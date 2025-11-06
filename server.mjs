// Fix: Removed TypeScript type imports as this file is run directly by Node.js.
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import multer from 'multer';
import mongoose from 'mongoose';

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
let isWhatsappReady = false;
let currentQrCode = null; // Variável para armazenar o QR Code

// --- MONGODB CONNECTION ---
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("ERRO: A variável de ambiente MONGO_URI não foi definida no servidor.");
    process.exit(1); // Encerra se não houver conexão com o DB
}

console.log('Conectando ao MongoDB...');
mongoose.connect(MONGO_URI).then(() => {
    console.log('MongoDB conectado com sucesso.');
    
    const store = new MongoStore({ mongoose: mongoose });

    // --- WHATSAPP CLIENT SETUP (USANDO REMOTE AUTH) ---
    console.log('Inicializando cliente WhatsApp com RemoteAuth...');
    const client = new Client({
        authStrategy: new RemoteAuth({
            store: store,
            backupSyncIntervalMs: 300000, // Salva a sessão no DB a cada 5 minutos
        }),
        puppeteer: {
            args: ['--no-sandbox', '--disable-setuid-sandbox'], // Necessário para rodar em ambientes como o Render
        },
    });

    client.on('qr', (qr) => {
        console.log('QR Code Recebido! Escaneie no frontend do aplicativo.');
        currentQrCode = qr;
        isWhatsappReady = false;
    });

    client.on('ready', () => {
        console.log('Cliente WhatsApp está pronto e conectado!');
        isWhatsappReady = true;
        currentQrCode = null;
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
        isWhatsappReady = false;
        currentQrCode = null;
    });

    // Inicializa o cliente.
    client.initialize().catch(err => console.error('Erro ao inicializar WhatsApp Client:', err));

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
    res.json({ isConnected: isWhatsappReady, qrCode: currentQrCode });
});

app.post('/api/whatsapp/send-message', async (req, res) => {
    const { chatId, message } = req.body;
    if (!chatId || !message) {
        return res.status(400).json({ error: 'chatId e message são obrigatórios.' });
    }
    if (!isWhatsappReady) {
        return res.status(503).json({ error: 'Cliente WhatsApp não está pronto.' });
    }
    try {
        // Acessamos o client de dentro do escopo do mongoose.connect
        const wwebClient = mongoose.connection.client.wwebClient;
        await wwebClient.sendMessage(chatId, message);
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
