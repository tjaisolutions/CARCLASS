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
                aistudio = JSON.parse(data);
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

// --- GEMINI API ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const serviceSelectionSchema = {
    type: Type.OBJECT,
    properties: {
        action: {
            type: Type.STRING,
            enum: ["REQUEST_MORE_INFO", "BOOK_SERVICE", "NO_ACTION"],
            description: "A ação a ser tomada. 'BOOK_SERVICE' se o usuário confirmou um ou mais serviços. 'REQUEST_MORE_INFO' se o usuário está perguntando sobre serviços, mas não confirmou qual. 'NO_ACTION' para saudações ou respostas não relacionadas a serviços."
        },
        serviceIds: {
            type: Type.ARRAY,
            items: {
                type: Type.STRING
            },
            description: "Um array de IDs de serviço que o usuário deseja agendar. O ID deve corresponder exatamente a um dos IDs fornecidos na lista de serviços."
        },
        responseText: {
            type: Type.STRING,
            description: "Uma resposta amigável para o usuário, informando a próxima etapa ou confirmando o entendimento."
        }
    },
    required: ["action", "responseText"]
};

app.post('/api/chat', async (req, res) => {
    const { userInput, services } = req.body;
    if (!userInput || !services) {
        return res.status(400).json({ error: 'Input do usuário e lista de serviços são obrigatórios.' });
    }

    const serviceList = services.map(s => `ID: ${s.id}, Nome: ${s.name}, Descrição: ${s.description}, Preço: R$${s.price}`).join('\n');

    const prompt = `
        Você é o chatbot de atendimento da estética automotiva "CAR CLASS".
        Seu objetivo é identificar qual(is) serviço(s) o cliente deseja agendar a partir da conversa.

        Lista de Serviços Disponíveis:
        ${serviceList}

        Analise a MENSAGEM DO USUÁRIO abaixo e determine a ação a ser tomada.
        - Se o usuário confirmar explicitamente um ou mais serviços para agendar, defina action como 'BOOK_SERVICE' e inclua os IDs dos serviços em 'serviceIds'.
        - Se o usuário fizer uma pergunta geral sobre os serviços ou não tiver certeza, defina action como 'REQUEST_MORE_INFO'.
        - Se a mensagem for uma saudação ou não estiver relacionada a serviços, defina action como 'NO_ACTION'.
        - A 'responseText' deve ser sempre amigável e útil. Se for agendar, confirme os serviços que entendeu. Se pedir mais informações, ofereça ajuda.

        MENSAGEM DO USUÁRIO: "${userInput}"
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
                responseSchema: serviceSelectionSchema,
            }
        });

        const jsonResponse = JSON.parse(response.text);
        res.json(jsonResponse);
    } catch (error) {
        console.error('Erro da API Gemini:', error);
        res.status(500).json({ error: 'Ocorreu um erro ao processar sua solicitação.' });
    }
});


// --- WHATSAPP BOT (BAILEYS) ---
let sock = null;
const SESSION_DIR = path.join(DATA_DIR, 'whatsapp_session');

const connectionStatus = {
  isConnected: false,
  qrCode: null,
  message: 'Serviço do WhatsApp não iniciado.',
};

const syncContacts = async (waSocket) => {
    // Baileys doesn't have a direct 'getContacts' method,
    // this function can be adapted if contact sync is needed later.
    console.log('[WhatsApp] Sincronização de contatos com Baileys pode ser implementada aqui se necessário.');
    connectionStatus.message = `Conectado! ${aistudio.clients.length} clientes no total.`;
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

        if (qr) {
            console.log('[WhatsApp] QR Code recebido, preparando para o frontend.');
            try {
                const dataUrl = await qrcode.toDataURL(qr);
                connectionStatus.isConnected = false;
                connectionStatus.qrCode = dataUrl.replace('data:image/png;base64,', '');
                connectionStatus.message = 'Por favor, escaneie o QR Code para conectar.';
            } catch (err) {
                console.error('[QRCode] Erro ao gerar a imagem do QR Code:', err);
                connectionStatus.qrCode = null;
                connectionStatus.message = 'Erro ao gerar QR Code.';
            }
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`[WhatsApp] Conexão fechada: ${lastDisconnect.error}, reconectando: ${shouldReconnect}`);
            connectionStatus.isConnected = false;

            if (shouldReconnect) {
                connectionStatus.message = 'Conexão perdida. Tentando reconectar...';
                connectToWhatsApp();
            } else {
                console.log('[WhatsApp] Desconectado permanentemente. Removendo sessão...');
                connectionStatus.message = 'Sessão encerrada. É necessário escanear o QR Code novamente.';
                try {
                    // FIX: Use synchronous directory removal to prevent race conditions.
                    if (fs.existsSync(SESSION_DIR)) {
                        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
                        console.log('[WhatsApp] Diretório da sessão removido com sucesso.');
                    }
                } catch (err) {
                    console.error('[WhatsApp] Erro ao remover pasta da sessão:', err);
                }
                // Restart the connection process to generate a new QR code.
                connectToWhatsApp(); 
            }
        } else if (connection === 'open') {
            console.log('[WhatsApp] Conexão aberta com sucesso!');
            connectionStatus.isConnected = true;
            connectionStatus.qrCode = null;
            connectionStatus.message = 'Conectado com sucesso!';
            await syncContacts(sock);
        }
    });
    
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe || msg.key.remoteJid.endsWith('@g.us')) {
            return;
        }
        
        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        
        console.log(`[WhatsApp] Mensagem de ${sender}: ${text}`);
        
        // TODO: Adicionar lógica do chatbot aqui
    });

}

app.get('/api/whatsapp/status', (req, res) => {
    res.json(connectionStatus);
});

app.get('/api/whatsapp/chats', async (req, res) => {
    if (!sock || !connectionStatus.isConnected) {
        return res.status(503).json([]);
    }
    try {
        // Baileys doesn't have a direct getChats method.
        // We will return the clients from our DB as a chat list.
        const chats = aistudio.clients.map(client => ({
             id: { _serialized: `${client.whatsapp}@c.us` },
             name: client.name || `Contato ${client.whatsapp}`,
             lastMessage: { body: 'Inicie uma conversa!' },
             timestamp: Date.now() / 1000,
        }));
        res.json(chats.sort((a,b) => b.timestamp - a.timestamp));
    } catch (error) {
        console.error('Error fetching chats from DB:', error);
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});


app.post('/api/whatsapp/send-message', async (req, res) => {
    const { chatId, message } = req.body;
    if (!sock || !connectionStatus.isConnected) {
        return res.status(500).json({ error: 'Cliente WhatsApp não está conectado.' });
    }
    if (!chatId || !message) {
        return res.status(400).json({ error: 'chatId e message são obrigatórios.' });
    }

    try {
        await sock.sendMessage(chatId, { text: message });
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
