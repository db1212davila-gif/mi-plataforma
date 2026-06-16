const router = require('express').Router();

// Webhook SIMPLE para diagnosticar
router.post('/:instanceName', async (req, res) => {
  console.log('📩 WEBHOOK RECIBIDO EN RENDER');
  console.log('📩 Instancia:', req.params.instanceName);
  console.log('📩 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📩 Body:', JSON.stringify(req.body, null, 2));
  
  // Siempre responder OK para que Evolution no reintente
  res.status(200).json({ 
    success: true, 
    message: 'Webhook recibido en Render',
    instance: req.params.instanceName,
    body: req.body
  });
});

module.exports = router;