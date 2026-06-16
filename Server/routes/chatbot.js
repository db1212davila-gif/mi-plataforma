const express       = require('express');
const ChatbotConfig = require('../models/ChatbotConfig');
const Conversation  = require('../models/Conversation');
const Contact       = require('../models/Contact');
const Message       = require('../models/Message');
const auth          = require('../middleware/auth');

function isWithinWorkingHours(wh) {
  const now     = new Date();
  const day     = now.getDay();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = wh.start.split(':').map(Number);
  const [eh, em] = wh.end.split(':').map(Number);
  return wh.days.includes(day) &&
         nowMins >= sh * 60 + sm &&
         nowMins <= eh * 60 + em;
}

async function askClaude(config, userMessage, recentMessages = []) {
  const history = recentMessages.slice(-8).map(m => ({
    role:    m.from === 'agent' || m.from === 'bot' ? 'assistant' : 'user',
    content: m.text
  }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         config.anthropicApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model:      config.model || 'claude-sonnet-4-6',
      max_tokens: 500,
      system:     config.systemPrompt,
      messages:   [...history, { role: 'user', content: userMessage }]
    })
  });

  if (!response.ok) throw new Error(`Claude error: ${await response.text()}`);
  const data = await response.json();
  return data.content?.[0]?.text || 'Lo siento, no pude procesar tu mensaje.';
}

async function sendWhatsAppReply(workspace, phoneNumber, text) {
  const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
  const evolutionKey = process.env.AUTHENTICATION_API_KEY;
  const instance     = workspace.channels?.whatsapp?.instanceName || 'omniconnect';

  try {
    await fetch(`${evolutionUrl}/message/sendText/${instance}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
      body:    JSON.stringify({ number: phoneNumber, text, options: { delay: 800 } })
    });
    return true;
  } catch (error) {
    console.error('Error enviando WhatsApp:', error);
    return false;
  }
}

// ============================================================
// WEBHOOK PÚBLICO
// ============================================================
const webhookRouter = express.Router();

webhookRouter.post('/webhook', async (req, res) => {
  try {
    const body    = req.body;
    const msgData = body?.data;

    console.log('📨 Webhook recibido body keys:', Object.keys(body || {}));
    console.log('📨 msgData:', JSON.stringify(msgData)?.slice(0, 300));

    if (!msgData?.message)   return res.sendStatus(200);
    if (msgData.key?.fromMe) return res.sendStatus(200);

    const phoneFull   = msgData.key?.remoteJid?.replace('@s.whatsapp.net', '') || '';
    const phoneLocal  = phoneFull.startsWith('593') ? '0' + phoneFull.slice(3) : phoneFull;
    const userMessage = msgData.message?.conversation ||
                        msgData.message?.extendedTextMessage?.text || '';

    console.log('📞 phoneFull:', phoneFull, '| phoneLocal:', phoneLocal);
    console.log('💬 mensaje:', userMessage);

    if (!phoneFull || !userMessage) return res.sendStatus(200);

    // Buscar con ambos formatos de número
    const contact = await Contact.findOne({
      channelId: { $in: [phoneFull, phoneLocal] },
      canal: 'whatsapp'
    });

    console.log('👤 Contacto:', contact ? contact.nombre : 'NO ENCONTRADO');
    if (!contact) return res.sendStatus(200);

    const conversation = await Conversation.findOne({ contact: contact._id }).populate('workspace');
    console.log('💬 Conversación:', conversation ? conversation._id : 'NO ENCONTRADA');
    if (!conversation) return res.sendStatus(200);

    const config = await ChatbotConfig.findOne({
      workspace: conversation.workspace._id,
      enabled:   true
    });
    console.log('🤖 Config:', config ? `modo=${config.mode}` : 'NO ENCONTRADA o INACTIVA');
    if (!config) return res.sendStatus(200);

    let shouldReply = false;
    if (config.mode === 'always') {
      shouldReply = true;
    } else if (config.mode === 'outside_hours') {
      shouldReply = !isWithinWorkingHours(config.workingHours);
    } else if (config.mode === 'no_agent') {
      shouldReply = !conversation.asignadoA;
    }

    console.log('✅ shouldReply:', shouldReply);
    if (!shouldReply) return res.sendStatus(200);

    const recentMsgs = await Message.find({ conversation: conversation._id })
      .sort({ timestamp: -1 }).limit(10).lean();

    const botReply = await askClaude(config, userMessage, recentMsgs.reverse());
    console.log('🤖 Respuesta:', botReply);

    await Message.create({
      conversation: conversation._id,
      from:         'agent',
      text:         botReply,
      sender:       null,
      senderModel:  'User',
      timestamp:    new Date()
    });

    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage:     botReply,
      lastMessageTime: new Date()
    });

    await sendWhatsAppReply(conversation.workspace, phoneFull, botReply);

    const io = req.app.get('io');
    if (io) {
      io.to(`workspace_${conversation.workspace._id}`).emit('new_message', {
        conversationId: conversation._id,
        message: { text: botReply, from: 'agent', timestamp: new Date() }
      });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Chatbot webhook error:', err.message, err.stack);
    res.sendStatus(500);
  }
});

// ============================================================
// RUTAS PROTEGIDAS
// ============================================================
const apiRouter = express.Router();

apiRouter.get('/config', auth, async (req, res) => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspace;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace no identificado' });
    const config = await ChatbotConfig.findOne({ workspace: workspaceId }, { anthropicApiKey: 0 });
    res.json(config || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/config', auth, async (req, res) => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspace;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace no identificado' });
    const { anthropicApiKey, ...rest } = req.body;
    const update = { ...rest, workspace: workspaceId };
    if (anthropicApiKey && anthropicApiKey.trim()) update.anthropicApiKey = anthropicApiKey.trim();
    const config = await ChatbotConfig.findOneAndUpdate(
      { workspace: workspaceId },
      update,
      { upsert: true, new: true, select: '-anthropicApiKey' }
    );
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/test', auth, async (req, res) => {
  try {
    const workspaceId = req.workspaceId || req.user?.workspace;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace no identificado' });
    const { message } = req.body;
    const config = await ChatbotConfig.findOne({ workspace: workspaceId });
    if (!config?.anthropicApiKey) {
      return res.status(400).json({ error: 'No hay API key configurada. Guarda primero la configuración.' });
    }
    const reply = await askClaude(config, message);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { webhookRouter, apiRouter };