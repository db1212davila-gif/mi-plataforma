const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  contact: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true
  },
  stage: {
    type: String,
    enum: ['lead', 'contacted', 'opportunity', 'negotiation', 'customer', 'lost'],
    default: 'lead'
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  source: {
    type: String,
    enum: ['google', 'facebook', 'instagram', 'whatsapp', 'telegram', 'email', 'organic', 'referral', 'other'],
    default: 'other'
  },
  utmCampaign: { type: String, default: '' },
  utmMedium: { type: String, default: '' },
  utmSource: { type: String, default: '' },
  estimatedValue: { type: Number, default: 0 },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tags: [String],
  notes: { type: String, default: '' },
  lastActivity: { type: Date, default: Date.now },
  closedAt: { type: Date, default: null },
  lostReason: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

leadSchema.index({ workspace: 1, stage: 1 });
leadSchema.index({ workspace: 1, score: -1 });
leadSchema.index({ contact: 1 }, { unique: true });

module.exports = mongoose.model('Lead', leadSchema);