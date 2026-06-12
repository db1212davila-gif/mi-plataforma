const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  workspace:    { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace',    required: true },

  // ✅ UNIFICADO: inglés, igual que el resto del proyecto
  from:   { type: String, enum: ['contact', 'agent', 'bot'], required: true },
  text:   { type: String, required: true },

  channel: { type: String, enum: ['whatsapp', 'telegram', 'messenger', 'instagram', 'email'] },
  read:    { type: Boolean, default: false },

  sender:      { type: mongoose.Schema.Types.ObjectId, refPath: 'senderModel' },
  senderModel: { type: String, enum: ['User', 'Contact'] },

  timestamp: { type: Date, default: Date.now },
  metadata:  { type: Object, default: {} }
}, { timestamps: true });

MessageSchema.index({ conversation: 1, timestamp: 1 });

module.exports = mongoose.models.Message || mongoose.model('Message', MessageSchema);