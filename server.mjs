// Fix: Removed TypeScript type imports as this file is run directly by Node.js.
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import multer from 'multer';
import mongoose from 'mongoose';
import { EventEmitter } from 'events';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode';


// --- SETUP ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.RENDER_DISK_PATH || path.join(__dirname, 'data');
const DIST_DIR = path.join(__dirname, 'dist');

if (!fs.existsSync(DATA_DIR)) {
  console.log(`[Persistence] Criando diretório de dados em: ${DATA_DIR}`);
  fs.mkdirSync(DATA_DIR, { recursive: true });
}


export const app = express();
const port = process.env.PORT || 3001;

// --- GERENCIAMENTO DE ESTADO SIMPLIFICADO ---
const DB_FILE_PATH = path.join(DATA_DIR, 'db.json');
let aistudio;

const getInitialState = () => ({
    clients: [],
    services: [],
    appointments: [],
    monthlyPlans: [],
    clientPlanUsages: [],
    operatingHours: {
        daysOpen: [1, 2, 3, 4, 5, 6],
        availableTimes: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
    },
    automatedMessages: [],
    users: [{ 
        id: 'user-owner', 
        username: 'owner', 
        password: '123', 
        role: 'owner', 
        permissions: {
            dashboard: true,
            agenda: true,
            clients: true,
            services: true,
            whatsapp: true,
            settings: true,
        } 
    }],
    conversationLogs: [],
    catalogFiles: [],
    wa_chats: {}, 
    // Chatbot state tracking
    chatbot_sessions: {},
});


const loadDb = () => {
    let loadedData = {};
    if (fs.existsSync(DB_FILE_PATH)) {
        try {
            console.log('[Persistence] Carregando dados do arquivo...');
            const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
            if (fileContent.trim() !== '') {
                loadedData = JSON.parse(fileContent);
            }
        } catch (error) {
            console.error('[Persistence] ERRO CRÍTICO ao ler ou analisar db.json:', error);
            const backupPath = path.join(DATA_DIR, `db.corrupted.${Date.now()}.json`);
            if (fs.existsSync(DB_FILE_PATH)) {
                fs.copyFileSync(DB_FILE_PATH, backupPath);
                console.warn(`[Persistence] Backup do arquivo corrompido salvo em: ${backupPath}`);
            }
            loadedData = {}; // Start fresh on corruption
        }
    }

    // Initialize with default state, then merge loaded data over it.
    aistudio = { ...getInitialState(), ...loadedData };

    // --- DATA SANITIZATION & RECOVERY ---
    // This routine ensures the primary 'owner' user can always log in, even if the
    // db.json file becomes corrupted or the user is deleted.
    const ownerTemplate = getInitialState().users[0];
    
    // Ensure 'users' is an array.
    if (!aistudio.users || !Array.isArray(aistudio.users)) {
        aistudio.users = [];
    }

    const ownerIndex = aistudio.users.findIndex(u => u.id === 'user-owner');

    if (ownerIndex !== -1) {
        // If owner exists, forcibly restore critical credentials from the template.
        // This fixes corrupted passwords or permissions.
        aistudio.users[ownerIndex] = {
            ...aistudio.users[ownerIndex], // Keep existing data like a changed username
            password: ownerTemplate.password,
            role: ownerTemplate.role,
            permissions: ownerTemplate.permissions,
        };
        console.log('[Persistence] Usuário "owner" verificado e restaurado.');
    } else {
        // If owner does not exist at all, add it back.
        aistudio.users.unshift(ownerTemplate);
        console.log('[Persistence] Usuário "owner" não encontrado. Adicionando ao sistema.');
    }

    // Ensure other critical properties exist
    if (!aistudio.wa_chats) aistudio.wa_chats = {};
    if (!aistudio.chatbot_sessions) aistudio.chatbot_sessions = {};
};

const saveDb = () => {
    try {
        fs.writeFileSync(DB_FILE_PATH, JSON.stringify(aistudio, null, 2));
    } catch (error) {
        console.error('[Persistence] ERRO ao salvar dados:', error);
    }
};

loadDb();


