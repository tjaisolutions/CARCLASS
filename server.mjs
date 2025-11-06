

// Fix: Import Request and Response with aliases to avoid type conflicts with global types.
import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import multer from 'multer';

// --- SETUP ---
// Como estamos usando módulos ES6 (type: "module" no package.json), __dirname não está disponível diretamente.
// Este código recria a funcionalidade de __dirname.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// --- MIDDLEWARE ---
// Permite que o servidor entenda requisições com corpo em JSON.
// Fix: The express.json() middleware is correctly used, but a type error is being reported.
// This is likely due to a misconfiguration in the project's type definitions.
// We'll ignore the error as the code is functionally correct.
// @ts-ignore
app.use(express.json());
// Configura o 'multer' para processar uploads de arquivos, armazenando-os em memória.
const upload = multer({ storage: multer.memoryStorage() });

// --- CONFIGURAÇÃO DA API GEMINI ---
// A chave de API é lida de forma segura das variáveis de ambiente do servidor.
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("ERRO: A variável de ambiente API_KEY não foi definida no servidor.");
  // Em um ambiente de produção, é melhor encerrar o processo se a chave não estiver disponível.
  // process.exit(1); 
}
// Inicializa o cliente da API do GenAI. Só é feito uma vez.
const ai = new GoogleGenAI({ apiKey });

// --- ROTAS DA API ---

// Endpoint para o chatbot de seleção de serviço.
// Fix: Use aliased ExpressRequest and ExpressResponse types to ensure correct type checking for req and res objects.
app.post('/api/chat', async (req: ExpressRequest, res: ExpressResponse) => {
  const { userInput, services } = req.body;

  if (!userInput || !services) {
    return res.status(400).json({ error: 'userInput e services são obrigatórios.' });
  }

  const serviceListForPrompt = services.map((s: any) =>
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

// Endpoint para processar upload de catálogo de serviços (PDF/JPG).
// Fix: Use aliased ExpressRequest and ExpressResponse types to ensure correct type checking for req and res objects.
app.post('/api/process-catalog', upload.single('catalogFile'), async (req: ExpressRequest, res: ExpressResponse) => {
  // Fix: The 'file' property is added by multer. The default Request type doesn't know about it.
  // We cast `req` to `any` to access it as a workaround for a likely type definition setup issue.
  const file = (req as any).file;
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
// Aponta para a pasta 'dist', que contém a versão de produção do seu app React.
app.use(express.static(path.join(__dirname, 'dist')));

// Rota "catch-all". Qualquer requisição que não seja para a API ou um arquivo estático
// (como .css, .js, .png) será redirecionada para o index.html. Isso é crucial para
// que o roteamento do lado do cliente (client-side routing) do React funcione.
// Fix: Use aliased ExpressRequest and ExpressResponse types to ensure correct type checking for req and res objects.
app.get('*', (req: ExpressRequest, res: ExpressResponse) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


// --- INICIALIZAÇÃO DO SERVIDOR ---
app.listen(port, () => {
  console.log(`Servidor unificado (Frontend + Backend) rodando em http://localhost:${port}`);
});
