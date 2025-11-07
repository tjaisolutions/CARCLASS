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

// --- GERENCIAMENTO DE ESTADO DO WHATSAPP ---
let whatsAppStatus = {
    isConnected: false,
    qrCode: null,
    message: 'Inicializando...'
};
const statusEmitter = new EventEmitter(); // Cria o notificador de status

let client; // Declarar o cliente no escopo superior

// --- MONGODB CONNECTION ---
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("ERRO: A variável de ambiente MONGO_URI não foi definida no servidor.");
    process.exit(1);
}

const handleReconnect = () => {
    console.log("Tentando reconectar...");
    if (client) {
        client.close().then(() => {
            console.log("Cliente antigo fechado. Reinicializando...");
            setTimeout(initializeWhatsApp, 2000);
        }).catch(e => {
            console.error("Erro ao fechar cliente, forçando nova inicialização.", e);
            initializeWhatsApp();
        });
    } else {
        initializeWhatsApp();
    }
};

const initializeWhatsApp = async () => {
    console.log('Inicializando cliente WhatsApp com @wppconnect...');
    
    try {
        const executablePath = await chromium.executablePath();
        console.log(`[Chromium] Usando executável em: ${executablePath || 'padrão'}`);

        const clientInstance = await wppconnect.create({
            session: 'CARCLASS-SESSION',
            deviceName: 'CARCLASS Server', // Ajuda na estabilidade da sessão
            catchQR: (base64Qr, asciiQR, attempts, urlCode) => {
                console.log('QR Code Recebido!');
                whatsAppStatus = { isConnected: false, qrCode: urlCode, message: 'Escaneie o QR Code' };
                statusEmitter.emit('statusChange');
            },
            statusFind: (statusSession, session) => {
                console.log('Status da Sessão:', statusSession);
                if (statusSession === 'inChat' || statusSession === 'isLogged') {
                    if (!whatsAppStatus.isConnected) {
                        console.log('Cliente WhatsApp está pronto e conectado!');
                        whatsAppStatus = { isConnected: true, qrCode: null, message: 'Conectado' };
                        statusEmitter.emit('statusChange');
                    }
                } else {
                     whatsAppStatus = { isConnected: false, qrCode: null, message: `Status: ${statusSession}` };
                     statusEmitter.emit('statusChange');
                }
            },
            puppeteerOptions: {
                executablePath: executablePath,
                headless: 'new',
                args: [
                    ...chromium.args,
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--single-process', // Executa o Chromium em um único processo para economizar memória
                    '--no-zygote',
                    '--disable-extensions',
                    '--disable-sync',
                ],
            },
            tokenStore: 'file',
            sessionDataPath: DATA_DIR,
            logQR: false,
            autoClose: 0,
        });
    
        client = clientInstance;
        startListeners(client);
    } catch (err) {
        console.error('Erro CRÍTICO ao criar cliente WhatsApp:', err.message);
        whatsAppStatus = { isConnected: false, qrCode: null, message: 'Erro na inicialização.' };
        statusEmitter.emit('statusChange');
    }
};

function startListeners(client) {
    client.onMessage(async (message) => {
        if (message.isGroupMsg || message.from === 'status@broadcast' || !message.body || message.fromMe) {
            return;
        }
        console.log(`Mensagem recebida de ${message.from}: ${message.body}`);
        if (message.body.toLowerCase() === 'oi') {
            await client.sendText(message.from, 'Olá! Bem-vindo à CAR CLASS. Como posso ajudar?');
        }
    });

    client.onStateChange((state) => {
        console.log('Estado do cliente mudou:', state);
        if (state === 'CONFLICT' || state === 'UNPAIRED' || state === 'UNPAIRED_IDLE') {
            console.log('Desconectado. Tentando reconectar automaticamente...');
            handleReconnect();
        }
    });
}


console.log('Conectando ao MongoDB...');
mongoose.connect(MONGO_URI).then(() => {
    console.log('MongoDB conectado com sucesso.');
}).catch(err => {
    console.error('Falha ao conectar ao MongoDB', err);
    process.exit(1);
});

// Inicializa o WhatsApp na inicialização do servidor
initializeWhatsApp();

// --- MIDDLEWARE ---
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

// --- CONFIGURAÇÃO DA API GEMINI ---
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("ERRO: A variável de ambiente API_KEY não foi definida no servidor.");
}
const ai = new GoogleGenAI({ apiKey });

// --- ROTAS DA API ---

