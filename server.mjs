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
});


const loadDb = () => {
    if (fs.existsSync(DB_FILE_PATH)) {
        try {
            console.log('[Persistence] Carregando dados do arquivo...');
            const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
            if (data.trim() === '') {
                 console.warn('[Persistence] O arquivo de dados estava vazio. Iniciando com estado padrão.');
                 aistudio = getInitialState();
            } else {
                aistudio = { ...getInitialState(), ...JSON.parse(data) };
            }
        } catch (error) {
            console.error('[Persistence] ERRO CRÍTICO ao ler ou analisar db.json:', error);
            const backupPath = path.join(DATA_DIR, `db.corrupted.${Date.now()}.json`);
            fs.copyFileSync(DB_FILE_PATH, backupPath);
            console.warn(`[Persistence] Backup do arquivo corrompido salvo em: ${backupPath}`);
            aistudio = getInitialState();
        }
    } else {
        console.log('[Persistence] Nenhum arquivo de dados encontrado, iniciando com estado padrão.');
        aistudio = getInitialState();
    }
     if (!aistudio.wa_chats) {
        aistudio.wa_chats = {};
    }
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
app.get('/api/data', (req, res) => {
    res.json(aistudio);
});

app.post('/api/data', (req, res) => {
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
waEvents.setMaxListeners(20);

const normalizeText = (text = '') => text ? text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

async function sendBotMessage(chatId, text, senderName) {
    if (!sock) return;
    try {
        await sock.sendMessage(chatId, { text });
        const botMessageData = {
            id: { fromMe: true, remote: chatId },
            body: text,
            timestamp: Math.floor(Date.now() / 1000),
            isBot: true,
        };
        if (!aistudio.wa_chats[chatId]) {
            aistudio.wa_chats[chatId] = { id: chatId, name: senderName, messages: [], state: 'GREETING', context: {} };
        }
        aistudio.wa_chats[chatId].messages.push(botMessageData);
        waEvents.emit('event', { type: 'message', senderName, data: botMessageData });
    } catch (error) {
        console.error(`[WhatsApp] Falha ao enviar mensagem para ${chatId}:`, error);
    }
}

// --- Funções Auxiliares do Chatbot ---
const findClientByCpf = (cpf) => {
    const cleanedCpf = cpf.replace(/\D/g, '');
    return aistudio.clients.find(c => c.cpf.replace(/\D/g, '') === cleanedCpf);
};

const findAppointmentsByClientId = (clientId) => {
    return aistudio.appointments.filter(app => app.clientId === clientId && app.status !== 'Finalizado');
};

const getAvailableDateTimeSlots = () => {
    const { daysOpen, availableTimes } = aistudio.operatingHours;
    const slots = [];
    let currentDate = new Date();
    
    for(let i = 0; i < 14 && slots.length < 7; i++) { // Check next 14 days, find up to 7 with slots
        currentDate.setDate(new Date().getDate() + i);
        if (daysOpen.includes(currentDate.getDay())) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const bookedTimes = aistudio.appointments.filter(app => app.date === dateStr).map(app => app.time);
            const now = new Date();
            
            const freeTimes = availableTimes.filter(time => {
                if (bookedTimes.includes(time)) return false;
                if (dateStr === now.toISOString().split('T')[0]) {
                    const [hour, minute] = time.split(':');
                    const slotTime = new Date();
                    slotTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
                    return slotTime > now;
                }
                return true;
            });
            
            if (freeTimes.length > 0) {
                slots.push({
                    date: dateStr,
                    times: freeTimes
                });
            }
        }
    }
    return slots;
};

const generateDateTimeMessage = (slots) => {
    if (slots.length === 0) {
        return "Desculpe, não temos horários disponíveis nos próximos dias. Por favor, entre em contato diretamente para agendar.";
    }
    let message = "Aqui estão nossos horários disponíveis. Por favor, escolha um dia e um horário.\n\n";
    slots.forEach(slot => {
        const date = new Date(slot.date + 'T00:00:00');
        const dateStr = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
        message += `*${dateStr}*:\n${slot.times.join(', ')}\n\n`;
    });
    return message;
};

const cancelAppointment = (appointmentId) => {
    aistudio.appointments = aistudio.appointments.filter(app => app.id !== appointmentId);
};


async function connectToWhatsApp() {
    console.log('[WhatsApp] Iniciando conexão com Baileys...');
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`[WhatsApp] Usando WA v${version.join('.')}, é a mais recente: ${isLatest}`);

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['CAR CLASS', 'Chrome', '1.0.0'],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        let qrCodeData = null;

        if (qr) {
            try {
                qrCodeData = (await qrcode.toDataURL(qr)).replace('data:image/png;base64,', '');
            } catch (err) { console.error('[QRCode] Erro ao gerar a imagem do QR Code:', err); }
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            waEvents.emit('event', { type: 'status_change', data: { isConnected: false, message: 'Conexão perdida. Reconectando...', qrCode: null } });
            if (shouldReconnect) connectToWhatsApp();
            else { console.log('[WhatsApp] Desconectado permanentemente.'); connectToWhatsApp(); }
        } else if (connection === 'open') {
            waEvents.emit('event', { type: 'status_change', data: { isConnected: true, message: 'Conectado!', qrCode: null } });
        } else if (qrCodeData) {
             waEvents.emit('event', { type: 'status_change', data: { isConnected: false, message: 'Escaneie o QR Code.', qrCode: qrCodeData } });
        }
    });
    
    // --- LÓGICA PRINCIPAL DO CHATBOT ---
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe || msg.key.remoteJid.endsWith('@g.us')) return;
        
        const chatId = msg.key.remoteJid;
        const userInput = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const senderName = msg.pushName || chatId.split('@')[0];
        
        console.log(`[WhatsApp] Mensagem de ${senderName} (${chatId}): ${userInput}`);
        
        if (!aistudio.wa_chats[chatId]) {
            aistudio.wa_chats[chatId] = { id: chatId, name: senderName, messages: [], state: 'GREETING', context: {} };
        }
        const conversation = aistudio.wa_chats[chatId];
        conversation.name = senderName;

        const userMessageData = { id: { fromMe: false, remote: chatId }, body: userInput, timestamp: msg.messageTimestamp };
        conversation.messages.push(userMessageData);
        waEvents.emit('event', { type: 'message', senderName, data: userMessageData });

        // Reset command
        if (normalizeText(userInput) === 'inicio') {
            conversation.state = 'GREETING';
            conversation.context = {};
        }
        
        switch (conversation.state) {
            case 'GREETING':
                await sendBotMessage(chatId, "Olá! Bem-vindo(a) ao assistente virtual da CAR CLASS. Você já é nosso cliente? Por favor, responda com 'Sim' ou 'Não'.", senderName);
                conversation.state = 'AWAITING_CUSTOMER_TYPE';
                break;

            case 'AWAITING_CUSTOMER_TYPE':
                if (normalizeText(userInput).includes('sim')) {
                    await sendBotMessage(chatId, "Que bom te ver de volta! Para continuar, por favor, digite o seu CPF (apenas números ou com pontuação).", senderName);
                    conversation.state = 'AWAITING_CPF_ATTEMPT_1';
                } else if (normalizeText(userInput).includes('nao')) {
                    await sendBotMessage(chatId, "Seja bem-vindo(a)! Para começarmos seu cadastro, qual é o seu nome completo?", senderName);
                    conversation.state = 'AWAITING_NEW_CUSTOMER_NAME';
                } else {
                    await sendBotMessage(chatId, "Desculpe, não entendi. Por favor, responda apenas com 'Sim' ou 'Não'.", senderName);
                }
                break;
            
            case 'AWAITING_CPF_ATTEMPT_1':
            case 'AWAITING_CPF_ATTEMPT_2':
                const client = findClientByCpf(userInput);
                if (client) {
                    conversation.context.client = client;
                    await sendBotMessage(chatId, `Bem-vindo(a) de volta, ${client.name}! Cadastro encontrado.`, senderName);
                    const existingAppointments = findAppointmentsByClientId(client.id);
                    if (existingAppointments.length > 0) {
                        conversation.context.existingAppointment = existingAppointments[0];
                         const serviceName = aistudio.services.find(s => s.id === existingAppointments[0].serviceIds[0])?.name || 'Serviço';
                         const date = new Date(existingAppointments[0].date + 'T00:00:00').toLocaleDateString('pt-BR');
                         await sendBotMessage(chatId, `Vi que você já tem um agendamento para *${serviceName}* no dia *${date}* às *${existingAppointments[0].time}*. Você deseja:\n1. Prosseguir com um novo agendamento\n2. Alterar este agendamento\n3. Cancelar este agendamento`, senderName);
                         conversation.state = 'EXISTING_APPOINTMENT_ACTION';
                    } else {
                        await sendBotMessage(chatId, "Deseja ver nossa lista de serviços ou prefere escolher o serviço no local?", senderName);
                        conversation.state = 'AWAITING_SERVICE_CHOICE';
                    }
                } else {
                    if (conversation.state === 'AWAITING_CPF_ATTEMPT_1') {
                        await sendBotMessage(chatId, "Não encontrei seu CPF em nosso sistema. Por favor, digite novamente para confirmarmos.", senderName);
                        conversation.state = 'AWAITING_CPF_ATTEMPT_2';
                    } else {
                        await sendBotMessage(chatId, "Ainda não encontrei este CPF. Vamos realizar um novo cadastro para você. Qual é o seu nome completo?", senderName);
                        conversation.state = 'AWAITING_NEW_CUSTOMER_NAME';
                    }
                }
                break;

            case 'AWAITING_NEW_CUSTOMER_NAME':
                conversation.context.name = userInput;
                await sendBotMessage(chatId, `Obrigado, ${userInput}! Agora, por favor, digite seu CPF.`, senderName);
                conversation.state = 'AWAITING_NEW_CUSTOMER_CPF';
                break;
                
            case 'AWAITING_NEW_CUSTOMER_CPF':
                const newClient = {
                    id: `c${Date.now()}`, name: conversation.context.name,
                    cpf: userInput.replace(/\D/g, ''), whatsapp: chatId.split('@')[0], cars: []
                };
                aistudio.clients.push(newClient);
                conversation.context.client = newClient;
                await sendBotMessage(chatId, "Cadastro concluído com sucesso! Deseja ver nossa lista de serviços ou prefere escolher o serviço no local?", senderName);
                conversation.state = 'AWAITING_SERVICE_CHOICE';
                break;

            case 'EXISTING_APPOINTMENT_ACTION':
                const choice = normalizeText(userInput);
                if (choice.includes('prosseguir') || choice.includes('1')) {
                    await sendBotMessage(chatId, "Ok, vamos para o novo agendamento. Deseja ver a lista de serviços ou escolher no local?", senderName);
                    conversation.state = 'AWAITING_SERVICE_CHOICE';
                } else if (choice.includes('alterar') || choice.includes('2')) {
                    conversation.context.isAltering = true;
                    const slots = getAvailableDateTimeSlots();
                    await sendBotMessage(chatId, generateDateTimeMessage(slots), senderName);
                    conversation.context.availableSlots = slots;
                    conversation.state = 'AWAITING_DATETIME_SELECTION';
                } else if (choice.includes('cancelar') || choice.includes('3')) {
                    cancelAppointment(conversation.context.existingAppointment.id);
                    await sendBotMessage(chatId, "Seu agendamento foi cancelado com sucesso. O horário agora está disponível novamente.", senderName);
                    conversation.state = 'GREETING'; conversation.context = {};
                } else {
                    await sendBotMessage(chatId, "Opção inválida. Por favor, escolha 1, 2 ou 3.", senderName);
                }
                break;

            case 'AWAITING_SERVICE_CHOICE':
                if (normalizeText(userInput).includes('lista')) {
                    // Aqui seria o envio dos PDFs, por enquanto, envia a lista de texto
                    const serviceList = aistudio.services.map(s => `- *${s.name}*`).join('\n') || "Nenhum serviço cadastrado.";
                    await sendBotMessage(chatId, `Aqui estão nossos serviços:\n\n${serviceList}\n\nQual serviço você gostaria de agendar?`, senderName);
                    conversation.state = 'AWAITING_SERVICE_SELECTION_FROM_LIST';
                } else if (normalizeText(userInput).includes('local')) {
                    conversation.context.service = { id: 'local', name: 'A definir no local' };
                    const slots = getAvailableDateTimeSlots();
                    await sendBotMessage(chatId, generateDateTimeMessage(slots), senderName);
                    conversation.context.availableSlots = slots;
                    conversation.state = 'AWAITING_DATETIME_SELECTION';
                } else {
                    await sendBotMessage(chatId, "Não entendi. Deseja ver a 'lista' de serviços ou escolher 'no local'?", senderName);
                }
                break;

            case 'AWAITING_SERVICE_SELECTION_FROM_LIST':
                 const servicePrompt = `O usuário disse: "${userInput}". Qual dos seguintes serviços ele provavelmente quer? Serviços: [${aistudio.services.map(s => `"${s.name}"`).join(', ')}]. Responda em JSON com {"serviceName": "nome do serviço"} ou {"error": "not found"}.`;
                 const serviceResult = await runGemini(servicePrompt);
                 const foundService = aistudio.services.find(s => s.name === serviceResult.serviceName);
                 if (foundService) {
                     conversation.context.service = foundService;
                     const slots = getAvailableDateTimeSlots();
                     await sendBotMessage(chatId, `Ótima escolha! ${generateDateTimeMessage(slots)}`, senderName);
                     conversation.context.availableSlots = slots;
                     conversation.state = 'AWAITING_DATETIME_SELECTION';
                 } else {
                     await sendBotMessage(chatId, "Não encontrei este serviço. Poderia tentar digitar o nome novamente?", senderName);
                 }
                 break;

            case 'AWAITING_DATETIME_SELECTION':
                const dateTimePrompt = `O usuário disse: "${userInput}". Extraia a data e a hora. Os slots disponíveis são: ${JSON.stringify(conversation.context.availableSlots)}. Responda em JSON com {"date": "YYYY-MM-DD", "time": "HH:MM"} ou {"error": "not found"}. Hoje é ${new Date().toISOString().split('T')[0]}.`;
                const dtResult = await runGemini(dateTimePrompt);
                
                // Validação
                const isValidSlot = dtResult.date && dtResult.time && conversation.context.availableSlots.some(s => s.date === dtResult.date && s.times.includes(dtResult.time));

                if (isValidSlot) {
                    conversation.context.date = dtResult.date;
                    conversation.context.time = dtResult.time;
                    const clientCars = conversation.context.client.cars;
                    if (clientCars.length > 1) {
                        const carList = clientCars.map((car, i) => `${i + 1}. ${car.model} (${car.plate})`).join('\n');
                        await sendBotMessage(chatId, `Qual veículo será usado para o serviço?\n${carList}\n${clientCars.length + 1}. Adicionar um novo veículo`, senderName);
                        conversation.state = 'AWAITING_VEHICLE_SELECTION';
                    } else if (clientCars.length === 1) {
                         conversation.context.car = clientCars[0];
                         await sendBotMessage(chatId, `O serviço será no seu ${clientCars[0].model} (${clientCars[0].plate})? Responda 'Sim' ou 'Não' se for outro veículo.`, senderName);
                         conversation.state = 'CONFIRM_EXISTING_VEHICLE';
                    } else { // 0 carros
                        await sendBotMessage(chatId, "O veículo possui alguma proteção especial (ex: PPF, vitrificação)? Responda 'Sim' ou 'Não'.", senderName);
                        conversation.context.isNewVehicle = true;
                        conversation.state = 'AWAITING_PROTECTION_INFO';
                    }
                } else {
                    await sendBotMessage(chatId, "Não consegui entender o dia e horário ou a data não está disponível. Por favor, tente novamente (ex: 'terça às 10h').", senderName);
                }
                break;
            
            case 'AWAITING_VEHICLE_SELECTION':
                 const carIndex = parseInt(userInput, 10) - 1;
                 if (carIndex >= 0 && carIndex < conversation.context.client.cars.length) {
                     conversation.context.car = conversation.context.client.cars[carIndex];
                     await sendBotMessage(chatId, `Ok, selecionado: ${conversation.context.car.model}. Este veículo possui alguma proteção especial (ex: PPF)? 'Sim' ou 'Não'.`, senderName);
                     conversation.state = 'AWAITING_PROTECTION_INFO';
                 } else if (carIndex === conversation.context.client.cars.length) {
                     conversation.context.isNewVehicle = true;
                     await sendBotMessage(chatId, "Entendido. O novo veículo possui alguma proteção especial (ex: PPF)? 'Sim' ou 'Não'.", senderName);
                     conversation.state = 'AWAITING_PROTECTION_INFO';
                 } else {
                     await sendBotMessage(chatId, "Opção inválida. Por favor, digite o número correspondente.", senderName);
                 }
                 break;

            case 'CONFIRM_EXISTING_VEHICLE':
                if (normalizeText(userInput) === 'sim') {
                    await sendBotMessage(chatId, "Ok. O veículo possui alguma proteção especial (ex: PPF)? 'Sim' ou 'Não'.", senderName);
                    conversation.state = 'AWAITING_PROTECTION_INFO';
                } else {
                    conversation.context.isNewVehicle = true;
                    conversation.context.car = null;
                    await sendBotMessage(chatId, "Entendido. O novo veículo possui alguma proteção especial (ex: PPF)? 'Sim' ou 'Não'.", senderName);
                    conversation.state = 'AWAITING_PROTECTION_INFO';
                }
                break;

            case 'AWAITING_PROTECTION_INFO':
                if (normalizeText(userInput) === 'sim') {
                    await sendBotMessage(chatId, "Por favor, descreva qual é a proteção.", senderName);
                    conversation.state = 'AWAITING_PROTECTION_DETAILS';
                } else {
                    conversation.context.protections = 'Nenhuma';
                    if (conversation.context.isNewVehicle) {
                        await sendBotMessage(chatId, "Ok. Qual o modelo do veículo?", senderName);
                        conversation.state = 'AWAITING_NEW_VEHICLE_MODEL';
                    } else {
                        // Resumo
                        const summary = `*Resumo do Agendamento:*\n- Cliente: ${conversation.context.client.name}\n- Serviço: ${conversation.context.service.name}\n- Data: ${new Date(conversation.context.date + 'T00:00:00').toLocaleDateString('pt-BR')}\n- Hora: ${conversation.context.time}\n- Veículo: ${conversation.context.car.model} (${conversation.context.car.plate})\n- Proteções: Nenhuma\n\nPodemos *confirmar* ou deseja *alterar* algo?`;
                        await sendBotMessage(chatId, summary, senderName);
                        conversation.state = 'AWAITING_FINAL_CONFIRMATION';
                    }
                }
                break;
            
            case 'AWAITING_PROTECTION_DETAILS':
                conversation.context.protections = userInput;
                if (conversation.context.isNewVehicle) {
                    await sendBotMessage(chatId, "Anotado. Qual o modelo do veículo?", senderName);
                    conversation.state = 'AWAITING_NEW_VEHICLE_MODEL';
                } else {
                    // Atualiza o carro existente e vai para o resumo
                    const carIndex = conversation.context.client.cars.findIndex(c => c.id === conversation.context.car.id);
                    if(carIndex > -1) conversation.context.client.cars[carIndex].protections = [userInput];

                    const summary = `*Resumo do Agendamento:*\n- Cliente: ${conversation.context.client.name}\n- Serviço: ${conversation.context.service.name}\n- Data: ${new Date(conversation.context.date + 'T00:00:00').toLocaleDateString('pt-BR')}\n- Hora: ${conversation.context.time}\n- Veículo: ${conversation.context.car.model} (${conversation.context.car.plate})\n- Proteções: ${userInput}\n\nPodemos *confirmar* ou deseja *alterar* algo?`;
                    await sendBotMessage(chatId, summary, senderName);
                    conversation.state = 'AWAITING_FINAL_CONFIRMATION';
                }
                break;

            case 'AWAITING_NEW_VEHICLE_MODEL':
                conversation.context.newCarModel = userInput;
                await sendBotMessage(chatId, "Ok. E qual a placa do veículo?", senderName);
                conversation.state = 'AWAITING_NEW_VEHICLE_PLATE';
                break;
            
            case 'AWAITING_NEW_VEHICLE_PLATE':
                const newCar = {
                    id: `car${Date.now()}`,
                    model: conversation.context.newCarModel,
                    plate: userInput,
                    protections: conversation.context.protections === 'Nenhuma' ? [] : [conversation.context.protections]
                };
                conversation.context.client.cars.push(newCar);
                conversation.context.car = newCar;
                
                const summary = `*Resumo do Agendamento:*\n- Cliente: ${conversation.context.client.name}\n- Serviço: ${conversation.context.service.name}\n- Data: ${new Date(conversation.context.date + 'T00:00:00').toLocaleDateString('pt-BR')}\n- Hora: ${conversation.context.time}\n- Veículo: ${newCar.model} (${newCar.plate})\n- Proteções: ${conversation.context.protections}\n\nPodemos *confirmar* ou deseja *alterar* algo?`;
                await sendBotMessage(chatId, summary, senderName);
                conversation.state = 'AWAITING_FINAL_CONFIRMATION';
                break;
                
            case 'AWAITING_FINAL_CONFIRMATION':
                if (normalizeText(userInput).includes('confirmar')) {
                     if(conversation.context.isAltering) {
                        cancelAppointment(conversation.context.existingAppointment.id);
                     }
                     const newAppt = {
                         id: `a${Date.now()}`,
                         clientId: conversation.context.client.id,
                         carId: conversation.context.car.id,
                         serviceIds: conversation.context.service.id === 'local' ? [] : [conversation.context.service.id],
                         date: conversation.context.date,
                         time: conversation.context.time,
                         status: 'Agendado',
                     };
                     aistudio.appointments.push(newAppt);
                     await sendBotMessage(chatId, "Excelente! Seu agendamento foi confirmado com sucesso. Aguardamos você na CAR CLASS!", senderName);
                     conversation.state = 'GREETING'; conversation.context = {};
                } else if (normalizeText(userInput).includes('alterar')) {
                    await sendBotMessage(chatId, "O que você gostaria de alterar? (Serviço, Data/Hora, Veículo)", senderName);
                    conversation.state = 'AWAITING_CHANGE_REQUEST';
                } else {
                    await sendBotMessage(chatId, "Por favor, responda com 'confirmar' ou 'alterar'.", senderName);
                }
                break;

             case 'AWAITING_CHANGE_REQUEST':
                const changeInput = normalizeText(userInput);
                if (changeInput.includes('serviço')) {
                    await sendBotMessage(chatId, "Ok. Deseja ver a 'lista' de serviços ou escolher 'no local'?", senderName);
                    conversation.state = 'AWAITING_SERVICE_CHOICE';
                } else if (changeInput.includes('data') || changeInput.includes('hora')) {
                    const slots = getAvailableDateTimeSlots();
                    await sendBotMessage(chatId, generateDateTimeMessage(slots), senderName);
                    conversation.context.availableSlots = slots;
                    conversation.state = 'AWAITING_DATETIME_SELECTION';
                } else if (changeInput.includes('veiculo')) {
                     const clientCars = conversation.context.client.cars;
                     const carList = clientCars.map((car, i) => `${i + 1}. ${car.model} (${car.plate})`).join('\n');
                     await sendBotMessage(chatId, `Qual veículo será usado?\n${carList}\n${clientCars.length + 1}. Adicionar novo`, senderName);
                     conversation.state = 'AWAITING_VEHICLE_SELECTION';
                } else {
                    await sendBotMessage(chatId, "Não entendi o que deseja alterar. Por favor, diga se é 'serviço', 'data/hora' ou 'veículo'.", senderName);
                }
                break;

            default:
                await sendBotMessage(chatId, "Desculpe, não entendi. Se quiser recomeçar, digite 'início'.", senderName);
                break;
        }
        saveDb();
    });
}

