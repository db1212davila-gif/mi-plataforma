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
    const body = req.body;
    const instanceName = req.params.instanceName;

    console.log('📩 Webhook recibido:', JSON.stringify(body, null, 2));

    // Solo procesar eventos de mensajes entrantes
    if (body.event !== 'messages.upsert') {
      console.log('⏭️ Evento ignorado:', body.event);
      return res.sendStatus(200);
    }

    const msgData = body.data;
    if (!msgData || msgData.key?.fromMe) {
      console.log('⏭️ Mensaje propio o sin datos');
      return res.sendStatus(200);
    }

    const phoneNumber = msgData.key.remoteJid?.replace('@s.whatsapp.net', '');
    if (!phoneNumber) {
      console.log('⏭️ No se pudo extraer el número de teléfono');
      return res.sendStatus(200);
    }

    const pushName = msgData.pushName || phoneNumber;
    const text =
      msgData.message?.conversation ||
      msgData.message?.extendedTextMessage?.text ||
      msgData.message?.imageMessage?.caption ||
      '[Archivo multimedia]';

    console.log(`📱 Mensaje de ${pushName} (${phoneNumber}): "${text}"`);

    // ── Buscar o CREAR workspace automáticamente ──
    let workspace = await Workspace.findOne({
      $or: [
        { 'channels.whatsapp.instanceName': instanceName },
        { 'channels.whatsapp.enabled': true }
      ]
    });

    // Si no existe, CREAR UNO NUEVO automáticamente
    if (!workspace) {
      console.log('⚠️ No se encontró workspace, creando uno automáticamente...');
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
      console.log(`✅ Workspace creado: ${workspace.name} (ID: ${workspace._id})`);
    }

    // Si aún no hay workspace (por si falló la creación), buscar cualquiera
    if (!workspace) {
      const anyWorkspace = await Workspace.findOne();
      if (anyWorkspace) {
        workspace = anyWorkspace;
        console.log(`📌 Usando workspace existente: ${workspace.name}`);
      } else {
        console.warn('⚠️ No se pudo crear ni encontrar ningún workspace');
        return res.sendStatus(200);
      }
    }

    const workspaceId = workspace._id;

    // ── Buscar o crear contacto ──
    let contact = await Contact.findOne({
      workspace: workspaceId,
      channelId: phoneNumber,
      canal: 'whatsapp'
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
      console.log(`👤 Nuevo contacto creado: ${pushName} (${phoneNumber})`);
    } else if (contact.nombre !== pushName) {
      contact.nombre = pushName;
      contact.name = pushName;
      await contact.save();
      console.log(`✏️ Contacto actualizado: ${pushName}`);
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
      console.log(`💬 Nueva conversación creada para ${pushName}`);
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
    conversation.status = conversation.status === 'resolved' ? 'open' : conversation.status;
    await conversation.save();

    // ── Notificar frontend vía Socket.IO ──
    const io = req.app.get('io');
    if (io) {
      io.to(workspaceId.toString()).emit('new_message', {
        conversationId: conversation._id,
        message: newMessage,
        contact: contact,
        conversation: conversation
      });
      console.log('📨 Notificación enviada al frontend');
    }

    console.log(`✅ [${instanceName}] Mensaje procesado de ${pushName} (${phoneNumber}): "${text}"`);
    res.sendStatus(200);

  } catch (error) {
    console.error('❌ Error en webhook WhatsApp:', error);
    console.error('Stack:', error.stack);
    res.sendStatus(500);
  }
});

module.exports = router;