// --- MIDDLEWARE ---
app.use(express.json());


// --- API ROUTES ---
app.get('/data', (req, res) => {
    res.json(aistudio);
});

app.post('/data', (req, res) => {
    for (const key in req.body) {
        if (Object.prototype.hasOwnProperty.call(aistudio, key)) {
            aistudio[key] = req.body[key];
        }
    }
    saveDb();
    res.status(200).json({ message: 'Dados salvos com sucesso!' });
});

// --- GEMINI API SETUP ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function runGemini(prompt) {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });
        return JSON.parse(response.text);
    } catch (e) {
        console.error("Gemini API error:", e);
        return { error: "Failed to process request with AI." };
    }
}


// --- WHATSAPP BOT (BAILEYS) ---
let sock = null;
const SESSION_DIR = path.join(DATA_DIR, 'whatsapp_session');
const waEvents = new EventEmitter();
waEvents.setMaxListeners(0); // Unlimited listeners for long-polling

let waConnectionStatus = { 
    isConnected: false, 
    message: 'Inicializando...', 
    qrCode: null 
};

const normalizeText = (text = '') => text ? text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

const sendMessageWTyping = async (jid, text) => {
    if (!sock) return;
    await sock.presenceSubscribe(jid);
    await sock.sendPresenceUpdate('composing', jid);
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
    await sock.sendPresenceUpdate('paused', jid);
    await sock.sendMessage(jid, { text });
};

const startWhatsApp = async () => {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const { version } = await fetchLatestBaileysVersion();
    
    console.log(`[WhatsApp] Usando Baileys v${version.join('.')}`);

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['CARCLASS', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if(qr) {
            waConnectionStatus = { isConnected: false, message: 'Escaneie o QR Code para conectar', qrCode: await qrcode.toDataURL(qr) };
        }
        
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            waConnectionStatus = { isConnected: false, message: 'Desconectado. Tentando reconectar...', qrCode: null };
            console.log('[WhatsApp] Conexão fechada, motivo:', lastDisconnect.error, ', reconectando:', shouldReconnect);
            
            if(shouldReconnect) {
                startWhatsApp();
            } else {
                 // Logged out, clear session
                if (fs.existsSync(SESSION_DIR)) {
                    fs.rmSync(SESSION_DIR, { recursive: true, force: true });
                }
                waConnectionStatus.message = 'Desconectado. Por favor, escaneie um novo QR Code.';
                 startWhatsApp(); // restart to generate new QR
            }
        } else if(connection === 'open') {
            waConnectionStatus = { isConnected: true, message: 'Conectado com sucesso!', qrCode: null };
            console.log('[WhatsApp] Conexão aberta.');
        }

        waEvents.emit('event', { type: 'status_change', data: waConnectionStatus });
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const senderJid = msg.key.remoteJid;
        const senderName = msg.pushName || senderJid.split('@')[0];
        const messageBody = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        
        console.log(`[WhatsApp] Mensagem de ${senderName} (${senderJid}): "${messageBody}"`);
        
        // --- SAVE MESSAGE & NOTIFY FRONTEND ---
         if (!aistudio.wa_chats[senderJid]) {
            aistudio.wa_chats[senderJid] = [];
        }
        const messageToStore = {
            id: { fromMe: false, remote: senderJid },
            body: messageBody,
            timestamp: msg.messageTimestamp,
            isBot: false,
        };
        aistudio.wa_chats[senderJid].push(messageToStore);
        saveDb();
        
         waEvents.emit('event', { type: 'message', data: messageToStore, senderName });
         
         // --- CHATBOT LOGIC ---
         await handleBotLogic(senderJid, messageBody, senderName);
    });
};

// --- WHATSAPP API ROUTES ---
app.get('/whatsapp/status', (req, res) => {
    res.json(waConnectionStatus);
});

app.get('/whatsapp/events', (req, res) => {
    const handler = (event) => {
        if (!res.headersSent) {
            res.json(event);
        }
    };
    waEvents.once('event', handler);
    // Clean up listener if client disconnects
    req.on('close', () => {
        waEvents.removeListener('event', handler);
    });
});

