const router = require('express').Router();

router.post('/', async (req, res) => {
  console.log('📨 Webhook Messenger recibido:', JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

// Verificación de webhook (Meta lo requiere)
router.get('/', (req, res) => {
  const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN || 'omniconnect_messenger';
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

module.exports = router;