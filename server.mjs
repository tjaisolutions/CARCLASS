import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import multer from 'multer';
import { makeWASocket, DisconnectReason, BufferJSON, initAuthCreds, proto } from '@whiskeysockets/baileys';
import { MongoClient } from 'mongodb';
import pino from 'pino';

// --- SETUP ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// --- MIDDLEWARE ---
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

// --- CONFIGURAÇÃO DA API GEMINI ---
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("ERRO: A variável de ambiente API_KEY não foi definida no servidor.");
}
const ai = new GoogleGenAI({ apiKey });

// --- CONFIGURAÇÃO MONGODB ---
// URI fornecida pelo usuário
const DEFAULT_MONGO_URI = "mongodb+srv://CARCLASS:carclass123@carclass.yobbg19.mongodb.net/?appName=CARCLASS";
const mongoUri = process.env.MONGODB_URI || DEFAULT_MONGO_URI;

let mongoClient;
let mongoCollection;

if (mongoUri) {
    try {
        mongoClient = new MongoClient(mongoUri);
        await mongoClient.connect();
        console.log("Conectado ao MongoDB com sucesso.");
        const db = mongoClient.db('carclass_whatsapp');
        mongoCollection = db.collection('auth_info');
    } catch (err) {
        console.error("Erro CRÍTICO ao conectar ao MongoDB:", err);
    }
} else {
    console.warn("ATENÇÃO: MONGODB_URI não definido. A sessão do WhatsApp não será persistida.");
}

// --- HELPER PARA AUTH STATE NO MONGODB ---
const useMongoDBAuthState = async (collection) => {
    const writeData = async (data, id) => {
        try {
            await collection.updateOne(
                { _id: id },
                { $set: { data: JSON.stringify(data, BufferJSON.replacer) } },
                { upsert: true }
            );
        } catch (err) {
            console.error(`Erro ao salvar auth data (${id}):`, err);
        }
    };

    const readData = async (id) => {
        try {
            const result = await collection.findOne({ _id: id });
            if (result && result.data) {
                return JSON.parse(result.data, BufferJSON.reviver);
            }
            return null;
        } catch (err) {
            console.error(`Erro ao ler auth data (${id}):`, err);
            return null;
        }
    };

    const removeData = async (id) => {
        try {
            await collection.deleteOne({ _id: id });
        } catch (err) {
             console.error(`Erro ao remover auth data (${id}):`, err);
        }
    };

    const creds = (await readData('creds')) || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(ids.map(async (id) => {
                        let value = await readData(`${type}-${id}`);
                        if (type === 'app-state-sync-key' && value) {
                            value = proto.Message.AppStateSyncKeyData.fromObject(value);
                        }
                        if (value) {
                            data[id] = value;
                        }
                    }));
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                tasks.push(writeData(value, key));
                            } else {
                                tasks.push(removeData(key));
                            }
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => {
            return writeData(creds, 'creds');
        }
    };
};


// --- GESTÃO DE SESSÃO WHATSAPP ---
let whatsappSession = {
    status: 'disconnected', // 'disconnected', 'loading' (scanning), 'connected'
    qrCode: null,
    sock: null
};

async function connectToWhatsApp() {
    let authState;

    if (mongoCollection) {
        console.log("Iniciando autenticação via MongoDB...");
        authState = await useMongoDBAuthState(mongoCollection);
    } else {
        console.log("Usando autenticação em memória (fallback).");
        const { useMultiFileAuthState } = await import('@whiskeysockets/baileys');
        authState = await useMultiFileAuthState('auth_info_local'); 
    }

    const { state, saveCreds } = authState;
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ["CarClass Mobile", "Chrome", "1.0.0"],
        connectTimeoutMs: 60000, 
    });

    whatsappSession.sock = sock;

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            whatsappSession.qrCode = qr;
            whatsappSession.status = 'loading';
            console.log("Novo QR Code gerado. Aguardando leitura...");
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexão fechada. Reconectar?', shouldReconnect);
            
            // Se foi logout (desconectou pelo celular), limpamos o banco
            if ((lastDisconnect?.error)?.output?.statusCode === DisconnectReason.loggedOut) {
                whatsappSession.status = 'disconnected';
                whatsappSession.qrCode = null;
                if (mongoCollection) {
                    mongoCollection.deleteMany({}); 
                    console.log("Sessão limpa do banco após logout.");
                }
            } else {
                // Se caiu a net, tenta reconectar
                 whatsappSession.status = 'disconnected'; 
            }

            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('Conexão WhatsApp ESTABELECIDA!');
            whatsappSession.status = 'connected';
            whatsappSession.qrCode = null;
        }
    });

    sock.ev.on('creds.update', saveCreds);
    
    // Monitoramento simples de mensagens para debug
    sock.ev.on('messages.upsert', async m => {
        if(m.type === 'notify') {
            // Aqui você pode implementar lógica futura para enviar mensagens reais para o frontend
            // Por enquanto, o frontend usa simulação lógica, mas a conexão é real.
            // console.log('Msg recebida:', m.messages[0]);
        }
    });
}

// Inicializa conexão se já tiver credenciais salvas
if (mongoCollection) {
    // Pequeno delay para garantir conexão com banco
    setTimeout(() => {
        connectToWhatsApp();
    }, 2000);
}


// --- ROTAS DA API WHATSAPP ---

// Endpoint para iniciar/reiniciar a sessão manualmente
app.post('/api/whatsapp/start', async (req, res) => {
    if (whatsappSession.status === 'connected') {
        return res.json({ status: 'connected', message: 'Já conectado' });
    }
    
    await connectToWhatsApp();
    res.json({ status: 'loading', message: 'Iniciando conexão...' });
});

// Endpoint para polling de status e QR Code
app.get('/api/whatsapp/status', (req, res) => {
    res.json({ 
        status: whatsappSession.status, 
        qrCode: whatsappSession.qrCode 
    });
});


// --- ROTAS DA API GEMINI ---
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
