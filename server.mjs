// Fix: Removed TypeScript type imports as this file is run directly by Node.js.
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import multer from 'multer';
// Removed unused mongoose import
import { EventEmitter } from 'events';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode';


// --- SETUP ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.RENDER_DISK_PATH || path.join(__dirname, 'data');
const DIST_DIR = path.join(__dirname, 'dist');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');


if (!fs.existsSync(DATA_DIR)) {
  console.log(`[Persistence] Criando diretório de dados em: ${DATA_DIR}`);
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  console.log(`[Persistence] Criando diretório de uploads em: ${UPLOADS_DIR}`);
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}


export const app = express();
const port = process.env.PORT || 3001;
const apiRouter = express.Router();
const upload = multer({ dest: UPLOADS_DIR });


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
    // This routine ensures the primary 'owner' user can always log in.
    const ownerTemplate = getInitialState().users[0];
    
    // Ensure 'users' is an array.
    if (!aistudio.users || !Array.isArray(aistudio.users)) {
        aistudio.users = [];
    }

    // Find if owner exists by username OR by ID
    const ownerIndex = aistudio.users.findIndex(u => u.username === 'owner' || u.id === 'user-owner');

    if (ownerIndex !== -1) {
        // Restore critical credentials. We KEEP the user ID consistent if it was different, 
        // but enforce the 'owner' username and '123' password.
        aistudio.users[ownerIndex] = {
            ...aistudio.users[ownerIndex], 
            id: 'user-owner', // Enforce standard ID
            username: 'owner', 
            password: '123',
            role: 'owner',
            permissions: ownerTemplate.permissions, // Restore full permissions
        };
        console.log('[Persistence] Usuário "owner" verificado e restaurado para o padrão.');
    } else {
        // If owner does not exist at all, add it back.
        aistudio.users.unshift(ownerTemplate);
        console.log('[Persistence] Usuário "owner" não encontrado. Adicionando ao sistema.');
    }
    
    // Deduplicate users based on ID or Username to prevent conflicts
    const seenIds = new Set();
    const seenUsernames = new Set();
    aistudio.users = aistudio.users.filter(u => {
        const isDuplicate = seenIds.has(u.id) || seenUsernames.has(u.username);
        seenIds.add(u.id);
        seenUsernames.add(u.username);
        return !isDuplicate;
    });

    // Ensure other critical properties exist
    if (!aistudio.wa_chats) aistudio.wa_chats = {};
    if (!aistudio.chatbot_sessions) aistudio.chatbot_sessions = {};
    if (!aistudio.catalogFiles) aistudio.catalogFiles = [];

    saveDb(); // Save immediately to ensure the owner fix is persisted
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
// @ts-ignore
app.use(express.json());
// Serve static files from the uploads directory
// @ts-ignore
app.use('/uploads', express.static(UPLOADS_DIR));


// --- API ROUTES ---
apiRouter.get('/data', (req, res) => {
    res.json(aistudio);
});

apiRouter.post('/data', (req, res) => {
    for (const key in req.body) {
        if (Object.prototype.hasOwnProperty.call(aistudio, key)) {
            aistudio[key] = req.body[key];
        }
    }
    saveDb();
    res.status(200).json({ message: 'Dados salvos com sucesso!' });
});

// @ts-ignore
apiRouter.post('/upload-catalog', upload.array('catalogs'), (req, res) => {
    if (!req.files) {
        return res.status(400).send('Nenhum arquivo enviado.');
    }
    const newFiles = req.files.map(file => ({
        id: file.filename,
        path: file.path,
        file: {
            name: file.originalname,
            type: file.mimetype,
        }
    }));
    aistudio.catalogFiles.push(...newFiles);
    saveDb();

    // Respond with the updated list for frontend sync
    res.status(200).json({
        catalogFiles: aistudio.catalogFiles,
        services: aistudio.services, // Also send services in case they are derived from this
    });
});

