const router = require('express').Router();
const auth = require('../middleware/auth');
const { hasWorkspaceAccess, hasRole } = require('../middleware/roleMiddleware');
const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const { updateLeadScoreAndStage, recordInteraction, getStageByScore } = require('../services/scoringService');

// Obtener todos los leads del workspace
router.get('/:workspaceId', auth, hasWorkspaceAccess, async (req, res) => {
  try {
    const { stage, minScore, maxScore, search } = req.query;
    const filter = { workspace: req.params.workspaceId };
    
    if (stage && stage !== 'all') filter.stage = stage;
    if (minScore) filter.score = { $gte: parseInt(minScore) };
    if (maxScore) filter.score = { ...filter.score, $lte: parseInt(maxScore) };
    
    if (search) {
      const contacts = await Contact.find({ 
        workspace: req.params.workspaceId,
        name: { $regex: search, $options: 'i' }
      });
      filter.contact = { $in: contacts.map(c => c._id) };
    }
    
    const leads = await Lead.find(filter)
      .populate('contact')
      .populate('assignedTo', 'name email')
      .sort({ score: -1, updatedAt: -1 });
    
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener leads agrupados por etapa (para kanban)
router.get('/:workspaceId/kanban', auth, hasWorkspaceAccess, async (req, res) => {
  try {
    const stages = ['lead', 'contacted', 'opportunity', 'negotiation', 'customer', 'lost'];
    const result = {};
    
    for (const stage of stages) {
      const leads = await Lead.find({ 
        workspace: req.params.workspaceId, 
        stage 
      }).populate('contact').populate('assignedTo', 'name');
      result[stage] = leads;
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear lead desde contacto
router.post('/:workspaceId', auth, hasWorkspaceAccess, hasRole(['admin', 'agent']), async (req, res) => {
  try {
    const { contactId, source, estimatedValue } = req.body;
    
    const existingLead = await Lead.findOne({ workspace: req.params.workspaceId, contact: contactId });
    if (existingLead) {
      return res.status(400).json({ error: 'Este contacto ya es un lead' });
    }
    
    const lead = new Lead({
      workspace: req.params.workspaceId,
      contact: contactId,
      source: source || 'other',
      estimatedValue: estimatedValue || 0,
      assignedTo: req.userId
    });
    
    await lead.save();
    await updateLeadScoreAndStage(lead._id);
    
    res.status(201).json(lead);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar etapa de lead (arrastrar en kanban)
router.patch('/:workspaceId/:leadId/stage', auth, hasWorkspaceAccess, hasRole(['admin', 'agent']), async (req, res) => {
  try {
    const { stage } = req.body;
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.leadId, workspace: req.params.workspaceId },
      { stage, updatedAt: new Date() },
      { new: true }
    );
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }
    
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar interacción
router.post('/:workspaceId/:leadId/interact', auth, hasWorkspaceAccess, async (req, res) => {
  try {
    const { type, channel, details } = req.body;
    const interaction = await recordInteraction(req.params.leadId, type, channel, details);
    res.json(interaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener métricas del pipeline
router.get('/:workspaceId/metrics', auth, hasWorkspaceAccess, async (req, res) => {
  try {
    const stages = ['lead', 'contacted', 'opportunity', 'negotiation', 'customer', 'lost'];
    const metrics = {};
    
    for (const stage of stages) {
      const count = await Lead.countDocuments({ workspace: req.params.workspaceId, stage });
      metrics[stage] = count;
    }
    
    const hotLeads = await Lead.countDocuments({ 
      workspace: req.params.workspaceId, 
      score: { $gte: 70 },
      stage: { $ne: 'customer', $ne: 'lost' }
    });
    
    const totalValue = await Lead.aggregate([
      { $match: { workspace: req.workspace, stage: { $in: ['opportunity', 'negotiation'] } } },
      { $group: { _id: null, total: { $sum: '$estimatedValue' } } }
    ]);
    
    res.json({
      stages: metrics,
      hotLeads,
      pipelineValue: totalValue[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;