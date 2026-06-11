const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  suspended: {
    type: Boolean,
    default: false
  },
  channels: {
    whatsapp: {
      apiKey: String,
      phoneNumberId: String,
      verifyToken: String,
      enabled: { type: Boolean, default: false }
    },
    telegram: {
      botToken: String,
      botUsername: String,
      enabled: { type: Boolean, default: false }
    },
    messenger: {
      pageAccessToken: String,
      pageId: String,
      verifyToken: String,
      enabled: { type: Boolean, default: false }
    }
  },
  settings: {
    timezone: { type: String, default: 'America/Santiago' },
    language: { type: String, default: 'es' },
    logo: { type: String, default: '' },
    primaryColor: { type: String, default: '#1f6feb' },
    quickReplies: { type: [String], default: ['Gracias por contactarnos', 'En breve te atenderemos', '¿En qué más puedo ayudarte?', 'Tu pedido está en proceso'] }
  },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'agent', 'viewer'], default: 'agent' },
    joinedAt: { type: Date, default: Date.now }
  }],
  plan: {
    type: String,
    enum: ['free', 'basic', 'pro', 'enterprise'],
    default: 'free'
  },
  planExpiresAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Workspace', workspaceSchema);