apiRouter.delete('/delete-catalog/:fileId', (req, res) => {
    const { fileId } = req.params;
    const fileIndex = aistudio.catalogFiles.findIndex(f => f.id === fileId);

    if (fileIndex > -1) {
        const fileToDelete = aistudio.catalogFiles[fileIndex];
        // Delete from filesystem
        if (fs.existsSync(fileToDelete.path)) {
            fs.unlinkSync(fileToDelete.path);
        }
        // Remove from DB
        aistudio.catalogFiles.splice(fileIndex, 1);
        saveDb();
        res.status(200).json({ services: aistudio.services }); // Send back potentially updated services
    } else {
        res.status(404).send('Arquivo não encontrado.');
    }
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
    try {
        await sock.presenceSubscribe(jid);
        await sock.sendPresenceUpdate('composing', jid);
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
        await sock.sendPresenceUpdate('paused', jid);
        await sock.sendMessage(jid, { text });
    } catch (err) {
        console.error(`[WhatsApp] Erro ao enviar mensagem para ${jid}:`, err);
    }
};

const startWhatsApp = async () => {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
        const { version } = await fetchLatestBaileysVersion();
        
        console.log(`[WhatsApp] Usando Baileys v${version.join('.')}`);

        sock = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: 'silent' }),
            browser: ['CARCLASS', 'Chrome', '1.0.0'],
            printQRInTerminal: false,
            syncFullHistory: true, // Request full history
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if(qr) {
                waConnectionStatus = { isConnected: false, message: 'Escaneie o QR Code para conectar', qrCode: await qrcode.toDataURL(qr) };
                waEvents.emit('event', { type: 'status_change', data: waConnectionStatus });
            }
            
            if(connection === 'close') {
                const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                waConnectionStatus = { isConnected: false, message: 'Desconectado. Tentando reconectar...', qrCode: null };
                console.log('[WhatsApp] Conexão fechada, motivo:', lastDisconnect.error, ', reconectando:', shouldReconnect);
                waEvents.emit('event', { type: 'status_change', data: waConnectionStatus });
                
                if(shouldReconnect) {
                    setTimeout(startWhatsApp, 3000);
                } else {
                    // Logged out, clear session
                    if (fs.existsSync(SESSION_DIR)) {
                        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
                    }
                    waConnectionStatus.message = 'Desconectado. Por favor, escaneie um novo QR Code.';
                    setTimeout(startWhatsApp, 1000); 
                }
            } else if(connection === 'open') {
                waConnectionStatus = { isConnected: true, message: 'Conectado com sucesso!', qrCode: null };
                console.log('[WhatsApp] Conexão aberta.');
                waEvents.emit('event', { type: 'status_change', data: waConnectionStatus });
            }
        });

        sock.ev.on('messages.upsert', async (m) => {
            // Process ALL messages in the upsert event (fixes history sync issues)
            for (const msg of m.messages) {
                if (!msg.message) continue;

                const senderJid = msg.key.remoteJid;
                // Ignore status updates
                if (senderJid === 'status@broadcast') continue;

                const senderName = msg.pushName || senderJid.split('@')[0];
                const messageBody = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
                
                // --- SAVE MESSAGE ---
                // We want to save both incoming and outgoing (fromMe) messages so the chat is complete.
                if (!aistudio.wa_chats[senderJid]) {
                    aistudio.wa_chats[senderJid] = [];
                }

                // Check for duplicates to avoid adding the same message twice (upserts can happen multiple times)
                // We use timestamp and id as unique identifiers.
                const alreadyExists = aistudio.wa_chats[senderJid].some(storedMsg => 
                    storedMsg.id.remote === senderJid && 
                    storedMsg.id.fromMe === msg.key.fromMe &&
                    (storedMsg.id.id === msg.key.id || Math.abs(storedMsg.timestamp - (msg.messageTimestamp || Date.now()/1000)) < 2)
                );

                if (!alreadyExists) {
                     const messageToStore = {
                        id: { fromMe: msg.key.fromMe, remote: senderJid, id: msg.key.id },
                        body: messageBody,
                        timestamp: msg.messageTimestamp || Date.now() / 1000,
                        isBot: false, 
                    };
                    aistudio.wa_chats[senderJid].push(messageToStore);
                    // Notify frontend
                    waEvents.emit('event', { type: 'message', data: messageToStore, senderName });
                    
                    // Only save DB periodically or on important events could be better, but for MVP saving here is safer.
                    saveDb(); 
                }

                // --- CHATBOT LOGIC ---
                // Only run bot logic for incoming messages that are NOT from the bot itself
                if (!msg.key.fromMe && messageBody) {
                    console.log(`[WhatsApp] Mensagem de ${senderName}: "${messageBody}"`);
                    await handleBotLogic(senderJid, messageBody, senderName);
                }
            }
        });

    } catch (error) {
        console.error('[WhatsApp] Erro fatal ao iniciar:', error);
        // Force cleanup and retry if session is corrupted
        if (fs.existsSync(SESSION_DIR)) {
            try {
                fs.rmSync(SESSION_DIR, { recursive: true, force: true });
            } catch(e) {}
        }
        setTimeout(startWhatsApp, 5000);
    }
};

