const router = require('express').Router();
const Contact = require('../models/Contact');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Workspace = require('../models/Workspace');

// ─────────────────────────────────────────────────────────────
// POST /webhook/whatsapp/:instanceName
// Recibe mensajes desde Evolution API
// ─────────────────────────────────────────────────────────────
router.post('/:instanceName', async (req, res) => {
  try {
    console.log('📩 Webhook recibido - Instancia:', req.params.instanceName);
    console.log('📩 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📩 Body:', JSON.stringify(req.body, null, 2));
    
    const body = req.body;
    const instanceName = req.params.instanceName;

    // Si el body es string, intentar parsearlo
    let data = body;
    if (typeof body === 'string') {
      try {
        data = JSON.parse(body);
        console.log('📩 Body parseado:', JSON.stringify(data, null, 2));
      } catch (e) {
        console.error('❌ Error parseando JSON:', e.message);
        return res.status(400).json({ error: 'Invalid JSON' });
      }
    }

    // Verificar si es un evento de mensaje
    const eventType = data.event || data.type;
    console.log('📩 Evento:', eventType);

    if (eventType !== 'messages.upsert' && eventType !== 'message') {
      console.log('⏭️ Evento ignorado:', eventType);
      return res.status(200).json({ message: 'Event ignored' });
    }

    // Extraer datos del mensaje
    let msgData = data.data || data;
    console.log('📩 msgData:', JSON.stringify(msgData, null, 2));

    // Obtener número de teléfono
    let phoneNumber = msgData.key?.remoteJid || msgData.remoteJid;
    if (phoneNumber) {
      phoneNumber = phoneNumber.replace('@s.whatsapp.net', '');
    }

    if (!phoneNumber) {
      console.log('❌ No se pudo extraer número de teléfono');
      return res.status(400).json({ error: 'No phone number' });
    }

    const pushName = msgData.pushName || phoneNumber;
    const message = msgData.message || {};
    const text = message.conversation ||
                 message.extendedTextMessage?.text ||
                 message.imageMessage?.caption ||
                 '[Archivo multimedia]';

    console.log(`📱 Mensaje de ${pushName} (${phoneNumber}): "${text}"`);

    // ── Buscar o CREAR workspace ──
    let workspace = await Workspace.findOne({
      $or: [
        { 'channels.whatsapp.instanceName': instanceName },
        { 'channels.whatsapp.enabled': true }
      ]
    });

    if (!workspace) {
      console.log('⚠️ No se encontró workspace, creando uno...');
      workspace = new Workspace({
        name: 'Mi Pizzería',
        slug: 'mi-pizzeria',
        channels: {
          whatsapp: {
            enabled: true,
            instanceName: instanceName
          }
        }
      });
      await workspace.save();
      console.log(`✅ Workspace creado: ${workspace.name}`);
    }

    const workspaceId = workspace._id;

    // ── Buscar o crear contacto ──
    let contact = await Contact.findOne({
      workspace: workspaceId,
      channelId: phoneNumber,
      $or: [{ canal: 'whatsapp' }, { channel: 'whatsapp' }]
    });

    if (!contact) {
      contact = new Contact({
        workspace: workspaceId,
        nombre: pushName,
        name: pushName,
        canal: 'whatsapp',
        channel: 'whatsapp',
        channelId: phoneNumber,
        telefono: phoneNumber
      });
      await contact.save();
      console.log(`👤 Nuevo contacto: ${pushName}`);
    }

    // ── Buscar o crear conversación ──
    let conversation = await Conversation.findOne({
      workspace: workspaceId,
      contact: contact._id,
      channel: 'whatsapp'
    });

    if (!conversation) {
      conversation = new Conversation({
        workspace: workspaceId,
        contact: contact._id,
        channel: 'whatsapp',
        status: 'open',
        instanceName: instanceName
      });
      await conversation.save();
      console.log(`💬 Nueva conversación`);
    }

    // ── Guardar mensaje ──
    const newMessage = new Message({
      conversation: conversation._id,
      workspace: workspaceId,
      from: 'contact',
      text: text,
      channel: 'whatsapp',
      sender: contact._id,
      senderModel: 'Contact',
      timestamp: new Date()
    });
    await newMessage.save();

    // ── Actualizar conversación ──
    conversation.lastMessage = text;
    conversation.lastMessageTime = new Date();
    conversation.unreadCount = (conversation.unreadCount || 0) + 1;
    await conversation.save();

    console.log(`✅ Mensaje procesado de ${pushName}`);
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ Error en webhook:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

module.exports = router;