// --- SISTEMA DE EVENTOS E LONG-POLLING ---
app.get('/api/whatsapp/events', (req, res) => {
    const onEvent = (event) => res.json(event);
    waEvents.once('event', onEvent);
    req.on('close', () => waEvents.removeListener('event', onEvent));
});

app.get('/api/whatsapp/chats', async (req, res) => {
     try {
        const chatList = Object.values(aistudio.wa_chats).map(chat => {
            const lastMessage = chat.messages[chat.messages.length - 1] || { body: '', timestamp: 0 };
            return { id: chat.id, name: chat.name, lastMessage: { body: lastMessage.body, timestamp: lastMessage.timestamp } };
        });
        res.json(chatList.sort((a,b) => b.lastMessage.timestamp - a.lastMessage.timestamp));
    } catch (error) {
        res.status(500).json({ error: 'Falha ao buscar chats' });
    }
});

app.get('/api/whatsapp/messages/:chatId', (req, res) => {
    const chat = aistudio.wa_chats[req.params.chatId];
    res.status(chat ? 200 : 404).json(chat ? chat.messages : []);
});

app.post('/api/whatsapp/send-message', async (req, res) => {
    const { chatId, message } = req.body;
    if (!sock || !sock.user) return res.status(500).json({ error: 'WhatsApp não conectado.' });
    if (!chatId || !message) return res.status(400).json({ error: 'chatId e message são obrigatórios.' });

    try {
        await sock.sendMessage(chatId, { text: message });
        if (!aistudio.wa_chats[chatId]) aistudio.wa_chats[chatId] = { id: chatId, name: chatId.split('@')[0], messages: [] };
        const msgData = { id: { fromMe: true, remote: chatId }, body: message, timestamp: Math.floor(Date.now() / 1000), isBot: false };
        aistudio.wa_chats[chatId].messages.push(msgData);
        saveDb();
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Falha ao enviar mensagem.', details: error.message });
    }
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
    const buildPath = path.join(__dirname, 'dist');
    if (fs.existsSync(buildPath)) {
        console.log(`[Server] Servindo arquivos estáticos de: ${buildPath}`);
        app.use(express.static(buildPath));
        app.get('*', (req, res) => res.sendFile(path.join(buildPath, 'index.html')));
    } else {
        console.warn(`[Server] Diretório 'dist' não encontrado. Execute 'npm run build'.`);
    }

    app.listen(port, () => {
      console.log(`Servidor rodando na porta ${port}`);
      connectToWhatsApp();
    });
}
