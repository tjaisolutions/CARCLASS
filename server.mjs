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


const app = express();
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
    // NOVO: Armazenamento para o estado do WhatsApp
    wa_chats: {}, // Armazena chats: { [chatId]: { id, name, messages: [], state: 'GREETING', context: {} } }
});


const loadDb = () => {
    if (fs.existsSync(DB_FILE_PATH)) {
        try {
            console.log('[Persistence] Carregando dados do arquivo...');
            const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
            // Check for empty file to prevent crash
            if (data.trim() === '') {
                 console.warn('[Persistence] O arquivo de dados estava vazio. Iniciando com estado padrão.');
                 aistudio = getInitialState();
            } else {
                aistudio = { ...getInitialState(), ...JSON.parse(data) };
            }
        } catch (error) {
            console.error('[Persistence] ERRO CRÍTICO ao ler ou analisar db.json:', error);
            console.warn('[Persistence] O arquivo de dados pode estar corrompido.');
            
            // Backup the corrupted file
            const backupPath = path.join(DATA_DIR, `db.corrupted.${Date.now()}.json`);
            fs.copyFileSync(DB_FILE_PATH, backupPath);
            console.warn(`[Persistence] Backup do arquivo corrompido salvo em: ${backupPath}`);

            console.warn('[Persistence] Iniciando com estado padrão para evitar crash.');
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
        console.log('[Persistence] Salvando dados no arquivo...');
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
    aistudio = { ...aistudio, ...req.body };
    saveDb();
    res.status(200).json({ message: 'Dados salvos com sucesso!' });
});

// --- GEMINI API & SCHEMA (Para futuras expansões) ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


// --- WHATSAPP BOT (BAILEYS) ---
let sock = null;
const SESSION_DIR = path.join(DATA_DIR, 'whatsapp_session');
const waEvents = new EventEmitter();
waEvents.setMaxListeners(20); // Aumenta o limite de listeners para evitar warnings

const normalizeText = (text = '') => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Helper para enviar mensagens, salvar e notificar o frontend
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
        aistudio.wa_chats[chatId].messages.push(botMessageData);
        waEvents.emit('event', { type: 'message', senderName, data: botMessageData });
    } catch (error) {
        console.error(`[WhatsApp] Falha ao enviar mensagem para ${chatId}:`, error);
    }
}


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
            console.log('[WhatsApp] QR Code recebido, preparando para o frontend.');
            try {
                const dataUrl = await qrcode.toDataURL(qr);
                qrCodeData = dataUrl.replace('data:image/png;base64,', '');
            } catch (err) {
                console.error('[QRCode] Erro ao gerar a imagem do QR Code:', err);
            }
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`[WhatsApp] Conexão fechada: ${lastDisconnect.error}, reconectando: ${shouldReconnect}`);
            
            waEvents.emit('event', { 
                type: 'status_change', 
                data: { isConnected: false, message: 'Conexão perdida. Tentando reconectar...', qrCode: null } 
            });

            if (shouldReconnect) {
                connectToWhatsApp();
            } else {
                console.log('[WhatsApp] Desconectado permanentemente. Removendo sessão...');
                try {
                    if (fs.existsSync(SESSION_DIR)) {
                        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
                        console.log('[WhatsApp] Diretório da sessão removido com sucesso.');
                    }
                } catch (err) {
                    console.error('[WhatsApp] Erro ao remover pasta da sessão:', err);
                }
                connectToWhatsApp(); 
            }
        } else if (connection === 'open') {
            console.log('[WhatsApp] Conexão aberta com sucesso!');
            waEvents.emit('event', { 
                type: 'status_change', 
                data: { isConnected: true, message: 'Conectado com sucesso!', qrCode: null } 
            });
        } else if (qrCodeData) {
             waEvents.emit('event', {
                type: 'status_change',
                data: { isConnected: false, message: 'Por favor, escaneie o QR Code para conectar.', qrCode: qrCodeData }
            });
        }
    });
    
    // --- LÓGICA PRINCIPAL DO CHATBOT ---
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe || msg.key.remoteJid.endsWith('@g.us')) {
            return;
        }
        
        const chatId = msg.key.remoteJid;
        const userInput = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const senderName = msg.pushName || chatId.split('@')[0];
        
        console.log(`[WhatsApp] Mensagem de ${senderName} (${chatId}): ${userInput}`);
        
        // 1. Garante que o estado da conversa exista
        if (!aistudio.wa_chats[chatId]) {
            aistudio.wa_chats[chatId] = { id: chatId, name: senderName, messages: [], state: 'GREETING', context: {} };
        }
        const conversation = aistudio.wa_chats[chatId];
        conversation.name = senderName; // Atualiza o nome caso mude

        const userMessageData = {
            id: { fromMe: false, remote: chatId },
            body: userInput,
            timestamp: msg.messageTimestamp,
        };
        conversation.messages.push(userMessageData);
        waEvents.emit('event', { type: 'message', senderName, data: userMessageData });

        // 2. Máquina de estados para guiar a conversa
        switch (conversation.state) {
            case 'GREETING':
                await sendBotMessage(chatId, "Olá! Bem-vindo(a) ao assistente virtual da CAR CLASS. Você já é nosso cliente? Por favor, responda com 'Sim' ou 'Não'.", senderName);
                conversation.state = 'AWAITING_CUSTOMER_TYPE';
                break;

            case 'AWAITING_CUSTOMER_TYPE':
                const normalizedInput = normalizeText(userInput);
                if (normalizedInput === 'sim') {
                    await sendBotMessage(chatId, "Que bom te ver de volta! Para continuar, por favor, digite o seu CPF (apenas números).", senderName);
                    conversation.state = 'AWAITING_EXISTING_CUSTOMER_CPF';
                } else if (normalizedInput === 'nao' || normalizedInput === 'não') {
                    await sendBotMessage(chatId, "Seja bem-vindo(a)! Para começarmos seu cadastro, qual é o seu nome completo?", senderName);
                    conversation.state = 'AWAITING_NEW_CUSTOMER_NAME';
                } else {
                    await sendBotMessage(chatId, "Desculpe, não entendi. Por favor, responda apenas com 'Sim' ou 'Não'.", senderName);
                }
                break;

            case 'AWAITING_NEW_CUSTOMER_NAME':
                conversation.context.name = userInput;
                await sendBotMessage(chatId, `Obrigado, ${userInput}! Agora, por favor, digite seu CPF (apenas números).`, senderName);
                conversation.state = 'AWAITING_NEW_CUSTOMER_CPF';
                break;

            case 'AWAITING_NEW_CUSTOMER_CPF':
                conversation.context.cpf = userInput.replace(/\D/g, ''); // Limpa formatação
                const newClient = {
                    id: `c${Date.now()}`,
                    name: conversation.context.name,
                    cpf: conversation.context.cpf,
                    whatsapp: chatId.split('@')[0],
                    cars: [],
                };
                aistudio.clients.push(newClient);
                conversation.context.clientId = newClient.id;
                
                await sendBotMessage(chatId, `Cadastro realizado com sucesso, ${newClient.name}! Vamos agendar seu serviço.`, senderName);
                
                // Transição para o fluxo de agendamento
                const serviceList = aistudio.services.map(s => `- *${s.name}* (R$ ${s.price.toFixed(2)})`).join('\n');
                await sendBotMessage(chatId, `Aqui estão nossos serviços:\n\n${serviceList}\n\nQual serviço você gostaria de agendar? Você também pode optar por "Escolher no local".`, senderName);
                conversation.state = 'AWAITING_SERVICE_SELECTION';
                break;
            
            case 'AWAITING_EXISTING_CUSTOMER_CPF':
                const clientCpf = userInput.replace(/\D/g, '');
                const existingClient = aistudio.clients.find(c => c.cpf.replace(/\D/g, '') === clientCpf);

                if (existingClient) {
                    conversation.context.clientId = existingClient.id;
                    await sendBotMessage(chatId, `Olá, ${existingClient.name}! É um prazer atendê-lo(a) novamente.`, senderName);

                    const futureAppointments = aistudio.appointments.filter(app => 
                        app.clientId === existingClient.id && 
                        new Date(app.date) >= new Date() &&
                        app.status !== 'Finalizado'
                    );

                    if (futureAppointments.length > 0) {
                        const app = futureAppointments[0];
                        const serviceNames = app.serviceIds.map(id => aistudio.services.find(s => s.id === id)?.name || 'Serviço desconhecido').join(', ');
                        const date = new Date(app.date + 'T00:00:00').toLocaleDateString('pt-BR');
                        await sendBotMessage(chatId, `Verifiquei que você tem um agendamento para *${serviceNames}* no dia *${date} às ${app.time}*. Deseja agendar um novo serviço mesmo assim?`, senderName);
                        conversation.state = 'AWAITING_SERVICE_SELECTION'; // Simplificado para continuar o fluxo
                    } else {
                        const serviceList = aistudio.services.map(s => `- *${s.name}* (R$ ${s.price.toFixed(2)})`).join('\n');
                        await sendBotMessage(chatId, `Não encontrei agendamentos futuros em seu nome. Aqui estão nossos serviços:\n\n${serviceList}\n\nQual serviço você gostaria de agendar?`, senderName);
                        conversation.state = 'AWAITING_SERVICE_SELECTION';
                    }
                } else {
                    await sendBotMessage(chatId, "Não encontrei seu CPF em nosso sistema. Gostaria de fazer um novo cadastro? Por favor, responda com 'Sim' ou 'Não'.", senderName);
                    conversation.state = 'AWAITING_CUSTOMER_TYPE';
                }
                break;
            
            // Outros estados do fluxo de agendamento (AWAITING_SERVICE_SELECTION, etc.) seriam adicionados aqui.
            // Por enquanto, o fluxo termina aqui para garantir a entrega da lógica de identificação.

            default:
                await sendBotMessage(chatId, "Olá! Para reiniciar o atendimento, por favor, envie a palavra 'início'.", senderName);
                conversation.state = 'GREETING'; // Reseta a conversa
                break;
        }

        saveDb();
    });

}

