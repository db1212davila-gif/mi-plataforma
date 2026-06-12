const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const http      = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app    = express();
const server = http.createServer(app);

// ─────────────────────────────────────────────────────────────
// SOCKET.IO — con salas por workspace
// ─────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://mi-plataforma-six.vercel.app',
      'https://mi-plataforma.vercel.app'
    ],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);

  // El frontend emite 'join_workspace' con el workspaceId
  socket.on('join_workspace', (workspaceId) => {
    socket.join(workspaceId);
    console.log(`📦 Socket ${socket.id} unido al workspace: ${workspaceId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Cliente desconectado: ${socket.id}`);
  });
});

// Hacer io accesible en todas las rutas vía req.app.get('io')
app.set('io', io);

// ─────────────────────────────────────────────────────────────
// MIDDLEWARES
// ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://mi-plataforma-six.vercel.app',
    'https://mi-plataforma.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());

// ─────────────────────────────────────────────────────────────
// MIDDLEWARES DE AUTH
// ─────────────────────────────────────────────────────────────
const auth = require('./middleware/auth');

// ─────────────────────────────────────────────────────────────
// WEBHOOKS (sin auth — Evolution API llama directo)
// ─────────────────────────────────────────────────────────────
const whatsappWebhook  = require('./webhooks/whatsapp');
const telegramWebhook  = require('./webhooks/telegram');
const messengerWebhook = require('./webhooks/messenger');

app.use('/webhook/whatsapp',  whatsappWebhook);
app.use('/webhook/telegram',  telegramWebhook);
app.use('/webhook/messenger', messengerWebhook);

// ─────────────────────────────────────────────────────────────
// RUTAS PÚBLICAS
// ─────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// ─────────────────────────────────────────────────────────────
// RUTAS PROTEGIDAS
// ─────────────────────────────────────────────────────────────
const workspaceRoutes    = require('./routes/workspaces');
const contactRoutes      = require('./routes/contacts');
const conversationRoutes = require('./routes/conversations');
const messageRoutes      = require('./routes/messages');
const emailRoutes        = require('./routes/email');
const adminRoutes        = require('./routes/admin');
const leadRoutes         = require('./routes/leads');
const pipelineRoutes     = require('./routes/pipeline');
const whatsappRoutes     = require('./routes/whatsapp');

app.use('/api/workspaces',    auth, workspaceRoutes);
app.use('/api/contacts',      auth, contactRoutes);
app.use('/api/conversations', auth, conversationRoutes);
app.use('/api/messages',      auth, messageRoutes);
app.use('/api/email',         auth, emailRoutes);
app.use('/api/admin',         auth, adminRoutes);
app.use('/api/leads',         auth, leadRoutes);
app.use('/api/pipeline',      auth, pipelineRoutes);
app.use('/api/whatsapp',      auth, whatsappRoutes);

// ─────────────────────────────────────────────────────────────
// RUTA DE SALUD
// ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message:  'OmniConnect API funcionando 🚀',
    version:  '2.0',
    channels: ['whatsapp', 'telegram', 'messenger']
  });
});

// ─────────────────────────────────────────────────────────────
// MANEJO DE ERRORES GLOBAL
// ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error no manejado:', err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ─────────────────────────────────────────────────────────────
// MONGODB
// ─────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error MongoDB:', err));

// ─────────────────────────────────────────────────────────────
// SERVIDOR
// ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4001;
server.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});