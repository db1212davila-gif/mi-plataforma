const mongoose = require('mongoose');

const ChatbotConfigSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    unique: true
  },
  enabled: {
    type: Boolean,
    default: false
  },
  mode: {
    type: String,
    enum: ['always', 'outside_hours', 'no_agent'],
    default: 'outside_hours'
  },
  workingHours: {
    start: { type: String, default: '09:00' },
    end: { type: String, default: '18:00' },
    days: { type: [Number], default: [1, 2, 3, 4, 5] }
  },
  systemPrompt: {
    type: String,
    default: ''
  },
  welcomeMessage: {
    type: String,
    default: '¡Hola! Soy el asistente virtual. ¿En qué te puedo ayudar?'
  },
  model: {
    type: String,
    default: 'claude-sonnet-4-6'
  },
  anthropicApiKey: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('ChatbotConfig', ChatbotConfigSchema);