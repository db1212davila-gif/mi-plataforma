const express = require('express');
const ChatbotConfig = require('../models/ChatbotConfig');
const Conversation = require('../models/Conversation');
const Contact = require('../models/Contact');
const Message = require('../models/Message');
const Workspace = require('../models/Workspace');
const auth = require('../middleware/auth');
const { hasWorkspaceAccess } = require('../middleware/roleMiddleware');

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function isWithinWorkingHours(wh) {
  const now = new Date();
  const day = now.getDay();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = wh.start.split(':').map(Number);
  const [eh, em] = wh.end.split(':').map(Number);
  return wh.days.includes(day) &&
         nowMins >= sh * 60 + sm &&
         nowMins <= eh * 60 + em;
}

async function askClaude(config, userMessage, recentMessages = []) {
  const history = recentMessages.slice(-8).map(m => ({
    role: m.from === 'agent' || m.from === 'bot' ? 'assistant' : 'user',
    content: m.text
  }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.anthropicApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: config.model || 'claude-sonnet-4-6',
      max_tokens: 500,
      system: config.systemPrompt,
      messages: [...history, { role: 'user', content: userMessage }]
    })
  });

  if (!response.ok) throw new Error(`Claude error: ${await response.text()}`);
  const data = await response.json();
  return data.content?.[0]?.text || 'Lo siento, no pude procesar tu mensaje.';
}

async function sendWhatsAppReply(workspace, phoneNumber, text) {
  const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
  const evolutionKey = process.env.AUTHENTICATION_API_KEY;
  const instance = workspace.channels?.whatsapp?.instanceName || 'omniconnect';

  if (!evolutionUrl || !instance) {
    console.warn('⚠️ Evolution API no configurada');
    return false;
  }

  try {
    await fetch(`${evolutionUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
      body: JSON.stringify({ number: phoneNumber, text, options: { delay: 800 } })
    });
    return true;
  } catch (error) {
    console.error('Error enviando WhatsApp:', error);
    return false;
  }
}

// ============================================================
// WEBHOOK PÚBLICO (Evolution API llama aquí)
// ============================================================
const webhookRouter = express.Router();

webhookRouter.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    const msgData = body?.data;
    
    if (!msgData?.message) return res.sendStatus(200);
    if (msgData.key?.fromMe) return res.sendStatus(200);

    const phone = msgData.key?.remoteJid?.replace('@s.whatsapp.net', '');
    const userMessage = msgData.message?.conversation ||
                        msgData.message?.extendedTextMessage?.text || '';

    if (!phone || !userMessage) return res.sendStatus(200);

    // Buscar contacto por número
    const contact = await Contact.findOne({ 
      channelId: phone, 
      canal: 'whatsapp' 
    });

    if (!contact) return res.sendStatus(200);

    // Buscar conversación activa
    const conversation = await Conversation.findOne({ 
      contact: contact._id 
    }).populate('workspace');

    if (!conversation) return res.sendStatus(200);

    // Cargar config del chatbot
    const config = await ChatbotConfig.findOne({
      workspace: conversation.workspace._id,
      enabled: true
    });

    if (!config) return res.sendStatus(200);

    // Decidir si el bot debe responder
    let shouldReply = false;
    if (config.mode === 'always') {
      shouldReply = true;
    } else if (config.mode === 'outside_hours') {
      shouldReply = !isWithinWorkingHours(config.workingHours);
    } else if (config.mode === 'no_agent') {
      shouldReply = !conversation.asignadoA;
    }

    if (!shouldReply) return res.sendStatus(200);

    // Obtener historial reciente
    const recentMsgs = await Message.find({ conversation: conversation._id })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    // Pedir respuesta a Claude
    const botReply = await askClaude(config, userMessage, recentMsgs.reverse());

    // Guardar mensaje del bot
    await Message.create({
      conversation: conversation._id,
      from: 'agent',
      text: botReply,
      sender: null,
      senderModel: 'User',
      timestamp: new Date()
    });

    // Actualizar conversación
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: botReply,
      lastMessageTime: new Date()
    });

    // Enviar respuesta por WhatsApp
    await sendWhatsAppReply(conversation.workspace, phone, botReply);

    // Emitir evento Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`workspace_${conversation.workspace._id}`).emit('new_message', {
        conversationId: conversation._id,
        message: { text: botReply, from: 'agent', timestamp: new Date() }
      });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Chatbot webhook error:', err.message);
    res.sendStatus(500);
  }
});

// ============================================================
// RUTAS PROTEGIDAS (API)
// ============================================================
const apiRouter = express.Router();

apiRouter.get('/config', auth, hasWorkspaceAccess, async (req, res) => {
  try {
    const config = await ChatbotConfig.findOne(
      { workspace: req.workspaceId },
      { anthropicApiKey: 0 }
    );
    res.json(config || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/config', auth, hasWorkspaceAccess, async (req, res) => {
  try {
    const { anthropicApiKey, ...rest } = req.body;
    const update = { ...rest, workspace: req.workspaceId };

    if (anthropicApiKey && anthropicApiKey.trim()) {
      update.anthropicApiKey = anthropicApiKey.trim();
    }

    const config = await ChatbotConfig.findOneAndUpdate(
      { workspace: req.workspaceId },
      update,
      { upsert: true, new: true, select: '-anthropicApiKey' }
    );
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/test', auth, hasWorkspaceAccess, async (req, res) => {
  try {
    const { message } = req.body;
    const config = await ChatbotConfig.findOne({ workspace: req.workspaceId });

    if (!config?.anthropicApiKey) {
      return res.status(400).json({ error: 'No hay API key configurada' });
    }

    const reply = await askClaude(config, message);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { webhookRouter, apiRouter };