app.get('/whatsapp/chats', (req, res) => {
     const chats = Object.keys(aistudio.wa_chats).map(chatId => {
        const messages = aistudio.wa_chats[chatId];
        const lastMessage = messages[messages.length - 1];
        // A simple way to get a name. In a real app, you'd store contact names.
        const contact = aistudio.clients.find(c => c.whatsapp === chatId.split('@')[0]);
        return {
            id: chatId,
            name: contact?.name || chatId.split('@')[0],
            lastMessage: {
                body: lastMessage?.body || '',
                timestamp: lastMessage?.timestamp || 0
            }
        };
    }).sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);
    res.json(chats);
});

app.get('/whatsapp/messages/:chatId', (req, res) => {
    const { chatId } = req.params;
    const messages = aistudio.wa_chats[chatId] || [];
    res.json(messages);
});

app.post('/whatsapp/send-message', async (req, res) => {
    if (!sock || !waConnectionStatus.isConnected) {
        return res.status(400).json({ error: "WhatsApp não está conectado." });
    }
    const { chatId, message } = req.body;
    try {
        await sock.sendMessage(chatId, { text: message });
        
        if (!aistudio.wa_chats[chatId]) aistudio.wa_chats[chatId] = [];
        const messageToStore = {
            id: { fromMe: true, remote: chatId },
            body: message,
            timestamp: Date.now() / 1000,
            isBot: false
        };
        aistudio.wa_chats[chatId].push(messageToStore);
        saveDb();
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
        res.status(500).json({ error: "Falha ao enviar mensagem." });
    }
});


// --- CHATBOT IMPLEMENTATION ---

// Helper functions for the bot
const normalizeCPF = (cpf) => cpf.replace(/[^\d]/g, '');
const findClientByCpf = (cpf) => aistudio.clients.find(c => normalizeCPF(c.cpf) === normalizeCPF(cpf));
const getClientUpcomingAppointment = (clientId) => {
    const today = new Date().toISOString().split('T')[0];
    return aistudio.appointments.find(a => a.clientId === clientId && a.date >= today && a.status !== 'Finalizado');
};

const parseDateTime = (text) => {
    const now = new Date();
    const normalizedText = normalizeText(text);

    const monthMap = {
        janeiro: 0, fevereiro: 1, marco: 2, abril: 3, maio: 4, junho: 5,
        julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11
    };

    let day, month, year = now.getFullYear(), hour, minute = 0;

    // Parse time: "17h", "17hrs", "17:30"
    const timeMatch = normalizedText.match(/(\d{1,2})[:h](\d{2})?/);
    if (timeMatch) {
        hour = parseInt(timeMatch[1], 10);
        minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    } else {
        return null; // Time is mandatory
    }

    // Parse day and month: "13 de novembro"
    const dayMonthMatch = normalizedText.match(/(\d{1,2})\s+de\s+([a-z]+)/);
    if (dayMonthMatch) {
        day = parseInt(dayMonthMatch[1], 10);
        const monthStr = dayMonthMatch[2];
        if (monthMap.hasOwnProperty(monthStr)) {
            month = monthMap[monthStr];
        } else {
            return null; // Invalid month
        }
    } else {
        return null; // For now, we require an explicit day and month
    }

    // Heuristic for year: if the parsed date is in the past for the current year, assume next year.
    const targetDateForYearCheck = new Date(year, month, day);
    if (targetDateForYearCheck < now && targetDateForYearCheck.toDateString() !== now.toDateString()) {
        year++; 
    }

    if (day !== undefined && month !== undefined && hour !== undefined) {
        const dateObj = new Date(year, month, day, hour, minute);
        // Ensure the date object is valid
        if (isNaN(dateObj.getTime())) return null;

        const date = dateObj.toISOString().split('T')[0];
        const time = dateObj.toTimeString().substring(0, 5);
        return { date, time };
    }

    return null;
}

