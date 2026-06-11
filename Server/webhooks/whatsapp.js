const router = require('express').Router();
const Contact = require('../models/Contact');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

router.post('/:instanceName', async (req, res) => {
  try {
    const body = req.body;
    console.log('📨 Webhook Evolution API recibido:', JSON.stringify(body, null, 2));

    // Solo procesar mensajes entrantes
    if (body.event !== 'messages.upsert') return res.sendStatus(200);
    
    const msg = body.data?.message;
    if (!msg || body.data?.key?.fromMe) return res.sendStatus(200); // ignorar mensajes propios

    const phoneNumber = body.data.key.remoteJid.replace('@s.whatsapp.net', '');
    const pushName = body.data.pushName || phoneNumber;
    const text = msg.conversation || msg.extendedTextMessage?.text || 'Mensaje sin texto';
    const instanceName = req.params.instanceName;

    // Usar el primer workspace disponible (puedes mejorar esto después)
    const Workspace = require('../models/Workspace');
    const workspace = await Workspace.findOne();
    if (!workspace) return res.sendStatus(200);

    const workspaceId = workspace._id;

    // Buscar o crear contacto
    let contact = await Contact.findOne({ workspace: workspaceId, channelId: phoneNumber });
    if (!contact) {
      contact = new Contact({
        workspace: workspaceId,
        nombre: pushName,
        canal: 'whatsapp',
        channelId: phoneNumber,
        telefono: phoneNumber
      });
      await contact.save();
    }

    // Buscar o crear conversación
    let conversation = await Conversation.findOne({ workspace: workspaceId, contact: contact._id, channel: 'whatsapp' });
    if (!conversation) {
      conversation = new Conversation({
        workspace: workspaceId,
        contact: contact._id,
        channel: 'whatsapp',
        instanceName: instanceName
      });
      await conversation.save();
    }

    // Guardar mensaje
    const newMessage = new Message({
      conversation: conversation._id,
      from: 'contact',
      text: text,
      sender: contact._id,
      senderModel: 'Contact'
    });
    await newMessage.save();

    // Actualizar conversación
    conversation.lastMessage = text;
    conversation.lastMessageTime = new Date();
    conversation.unreadCount = (conversation.unreadCount || 0) + 1;
    await conversation.save();

    // Notificar frontend via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('new_message', { conversationId: conversation._id, message: newMessage });
    }

    console.log(`✅ Mensaje guardado de ${pushName} (${phoneNumber}): "${text}"`);
    res.sendStatus(200);

  } catch (error) {
    console.error('❌ Error en webhook WhatsApp:', error);
    res.sendStatus(500);
  }
});

module.exports = router;