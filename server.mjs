
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import multer from 'multer';
import { EventEmitter } from 'events';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, jidNormalizedUser } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode';

// --- SETUP ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.RENDER_DISK_PATH || path.join(__dirname, 'data');
const DIST_DIR = path.join(__dirname, 'dist');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  console.log(`[Persistence] Criando diretório de dados em: ${DATA_DIR}`);
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  console.log(`[Persistence] Criando diretório de uploads em: ${UPLOADS_DIR}`);
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// --- DATA MANAGEMENT ---
const DB_FILE = path.join(DATA_DIR, 'db.json');

const defaultDb = {
  clients: [],
  appointments: [],
  services: [],
  monthlyPlans: [],
  clientPlanUsages: [],
  users: [],
  operatingHours: {
    daysOpen: [1, 2, 3, 4, 5, 6],
    availableTimes: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
  },
  automatedMessages: [],
  catalogFiles: [],
  conversationLogs: []
};

let db = { ...defaultDb };

// Load DB
if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    db = { ...defaultDb, ...JSON.parse(raw) };
    console.log('[Persistence] Banco de dados carregado.');
  } catch (err) {
    console.error('[Persistence] Erro ao carregar DB:', err);
  }
} else {
  // Create initial owner user if not exists
  db.users.push({
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
  });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

const saveDb = () => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    // Notify frontend immediately upon save
    notifyFrontendOfDbChange(); 
  } catch (err) {
    console.error('[Persistence] Erro ao salvar DB:', err);
  }
};

// --- EVENTS ---
const eventEmitter = new EventEmitter();
const NOTIFICATION_EVENT = 'notification';
const DB_CHANGE_EVENT = 'db_change';
const WA_STATUS_CHANGE = 'wa_status_change';
const WA_MESSAGE = 'wa_message';

const notifyFrontendOfDbChange = () => {
    eventEmitter.emit(DB_CHANGE_EVENT, db);
};

// --- EXPRESS APP ---
const app = express();
app.use(express.json());

// Serve static files from the React app (Vite build)
app.use(express.static(DIST_DIR));

// API Routes
app.get('/api/data', (req, res) => res.json(db));

app.post('/api/data', (req, res) => {
  const newData = req.body;
  // Merge logic
  if (newData.clients) db.clients = newData.clients;
  if (newData.appointments) db.appointments = newData.appointments;
  if (newData.services) db.services = newData.services;
  if (newData.monthlyPlans) db.monthlyPlans = newData.monthlyPlans;
  if (newData.users) db.users = newData.users;
  if (newData.operatingHours) db.operatingHours = newData.operatingHours;
  if (newData.automatedMessages) db.automatedMessages = newData.automatedMessages;
  
  saveDb();
  res.json({ success: true });
});

// Catalog Upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `catalog-${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

app.post('/api/upload-catalog', upload.array('catalogs'), async (req, res) => {
    try {
        const newFiles = req.files.map(f => ({
            id: path.parse(f.filename).name,
            file: { name: f.originalname, type: f.mimetype, path: f.filename }
        }));
        db.catalogFiles.push(...newFiles);
        
        // Mock processing: Add a dummy service based on file name
        // In production, use Gemini to parse PDF/Image
        req.files.forEach(f => {
             db.services.push({
                 id: `svc-${Date.now()}`,
                 name: `Serviço extraído de ${f.originalname}`,
                 description: 'Gerado automaticamente via upload de catálogo.',
                 duration: 60,
                 price: 100,
                 sourceFileId: path.parse(f.filename).name
             });
        });

        saveDb();
        res.json({ success: true, services: db.services, catalogFiles: db.catalogFiles });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Upload failed' });
    }
});

