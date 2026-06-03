const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  type: {
    type: String,
    enum: ['message_sent', 'message_received', 'email_opened', 'link_clicked', 'form_submitted', 'call_made', 'quote_sent', 'quote_viewed', 'payment_made'],
    required: true
  },
  channel: {
    type: String,
    enum: ['whatsapp', 'telegram', 'messenger', 'email', 'web', 'call', 'other'],
    default: 'other'
  },
  details: {
    type: Map,
    of: String,
    default: {}
  },
  points: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
});

interactionSchema.index({ lead: 1, timestamp: -1 });
interactionSchema.index({ workspace: 1, timestamp: -1 });

module.exports = mongoose.model('Interaction', interactionSchema);