const isSlotAvailable = (dateString, timeString) => {
    const { operatingHours, appointments } = aistudio;
    const targetDate = new Date(`${dateString}T00:00:00Z`); // Use Z for UTC to avoid timezone issues with getDay()
    const dayOfWeek = targetDate.getUTCDay();

    if (!operatingHours.daysOpen.includes(dayOfWeek)) return false;
    if (!operatingHours.availableTimes.includes(timeString)) return false;

    const isBooked = appointments.some(app => app.date === dateString && app.time === timeString && app.status !== 'Finalizado');
    return !isBooked;
};

const getAvailableSlots = () => {
    const { operatingHours, appointments } = aistudio;
    let availableSlotsMessage = "Estes são os nossos próximos dias e horários disponíveis:\n\n";
    let slotsFound = 0;
    const distinctDays = new Set();

    for (let i = 0; i < 14 && slotsFound < 5; i++) {
        const day = new Date();
        day.setDate(day.getDate() + i);
        const dayOfWeek = day.getDay();

        if (operatingHours.daysOpen.includes(dayOfWeek)) {
            const dateString = day.toISOString().split('T')[0];
            
            if (distinctDays.has(dateString)) continue;

            const todaysAppointments = appointments.filter(a => a.date === dateString && a.status !== 'Finalizado');
            const bookedTimes = todaysAppointments.map(a => a.time);
            const availableForDay = operatingHours.availableTimes.filter(t => !bookedTimes.includes(t));

            if (availableForDay.length > 0) {
                const dayLabel = day.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
                availableSlotsMessage += `*${dayLabel}*:\n${availableForDay.join('h, ')}h\n\n`;
                slotsFound++;
                distinctDays.add(dateString);
            }
        }
    }
    return slotsFound > 0 ? availableSlotsMessage : "Desculpe, não temos horários disponíveis nos próximos 14 dias. Por favor, entre em contato para verificar a disponibilidade.";
};

