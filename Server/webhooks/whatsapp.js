const router   = require('express').Router();
const Contact      = require('../models/Contact');
const Conversation = require('../models/Conversation');
const Message      = require('../models/Message');
const Workspace    = require('../models/Workspace');

// ─────────────────────────────────────────────────────────────
// POST /webhook/whatsapp/:instanceName
// Recibe mensajes desde Evolution API
// ─────────────────────────────────────────────────────────────
router.post('/:instanceName', async (req, res) => {
  try {
    const body = req.body;
    const instanceName = req.params.instanceName;

    // Solo procesar eventos de mensajes entrantes
    if (body.event !== 'messages.upsert') return res.sendStatus(200);

    const msgData = body.data;
    if (!msgData || msgData.key?.fromMe) return res.sendStatus(200);

    const phoneNumber = msgData.key.remoteJid?.replace('@s.whatsapp.net', '');
    if (!phoneNumber) return res.sendStatus(200);

    const pushName = msgData.pushName || phoneNumber;
    const text =
      msgData.message?.conversation ||
      msgData.message?.extendedTextMessage?.text ||
      msgData.message?.imageMessage?.caption ||
      '[Archivo multimedia]';

    // ── Buscar workspace por instanceName en el canal WhatsApp ──
    // Primero intenta coincidir con el nombre de instancia guardado en channels.whatsapp
    let workspace = await Workspace.findOne({
      $or: [
        { 'channels.whatsapp.instanceName': instanceName },
        { 'channels.whatsapp.enabled': true }          // fallback: primer workspace activo
      ]
    });

    // Último recurso: cualquier workspace
    if (!workspace) workspace = await Workspace.findOne();
    if (!workspace) {
      console.warn('⚠️  Webhook recibido pero no hay workspaces en la DB');
      return res.sendStatus(200);
    }

    const workspaceId = workspace._id;

    // ── Buscar o crear contacto ──
    let contact = await Contact.findOne({ workspace: workspaceId, channelId: phoneNumber, canal: 'whatsapp' });
    if (!contact) {
      contact = new Contact({
        workspace:  workspaceId,
        nombre:     pushName,
        name:       pushName,        // campo alternativo usado en App.js
        canal:      'whatsapp',
        channel:    'whatsapp',
        channelId:  phoneNumber,
        telefono:   phoneNumber
      });
      await contact.save();
      console.log(`👤 Nuevo contacto creado: ${pushName} (${phoneNumber})`);
    } else if (contact.nombre !== pushName) {
      // Actualizar nombre si cambió
      contact.nombre = pushName;
      contact.name   = pushName;
      await contact.save();
    }

    // ── Buscar o crear conversación ──
    let conversation = await Conversation.findOne({
      workspace: workspaceId,
      contact:   contact._id,
      channel:   'whatsapp'
    });

    if (!conversation) {
      conversation = new Conversation({
        workspace:    workspaceId,
        contact:      contact._id,
        channel:      'whatsapp',
        status:       'open',
        instanceName: instanceName
      });
      await conversation.save();
      console.log(`💬 Nueva conversación creada para ${pushName}`);
    }

    // ── Guardar mensaje ──
    const newMessage = new Message({
      conversation: conversation._id,
      workspace:    workspaceId,
      from:         'contact',
      text:         text,
      channel:      'whatsapp',
      sender:       contact._id,
      senderModel:  'Contact',
      timestamp:    new Date()
    });
    await newMessage.save();

    // ── Actualizar conversación ──
    conversation.lastMessage     = text;
    conversation.lastMessageTime = new Date();
    conversation.unreadCount     = (conversation.unreadCount || 0) + 1;
    conversation.status          = conversation.status === 'resolved' ? 'open' : conversation.status;
    await conversation.save();

    // ── Notificar frontend vía Socket.IO (sala por workspace) ──
    const io = req.app.get('io');
    if (io) {
      // Emitir a la sala del workspace para que solo los agentes de esa empresa lo vean
      io.to(workspaceId.toString()).emit('new_message', {
        conversationId: conversation._id,
        message:        newMessage,
        contact:        contact,
        conversation:   conversation
      });
    }

    console.log(`✅ [${instanceName}] Mensaje de ${pushName} (${phoneNumber}): "${text}"`);
    res.sendStatus(200);

  } catch (error) {
    console.error('❌ Error en webhook WhatsApp:', error);
    res.sendStatus(500);
  }
});

module.exports = router;