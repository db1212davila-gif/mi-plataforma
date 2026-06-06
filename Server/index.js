const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Modelos
const User = require('./models/User');
const Workspace = require('./models/Workspace');
const Contact = require('./models/Contact');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

// Middleware de autenticación
const auth = require('./middleware/auth');

// Rutas
const authRoutes = require('./routes/auth');
const workspaceRoutes = require('./routes/workspaces');
const contactRoutes = require('./routes/contacts');
const conversationRoutes = require('./routes/conversations');
const messageRoutes = require('./routes/messages');
const emailRoutes = require('./routes/email');
const adminRoutes = require('./routes/admin');
const leadRoutes = require('./routes/leads');
const pipelineRoutes = require('./routes/pipeline');

// Usar rutas públicas
app.use('/api/auth', authRoutes);

// Usar rutas protegidas
app.use('/api/workspaces', auth, workspaceRoutes);
app.use('/api/contacts', auth, contactRoutes);
app.use('/api/conversations', auth, conversationRoutes);
app.use('/api/messages', auth, messageRoutes);
app.use('/api/email', auth, emailRoutes);
app.use('/api/admin', auth, adminRoutes);
app.use('/api/leads', auth, leadRoutes);
app.use('/api/pipeline', auth, pipelineRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: 'API funcionando 🚀' });
});

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error:', err));

const PORT = process.env.PORT || 4001;
server.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
