// Reglas de respuestas automáticas (palabras clave en español)
const rules = [
  {
    keywords: ['hola', 'buenas', 'holi', 'buen día', 'buenas tardes', 'buenas noches'],
    response: '¡Hola! 😊 ¿En qué puedo ayudarte hoy?'
  },
  {
    keywords: ['horario', 'horarios', 'abren', 'atienden', 'a qué hora', 'cuándo abren'],
    response: '🕐 Atendemos de Lunes a Viernes de 9:00 AM a 6:00 PM. ¡Estamos para servirte!'
  },
  {
    keywords: ['precio', 'cuesta', 'valor', 'cuánto', 'precios'],
    response: '💰 Los precios varían según el producto. ¿Qué producto o servicio te interesa? Así te doy la información exacta.'
  },
  {
    keywords: ['pedido', 'mi pedido', 'estado de mi pedido', 'dónde está mi pedido'],
    response: '📦 Dame tu número de pedido y con gusto lo revisamos para ti.'
  },
  {
    keywords: ['gracias', 'graciass', 'thx', 'ok', 'vale'],
    response: '¡A ti por contactarnos! 🙌 ¿Necesitas algo más?'
  },
  {
    keywords: ['hablar con agente', 'humano', 'persona', 'atención al cliente', 'soporte'],
    response: '👨‍💼 Te voy a conectar con un agente humano en unos momentos. Por favor espera un poco.'
  },
  {
    keywords: ['pizza', 'pizzas', 'menú', 'carta'],
    response: '🍕 Nuestras pizzas: Pepperoni ($15), Margarita ($12), Hawaiana ($14), Cuatro Quesos ($16). ¿Cuál te gusta?'
  },
  {
    keywords: ['cerveza', 'bebida', 'gaseosa', 'refresco'],
    response: '🥤 Bebidas: Coca Cola ($3), Sprite ($3), Cerveza ($4), Agua ($2).'
  },
  {
    keywords: ['domicilio', 'delivery', 'envío', 'para llevar'],
    response: '🚗 Hacemos delivery sin costo adicional en un radio de 5km. El tiempo de entrega es de 30-45 minutos.'
  }
];

// Función para buscar respuesta automática
const getAutoResponse = (message) => {
  const lowerMessage = message.toLowerCase();
  
  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      if (lowerMessage.includes(keyword)) {
        return {
          matched: true,
          response: rule.response,
          keyword: keyword
        };
      }
    }
  }
  
  return {
    matched: false,
    response: null
  };
};

// Función para derivar a agente (marca la conversación como pendiente)
const escalateToAgent = async (conversationId, Conversation) => {
  await Conversation.findByIdAndUpdate(conversationId, {
    status: 'pending',
    updatedAt: new Date()
  });
  return true;
};

module.exports = { getAutoResponse, escalateToAgent };