// --- WHATSAPP API ROUTES ---
apiRouter.get('/whatsapp/status', (req, res) => {
    res.json(waConnectionStatus);
});

apiRouter.get('/whatsapp/events', (req, res) => {
    const handler = (event) => {
        if (!res.headersSent) {
            res.json(event);
        }
    };
    waEvents.once('event', handler);
    // Clean up listener if client disconnects
    // @ts-ignore
    req.on('close', () => {
        waEvents.removeListener('event', handler);
    });
});

apiRouter.get('/whatsapp/chats', (req, res) => {
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

apiRouter.get('/whatsapp/messages/:chatId', (req, res) => {
    const { chatId } = req.params;
    const messages = aistudio.wa_chats[chatId] || [];
    res.json(messages);
});

apiRouter.post('/whatsapp/send-message', async (req, res) => {
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

// Mount the API router
app.use('/api', apiRouter);


// --- CHATBOT IMPLEMENTATION ---

// Helper functions for the bot
// Using Brazil time for accurate scheduling
const getBrazilDate = () => new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));

const normalizeCPF = (cpf) => cpf.replace(/[^\d]/g, '');
const findClientByCpf = (cpf) => aistudio.clients.find(c => normalizeCPF(c.cpf) === normalizeCPF(cpf));
const getClientUpcomingAppointment = (clientId) => {
    const today = getBrazilDate().toISOString().split('T')[0];
    return aistudio.appointments
        .filter(a => a.clientId === clientId && a.date >= today && a.status !== 'Finalizado')
        .sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time))[0];
};

const parseDateTime = (text) => {
    const now = getBrazilDate();
    const normalizedText = normalizeText(text.replace(/ as /g, ' '));

    const monthMap = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11, janeiro: 0, fevereiro: 1, marco: 2, abril: 3, maio: 4, junho: 5, julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11 };
    const weekdayMap = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };

    let day, month, year = now.getFullYear(), hour, minute = 0;

    const timeMatch = normalizedText.match(/(\d{1,2})[:h](\d{2})?/);
    if (timeMatch) {
        hour = parseInt(timeMatch[1], 10);
        minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    } else {
        return null; // Time is mandatory
    }

    const dayMonthMatch = normalizedText.match(/(\d{1,2})\s+de\s+([a-z]+)/);
    const dayOnlyMatch = normalizedText.match(/dia\s+(\d{1,2})/);
    const weekdayMatch = normalizedText.match(/(seg|ter|qua|qui|sex|sab|dom)/);

    if (dayMonthMatch) {
        day = parseInt(dayMonthMatch[1], 10);
        const monthStr = dayMonthMatch[2].substring(0, 3);
        if (monthMap.hasOwnProperty(monthStr)) month = monthMap[monthStr];
    } else if (dayOnlyMatch) {
        day = parseInt(dayOnlyMatch[1], 10);
        month = now.getDate() > day ? now.getMonth() + 1 : now.getMonth();
    } else if (weekdayMatch) {
        const targetWeekday = weekdayMap[weekdayMatch[1]];
        const tempDate = getBrazilDate();
        tempDate.setDate(tempDate.getDate() + (targetWeekday + 7 - tempDate.getDay()) % 7);
        day = tempDate.getDate();
        month = tempDate.getMonth();
        year = tempDate.getFullYear();
    } else {
        return null; // Day/Month context is missing
    }

    if (day === undefined || month === undefined) return null;
    
    const targetDate = new Date(year, month, day);
    if (targetDate < now && targetDate.toDateString() !== now.toDateString()) {
        year++;
    }

    const dateObj = new Date(year, month, day, hour, minute);
    if (isNaN(dateObj.getTime())) return null;

    return {
        date: dateObj.toISOString().split('T')[0],
        time: dateObj.toTimeString().substring(0, 5)
    };
};

