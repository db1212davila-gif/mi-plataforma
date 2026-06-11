const router = require('express').Router();
const Workspace = require('../models/Workspace');
const Contact = require('../models/Contact');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { getAutoResponse, escalateToAgent } = require('../services/autoResponses');

// Verificación del webhook (GET)
router.get('/:workspaceId', async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    
    if (mode === 'subscribe' && token === workspace?.channels?.whatsapp?.verifyToken) {
      console.log(`✅ Webhook de WhatsApp verificado para workspace ${req.params.workspaceId}`);
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } catch (error) {
    res.sendStatus(403);
  }
});

// Recepción de mensajes (POST)
router.post('/:workspaceId', async (req, res) => {
  try {
    const workspaceId = req.params.workspaceId;
    const workspace = await Workspace.findById(workspaceId);
    
    if (!workspace) {
      return res.sendStatus(404);
    }
    
    const body = req.body;
    
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry[0];
      const changes = entry.changes[0];
      const value = changes.value;
      
      if (value.messages && value.messages[0]) {
        const message = value.messages[0];
        const contact = value.contacts[0];
        
        // Buscar o crear contacto
        let dbContact = await Contact.findOne({
          workspace: workspaceId,
          canal: 'whatsapp',
          channelId: contact.wa_id
        });
        
        if (!dbContact) {
          dbContact = new Contact({
            workspace: workspaceId,
            nombre: contact.profile.name,
            canal: 'whatsapp',
            channelId: contact.wa_id,
            telefono: contact.wa_id
          });
          await dbContact.save();
        }
        
        // Buscar o crear conversación
        let conversation = await Conversation.findOne({
          workspace: workspaceId,
          contact: dbContact._id,
          channel: 'whatsapp'
        });
        
        if (!conversation) {
          conversation = new Conversation({
            workspace: workspaceId,
            contact: dbContact._id,
            channel: 'whatsapp'
          });
          await conversation.save();
        }
        
        // Guardar mensaje
        const newMessage = new Message({
          conversation: conversation._id,
          from: 'contact',
          text: message.text?.body || 'Mensaje sin texto',
          sender: dbContact._id,
          senderModel: 'Contact'
        });
        await newMessage.save();
        
        // Actualizar conversación
        conversation.lastMessage = newMessage.text;
        conversation.lastMessageTime = new Date();
        conversation.unreadCount += 1;
        await conversation.save();
        
        // ============================================================
        // RESPUESTA AUTOMÁTICA (código que preguntaste)
        // ============================================================
        const auto = getAutoResponse(newMessage.text);
        const io = req.app.get('io');
        
        if (auto.matched) {
          // Enviar respuesta automática (solo simulación, falta API real)
          console.log(`🤖 Respuesta automática: "${auto.response}" (detectó: "${auto.keyword}")`);
          
          // Guardar la respuesta automática como mensaje del agente
          const autoMessage = new Message({
            conversation: conversation._id,
            from: 'agent',
            text: auto.response,
            sender: null,
            senderModel: 'User'
          });
          await autoMessage.save();
          
          // Notificar al frontend
          if (io) {
            io.to(`workspace_${workspaceId}`).emit('new_message', {
              conversationId: conversation._id,
              message: autoMessage
            });
          }
        } else {
          // No hubo respuesta automática, derivar a agente
          await escalateToAgent(conversation._id, Conversation);
          if (io) {
            io.to(`workspace_${workspaceId}`).emit('new_message', {
              conversationId: conversation._id,
              message: newMessage,
              requiresAgent: true
            });
          }
        }
        // ============================================================
      }
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Error en webhook de WhatsApp:', error);
    res.sendStatus(500);
  }
});

module.exports = router;