app.get('/api/whatsapp/status', (req, res) => {
    if (whatsAppStatus.isConnected) {
        return res.json(whatsAppStatus);
    }
    const waitForStatusChange = () => {
        res.json(whatsAppStatus);
        clearTimeout(timeout);
    };
    const timeout = setTimeout(() => {
        statusEmitter.off('statusChange', waitForStatusChange);
        res.json(whatsAppStatus);
    }, 25000);
    statusEmitter.once('statusChange', waitForStatusChange);
});

app.post('/api/whatsapp/reconnect', (req, res) => {
    console.log("Recebida solicitação de reconexão do frontend.");
    res.status(202).json({ message: 'Tentativa de reconexão iniciada.' });
    handleReconnect();
});

app.post('/api/whatsapp/send-message', async (req, res) => {
    const { chatId, message } = req.body;
    if (!chatId || !message) {
        return res.status(400).json({ error: 'chatId e message são obrigatórios.' });
    }
    if (!whatsAppStatus.isConnected || !client) {
        return res.status(503).json({ error: 'Cliente WhatsApp não está pronto.' });
    }
    try {
        await client.sendText(chatId, message);
        res.status(200).json({ success: true });
    } catch (e) {
        console.error("Erro ao enviar mensagem manual:", e);
        res.status(500).json({ success: false, error: 'Falha ao enviar mensagem.' });
    }
});

app.post('/api/chat', async (req, res) => {
  const { userInput, services } = req.body;
  if (!userInput || !services) {
    return res.status(400).json({ error: 'userInput e services são obrigatórios.' });
  }
  const serviceListForPrompt = services.map((s) => `- ID: "${s.id}", Nome: "${s.name}", Preço: R$${s.price.toFixed(2)}, Descrição: "${s.description}"`).join('\n');
  const prompt = `Você é um assistente de agendamento para a estética automotiva CAR CLASS. O cliente recebeu um catálogo com serviços e respondeu. Sua tarefa é analisar a mensagem do cliente e a lista de serviços para decidir a ação.

Lista de Serviços:
${serviceListForPrompt}

Mensagem do Cliente: "${userInput}"

Com base na mensagem, responda APENAS com um objeto JSON válido com este formato:
{
  "action": "BOOK_SERVICE" | "ANSWER_QUESTION" | "CLARIFY",
  "serviceIds": ["id_do_servico_1", "id_do_servico_2"],
  "responseText": "Sua resposta para o cliente."
}

- Se o cliente claramente escolheu um ou mais serviços, use action "BOOK_SERVICE", inclua os serviceIds, e confirme em responseText.
- Se o cliente fez uma pergunta (preço, duração, etc), use action "ANSWER_QUESTION", responda em responseText e deixe serviceIds vazio.
- Se for ambíguo (ex: "lavagem", quando há duas), use action "CLARIFY", peça para esclarecer em responseText e deixe serviceIds vazio.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING },
            serviceIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            responseText: { type: Type.STRING }
          },
          required: ['action', 'responseText']
        }
      }
    });
    
    const result = JSON.parse(response.text);
    res.json(result);
  } catch (error) {
    console.error('Erro na API do Gemini (Chat):', error);
    res.status(500).json({ error: 'Falha ao se comunicar com a IA.' });
  }
});

app.post('/api/process-catalog', upload.single('catalogFile'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }
  const base64File = file.buffer.toString('base64');
  const isPdf = file.mimetype === 'application/pdf';
  const prompt = isPdf
      ? `Extraia todos os serviços do documento PDF. Para cada serviço, identifique o nome, descrição, duração em minutos, preço em BRL e, se houver, o intervalo de manutenção em meses. Retorne os dados em um array de objetos JSON, seguindo este schema. Campos numéricos devem ser apenas números.`
      : `Extraia todos os serviços da imagem do catálogo. Para cada serviço, identifique o nome, descrição, duração em minutos, preço em BRL e, se houver, o intervalo de manutenção em meses. Retorne os dados em um array de objetos JSON, seguindo este schema. Campos numéricos devem ser apenas números.`;
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { text: prompt },
                {
                    inlineData: {
                        mimeType: file.mimetype,
                        data: base64File,
                    },
                },
            ],
        },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        duration: { type: Type.NUMBER },
                        price: { type: Type.NUMBER },
                        maintenanceIntervalMonths: { type: Type.NUMBER },
                    },
                    required: ["name", "description", "duration", "price"]
                }
            }
        }
    });
    const extractedServices = JSON.parse(response.text);
    res.json(extractedServices);
  } catch(error) {
    console.error('Erro na API do Gemini (Catalog):', error);
    res.status(500).json({ error: 'Falha ao processar o arquivo com a IA.' });
  }
});

// --- SERVINDO O FRONTEND ---
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
app.listen(port, () => {
  console.log(`Servidor unificado (Frontend + Backend) rodando em http://localhost:${port}`);
});
