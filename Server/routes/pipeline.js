const router = require('express').Router();
const auth = require('../middleware/auth');
const { hasWorkspaceAccess } = require('../middleware/roleMiddleware');
const Task = require('../models/Task');

// Obtener tareas del pipeline
router.get('/:workspaceId/tasks', auth, hasWorkspaceAccess, async (req, res) => {
  try {
    const { status, assignedTo } = req.query;
    const filter = { workspace: req.params.workspaceId };
    
    if (status && status !== 'all') filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;
    
    const tasks = await Task.find(filter)
      .populate('lead')
      .populate('assignedTo', 'name email')
      .sort({ dueDate: 1, priority: -1 });
    
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear tarea
router.post('/:workspaceId/tasks', auth, hasWorkspaceAccess, async (req, res) => {
  try {
    const { leadId, title, description, type, priority, dueDate } = req.body;
    
    const task = new Task({
      workspace: req.params.workspaceId,
      lead: leadId || null,
      title,
      description,
      type: type || 'other',
      priority: priority || 'medium',
      assignedTo: req.userId,
      dueDate: dueDate || null
    });
    
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Completar tarea
router.patch('/:workspaceId/tasks/:taskId/complete', auth, hasWorkspaceAccess, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.taskId, workspace: req.params.workspaceId },
      { status: 'completed', completedAt: new Date() },
      { new: true }
    );
    
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;