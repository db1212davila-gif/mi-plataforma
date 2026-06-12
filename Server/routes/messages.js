const router       = require('express').Router();
const Message      = require('../models/Message');
const Conversation = require('../models/Conversation');
const auth         = require('../middleware/auth');
const { hasWorkspaceAccess } = require('../middleware/roleMiddleware');

// ─────────────────────────────────────────────────────────────
// POST /api/messages/:workspaceId/:conversationId
// Enviar mensaje desde el agente
// ─────────────────────────────────────────────────────────────
router.post('/:workspaceId/:conversationId', auth, hasWorkspaceAccess, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'El mensaje no puede estar vacío' });

    const conversation = await Conversation.findOne({
      _id:       req.params.conversationId,
      workspace: req.params.workspaceId
    });
    if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada' });

    const message = new Message({
      conversation: conversation._id,
      workspace:    req.params.workspaceId,   // ✅ requerido por el modelo
      from:         'agent',
      text:         text.trim(),
      channel:      conversation.channel,
      sender:       req.user?.userId,
      senderModel:  'User',
      timestamp:    new Date()
    });
    await message.save();

    // Actualizar último mensaje en la conversación
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage:     text.trim(),
      lastMessageTime: new Date()
    });

    // Notificar en tiempo real
    const io = req.app.get('io');
    if (io) {
      io.to(req.params.workspaceId).emit('new_message', {
        conversationId: conversation._id,
        message
      });
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/messages/:workspaceId/:conversationId
// Obtener mensajes de una conversación
// ─────────────────────────────────────────────────────────────
router.get('/:workspaceId/:conversationId', auth, hasWorkspaceAccess, async (req, res) => {
  try {
    const messages = await Message.find({
      conversation: req.params.conversationId,
      workspace:    req.params.workspaceId
    }).sort({ timestamp: 1 });

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;