const handleBotLogic = async (senderJid, message, senderName) => {
    const session = aistudio.chatbot_sessions[senderJid] || { state: 'GREETING' };
    const normalizedMessage = normalizeText(message);
    const clientNumber = senderJid.split('@')[0];

    const sendBotMessage = async (text) => {
        await sendMessageWTyping(senderJid, text);
        if (!aistudio.wa_chats[senderJid]) aistudio.wa_chats[senderJid] = [];
        const messageToStore = { id: { fromMe: true, remote: senderJid }, body: text, timestamp: Date.now() / 1000, isBot: true };
        aistudio.wa_chats[senderJid].push(messageToStore);
        waEvents.emit('event', { type: 'message', data: messageToStore, senderName });
    };

    const resetSession = () => {
        delete aistudio.chatbot_sessions[senderJid];
    };
    
    const showSummaryAndConfirm = async () => {
        const { serviceId, carId, date, time, protections } = session;
        const service = serviceId === 'on-site' ? { name: 'A ser escolhido no local' } : aistudio.services.find(s => s.id === serviceId);
        const client = aistudio.clients.find(c => c.id === session.clientId);
        const car = client.cars.find(c => c.id === carId);

        let summary = "Ótimo! Por favor, confirme os detalhes do seu agendamento:\n\n";
        if (service) summary += `*Serviço:* ${service.name}\n`;
        if (car) summary += `*Veículo:* ${car.model} (${car.plate})\n`;
        if (date && time) {
             const confirmationDate = new Date(`${date}T${time}`);
             const formattedDate = confirmationDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
             summary += `*Data e Hora:* ${formattedDate} às ${time}h\n`;
        }
        if (protections) summary += `*Proteções informadas:* ${protections}\n`;

        summary += "\nEstá tudo correto? Responda *Confirmar* ou *Alterar*.";
        await sendBotMessage(summary);
        session.state = 'AWAITING_FINAL_CONFIRMATION';
    };

    switch (session.state) {
        case 'GREETING':
            await sendBotMessage(`Olá, bem-vindo(a) à CAR CLASS! Para começarmos, você já é nosso cliente? (Responda com *Sim* ou *Não*)`);
            session.state = 'AWAITING_IS_CLIENT_RESPONSE';
            break;

        case 'AWAITING_IS_CLIENT_RESPONSE':
            if (normalizedMessage.includes('sim')) {
                await sendBotMessage("Que bom te ver de volta! Por favor, digite seu CPF para localizarmos seu cadastro. (Pode ser com pontos e traço)");
                session.state = 'VALIDATING_CPF';
                session.cpfRetryCount = 0;
            } else if (normalizedMessage.includes('nao')) {
                await sendBotMessage("Vamos realizar seu cadastro. Por favor, digite seu nome completo.");
                session.state = 'AWAITING_NEW_CLIENT_NAME';
            } else {
                await sendBotMessage("Desculpe, não entendi. Por favor, responda com *Sim* ou *Não*.");
            }
            break;

        case 'VALIDATING_CPF':
            const foundClient = findClientByCpf(message);
            if (foundClient) {
                session.clientId = foundClient.id;
                await sendBotMessage(`Cadastro encontrado em nome de *${foundClient.name}*!`);
                const upcomingAppointment = getClientUpcomingAppointment(foundClient.id);
                if (upcomingAppointment) {
                    session.existingAppointmentId = upcomingAppointment.id;
                    const appointmentDate = new Date(upcomingAppointment.date + 'T' + upcomingAppointment.time).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                    await sendBotMessage(`Verifiquei aqui e você já tem um agendamento para ${appointmentDate}. Você deseja *alterar*, *cancelar* este agendamento ou *prosseguir* com um novo?`);
                    session.state = 'AWAITING_EXISTING_APPOINTMENT_ACTION';
                } else {
                    await sendBotMessage("Deseja ver a lista de serviços ou escolher o serviço no local?");
                    session.state = 'CHOOSE_SERVICE_OPTION';
                }
            } else {
                session.cpfRetryCount++;
                if (session.cpfRetryCount < 2) {
                    await sendBotMessage("CPF não encontrado. Por favor, tente digitar novamente.");
                } else {
                    await sendBotMessage("Ainda não localizei seu CPF. Vamos fazer um novo cadastro para você. Qual o seu nome completo?");
                    session.state = 'AWAITING_NEW_CLIENT_NAME_AFTER_FAIL';
                }
            }
            break;

        case 'AWAITING_EXISTING_APPOINTMENT_ACTION':
             if (normalizedMessage.includes('cancelar')) {
                const appointmentId = session.existingAppointmentId;
                aistudio.appointments = aistudio.appointments.filter(a => a.id !== appointmentId);
                await sendBotMessage("Seu agendamento foi cancelado com sucesso. O horário agora está disponível novamente. Se precisar de algo mais, é só chamar!");
                waEvents.emit('event', { type: 'db_change', data: { cancelledAppointmentId: appointmentId } });
                resetSession();
            } else if (normalizedMessage.includes('alterar')) {
                const appointment = aistudio.appointments.find(a => a.id === session.existingAppointmentId);
                session.serviceId = appointment.serviceIds[0]; 
                session.carId = appointment.carId;
                await sendBotMessage("Ok, vamos alterar. " + getAvailableSlots());
                session.state = 'AWAITING_DATETIME_CHOICE';
            } else if (normalizedMessage.includes('prosseguir')) {
                await sendBotMessage("Certo! Deseja ver a lista de serviços ou escolher o serviço no local?");
                session.state = 'CHOOSE_SERVICE_OPTION';
            } else {
                await sendBotMessage("Por favor, responda com *alterar*, *cancelar* ou *prosseguir*.");
            }
            break;

        case 'AWAITING_NEW_CLIENT_NAME':
        case 'AWAITING_NEW_CLIENT_NAME_AFTER_FAIL':
            session.newClientName = message;
            await sendBotMessage("Obrigado. Agora, por favor, digite seu CPF.");
            session.state = 'AWAITING_NEW_CLIENT_CPF';
            break;

        case 'AWAITING_NEW_CLIENT_CPF':
            const existingClient = findClientByCpf(message);
            if (existingClient) {
                await sendBotMessage("Este CPF já está cadastrado em nome de *" + existingClient.name + "*. Vamos prosseguir com este cadastro.");
                session.clientId = existingClient.id;
                await sendBotMessage("Deseja ver a lista de serviços ou escolher o serviço no local?");
                session.state = 'CHOOSE_SERVICE_OPTION';
            } else {
                const newClient = { id: `c${Date.now()}`, name: session.newClientName, cpf: message, whatsapp: clientNumber, cars: [] };
                aistudio.clients.push(newClient);
                session.clientId = newClient.id;
                waEvents.emit('event', { type: 'db_change', data: { newClient } });
                await sendBotMessage("Cadastro concluído com sucesso! Deseja ver a lista de serviços ou escolher o serviço no local?");
                session.state = 'CHOOSE_SERVICE_OPTION';
            }
            break;

        case 'CHOOSE_SERVICE_OPTION':
            const serviceList = aistudio.services.map(s => `*- ${s.name}*`).join('\n');
            if (normalizedMessage.includes('lista') || normalizedMessage.includes('ver')) {
                await sendBotMessage(`Claro! Aqui estão nossos serviços:\n\n${serviceList}\n\nQual deles você deseja?`);
                session.state = 'AWAITING_SERVICE_CHOICE';
            } else if (normalizedMessage.includes('local') || normalizedMessage.includes('escolher')) {
                session.serviceId = 'on-site';
                await sendBotMessage("Entendido. " + getAvailableSlots());
                session.state = 'AWAITING_DATETIME_CHOICE';
            } else {
                await sendBotMessage("Por favor, me diga se quer ver a *lista de serviços* ou *escolher no local*.");
            }
            break;

        case 'AWAITING_SERVICE_CHOICE':
            const chosenService = aistudio.services.find(s => normalizeText(s.name).includes(normalizedMessage));
            if (chosenService) {
                session.serviceId = chosenService.id;
                await sendBotMessage(`Ótimo, serviço *${chosenService.name}* selecionado. ` + getAvailableSlots());
                session.state = 'AWAITING_DATETIME_CHOICE';
            } else {
                await sendBotMessage("Não encontrei este serviço. Por favor, digite o nome de um dos serviços da nossa lista.");
            }
            break;
            
        case 'AWAITING_DATETIME_CHOICE':
            const parsedDateTime = parseDateTime(message);
            if (parsedDateTime && isSlotAvailable(parsedDateTime.date, parsedDateTime.time)) {
                session.date = parsedDateTime.date;
                session.time = parsedDateTime.time;
                const confirmationDate = new Date(`${parsedDateTime.date}T${parsedDateTime.time}`);
                const formattedDate = confirmationDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
                await sendBotMessage(`Ok! Horário pré-agendado para ${formattedDate} às ${parsedDateTime.time}. Agora, me diga, seu veículo possui algum tipo de proteção como PPF, vitrificação, etc? (Responda *Sim* ou *Não*)`);
                session.state = 'AWAITING_PROTECTION_RESPONSE';
            } else {
                await sendBotMessage("Desculpe, não entendi a data e hora ou este horário não está disponível. Por favor, escolha um dos horários da lista ou digite no formato '13 de novembro às 17h'.");
            }
            break;
            
        case 'AWAITING_PROTECTION_RESPONSE':
            if (normalizedMessage.includes('sim')) {
                await sendBotMessage("Por favor, me diga qual ou quais proteções ele possui.");
                session.state = 'AWAITING_PROTECTION_DETAILS';
            } else if (normalizedMessage.includes('nao')) {
                session.protections = 'Nenhuma';
                const clientForProtectionCheck = aistudio.clients.find(c => c.id === session.clientId);
                if (clientForProtectionCheck.cars && clientForProtectionCheck.cars.length > 0) {
                    if (clientForProtectionCheck.cars.length === 1) {
                        const car = clientForProtectionCheck.cars[0];
                        await sendBotMessage(`O serviço será no seu *${car.model} (${car.plate})*? (*Sim* ou *Não*)`);
                        session.state = 'CONFIRM_EXISTING_VEHICLE';
                    } else {
                        let carList = "O serviço será em qual dos seus veículos?\n";
                        clientForProtectionCheck.cars.forEach((car, index) => {
                            carList += `${index + 1}. ${car.model} (${car.plate})\n`;
                        });
                        carList += "\nDigite o número correspondente.";
                        await sendBotMessage(carList);
                        session.state = 'CHOOSE_AMONG_VEHICLES';
                    }
                } else {
                    await sendBotMessage("Para finalizar, qual o modelo e a placa do veículo? (Ex: Honda Civic ABC1D23)");
                    session.state = 'AWAITING_NEW_VEHICLE';
                }
            } else {
                await sendBotMessage("Por favor, responda com *Sim* ou *Não*.");
            }
            break;

        case 'AWAITING_PROTECTION_DETAILS':
            session.protections = message;
            const clientForDetailsCheck = aistudio.clients.find(c => c.id === session.clientId);
            if (clientForDetailsCheck.cars && clientForDetailsCheck.cars.length > 0) {
                 if (clientForDetailsCheck.cars.length === 1) {
                    const car = clientForDetailsCheck.cars[0];
                    await sendBotMessage(`O serviço será no seu *${car.model} (${car.plate})*? (*Sim* ou *Não*)`);
                    session.state = 'CONFIRM_EXISTING_VEHICLE';
                } else {
                    let carList = "Entendido. E o serviço será em qual dos seus veículos?\n";
                    clientForDetailsCheck.cars.forEach((car, index) => { carList += `${index + 1}. ${car.model} (${car.plate})\n`; });
                    carList += "\nDigite o número correspondente.";
                    await sendBotMessage(carList);
                    session.state = 'CHOOSE_AMONG_VEHICLES';
                }
            } else {
                 await sendBotMessage("Entendido. Para finalizar, qual o modelo e a placa do veículo? (Ex: Honda Civic ABC1D23)");
                 session.state = 'AWAITING_NEW_VEHICLE';
            }
            break;

        case 'CONFIRM_EXISTING_VEHICLE':
             const clientToConfirm = aistudio.clients.find(c => c.id === session.clientId);
             if (normalizedMessage.includes('sim')) {
                 session.carId = clientToConfirm.cars[0].id;
                 await showSummaryAndConfirm();
             } else {
                 await sendBotMessage("Ok. Por favor, informe o modelo e a placa do novo veículo.");
                 session.state = 'AWAITING_NEW_VEHICLE';
             }
             break;

        case 'CHOOSE_AMONG_VEHICLES':
            const clientToChoose = aistudio.clients.find(c => c.id === session.clientId);
            const choice = parseInt(message, 10) - 1;
            if (clientToChoose.cars[choice]) {
                session.carId = clientToChoose.cars[choice].id;
                await showSummaryAndConfirm();
            } else {
                await sendBotMessage("Opção inválida. Por favor, digite o número de um dos veículos da lista.");
            }
            break;

        case 'AWAITING_NEW_VEHICLE':
            const parts = message.trim().split(' ');
            if (parts.length < 2) {
                 await sendBotMessage("Formato inválido. Por favor, envie o modelo e a placa. (Ex: Honda Civic ABC1D23)");
                 return;
            }
            const plate = parts.pop();
            const model = parts.join(' ');
            const newCar = { id: `car${Date.now()}`, model, plate, protections: session.protections ? [session.protections] : [] };
            
            const clientIndex = aistudio.clients.findIndex(c => c.id === session.clientId);
            if (clientIndex !== -1) {
                aistudio.clients[clientIndex].cars.push(newCar);
                session.carId = newCar.id;
                waEvents.emit('event', { type: 'db_change', data: { updatedClient: aistudio.clients[clientIndex] } });
                await sendBotMessage(`Veículo *${model} (${plate})* cadastrado!`);
                await showSummaryAndConfirm();
            }
            break;
            
        case 'AWAITING_FINAL_CONFIRMATION':
            if (normalizedMessage.includes('confirmar')) {
                if (!isSlotAvailable(session.date, session.time)) {
                    await sendBotMessage("Oh, que pena! Parece que alguém acabou de agendar neste mesmo horário enquanto você confirmava. Vamos tentar outro?");
                    await sendBotMessage(getAvailableSlots());
                    session.state = 'AWAITING_DATETIME_CHOICE';
                    break;
                }

                let appointmentData = {
                    id: session.existingAppointmentId || `a${Date.now()}`,
                    clientId: session.clientId,
                    carId: session.carId,
                    serviceIds: session.serviceId === 'on-site' ? [] : [session.serviceId],
                    date: session.date,
                    time: session.time,
                    status: 'Agendado'
                };
                
                if (session.existingAppointmentId) {
                    aistudio.appointments = aistudio.appointments.map(a => a.id === session.existingAppointmentId ? { ...a, ...appointmentData } : a);
                    waEvents.emit('event', { type: 'db_change', data: { updatedAppointment: appointmentData } });
                } else {
                    aistudio.appointments.push(appointmentData);
                    waEvents.emit('event', { type: 'db_change', data: { newAppointment: appointmentData } });
                }
                
                await sendBotMessage("Agendamento confirmado com sucesso! Muito obrigado por escolher a CAR CLASS. Até breve!");
                resetSession();

            } else if (normalizedMessage.includes('alterar')) {
                await sendBotMessage("O que você deseja alterar? (*Serviço*, *Veículo*, *Data/Hora* ou *Proteção*)");
                session.state = 'AWAITING_ALTERATION_CHOICE';
            } else {
                await sendBotMessage("Por favor, responda com *Confirmar* ou *Alterar*.");
            }
            break;
            
        case 'AWAITING_ALTERATION_CHOICE':
             if (normalizedMessage.includes('servico')) {
                const serviceList = aistudio.services.map(s => `*- ${s.name}*`).join('\n');
                await sendBotMessage(`Ok, vamos alterar o serviço. Qual você deseja?\n\n${serviceList}`);
                session.state = 'AWAITING_SERVICE_CHOICE';
             } else if (normalizedMessage.includes('veiculo')) {
                 session.state = 'AWAITING_PROTECTION_RESPONSE'; // Restart from vehicle/protection step
                 await sendBotMessage("Vamos alterar o veículo. Ele possui alguma proteção? (*Sim* ou *Não*)");
             } else if (normalizedMessage.includes('data') || normalizedMessage.includes('hora')) {
                 await sendBotMessage("Ok, vamos alterar a data/hora. " + getAvailableSlots());
                 session.state = 'AWAITING_DATETIME_CHOICE';
             } else if (normalizedMessage.includes('protecao')) {
                 await sendBotMessage("Vamos alterar a informação de proteção. Seu veículo possui alguma? (*Sim* ou *Não*)");
                 session.state = 'AWAITING_PROTECTION_RESPONSE';
             } else {
                 await sendBotMessage("Não entendi. Por favor, escolha entre *Serviço*, *Veículo*, *Data/Hora* ou *Proteção*.");
             }
             break;
    }

    // Save session only if it hasn't been reset
    if (aistudio.chatbot_sessions[senderJid]) {
        aistudio.chatbot_sessions[senderJid] = session;
    }
    saveDb();
};


// --- STARTUP LOGIC ---
// Differentiate between development (Vite middleware) and production (standalone server)
const isViteDev = process.env.npm_lifecycle_script?.includes('vite');

if (isViteDev) {
    // DEVELOPMENT: Running as Vite middleware.
    // The `app` is already configured with API routes.
    // Vite handles static serving and the server itself.
    // We just need to start the WhatsApp client.
    console.log('[Vite Dev] Anexando servidor Express e iniciando WhatsApp...');
    startWhatsApp().catch(err => console.error("[Vite Dev Startup] Erro fatal ao iniciar o WhatsApp:", err));
} else {
    // PRODUCTION: Running as a standalone Node.js server.
    // Serve the built frontend files.
    app.use(express.static(DIST_DIR));
    app.get('*', (req, res) => {
        res.sendFile(path.join(DIST_DIR, 'index.html'));
    });

    // Start listening and then start WhatsApp.
    app.listen(port, () => {
        console.log(`[Server] Servidor HTTP rodando na porta ${port}`);
        console.log(`[Server] Acessível em http://localhost:${port}`);
        startWhatsApp().catch(err => console.error("[Production Startup] Erro fatal ao iniciar o WhatsApp:", err));
    });
}