// --- NOVO: SISTEMA DE EVENTOS E LONG-POLLING ---
app.get('/api/whatsapp/events', (req, res) => {
    const onEvent = (event) => {
        res.json(event);
    };

    waEvents.once('event', onEvent);
    
    req.on('close', () => {
        waEvents.removeListener('event', onEvent);
    });
});

app.get('/api/whatsapp/chats', async (req, res) => {
     try {
        const chatList = Object.values(aistudio.wa_chats).map(chat => {
            const lastMessage = chat.messages[chat.messages.length - 1] || { body: 'Nenhuma mensagem ainda', timestamp: 0 };
            return {
                id: chat.id,
                name: chat.name,
                lastMessage: {
                    body: lastMessage.body,
                    timestamp: lastMessage.timestamp,
                }
            };
        });
        res.json(chatList.sort((a,b) => b.lastMessage.timestamp - a.lastMessage.timestamp));
    } catch (error) {
        console.error('Erro ao buscar chats locais:', error);
        res.status(500).json({ error: 'Falha ao buscar chats' });
    }
});

app.get('/api/whatsapp/messages/:chatId', (req, res) => {
    const { chatId } = req.params;
    const chat = aistudio.wa_chats[chatId];
    if (chat) {
        res.json(chat.messages);
    } else {
        res.status(404).json([]);
    }
});


