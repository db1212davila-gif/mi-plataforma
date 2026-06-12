const router = require('express').Router();
const axios  = require('axios');

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_KEY = process.env.AUTHENTICATION_API_KEY;

// Obtener QR para conectar WhatsApp
router.get('/qr/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params;
    const response = await axios.get(
      `${EVOLUTION_URL}/instance/connect/${instanceName}`,
      { headers: { apikey: EVOLUTION_KEY } }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar mensaje de WhatsApp
router.post('/send/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params;
    const { phone, message } = req.body;
    const response = await axios.post(
      `${EVOLUTION_URL}/message/sendText/${instanceName}`,
      { number: phone, text: message },
      { headers: { apikey: EVOLUTION_KEY } }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar instancias activas
router.get('/instances', async (req, res) => {
  try {
    const response = await axios.get(
      `${EVOLUTION_URL}/instance/fetchInstances`,
      { headers: { apikey: EVOLUTION_KEY } }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;