// Fix: Removed TypeScript type imports as this file is run directly by Node.js.
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { GoogleGenAI, Type } from '@google/genai';
import multer from 'multer';
import qrcode from 'qrcode';
// Fix: Correctly import CommonJS module 'whatsapp-web.js' into an ES module.
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;

// --- SETUP ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const port = process.env.PORT || 3001;
let isWhatsappReady = false;

// --- WEBSOCKET BROADCASTING ---
const broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

wss.on('connection', (ws) => {
  console.log('Cliente WebSocket conectado ao servidor.');
  // Você pode enviar o status inicial ao cliente se desejar
  // ws.send(JSON.stringify({ type: 'status', data: isWhatsappReady ? 'connected' : 'disconnected' }));
});


// --- WHATSAPP CLIENT SETUP (NÃO OFICIAL) ---
console.log('Inicializando cliente WhatsApp...');
const client = new Client({
    authStrategy: new LocalAuth(), // Usa LocalAuth para salvar a sessão e evitar escanear sempre. ATENÇÃO: pode não ser persistente no Render.
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Necessário para rodar em ambientes como o Render
    },
});

client.on('qr', async (qr) => {
    console.log('QR Code Recebido! Gerando data URL para o frontend.');
    try {
        const qrDataUrl = await qrcode.toDataURL(qr);
        broadcast({ type: 'qr_code', data: qrDataUrl });
        isWhatsappReady = false;
    } catch (err) {
        console.error('Falha ao gerar QR code data URL:', err);
    }
});

client.on('ready', () => {
    console.log('Cliente WhatsApp está pronto e conectado!');
    isWhatsappReady = true;
    broadcast({ type: 'status', data: 'connected' });
});

client.on('message', async (message) => {
    console.log(`Mensagem recebida de ${message.from}: ${message.body}`);
    // A lógica do seu chatbot começaria aqui.
    broadcast({ type: 'message', data: { from: message.from, body: message.body, timestamp: message.timestamp, fromMe: message.fromMe } });
});

client.on('message_create', async (message) => {
    // Fired on all message creations, including your own
    if (message.fromMe) {
        console.log(`Mensagem enviada para ${message.to}: ${message.body}`);
        broadcast({ type: 'message', data: { to: message.to, body: message.body, timestamp: message.timestamp, fromMe: message.fromMe } });
    }
});

client.on('disconnected', (reason) => {
    console.log('Cliente WhatsApp foi desconectado!', reason);
    isWhatsappReady = false;
    broadcast({ type: 'status', data: 'disconnected' });
    // Tenta reinicializar para se reconectar
    client.initialize();
});

// Inicializa o cliente. Isso vai disparar o evento 'qr' se não estiver autenticado.
client.initialize().catch(err => console.error('Erro ao inicializar WhatsApp Client:', err));


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
    res.json({ isConnected: isWhatsappReady });
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
        // O formato do ID do chat no wweb.js é numero@c.us
        const sanitizedChatId = chatId.endsWith('@c.us') ? chatId : `${chatId}@c.us`;
        await client.sendMessage(sanitizedChatId, message);
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
server.listen(port, () => {
  console.log(`Servidor unificado (Frontend + Backend) rodando em http://localhost:${port}`);
});
