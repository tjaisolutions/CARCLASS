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
app.get('/api/whatsapp/status', (req, res) => {
    res.json(waConnectionStatus);
});

app.get('/api/whatsapp/events', (req, res) => {
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

app.get('/api/whatsapp/chats', (req, res) => {
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

app.get('/api/whatsapp/messages/:chatId', (req, res) => {
    const { chatId } = req.params;
    const messages = aistudio.wa_chats[chatId] || [];
    res.json(messages);
});

app.post('/api/whatsapp/send-message', async (req, res) => {
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
const handleBotLogic = async (senderJid, message, senderName) => {
    const session = aistudio.chatbot_sessions[senderJid] || { state: 'GREETING' };
    const normalizedMessage = normalizeText(message);

    const findClient = () => aistudio.clients.find(c => c.whatsapp === senderJid.split('@')[0]);
    
    // Helper to send bot messages and store them
    const sendBotMessage = async (text) => {
        await sendMessageWTyping(senderJid, text);
        if (!aistudio.wa_chats[senderJid]) aistudio.wa_chats[senderJid] = [];
        const messageToStore = {
            id: { fromMe: true, remote: senderJid },
            body: text,
            timestamp: Date.now() / 1000,
            isBot: true
        };
        aistudio.wa_chats[senderJid].push(messageToStore);
        waEvents.emit('event', { type: 'message', data: messageToStore, senderName });
    };

    switch (session.state) {
        case 'GREETING':
            let client = findClient();
            if (!client) {
                client = { id: `c${Date.now()}`, name: senderName, whatsapp: senderJid.split('@')[0], cpf: '', cars: [] };
                aistudio.clients.push(client);
                saveDb();
                 await sendBotMessage(`Olá, ${senderName}! Bem-vindo à CAR CLASS. Para agilizar, já salvei seu contato. Como posso ajudar hoje? Você pode pedir para "ver serviços" ou "agendar um serviço".`);
            } else {
                 await sendBotMessage(`Olá, ${client.name}! Que bom te ver de volta na CAR CLASS. Como posso te ajudar hoje?`);
            }
            session.state = 'AWAITING_COMMAND';
            break;
        
        case 'AWAITING_COMMAND':
            if (normalizedMessage.includes('agendar')) {
                const serviceList = aistudio.services.map(s => `- ${s.name}`).join('\n');
                await sendBotMessage(`Ótimo! Qual serviço você gostaria de agendar?\n\nNossos serviços:\n${serviceList}`);
                session.state = 'AWAITING_SERVICE_CHOICE';
            } else if (normalizedMessage.includes('ver servico')) {
                const serviceList = aistudio.services.map(s => `- ${s.name} (R$ ${s.price.toFixed(2)})`).join('\n');
                await sendBotMessage(`Claro! Aqui estão nossos serviços e preços:\n\n${serviceList}\n\nQuando quiser, é só pedir para "agendar um serviço".`);
                // Stays in AWAITING_COMMAND
            } else {
                await sendBotMessage('Desculpe, não entendi. Você pode pedir para "agendar um serviço" ou "ver serviços".');
            }
            break;
            
        case 'AWAITING_SERVICE_CHOICE':
            const chosenService = aistudio.services.find(s => normalizeText(s.name).includes(normalizedMessage));
            if (chosenService) {
                session.serviceId = chosenService.id;
                let client = findClient();
                if (client.cars && client.cars.length > 0) {
                     const carList = client.cars.map((c, i) => `${i + 1}. ${c.model} (${c.plate})`).join('\n');
                     await sendBotMessage(`Entendido. Agendando "${chosenService.name}". Para qual dos seus veículos?\n${carList}\nPor favor, digite o número correspondente.`);
                     session.state = 'AWAITING_CAR_CHOICE';
                } else {
                    await sendBotMessage(`Entendido. Agendando "${chosenService.name}". Qual o modelo e placa do veículo? (Ex: Honda Civic ABC-1234)`);
                    session.state = 'AWAITING_NEW_CAR';
                }
            } else {
                await sendBotMessage('Não encontrei este serviço. Por favor, digite o nome de um dos serviços da nossa lista.');
            }
            break;
        
         case 'AWAITING_CAR_CHOICE':
             let clientForCar = findClient();
             const carIndex = parseInt(message, 10) - 1;
             if (clientForCar && clientForCar.cars[carIndex]) {
                 session.carId = clientForCar.cars[carIndex].id;
                 await sendBotMessage(`Ótimo! Para qual dia e hora você gostaria de agendar? (Ex: amanhã às 10:00, ou 25/12 às 15:30)`);
                 session.state = 'AWAITING_DATETIME';
             } else {
                 await sendBotMessage('Opção inválida. Por favor, digite o número de um dos veículos da lista.');
             }
             break;
             
        case 'AWAITING_NEW_CAR':
            // Simple parsing for model and plate
            const parts = message.split(' ');
            const plate = parts.pop();
            const model = parts.join(' ');
            let clientForNewCar = findClient();
            const newCar = { id: `car${Date.now()}`, model, plate, protections: [] };
            clientForNewCar.cars.push(newCar);
            saveDb(); // Save the new car to the client
            session.carId = newCar.id;
            await sendBotMessage(`Veículo ${model} (${plate}) adicionado! Para qual dia e hora você gostaria de agendar?`);
            session.state = 'AWAITING_DATETIME';
            break;
            
        case 'AWAITING_DATETIME':
            // This is a placeholder for a real date/time parsing logic
            // For now, we'll just assume the user provides something reasonable
            session.dateTime = message; // e.g., "Amanhã 10:00"
            const service = aistudio.services.find(s => s.id === session.serviceId);
            const car = findClient().cars.find(c => c.id === session.carId);
            
            await sendBotMessage(`Perfeito! Por favor, confirme os detalhes do seu agendamento:\n\n- Serviço: ${service.name}\n- Veículo: ${car.model} (${car.plate})\n- Data/Hora: ${session.dateTime}\n\nEstá tudo correto? (sim/não)`);
            session.state = 'AWAITING_FINAL_CONFIRMATION';
            break;
            
        case 'AWAITING_FINAL_CONFIRMATION':
            if (normalizedMessage === 'sim') {
                 const newAppointment = {
                    id: `a${Date.now()}`,
                    clientId: findClient().id,
                    carId: session.carId,
                    serviceIds: [session.serviceId],
                    date: new Date().toISOString().split('T')[0], // Placeholder
                    time: session.dateTime.split(' ').pop(), // Placeholder
                    status: 'Agendado'
                };
                aistudio.appointments.push(newAppointment);
                saveDb();
                
                await sendBotMessage('Agendamento confirmado com sucesso! Obrigado por escolher a CAR CLASS.');
                
                // Notify frontend to update data
                waEvents.emit('event', { type: 'db_change' });
                
                delete aistudio.chatbot_sessions[senderJid]; // End session
            } else {
                await sendBotMessage('Ok, vamos recomeçar. O que você gostaria de fazer? (agendar/ver serviços)');
                session.state = 'AWAITING_COMMAND';
            }
            break;
    }

    aistudio.chatbot_sessions[senderJid] = session;
    saveDb();
};

// --- SERVE STATIC FRONTEND ---
// Must be after API routes
app.use(express.static(DIST_DIR));
app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
});


// --- START SERVER AND WHATSAPP ---
app.listen(port, () => {
    console.log(`[Server] Servidor HTTP rodando na porta ${port}`);
    console.log(`[Server] Acessível em http://localhost:${port}`);
    
    // Once the server is listening, start the WhatsApp connection process.
    // This allows the deployment to succeed even if WA is waiting for a QR scan.
    startWhatsApp().catch(err => console.error("[Startup] Erro fatal ao iniciar o WhatsApp:", err));
});
