// Fix: Removed TypeScript type imports as this file is run directly by Node.js.
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import multer from 'multer';
import mongoose from 'mongoose';
import { EventEmitter } from 'events';
// Fix: Robust import for CommonJS module 'whatsapp-web.js' to prevent SyntaxError on deploy
import WhatsAppWeb from 'whatsapp-web.js';
const { Client, LocalAuth } = WhatsAppWeb;
import qrcodeTerminal from 'qrcode-terminal';
import qrcode from 'qrcode';
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
let whatsappClient = null;
const incomingMessages = []; // Fila para mensagens recebidas
let isInitializing = false; // Flag to prevent restart loops

const connectionStatus = {
  isConnected: false,
  qrCode: null,
  message: 'Serviço do WhatsApp não iniciado.',
};

const syncContacts = async (client) => {
    try {
        console.log('[WhatsApp] Sincronizando contatos...');
        const contacts = await client.getContacts();
        let newClientsCount = 0;
        for (const contact of contacts) {
            if (contact.isMyContact && contact.id.user) {
                const contactNumber = contact.id.user;
                const clientExists = aistudio.clients.some(c => c.whatsapp.includes(contactNumber));

                if (!clientExists) {
                    const newClient = {
                        id: `c${Date.now()}${Math.random().toString(16).slice(2)}`,
                        name: contact.name || contact.pushname || `Contato ${contactNumber}`,
                        whatsapp: contactNumber,
                        cpf: '',
                        cars: [],
                    };
                    aistudio.clients.push(newClient);
                    newClientsCount++;
                }
            }
        }
        if (newClientsCount > 0) {
            console.log(`[WhatsApp] ${newClientsCount} novo(s) cliente(s) adicionado(s) a partir dos contatos.`);
            saveDb();
        } else {
            console.log('[WhatsApp] Nenhum novo contato para sincronizar.');
        }
        connectionStatus.message = `Conectado! ${aistudio.clients.length} clientes no total.`;
    } catch (error) {
        console.error('[WhatsApp] Erro ao sincronizar contatos:', error.message);
    }
}

async function startWhatsAppBot() {
  if (isInitializing) {
    console.log('[WhatsApp] Inicialização já em andamento. Aguardando...');
    return;
  }
  isInitializing = true;
  console.log('[WhatsApp] Iniciando cliente com whatsapp-web.js...');
  connectionStatus.message = 'Iniciando o cliente...';
  connectionStatus.isConnected = false;
  connectionStatus.qrCode = null;

  try {
    whatsappClient = new Client({
      authStrategy: new LocalAuth({ clientId: WHATSAPP_SESSION_ID, dataPath: DATA_DIR }),
      puppeteer: {
        headless: 'new',
        executablePath: await chromium.executablePath(),
        args: [
            ...chromium.args,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process', 
            '--no-zygote',
            '--disable-extensions'
        ],
      },
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
      }
    });
    
    whatsappClient.on('qr', async (qr) => {
      console.log('[WhatsApp] QR Code recebido, gerando para o frontend.');
      try {
        const dataUrl = await qrcode.toDataURL(qr);
        connectionStatus.qrCode = dataUrl.replace('data:image/png;base64,', '');
        connectionStatus.message = 'Por favor, escaneie o QR Code.';
      } catch (err) {
        console.error('[QRCode] Erro ao gerar a imagem do QR Code:', err);
        connectionStatus.qrCode = null;
        connectionStatus.message = 'Erro ao gerar QR Code.';
      }
    });
    
    whatsappClient.on('ready', async () => {
      console.log('[WhatsApp] Cliente está pronto e conectado!');
      connectionStatus.isConnected = true;
      connectionStatus.qrCode = null;
      connectionStatus.message = 'Conectado com sucesso!';
      isInitializing = false; // Successfully initialized
      await syncContacts(whatsappClient);
    });
    
    whatsappClient.on('disconnected', (reason) => {
        console.log('[WhatsApp] Cliente foi desconectado:', reason);
        connectionStatus.isConnected = false;
        connectionStatus.message = 'Conexão perdida. Tentando reconectar automaticamente...';
        // A biblioteca tentará se reconectar sozinha. Não forçamos uma reinicialização aqui para evitar loops.
    });
    
    whatsappClient.on('auth_failure', (msg) => {
        console.error('[WhatsApp] FALHA DE AUTENTICAÇÃO', msg);
        connectionStatus.isConnected = false;
        connectionStatus.qrCode = null;
        connectionStatus.message = 'Falha na autenticação. É necessário escanear o QR Code novamente.';
        // Forçar reinicialização para obter um novo QR Code
        reconnect();
    });

    whatsappClient.on('message', (message) => {
        if (message.isStatus || message.from.endsWith('@g.us') || !message.body) {
            return;
        }
        console.log(`[WhatsApp] Mensagem recebida de ${message.from}: ${message.body}`);
        incomingMessages.push({
            from: message.from,
            body: message.body,
            timestamp: message.timestamp,
        });
    });

    await whatsappClient.initialize();

  } catch (error) {
    console.error('Erro CRÍTICO ao inicializar o cliente WhatsApp:', error.message);
    connectionStatus.isConnected = false;
    connectionStatus.qrCode = null;
    connectionStatus.message = `Erro na inicialização. Verifique os logs.`;
    isInitializing = false; // Allow re-initialization
    // Tentar reiniciar após um tempo em caso de falha crítica
    setTimeout(reconnect, 30000); 
  }
}

async function reconnect() {
    if (isInitializing) return;
    
    if (whatsappClient) {
        console.log("[WhatsApp] Tentando destruir cliente existente para reconectar...");
        try {
            await whatsappClient.destroy();
        } catch (e) {
            console.warn("[WhatsApp] Erro ao destruir cliente. Pode já estar destruído.", e.message);
        } finally {
            whatsappClient = null;
        }
    }
    startWhatsAppBot();
}


app.get('/api/whatsapp/status', (req, res) => {
    res.json(connectionStatus);
});

app.get('/api/whatsapp/messages', (req, res) => {
    res.json(incomingMessages);
    incomingMessages.length = 0; // Clear the queue after the frontend consumes it
});

app.post('/api/whatsapp/reconnect', async (req, res) => {
    connectionStatus.message = 'Reconectando manualmente...';
    reconnect();
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
        await whatsappClient.sendMessage(chatId, message);
        res.status(200).json({ success: true, message: 'Mensagem enviada.' });
    } catch (error) {
        console.error('Erro ao enviar mensagem via WhatsApp:', error);
        res.status(500).json({ error: 'Falha ao enviar mensagem.', details: error.message });
    }
});


// --- ROTA CATCH-ALL ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  console.log(`Diretório de dados: ${DATA_DIR}`);
  startWhatsAppBot();
});
