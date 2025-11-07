// Fix: Removed TypeScript type imports as this file is run directly by Node.js.
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import multer from 'multer';
import mongoose from 'mongoose';
import { EventEmitter } from 'events';
import wppconnect from '@wppconnect-team/wppconnect';
import chromium from '@sparticuz/chromium';


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
// Em um app real, isso seria um banco de dados como MongoDB ou PostgreSQL.
const DB_FILE_PATH = path.join(DATA_DIR, 'db.json');
let aistudio;

const loadDb = () => {
    if (fs.existsSync(DB_FILE_PATH)) {
        console.log('[Persistence] Carregando dados do arquivo...');
        const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        aistudio = JSON.parse(data);
    } else {
        console.log('[Persistence] Nenhum arquivo de dados encontrado, iniciando com estado padrão.');
        aistudio = {
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
            users: [{ id: 'user-owner', username: 'owner', password: '123', role: 'owner', permissions: {} }],
            conversationLogs: [],
            catalogFiles: [],
        };
    }
};

const saveDb = () => {
    console.log('[Persistence] Salvando dados no arquivo...');
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(aistudio, null, 2));
};

loadDb();


// --- MIDDLEWARE ---
app.use(express.json());
// Servir arquivos estáticos da pasta 'dist' (build de produção)
app.use(express.static(path.join(__dirname, 'dist')));


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


// --- WHATSAPP BOT ---
const WHATSAPP_SESSION_ID = 'CARCLASS-SESSION';
const connectionStatus = {
  isConnected: false,
  qrCode: null,
  message: 'Serviço do WhatsApp não iniciado.',
};
let whatsappClient = null;

// This function will be called to initialize the bot
async function startWhatsAppBot() {
  console.log('[WhatsApp] Iniciando cliente...');
  connectionStatus.message = 'Iniciando o cliente wppconnect...';
  connectionStatus.isConnected = false;
  connectionStatus.qrCode = null;

  try {
    whatsappClient = await wppconnect.create({
      session: WHATSAPP_SESSION_ID,
      catchQR: (base64Qr, asciiQR, attempts, urlCode) => {
        console.log('[WhatsApp] Novo QR Code gerado. Tentativa:', attempts);
        connectionStatus.qrCode = base64Qr; // Passa a imagem base64 diretamente para o front-end
        connectionStatus.message = 'Aguardando leitura do QR Code.';
      },
      statusFind: (statusSession, session) => {
        console.log(`[WhatsApp] Status da sessão: ${statusSession} (${session})`);
        connectionStatus.message = `Status da sessão: ${statusSession}`;
        if (statusSession === 'isLogged' || statusSession === 'qrReadSuccess' || statusSession === 'chatsAvailable') {
            connectionStatus.isConnected = true;
            connectionStatus.qrCode = null;
            connectionStatus.message = 'Cliente conectado com sucesso!';
        }
        if (statusSession === 'notLogged' || statusSession === 'deviceNotConnected' || statusSession === 'desconnectedMobile') {
            connectionStatus.isConnected = false;
        }
      },
      headless: 'new',
      puppeteerOptions: {
        executablePath: await chromium.executablePath(),
        args: [
            ...chromium.args,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ],
      },
      autoClose: 99999999,
      // Fix: Add deviceName for better session stability.
      deviceName: 'CARCLASS_SERVER',
    });

    console.log('[WhatsApp] Cliente criado com sucesso!');
    connectionStatus.isConnected = true;
    connectionStatus.message = 'Conectado ao WhatsApp.';

    whatsappClient.onMessage((message) => {
        console.log(`[WhatsApp] Mensagem recebida de ${message.from}: ${message.body}`);
        // Aqui você pode adicionar a lógica para emitir um evento para o front-end
        // ou processar a mensagem com o Gemini.
    });

  } catch (error) {
    console.error('Erro CRÍTICO ao criar cliente WhatsApp:', error.message);
    connectionStatus.isConnected = false;
    connectionStatus.qrCode = null;
    connectionStatus.message = `Erro: ${error.message}`;
    // Try to restart after a delay
    setTimeout(startWhatsAppBot, 30000);
  }
}

// Endpoint para verificar o status da conexão
app.get('/api/whatsapp/status', (req, res) => {
    res.json(connectionStatus);
});

// Endpoint para forçar a reconexão
app.post('/api/whatsapp/reconnect', async (req, res) => {
    if (whatsappClient) {
        try {
            await whatsappClient.close();
        } catch (e) {
            console.warn("Erro ao fechar cliente existente, pode já estar fechado.", e.message);
        }
    }
    whatsappClient = null;
    connectionStatus.isConnected = false;
    connectionStatus.message = 'Reconectando...';
    startWhatsAppBot(); // Inicia o processo novamente
    res.status(200).send({ message: 'Processo de reconexão iniciado.' });
});

app.post('/api/whatsapp/send-message', async (req, res) => {
    const { chatId, message } = req.body;
    if (!whatsappClient || !connectionStatus.isConnected) {
        return res.status(500).json({ error: 'Cliente WhatsApp não está conectado.' });
    }
    if (!chatId || !message) {
        return res.status(400).json({ error: 'chatId e message são obrigatórios.' });
    }

    try {
        await whatsappClient.sendText(chatId, message);
        res.status(200).json({ success: true, message: 'Mensagem enviada.' });
    } catch (error) {
        console.error('Erro ao enviar mensagem via WhatsApp:', error);
        res.status(500).json({ error: 'Falha ao enviar mensagem.', details: error.message });
    }
});


// --- ROTA CATCH-ALL ---
// Deve ser a última rota para não sobrescrever as rotas da API
// Serve o index.html da pasta 'dist' para o carregamento inicial da SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  console.log(`Diretório de dados: ${DATA_DIR}`);
  // Inicia o bot do WhatsApp após o servidor Express estar no ar
  startWhatsAppBot();
});
