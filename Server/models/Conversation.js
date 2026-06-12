const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  contact:   { type: mongoose.Schema.Types.ObjectId, ref: 'Contact',   required: true },

  // ✅ UNIFICADO: todos los archivos usan "channel" y "status"
  channel: {
    type: String,
    enum: ['whatsapp', 'telegram', 'messenger', 'instagram', 'email'],
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'pending', 'resolved'],
    default: 'open'
  },

  lastMessage:     { type: String,  default: '' },
  lastMessageTime: { type: Date,    default: Date.now },
  unreadCount:     { type: Number,  default: 0 },

  // Asignación de agente
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Para multi-instancia de WhatsApp
  instanceName: { type: String, default: '' },

  // Notas internas del equipo (nuevo)
  notes: [
    {
      text:      { type: String, required: true },
      author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: Date.now }
    }
  ]

}, { timestamps: true });

// Índice para búsquedas rápidas por workspace
ConversationSchema.index({ workspace: 1, status: 1 });
ConversationSchema.index({ workspace: 1, contact: 1, channel: 1 });

module.exports = mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);