app.delete('/api/delete-catalog/:id', (req, res) => {
    const fileId = req.params.id;
    const fileIndex = db.catalogFiles.findIndex(f => f.id === fileId);
    if(fileIndex > -1) {
        const fileEntry = db.catalogFiles[fileIndex];
        try {
            fs.unlinkSync(path.join(UPLOADS_DIR, fileEntry.file.path));
        } catch(e) { console.error("Error deleting file from disk", e); }
        
        db.catalogFiles.splice(fileIndex, 1);
        // Remove associated services
        db.services = db.services.filter(s => s.sourceFileId !== fileId);
        
        saveDb();
        res.json({ success: true, services: db.services });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

// --- WHATSAPP LOGIC ---
let sock;
let qrCodeData = null;
let connectionStatus = 'disconnected';
let statusMessage = 'Iniciando...';
const sessions = new Map(); // Stores conversation state per chatId
const contactStore = new Map(); // Stores contact names: jid -> name

// Helper: Normalize JID
const getJid = (msg) => msg.key.remoteJid;

// Helper: Send text message
const sendText = async (jid, text) => {
    if (!sock) return;
    await sock.sendMessage(jid, { text });
    
    // Emit message to frontend for chat view
    const waMessage = {
        id: { fromMe: true, remote: jid },
        body: text,
        timestamp: Date.now() / 1000,
        isBot: true
    };
    eventEmitter.emit(WA_MESSAGE, waMessage, 'Bot');
};

// --- NLP HELPERS ---
const normalizeString = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const parseNaturalLanguageDate = (input) => {
    const text = normalizeString(input);
    const now = new Date();
    let targetDate = new Date();
    let targetHour = null;
    let targetMinute = 0;

    // Map weekdays
    const weekDays = {
        'domingo': 0, 'segunda': 1, 'terca': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sabado': 6
    };
    
    // Map number words
    const numberWords = {
        'uma': 1, 'um': 1, 'duas': 2, 'dois': 2, 'tres': 3, 'quatro': 4, 'cinco': 5, 
        'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10, 'onze': 11, 'doze': 12,
        'meio dia': 12, 'meia noite': 0
    };

    // 1. Detect Day
    let dayFound = false;
    for (const [dayName, dayIndex] of Object.entries(weekDays)) {
        if (text.includes(dayName)) {
            const currentDay = now.getDay();
            let daysUntil = dayIndex - currentDay;
            if (daysUntil <= 0) daysUntil += 7; // Next occurrence
            targetDate.setDate(now.getDate() + daysUntil);
            dayFound = true;
            break;
        }
    }
    
    // If no day specified, assume today if logic allows, or handle "amanhã"
    if (!dayFound) {
        if (text.includes('amanha')) {
            targetDate.setDate(now.getDate() + 1);
        } else if (text.includes('hoje')) {
            // targetDate stays today
        }
        // If neither, we might just be setting time for today (if future) or tomorrow
    }

    // 2. Detect Time
    // Regex for "HH:MM" or "HH hours" or "HH"
    const timeRegex = /(\d{1,2})(:(\d{2}))?\s*(h|horas|hrs)?/i;
    const match = text.match(timeRegex);
    
    if (match) {
        targetHour = parseInt(match[1]);
        if (match[3]) targetMinute = parseInt(match[3]);
    } else {
        // Try word numbers
        for (const [word, num] of Object.entries(numberWords)) {
            // Look for "as [word]" or just "[word] da tarde"
            if (text.includes(word)) {
                targetHour = num;
                break; // Take first found
            }
        }
    }

    // 3. Adjust for PM
    if (targetHour !== null) {
        if ((text.includes('tarde') || text.includes('noite')) && targetHour < 12 && targetHour !== 0) {
            targetHour += 12;
        }
        // Adjust "11 da manha" explicitly if needed (usually default)
        
        // Construct ISO String part
        const yyyy = targetDate.getFullYear();
        const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
        const dd = String(targetDate.getDate()).padStart(2, '0');
        
        const hh = String(targetHour).padStart(2, '0');
        const min = String(targetMinute).padStart(2, '0');
        
        return {
            date: `${yyyy}-${mm}-${dd}`,
            time: `${hh}:${min}`,
            formatted: `${dd}/${mm}/${yyyy} às ${hh}:${min}`
        };
    }

    return null;
};

// --- CHATBOT STATE MACHINE ---
const handleBotLogic = async (msg) => {
    const remoteJid = getJid(msg);
    if (!remoteJid || msg.key.fromMe) return;

    // Extract text content
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
    if (!text) return;
    
    // Check if Human Support is active for this SPECIFIC chat
    let session = sessions.get(remoteJid);
    
    // Retrieve Contact Name (Priority: Address Book > PushName > ID)
    let contactName = contactStore.get(remoteJid) || msg.pushName || remoteJid.split('@')[0];

    // Initialize session if new
    if (!session) {
        session = { state: 'START', tempData: { name: contactName } };
        sessions.set(remoteJid, session);
    }
    
    // *** HUMAN SUPPORT CHECK ***
    // If this specific user is in human support mode, the bot does NOTHING.
    if (session.state === 'HUMAN_SUPPORT') {
        return; 
    }

    // --- STATE HANDLERS ---

    // 1. START
    if (session.state === 'START') {
        const welcomeMsg = `Olá, ${contactName}! Bem-vindo à *CAR CLASS*.
Eu sou o assistente virtual. Como posso ajudar?

1. Agendar Serviço
2. Meus Agendamentos
3. Ver Serviços e Preços
4. Tirar Dúvidas (Falar com Atendente)

_Responda com o número da opção._`;
        await sendText(remoteJid, welcomeMsg);
        session.state = 'MENU_SELECTION';
        
        // Notification: Cliente entrou em contato
        eventEmitter.emit(NOTIFICATION_EVENT, `Cliente ${contactName} entrou em contato.`);
        return;
    }

    // 2. MENU SELECTION
    if (session.state === 'MENU_SELECTION') {
        if (text.includes('1')) {
            await sendText(remoteJid, "Ótimo! Para começarmos o agendamento, por favor, digite seu *Nome Completo* (apenas letras).");
            session.state = 'COLLECTING_NAME';
        } else if (text.includes('2')) {
            // Simple lookup by phone number logic
            const client = db.clients.find(c => c.whatsapp.replace(/\D/g, '') === remoteJid.replace(/\D/g, ''));
            if (client) {
                const apps = db.appointments.filter(a => a.clientId === client.id && a.status === 'Agendado');
                if (apps.length > 0) {
                    const appList = apps.map(a => `${a.date.split('-').reverse().join('/')} às ${a.time}`).join('\n');
                    await sendText(remoteJid, `Seus agendamentos futuros:\n${appList}`);
                } else {
                    await sendText(remoteJid, "Você não tem agendamentos futuros.");
                }
            } else {
                await sendText(remoteJid, "Não encontrei cadastro com este número.");
            }
            session.state = 'START';
        } else if (text.includes('3')) {
            if (db.services.length === 0) {
                await sendText(remoteJid, "No momento não temos serviços cadastrados no sistema.");
            } else {
                const serviceList = db.services.map(s => `*${s.name}* - R$ ${s.price.toFixed(2)} (${s.duration} min)`).join('\n');
                await sendText(remoteJid, `Nossos Serviços:\n\n${serviceList}\n\nSe desejar agendar, digite 'Voltar' e escolha a opção 1.`);
                
                // Send Catalogs if available
                if (db.catalogFiles.length > 0) {
                    await sendText(remoteJid, "Estou enviando nosso catálogo em PDF/Imagem...");
                    // Logic to send files would go here
                }
            }
            session.state = 'START'; // Reset to start or let them navigate back
        } else if (text.includes('4') || text.toLowerCase().includes('duvida')) {
            await sendText(remoteJid, "Entendido. Estou transferindo seu atendimento para um humano. Aguarde um momento que o dono irá responder nesta mesma conversa.");
            session.state = 'HUMAN_SUPPORT';
            
            // Notification: Cliente quer tirar dúvida
            const notifMsg = `Cliente ${contactName} quer tirar dúvida.`;
            eventEmitter.emit(NOTIFICATION_EVENT, notifMsg);
            
            // *** SELF-NOTIFICATION (WhatsApp) ***
            try {
                // Get the bot's own JID (the connected number)
                const botId = jidNormalizedUser(sock.user.id);
                // Send message to self
                await sock.sendMessage(botId, { text: `🔔 *ALERTA DO SISTEMA*\n\nO cliente *${contactName}* (${remoteJid.split('@')[0]}) solicitou atendimento humano para tirar dúvidas.\n\nAcesse a aba 'WhatsApp' > 'Suporte Humano' no painel para responder.` });
            } catch (err) {
                console.error("Failed to send self-notification", err);
            }

        } else {
            await sendText(remoteJid, "Opção inválida. Digite 1, 2, 3 ou 4.");
        }
        return;
    }

    // 3. COLLECTING NAME (Strict Validation, Allows accents and unaccented)
    if (session.state === 'COLLECTING_NAME') {
        const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/;
        if (!nameRegex.test(text.trim())) {
            await sendText(remoteJid, "Por favor, digite um nome válido contendo *apenas letras* (pode ser com ou sem acento).");
            return;
        }
        session.tempData.name = text.trim();
        await sendText(remoteJid, "Obrigado. Agora, digite seu *CPF* (apenas os 11 números, ex: 12345678901):");
        session.state = 'COLLECTING_CPF';
        return;
    }

    // 4. COLLECTING CPF (Strict Validation)
    if (session.state === 'COLLECTING_CPF') {
        const cleanCpf = text.replace(/\D/g, '');
        if (cleanCpf.length !== 11) {
            await sendText(remoteJid, "CPF inválido. Por favor, digite exatamente *11 números*.");
            return;
        }
        session.tempData.cpf = cleanCpf;
        
        // List Services
        let msg = "Escolha o serviço (digite o número):\n";
        db.services.forEach((s, i) => msg += `${i + 1}. ${s.name} (R$ ${s.price})\n`);
        await sendText(remoteJid, msg);
        session.state = 'SELECTING_SERVICE';
        return;
    }

    // 5. SELECTING SERVICE
    if (session.state === 'SELECTING_SERVICE') {
        const choice = parseInt(text) - 1;
        if (isNaN(choice) || choice < 0 || choice >= db.services.length) {
            await sendText(remoteJid, "Opção inválida. Tente novamente.");
            return;
        }
        session.tempData.serviceId = db.services[choice].id;
        session.tempData.serviceName = db.services[choice].name;
        
        await sendText(remoteJid, "Para quando você gostaria de agendar? \n(Ex: 'Terca as 9', 'Amanhã as 14h', '15/10 as 10:00')");
        session.state = 'SELECTING_TIME';
        return;
    }

    // 6. SELECTING TIME (NLP)
    if (session.state === 'SELECTING_TIME') {
        // Use the NLP helper
        const parsedData = parseNaturalLanguageDate(text);
        
        if (!parsedData) {
            await sendText(remoteJid, "Não consegui entender o horário. Tente algo como 'Terça as 9 da manhã' ou 'Amanhã as 15h'.");
            return;
        }

        session.tempData.date = parsedData.date;
        session.tempData.time = parsedData.time;
        
        // Check availability (Mock logic: just check if slot matches existing appointment)
        const isTaken = db.appointments.some(a => a.date === parsedData.date && a.time === parsedData.time && a.status !== 'Finalizado');
        
        if (isTaken) {
             await sendText(remoteJid, `O horário ${parsedData.formatted} já está ocupado. Por favor, escolha outro.`);
             return;
        }

        // Summary
        // Show the name they typed in the confirmation message
        const summary = `Confirma o agendamento?\n\n` +
                        `Cliente: ${session.tempData.name}\n` +
                        `Serviço: ${session.tempData.serviceName}\n` +
                        `Data/Hora: ${parsedData.formatted}\n\n` +
                        `Digite *Sim* para confirmar ou *Cancelar* para desistir.`;
        await sendText(remoteJid, summary);
        session.state = 'CONFIRMING_APPOINTMENT';
        return;
    }

    // 7. CONFIRMING
    if (session.state === 'CONFIRMING_APPOINTMENT') {
        if (text.toLowerCase() === 'sim') {
            // USER REQUEST: Use the name the CLIENT typed (session.tempData.name) for Registration/DB.
            // Do NOT overwrite it with the WhatsApp Agenda name.
            const nameToRegister = session.tempData.name;

            // Create Client if not exists
            let client = db.clients.find(c => c.cpf === session.tempData.cpf);
            if (!client) {
                client = {
                    id: `c-${Date.now()}`,
                    name: nameToRegister, // Strict use of typed name
                    cpf: session.tempData.cpf,
                    whatsapp: remoteJid.replace('@s.whatsapp.net', ''),
                    cars: [],
                };
                db.clients.push(client);
            } else {
                // Update the name to what they typed this time
                client.name = nameToRegister;
            }

            // Create Appointment
            const appointment = {
                id: `appt-${Date.now()}`,
                clientId: client.id,
                carId: client.cars.length > 0 ? client.cars[0].id : 'temp-car', // Simplification
                serviceIds: [session.tempData.serviceId],
                date: session.tempData.date,
                time: session.tempData.time,
                status: 'Agendado'
            };
            db.appointments.push(appointment);
            saveDb(); // Triggers instant update on frontend via SSE

            // Notification: Cliente agendou (using registered name)
            const formattedDate = appointment.date.split('-').reverse().join('/');
            eventEmitter.emit(NOTIFICATION_EVENT, `Cliente ${client.name} agendou para ${formattedDate} às ${appointment.time}.`);

            await sendText(remoteJid, "Agendamento confirmado com sucesso! Obrigado pela preferência.");
            
            // Ask final question (Loop back to start or human support?)
            await sendText(remoteJid, "Deseja algo mais?\n1. Voltar ao Menu\n2. Tirar Dúvidas (Falar com Humano)");
            session.state = 'FINAL_DECISION';

        } else {
            await sendText(remoteJid, "Agendamento cancelado. Digite 'Oi' para recomeçar.");
            session.state = 'START';
        }
        return;
    }
    
    // 8. FINAL DECISION
    if (session.state === 'FINAL_DECISION') {
        const currentName = contactStore.get(remoteJid) || session.tempData.name;

        if (text.includes('2') || text.toLowerCase().includes('duvida')) {
             await sendText(remoteJid, "OK. Um atendente humano irá assumir esta conversa em breve.");
             session.state = 'HUMAN_SUPPORT';
             
             // Notification & Self-message
             const notifMsg = `Cliente ${currentName} quer tirar dúvida (após agendamento).`;
             eventEmitter.emit(NOTIFICATION_EVENT, notifMsg);
             
             try {
                const botId = jidNormalizedUser(sock.user.id);
                await sock.sendMessage(botId, { text: `🔔 *ALERTA DO SISTEMA*\n\nO cliente *${currentName}* solicitou suporte humano após finalizar um fluxo.` });
            } catch (err) {}

        } else {
            // Reset to start
            session.state = 'START';
            await sendText(remoteJid, "Certo. Digite 'Oi' quando precisar.");
        }
    }
};

const connectToWhatsApp = async () => {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(DATA_DIR, 'auth_info_baileys'));
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ["CarClass Admin", "Chrome", "1.0.0"],
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrcode.toDataURL(qr, (err, url) => {
                qrCodeData = url;
                connectionStatus = 'disconnected';
                statusMessage = 'Aguardando leitura do QR Code';
                // Emit status to frontend
                eventEmitter.emit(WA_STATUS_CHANGE, { isConnected: false, message: statusMessage, qrCode: qrCodeData });
            });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexão fechada. Reconectando...', shouldReconnect);
            connectionStatus = 'disconnected';
            statusMessage = 'Desconectado. Tentando reconectar...';
            eventEmitter.emit(WA_STATUS_CHANGE, { isConnected: false, message: statusMessage, qrCode: null });
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('WhatsApp conectado!');
            connectionStatus = 'connected';
            statusMessage = 'Conectado';
            qrCodeData = null;
            eventEmitter.emit(WA_STATUS_CHANGE, { isConnected: true, message: statusMessage, qrCode: null });
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Sync Contacts to get real names (Address Book)
    sock.ev.on('contacts.upsert', (contacts) => {
        for (const contact of contacts) {
            if (contact.name) {
                // This is the name saved in the address book (Agenda)
                contactStore.set(contact.id, contact.name);
            } else if (contact.notify && !contactStore.has(contact.id)) {
                // Fallback to pushName only if we don't have a real name
                contactStore.set(contact.id, contact.notify);
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'notify') {
            for (const msg of messages) {
                if (!msg.key.fromMe) {
                    const remoteJid = getJid(msg);
                    const pushName = msg.pushName;
                    
                    // If we have a pushname and not in store, store it as fallback
                    if (pushName && !contactStore.has(remoteJid)) {
                        contactStore.set(remoteJid, pushName);
                    }

                    // Strict priority: Address Book > Push Name > ID
                    const senderName = contactStore.get(remoteJid) || pushName || remoteJid.split('@')[0];

                    // Emit to Frontend Chat Interface
                    const textBody = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
                    const waMessage = {
                        id: msg.key,
                        body: textBody,
                        timestamp: msg.messageTimestamp,
                        isBot: false,
                        senderName: senderName
                    };
                    eventEmitter.emit(WA_MESSAGE, waMessage, senderName);

                    // Bot Logic
                    await handleBotLogic(msg);
                }
            }
        }
    });
};

// Start WhatsApp
connectToWhatsApp();


// --- WA API ROUTES ---
app.get('/api/whatsapp/status', (req, res) => {
    res.json({ isConnected: connectionStatus === 'connected', message: statusMessage, qrCode: qrCodeData });
});

app.get('/api/whatsapp/chats', async (req, res) => {
    const chatList = [];
    for (const [jid, session] of sessions.entries()) {
        const contactName = contactStore.get(jid) || jid.split('@')[0];
        chatList.push({
            id: jid,
            name: contactName,
            isHumanSupport: session.state === 'HUMAN_SUPPORT',
            lastMessage: { body: 'Conversa ativa', timestamp: Date.now() / 1000 } 
        });
    }
    res.json(chatList);
});

app.get('/api/whatsapp/messages/:chatId', (req, res) => {
    res.json([]);
});

app.post('/api/whatsapp/send-message', async (req, res) => {
    const { chatId, message } = req.body;
    if (sock && connectionStatus === 'connected') {
        await sock.sendMessage(chatId, { text: message });
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'WhatsApp not connected' });
    }
});

app.post('/api/whatsapp/resolve-support', async (req, res) => {
    const { chatId } = req.body;
    if (sessions.has(chatId)) {
        const session = sessions.get(chatId);
        session.state = 'START'; // Reset bot to start
        await sendText(chatId, "O atendimento humano foi finalizado. O assistente virtual está de volta. Como posso ajudar?");
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Session not found' });
    }
});

// SSE for Real-time events
app.get('/api/whatsapp/events', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const statusHandler = (data) => res.write(`data: ${JSON.stringify({ type: 'status_change', data })}\n\n`);
    const messageHandler = (data, senderName) => res.write(`data: ${JSON.stringify({ type: 'message', data, senderName })}\n\n`);
    const dbHandler = (data) => res.write(`data: ${JSON.stringify({ type: 'db_change', data })}\n\n`);
    const notificationHandler = (message) => res.write(`data: ${JSON.stringify({ type: 'notification', message })}\n\n`);

    // Listeners
    eventEmitter.on(WA_STATUS_CHANGE, statusHandler);
    eventEmitter.on(WA_MESSAGE, messageHandler);
    eventEmitter.on(DB_CHANGE_EVENT, dbHandler);
    eventEmitter.on(NOTIFICATION_EVENT, notificationHandler);

    // Send current status immediately
    res.write(`data: ${JSON.stringify({ type: 'status_change', data: { isConnected: connectionStatus === 'connected', message: statusMessage, qrCode: qrCodeData } })}\n\n`);

    // Cleanup
    req.on('close', () => {
        eventEmitter.off(WA_STATUS_CHANGE, statusHandler);
        eventEmitter.off(WA_MESSAGE, messageHandler);
        eventEmitter.off(DB_CHANGE_EVENT, dbHandler);
        eventEmitter.off(NOTIFICATION_EVENT, notificationHandler);
    });
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

export { app };