const isSlotAvailable = (dateString, timeString) => {
    const { operatingHours, appointments } = aistudio;
    const targetDate = new Date(`${dateString}T00:00:00`); 
    const dayOfWeek = targetDate.getDay(); // Sun=0, Sat=6

    // 1. Check if day is open
    if (!operatingHours.daysOpen.includes(dayOfWeek)) return false;
    // 2. Check if time is in list
    if (!operatingHours.availableTimes.includes(timeString)) return false;

    // 3. Check if time has passed (for today) using Brazil time
    const now = getBrazilDate();
    const todayString = now.toISOString().split('T')[0];
    
    if (dateString === todayString) {
        const [h, m] = timeString.split(':').map(Number);
        const slotDate = getBrazilDate();
        slotDate.setHours(h, m, 0, 0);
        
        // If the slot time is before "now", it's not available
        if (slotDate < now) return false;
    }

    // 4. Check if booked
    const isBooked = appointments.some(app => app.date === dateString && app.time === timeString && app.status !== 'Finalizado');
    return !isBooked;
};

const getAvailableSlots = () => {
    const { operatingHours, appointments } = aistudio;
    let availableSlotsMessage = "Estes são os nossos próximos dias e horários disponíveis:\n\n";
    let daysFound = 0;
    const distinctDays = new Set();
    const now = getBrazilDate();
    const todayString = now.toISOString().split('T')[0];

    for (let i = 0; i < 14 && daysFound < 5; i++) {
        const day = getBrazilDate();
        day.setDate(day.getDate() + i);
        const dayOfWeek = day.getDay();

        if (operatingHours.daysOpen.includes(dayOfWeek)) {
            const dateString = day.toISOString().split('T')[0];
            if (distinctDays.has(dateString)) continue;

            const todaysAppointments = appointments.filter(a => a.date === dateString && a.status !== 'Finalizado');
            const bookedTimes = todaysAppointments.map(a => a.time);
            
            // Filter base available times
            let availableForDay = operatingHours.availableTimes.filter(t => !bookedTimes.includes(t));

            // Extra filter for TODAY: remove passed hours
            if (dateString === todayString) {
                availableForDay = availableForDay.filter(t => {
                    const [h, m] = t.split(':').map(Number);
                    const slotDate = getBrazilDate();
                    slotDate.setHours(h, m, 0, 0);
                    return slotDate > now;
                });
            }

            if (availableForDay.length > 0) {
                const dayLabel = day.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
                availableSlotsMessage += `*${dayLabel}*:\n${availableForDay.join('h, ')}h\n\n`;
                daysFound++;
                distinctDays.add(dateString);
            }
        }
    }
    return daysFound > 0 ? availableSlotsMessage : "Desculpe, não temos horários disponíveis nos próximos dias. Por favor, entre em contato para verificar a disponibilidade.";
};

