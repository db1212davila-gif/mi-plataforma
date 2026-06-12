const router  = require('express').Router();
const Conversation = require('../models/Conversation');
const Message      = require('../models/Message');
const auth         = require('../middleware/auth');
const { hasWorkspaceAccess } = require('../middleware/roleMiddleware');

// ─────────────────────────────────────────────────────────────
// GET /api/conversations/:workspaceId
// Lista conversaciones con filtros opcionales
// ─────────────────────────────────────────────────────────────
router.get('/:workspaceId', auth, hasWorkspaceAccess, async (req, res) => {
  try {
    const { status, channel, assignedTo, search } = req.query;

    const query = { workspace: req.params.workspaceId };
    if (status  && status  !== 'all') query.status  = status;
    if (channel && channel !== 'all') query.channel = channel;
    if (assignedTo) query.assignedTo = assignedTo;

    let conversations = await Conversation.find(query)
      .populate('contact')
      .populate('assignedTo', 'name email avatar')
      .sort({ lastMessageTime: -1 });

    // Búsqueda por nombre de contacto (filtro en memoria, simple)
    if (search) {
      const q = search.toLowerCase();
      conversations = conversations.filter(c => {
        const name = (c.contact?.name || c.contact?.nombre || '').toLowerCase();
        return name.includes(q);
      });
    }

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/conversations/:workspaceId/:conversationId
// Conversación + mensajes paginados
// ─────────────────────────────────────────────────────────────
router.get('/:workspaceId/:conversationId', auth, hasWorkspaceAccess, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id:       req.params.conversationId,
      workspace: req.params.workspaceId
    })
      .populate('contact')
      .populate('assignedTo', 'name email avatar')
      .populate('notes.author', 'name avatar');

    if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada' });

    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 50;
    const messages = await Message.find({ conversation: conversation._id })
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .then(msgs => msgs.reverse());

    // Marcar como leído al abrir
    await Conversation.findByIdAndUpdate(conversation._id, { unreadCount: 0 });

    res.json({ conversation, messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/conversations/:workspaceId/:conversationId
// Actualizar estado y/o agente asignado
// ─────────────────────────────────────────────────────────────
router.patch('/:workspaceId/:conversationId', auth, hasWorkspaceAccess, async (req, res) => {
  try {
    const { status, assignedTo } = req.body;

    const updates = { updatedAt: new Date() };
    if (status)     updates.status     = status;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo || null;

    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.conversationId, workspace: req.params.workspaceId },
      updates,
      { new: true }
    )
      .populate('contact')
      .populate('assignedTo', 'name email avatar');

    if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada' });

    // Notificar cambio en tiempo real
    const io = req.app.get('io');
    if (io) io.to(req.params.workspaceId).emit('conversation_updated', conversation);

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/conversations/:workspaceId/:conversationId/notes
// Agregar nota interna (visible solo para agentes)
// ─────────────────────────────────────────────────────────────
router.post('/:workspaceId/:conversationId/notes', auth, hasWorkspaceAccess, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'La nota no puede estar vacía' });

    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.conversationId, workspace: req.params.workspaceId },
      { $push: { notes: { text, author: req.user.userId } } },
      { new: true }
    ).populate('notes.author', 'name avatar');

    res.json(conversation.notes.at(-1));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;