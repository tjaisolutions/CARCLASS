// Fix: Removed TypeScript type imports as this file is run directly by Node.js.
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import multer from 'multer';
import mongoose from 'mongoose';
import { EventEmitter } from 'events'; // Importa o EventEmitter

// Fix: Correctly import CommonJS module 'whatsapp-web.js' into an ES module.
import pkg from 'whatsapp-web.js';
const { Client, RemoteAuth } = pkg;

// Importar o MongoStore para RemoteAuth
import { MongoStore } from 'wwebjs-mongo';

// --- SETUP ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const initializeWhatsApp = () => {
    console.log('Inicializando cliente WhatsApp com RemoteAuth...');
    
    // Certifique-se de que a conexão mongoose está disponível
    const store = new MongoStore({ mongoose: mongoose });

    client = new Client({
        authStrategy: new RemoteAuth({
            store: store,
            backupSyncIntervalMs: 300000,
        }),
        puppeteer: {
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true, // Garante que rode em modo headless no servidor
        },
    });

    client.on('qr', (qr) => {
        console.log('QR Code Recebido!');
        whatsAppStatus = { isConnected: false, qrCode: qr, message: 'Escaneie o QR Code' };
        statusEmitter.emit('statusChange'); // Notifica que o status mudou
    });

    client.on('ready', () => {
        console.log('Cliente WhatsApp está pronto e conectado!');
        whatsAppStatus = { isConnected: true, qrCode: null, message: 'Conectado' };
        statusEmitter.emit('statusChange'); // Notifica que o status mudou
    });
    
    client.on('remote_session_saved', () => {
        console.log('Sessão remota salva no MongoDB.');
    });

    client.on('message', async (message) => {
        console.log(`Mensagem recebida de ${message.from}: ${message.body}`);
        if (message.body.toLowerCase() === 'oi') {
            await message.reply('Olá! Bem-vindo à CAR CLASS. Como posso ajudar?');
        }
    });

    client.on('disconnected', (reason) => {
        console.log('Cliente WhatsApp foi desconectado!', reason);
        whatsAppStatus = { isConnected: false, qrCode: null, message: 'Desconectado' };
        statusEmitter.emit('statusChange'); // Notifica que o status mudou
        // Tenta reinicializar para reconectar automaticamente
        console.log('Tentando reconectar...');
        client.initialize().catch(err => console.error('Erro ao RE-inicializar WhatsApp Client:', err));
    });

    client.initialize().catch(err => console.error('Erro ao inicializar WhatsApp Client:', err));
};

console.log('Conectando ao MongoDB...');
mongoose.connect(MONGO_URI).then(() => {
    console.log('MongoDB conectado com sucesso.');
    initializeWhatsApp(); // Inicializa o WhatsApp somente após conectar ao DB
}).catch(err => {
    console.error('Falha ao conectar ao MongoDB', err);
    process.exit(1);
});

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
    // Se já estiver conectado, responde imediatamente
    if (whatsAppStatus.isConnected) {
        return res.json(whatsAppStatus);
    }
    
    // Se não, espera por uma mudança de status por até 25 segundos
    const waitForStatusChange = () => {
        res.json(whatsAppStatus);
        clearTimeout(timeout);
    };

    const timeout = setTimeout(() => {
        statusEmitter.off('statusChange', waitForStatusChange);
        res.json(whatsAppStatus); // Responde com o status atual se o tempo esgotar
    }, 25000); // 25 segundos de timeout

    statusEmitter.once('statusChange', waitForStatusChange);
});

app.post('/api/whatsapp/reconnect', (req, res) => {
    if (client) {
        console.log("Recebida solicitação de reconexão do frontend.");
        whatsAppStatus = { isConnected: false, qrCode: null, message: 'Reconectando...' };
        res.status(202).json({ message: 'Tentativa de reconexão iniciada.' });
        client.initialize().catch(err => console.error('Erro ao re-inicializar via API:', err));
    } else {
        res.status(503).json({ error: 'Cliente não inicializado.' });
    }
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
        await client.sendMessage(chatId, message);
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

  const serviceListForPrompt = services.map((s) =>
    `- ID: "${s.id}", Nome: "${s.name}", Preço: R$${s.price.toFixed(2)}, Descrição: "${s.description}"`
  ).join('\n');

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