const handleBotLogic = async (senderJid, message, senderName) => {
    let session = aistudio.chatbot_sessions[senderJid] || { state: 'GREETING' };
    const normalizedMessage = normalizeText(message);
    const clientNumber = senderJid.split('@')[0];
    
    if (session.state === 'CONVERSATION_ENDED' && message) {
        session = { state: 'GREETING' };
    }

    const sendBotMessage = async (text) => {
        await sendMessageWTyping(senderJid, text);
    };

    const resetSession = () => {
        delete aistudio.chatbot_sessions[senderJid];
    };
    
    // Sends the complete, updated data to the frontend for robust sync
    const notifyFrontendOfDbChange = () => {
        waEvents.emit('event', { 
            type: 'db_change', 
            data: { 
                clients: aistudio.clients, 
                appointments: aistudio.appointments 
            } 
        });
    }

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

    const handlePlanCheck = async () => {
        const client = aistudio.clients.find(c => c.id === session.clientId);
        if (client.monthlyPlanId) {
            // Client has a plan
            const plan = aistudio.monthlyPlans.find(p => p.id === client.monthlyPlanId);
            const today = getBrazilDate();
            const currentCycleStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            
            // Get usage
            let usage = aistudio.clientPlanUsages.find(u => u.clientId === client.id && u.cycleStartDate === currentCycleStart);
            
            if (plan) {
                let statusMsg = `Você é assinante do plano *${plan.name}*.\n`;
                const details = plan.includedServices.map(item => {
                    const serviceName = aistudio.services.find(s => s.id === item.serviceId)?.name || 'Serviço';
                    const used = usage && usage.usedServices[item.serviceId] ? usage.usedServices[item.serviceId] : 0;
                    const remaining = Math.max(0, item.quantity - used);
                    return `- ${serviceName}: ${remaining} restantes de ${item.quantity}`;
                }).join('\n');
                statusMsg += details;
                await sendBotMessage(statusMsg);
            }
            
            // Skip plan pitch, go to service selection
            await sendBotMessage("Deseja ver a lista completa de serviços ou prefere escolher o serviço no local?");
            session.state = 'CHOOSE_SERVICE_OPTION';

        } else {
            // Client does NOT have a plan
            await sendBotMessage("Verifiquei que você ainda não possui um plano mensal conosco. Gostaria de *conhecer* nossos planos e economizar, ou prefere *prosseguir* com o agendamento avulso?");
            session.state = 'AWAITING_PLAN_INTEREST_RESPONSE';
        }
    };

    switch (session.state) {
        case 'GREETING':
            await sendBotMessage(`Olá! Sou o assistente virtual da CAR CLASS. Para começarmos, você já é nosso cliente? (Responda com *Sim* ou *Não*)`);
            session.state = 'AWAITING_IS_CLIENT_RESPONSE';
            break;

        case 'AWAITING_IS_CLIENT_RESPONSE':
            if (normalizedMessage.includes('sim')) {
                await sendBotMessage("Que bom te ver de volta! Por favor, digite seu CPF para localizarmos seu cadastro. (Pode ser com pontos e traço)");
                session.state = 'VALIDATING_CPF';
                session.cpfRetryCount = 0;
            } else if (normalizedMessage.includes('nao')) {
                await sendBotMessage("Seja bem-vindo(a)! Vamos realizar seu cadastro. Por favor, digite seu nome completo.");
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
                    // Check for plans before going to service selection
                    await handlePlanCheck();
                }
            } else {
                session.cpfRetryCount++;
                if (session.cpfRetryCount < 2) {
                    await sendBotMessage("CPF não encontrado. Por favor, tente digitar novamente.");
                } else {
                    await sendBotMessage("Ainda não localizei seu CPF. Vamos fazer um novo cadastro para você. Qual o seu nome completo?");
                    session.state = 'AWAITING_NEW_CLIENT_NAME';
                }
            }
            break;

        case 'AWAITING_EXISTING_APPOINTMENT_ACTION':
             if (normalizedMessage.includes('cancelar')) {
                const appointmentId = session.existingAppointmentId;
                aistudio.appointments = aistudio.appointments.filter(a => a.id !== appointmentId);
                await sendBotMessage("Seu agendamento foi cancelado com sucesso. O horário agora está disponível novamente. Se precisar de algo mais, é só chamar!");
                notifyFrontendOfDbChange();
                resetSession();
            } else if (normalizedMessage.includes('alterar')) {
                const appointment = aistudio.appointments.find(a => a.id === session.existingAppointmentId);
                session.serviceId = appointment.serviceIds[0]; 
                await sendBotMessage("Ok, vamos alterar. " + getAvailableSlots());
                session.state = 'AWAITING_DATETIME_FOR_CHANGE';
            } else if (normalizedMessage.includes('prosseguir')) {
                 // Check for plans before going to service selection
                 await handlePlanCheck();
            } else {
                await sendBotMessage("Por favor, responda com *alterar*, *cancelar* ou *prosseguir*.");
            }
            break;

        case 'AWAITING_NEW_CLIENT_NAME':
            session.newClientName = message;
            await sendBotMessage("Obrigado. Agora, por favor, digite seu CPF.");
            session.state = 'AWAITING_NEW_CLIENT_CPF';
            break;

        case 'AWAITING_NEW_CLIENT_CPF':
            const existingClient = findClientByCpf(message);
            if (existingClient) {
                await sendBotMessage("Este CPF já está cadastrado em nome de *" + existingClient.name + "*. Vamos prosseguir com este cadastro.");
                session.clientId = existingClient.id;
            } else {
                const newClient = { id: `c${Date.now()}`, name: session.newClientName, cpf: message, whatsapp: clientNumber, cars: [] };
                aistudio.clients.push(newClient);
                session.clientId = newClient.id;
                await sendBotMessage("Cadastro concluído com sucesso!");
                notifyFrontendOfDbChange();
            }
            // Check plans for new or existing client
            await handlePlanCheck();
            break;

        case 'AWAITING_PLAN_INTEREST_RESPONSE':
            if (normalizedMessage.includes('conhecer') || normalizedMessage.includes('sim')) {
                const plans = aistudio.monthlyPlans;
                if (plans.length > 0) {
                    let plansMsg = "Estes são os nossos planos mensais:\n\n";
                    plans.forEach((p, idx) => {
                        plansMsg += `*${idx + 1}. ${p.name}* - R$ ${p.price.toFixed(2)}\n`;
                    });
                    plansMsg += "\nDigite o número do plano que deseja aderir, ou digite *prosseguir* para continuar sem plano.";
                    await sendBotMessage(plansMsg);
                    session.state = 'AWAITING_PLAN_SELECTION';
                } else {
                    await sendBotMessage("No momento não temos planos cadastrados. Vamos prosseguir com o agendamento avulso.");
                    await sendBotMessage("Deseja ver a lista de serviços ou prefere escolher o serviço no local?");
                    session.state = 'CHOOSE_SERVICE_OPTION';
                }
            } else {
                await sendBotMessage("Sem problemas! Vamos prosseguir com o agendamento avulso.");
                await sendBotMessage("Deseja ver a lista de serviços ou prefere escolher o serviço no local?");
                session.state = 'CHOOSE_SERVICE_OPTION';
            }
            break;

        case 'AWAITING_PLAN_SELECTION':
            if (normalizedMessage.includes('prosseguir')) {
                await sendBotMessage("Deseja ver a lista de serviços ou prefere escolher o serviço no local?");
                session.state = 'CHOOSE_SERVICE_OPTION';
            } else {
                const choice = parseInt(message, 10) - 1;
                if (aistudio.monthlyPlans[choice]) {
                    const selectedPlan = aistudio.monthlyPlans[choice];
                    const clientIndex = aistudio.clients.findIndex(c => c.id === session.clientId);
                    if (clientIndex !== -1) {
                        aistudio.clients[clientIndex].monthlyPlanId = selectedPlan.id;
                        notifyFrontendOfDbChange();
                        await sendBotMessage(`Parabéns! O plano *${selectedPlan.name}* foi vinculado ao seu cadastro.`);
                        await sendBotMessage("Agora, deseja ver a lista de serviços ou prefere escolher o serviço no local?");
                        session.state = 'CHOOSE_SERVICE_OPTION';
                    } else {
                        await sendBotMessage("Houve um erro ao vincular o plano. Vamos prosseguir com o agendamento.");
                        session.state = 'CHOOSE_SERVICE_OPTION';
                    }
                } else {
                    await sendBotMessage("Opção inválida. Digite o número do plano ou *prosseguir*.");
                }
            }
            break;

        case 'CHOOSE_SERVICE_OPTION':
            if (normalizedMessage.includes('lista') || normalizedMessage.includes('ver')) {
                if (aistudio.catalogFiles && aistudio.catalogFiles.length > 0) {
                    await sendBotMessage("Certo! Enviando nosso catálogo de serviços para você:");
                     for (const file of aistudio.catalogFiles) {
                         await sock.sendMessage(senderJid, {
                             document: { url: file.path },
                             mimetype: file.file.type,
                             fileName: file.file.name
                         });
                     }
                    await sendBotMessage("Qual dos serviços acima você deseja agendar?");
                } else {
                    const serviceList = aistudio.services.map(s => `*- ${s.name}*`).join('\n');
                    await sendBotMessage(`Claro! Aqui estão nossos serviços:\n\n${serviceList}\n\nQual deles você deseja?`);
                }
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
        case 'AWAITING_DATETIME_FOR_CHANGE':
            const parsedDateTime = parseDateTime(message);
            if (parsedDateTime && isSlotAvailable(parsedDateTime.date, parsedDateTime.time)) {
                session.date = parsedDateTime.date;
                session.time = parsedDateTime.time;
                const confirmationDate = new Date(`${parsedDateTime.date}T${parsedDateTime.time}`);
                const formattedDate = confirmationDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
                await sendBotMessage(`Ok! Horário pré-agendado para ${formattedDate} às ${parsedDateTime.time}h.`);
                
                const clientForVehicleCheck = aistudio.clients.find(c => c.id === session.clientId);

                if (session.state === 'AWAITING_DATETIME_FOR_CHANGE') {
                     if (clientForVehicleCheck.cars && clientForVehicleCheck.cars.length > 0) {
                         const carToConfirm = clientForVehicleCheck.cars.find(c => c.id === aistudio.appointments.find(a => a.id === session.existingAppointmentId).carId);
                         await sendBotMessage(`O serviço será no seu *${carToConfirm.model} (${carToConfirm.plate})*? (*Sim* ou *Não*)`);
                         session.state = 'CONFIRM_EXISTING_VEHICLE_FOR_CHANGE';
                     } else { // Should not happen if appointment existed, but as a fallback
                          await sendBotMessage("Agora, me diga, seu veículo possui algum tipo de proteção como PPF, vitrificação, etc? (Responda *Sim* ou *Não*)");
                          session.state = 'AWAITING_PROTECTION_RESPONSE';
                     }
                } else {
                     await sendBotMessage("Agora, me diga, seu veículo possui algum tipo de proteção como PPF, vitrificação, etc? (Responda *Sim* ou *Não*)");
                     session.state = 'AWAITING_PROTECTION_RESPONSE';
                }
            } else {
                await sendBotMessage("Desculpe, não entendi a data e hora ou este horário não está disponível. Por favor, escolha um dos horários da lista ou digite, por exemplo: 'terça as 10h' ou 'dia 22 as 15h'.");
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
        
        case 'CONFIRM_EXISTING_VEHICLE_FOR_CHANGE':
             const clientToConfirmChange = aistudio.clients.find(c => c.id === session.clientId);
             const appointmentToChange = aistudio.appointments.find(a => a.id === session.existingAppointmentId);
             if (normalizedMessage.includes('sim')) {
                 session.carId = appointmentToChange.carId;
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
            
            const clientIndexNewCar = aistudio.clients.findIndex(c => c.id === session.clientId);
            if (clientIndexNewCar !== -1) {
                aistudio.clients[clientIndexNewCar].cars.push(newCar);
                session.carId = newCar.id;
                notifyFrontendOfDbChange();
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
                    clientId: session.clientId,
                    carId: session.carId,
                    serviceIds: session.serviceId === 'on-site' ? [] : [session.serviceId],
                    date: session.date,
                    time: session.time,
                    status: 'Agendado'
                };
                
                if (session.existingAppointmentId) {
                    aistudio.appointments = aistudio.appointments.map(a => a.id === session.existingAppointmentId ? { ...a, ...appointmentData } : a);
                } else {
                    aistudio.appointments.push({ ...appointmentData, id: `a${Date.now()}`});
                }
                notifyFrontendOfDbChange();
                await sendBotMessage("Agendamento confirmado com sucesso! Muito obrigado por escolher a CAR CLASS. Até breve!");
                session.state = 'CONVERSATION_ENDED';

            } else if (normalizedMessage.includes('alterar')) {
                await sendBotMessage("O que você deseja alterar? (*Serviço*, *Veículo*, *Data/Hora* ou *Proteção*)");
                session.state = 'AWAITING_ALTERATION_CHOICE';
            } else {
                await sendBotMessage("Por favor, responda com *Confirmar* ou *Alterar*.");
            }
            break;
            
        case 'AWAITING_ALTERATION_CHOICE':
             if (normalizedMessage.includes('servico')) {
                session.state = 'CHOOSE_SERVICE_OPTION';
                await sendBotMessage("Ok, vamos alterar o serviço. Deseja ver a lista ou escolher no local?");
             } else if (normalizedMessage.includes('veiculo') || normalizedMessage.includes('protecao')) {
                 session.state = 'AWAITING_PROTECTION_RESPONSE'; // Restart from vehicle/protection step
                 await sendBotMessage("Vamos alterar o veículo. Ele possui alguma proteção? (*Sim* ou *Não*)");
             } else if (normalizedMessage.includes('data') || normalizedMessage.includes('hora')) {
                 await sendBotMessage("Ok, vamos alterar a data/hora. " + getAvailableSlots());
                 session.state = 'AWAITING_DATETIME_CHOICE';
             } else {
                 await sendBotMessage("Não entendi. Por favor, escolha entre *Serviço*, *Veículo*, *Data/Hora* ou *Proteção*.");
             }
             break;
    }

    aistudio.chatbot_sessions[senderJid] = session;
    saveDb();
};


// --- STARTUP LOGIC ---
// Differentiate between development (Vite middleware) and production (standalone server)
const isViteDev = process.env.npm_lifecycle_script?.includes('vite');

if (isViteDev) {
    // DEVELOPMENT: Running as Vite middleware.
    console.log('[Vite Dev] Anexando servidor Express e iniciando WhatsApp...');
    startWhatsApp().catch(err => console.error("[Vite Dev Startup] Erro fatal ao iniciar o WhatsApp:", err));
} else {
    // PRODUCTION: Running as a standalone Node.js server.
    // Serve the built frontend files.
    // @ts-ignore
    app.use(express.static(DIST_DIR));
    
    // Explicitly handle 404s for common asset types to prevent index.html fallback errors (MIME type issues)
    app.get('*', (req, res, next) => {
        if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|json|map)$/)) {
            return res.status(404).end();
        }
        res.sendFile(path.join(DIST_DIR, 'index.html'));
    });

    // Start listening and then start WhatsApp.
    app.listen(port, () => {
        console.log(`[Server] Servidor HTTP rodando na porta ${port}`);
        startWhatsApp().catch(err => console.error("[Production Startup] Erro fatal ao iniciar o WhatsApp:", err));
    });
}
