const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
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
  name: { type: String, required: true },
  value: { type: Number, default: 0 },
  probability: { type: Number, min: 0, max: 100, default: 0 },
  expectedCloseDate: { type: Date, default: null },
  products: [{
    name: String,
    quantity: Number,
    price: Number
  }],
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Deal', dealSchema);