app.post('/api/whatsapp/send-message', async (req, res) => {
    const { chatId, message } = req.body;
    if (!sock || !sock.user) {
        return res.status(500).json({ error: 'Cliente WhatsApp não está conectado.' });
    }
    if (!chatId || !message) {
        return res.status(400).json({ error: 'chatId e message são obrigatórios.' });
    }

    try {
        await sock.sendMessage(chatId, { text: message });
        
        if (!aistudio.wa_chats[chatId]) {
            aistudio.wa_chats[chatId] = { id: chatId, name: chatId.split('@')[0], messages: [] };
        }
         const messageData = {
            id: { fromMe: true, remote: chatId },
            body: message,
            timestamp: Math.floor(Date.now() / 1000),
            isBot: false, // Mensagem manual do agente
        };
        aistudio.wa_chats[chatId].messages.push(messageData);
        saveDb();

        res.status(200).json({ success: true, message: 'Mensagem enviada.' });
    } catch (error) {
        console.error('Erro ao enviar mensagem via WhatsApp:', error);
        res.status(500).json({ error: 'Falha ao enviar mensagem.', details: error.message });
    }
});


// Servir arquivos estáticos da pasta 'dist' (build de produção)
app.use(express.static(path.join(__dirname, 'dist')));

// --- ROTA CATCH-ALL ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  console.log(`Diretório de dados: ${DATA_DIR}`);
  connectToWhatsApp();
});
