const router = require('express').Router();
const Contact = require('../models/Contact');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Workspace = require('../models/Workspace');

router.post('/:instanceName', async (req, res) => {
  let rawBody = '';
  
  req.on('data', chunk => {
    rawBody += chunk;
  });
  
  req.on('end', async () => {
    try {
      console.log('📩 BODY CRUDO RECIBIDO:');
      console.log(rawBody);
      
      let body;
      try {
        body = JSON.parse(rawBody);
      } catch (e) {
        console.error('❌ Error parseando JSON:', e.message);
        console.log('📝 Contenido recibido (primeros 200 caracteres):', rawBody.substring(0, 200));
        return res.status(200).json({ message: 'Invalid JSON' });
      }
      
      const instanceName = req.params.instanceName;
      console.log('📩 Instancia:', instanceName);
      
      if (body.event !== 'messages.upsert') {
        console.log('⏭️ Evento ignorado:', body.event);
        return res.status(200).json({ message: 'Event ignored' });
      }

      const msgData = body.data;
      if (!msgData || msgData.key?.fromMe) {
        console.log('⏭️ Mensaje propio o sin datos');
        return res.status(200).json({ message: 'Own message' });
      }

      const phoneNumber = msgData.key.remoteJid?.replace('@s.whatsapp.net', '');
      if (!phoneNumber) {
        console.log('❌ No se pudo extraer número de teléfono');
        return res.status(400).json({ error: 'No phone number' });
      }

      const pushName = msgData.pushName || phoneNumber;
      const text = msgData.message?.conversation ||
                   msgData.message?.extendedTextMessage?.text ||
                   msgData.message?.imageMessage?.caption ||
                   '[Archivo multimedia]';

      console.log(`📱 Mensaje de ${pushName} (${phoneNumber}): "${text}"`);

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
      } else if (contact.nombre !== pushName) {
        contact.nombre = pushName;
        contact.name = pushName;
        await contact.save();
        console.log(`✏️ Contacto actualizado: ${pushName}`);
      }

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
        console.log(`💬 Nueva conversación creada`);
      }

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

      conversation.lastMessage = text;
      conversation.lastMessageTime = new Date();
      conversation.unreadCount = (conversation.unreadCount || 0) + 1;
      conversation.status = conversation.status === 'resolved' ? 'open' : conversation.status;
      await conversation.save();

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

      console.log(`✅ Mensaje procesado de ${pushName}`);
      res.status(200).json({ success: true });

    } catch (error) {
      console.error('❌ Error en webhook:', error);
      console.error('❌ Stack:', error.stack);
      res.status(500).json({ error: error.message });
    }
  });
});

module.exports = router;