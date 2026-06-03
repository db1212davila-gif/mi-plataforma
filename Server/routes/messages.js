const router = require('express').Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const auth = require('../middleware/auth');
const { hasWorkspaceAccess } = require('../middleware/roleMiddleware');

// Enviar mensaje (agente)
router.post('/:workspaceId/:conversationId', auth, hasWorkspaceAccess, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    }
    
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }
    
    const message = new Message({
      conversation: req.params.conversationId,
      from: 'agent',
      text,
      sender: req.userId,
      senderModel: 'User',
      timestamp: new Date()
    });
    
    await message.save();
    
    // Actualizar conversación
    await Conversation.findByIdAndUpdate(req.params.conversationId, {
      lastMessage: text,
      lastMessageTime: new Date(),
      updatedAt: new Date()
    });
    
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener mensajes de una conversación
router.get('/:workspaceId/:conversationId', auth, hasWorkspaceAccess, async (req, res) => {
  try {
    const messages = await Message.find({ conversation: req.params.conversationId })
      .sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;