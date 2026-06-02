import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

function App() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [user, setUser] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterChannel, setFilterChannel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({ total: 0, open: 0, pending: 0, resolved: 0 });
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Datos de prueba (mientras no hay backend)
  const mockContacts = [
    { id: 1, name: "Juan Pérez", channel: "whatsapp", status: "open", lastMessage: "Hola, ¿cómo están?", time: "10:30", unread: 2, avatar: "JP", channelId: "+56912345678" },
    { id: 2, name: "María González", channel: "telegram", status: "pending", lastMessage: "Necesito información", time: "09:15", unread: 0, avatar: "MG", channelId: "@maria_g" },
    { id: 3, name: "Carlos López", channel: "messenger", status: "resolved", lastMessage: "Gracias por la ayuda", time: "ayer", unread: 0, avatar: "CL", channelId: "carlos.lopez" },
    { id: 4, name: "Ana Martínez", channel: "whatsapp", status: "open", lastMessage: "¿Cuándo llega mi pedido?", time: "08:45", unread: 3, avatar: "AM", channelId: "+56987654321" },
    { id: 5, name: "Pedro Sánchez", channel: "telegram", status: "pending", lastMessage: "Quiero contratar sus servicios", time: "ayer", unread: 1, avatar: "PS", channelId: "@pedro_s" },
  ];

  const mockMessages = {
    1: [
      { id: 1, from: "contact", text: "Hola, ¿cómo están?", time: "10:30" },
      { id: 2, from: "agent", text: "¡Hola Juan! Bien, ¿en qué podemos ayudarte?", time: "10:32" },
      { id: 3, from: "contact", text: "Quisiera saber el estado de mi pedido", time: "10:33" },
    ],
    2: [
      { id: 1, from: "contact", text: "Necesito información sobre sus planes", time: "09:15" },
      { id: 2, from: "agent", text: "Claro María, te comparto nuestros planes", time: "09:20" },
    ],
  };

  // Verificar autenticación al cargar
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedWorkspace = localStorage.getItem('workspace');
    
    if (token && storedUser && storedWorkspace) {
      setUser(JSON.parse(storedUser));
      setWorkspace(JSON.parse(storedWorkspace));
      setIsLoggedIn(true);
      
      // Calcular stats con datos de prueba
      const total = mockContacts.length;
      const open = mockContacts.filter(c => c.status === "open").length;
      const pending = mockContacts.filter(c => c.status === "pending").length;
      const resolved = mockContacts.filter(c => c.status === "resolved").length;
      setStats({ total, open, pending, resolved });
      setConversations(mockContacts);
    }
    setLoading(false);
  }, []);

  const handleLogin = async (email, password) => {
  try {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('workspace', JSON.stringify(data.workspace));
      setUser(data.user);
      setWorkspace(data.workspace);
      setIsLoggedIn(true);
    } else {
      alert(data.error || 'Error al iniciar sesión');
    }
  } catch (error) {
    alert('Error de conexión con el servidor');
  }
};

const handleLogout = () => {
  localStorage.clear();
  setUser(null);
  setWorkspace(null);
  setIsLoggedIn(false);
  setSelectedConversation(null);
};

  const selectConversation = (conversation) => {
    setSelectedConversation(conversation);
    const conversationMessages = mockMessages[conversation.id] || [];
    setMessages(conversationMessages);
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    const newMsg = {
      id: Date.now(),
      from: "agent",
      text: newMessage,
      time: new Date().toLocaleTimeString()
    };
    
    setMessages([...messages, newMsg]);
    setNewMessage('');
  };

  const updateConversationStatus = (conversationId, status) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId ? { ...conv, status } : conv
      )
    );
    
    // Actualizar stats
    const updatedConvs = conversations.map(conv => 
      conv.id === conversationId ? { ...conv, status } : conv
    );
    const open = updatedConvs.filter(c => c.status === "open").length;
    const pending = updatedConvs.filter(c => c.status === "pending").length;
    const resolved = updatedConvs.filter(c => c.status === "resolved").length;
    setStats({ total: conversations.length, open, pending, resolved });
  };

  const getChannelIcon = (channel) => {
    const icons = {
      whatsapp: '💚',
      telegram: '💙',
      messenger: '💜',
      instagram: '💗',
      email: '📧'
    };
    return icons[channel] || '💬';
  };

  const getChannelColor = (channel) => {
    const colors = {
      whatsapp: '#25D366',
      telegram: '#0088cc',
      messenger: '#0084ff',
      instagram: '#E4405F',
      email: '#EA4335'
    };
    return colors[channel] || '#666';
  };

  const getStatusColor = (status) => {
    const colors = {
      open: '#4caf50',
      pending: '#ff9800',
      resolved: '#2196f3'
    };
    return colors[status] || '#9e9e9e';
  };

  const getStatusText = (status) => {
    const texts = {
      open: '🟢 Abierta',
      pending: '🟡 Pendiente',
      resolved: '🔵 Resuelta'
    };
    return texts[status] || status;
  };

  // Filtrar conversaciones
  const filteredConversations = conversations.filter(conv => {
    if (filterChannel !== 'all' && conv.channel !== filterChannel) return false;
    if (filterStatus !== 'all' && conv.status !== filterStatus) return false;
    return true;
  });

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#0d1117',
        color: 'white'
      }}>
        <div>Cargando plataforma...</div>
      </div>
    );
  }

  // Pantalla de login
  if (!isLoggedIn) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh', 
        backgroundColor: '#0d1117',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ 
          backgroundColor: '#161b22', 
          padding: '40px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          width: '400px',
          border: '1px solid #30363d'
        }}>
          <h2 style={{ 
            textAlign: 'center', 
            marginBottom: '30px', 
            color: 'white',
            fontSize: '24px'
          }}>
            🚀 Plataforma de Mensajería
          </h2>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const email = e.target.email.value;
            const password = e.target.password.value;
            handleLogin(email, password);
          }}>
            <input
              type="email"
              name="email"
              placeholder="Email"
              style={{ 
                width: '100%', 
                padding: '12px', 
                marginBottom: '15px', 
                borderRadius: '6px', 
                border: '1px solid #30363d',
                backgroundColor: '#0d1117',
                color: 'white',
                fontSize: '14px'
              }}
              required
            />
            
            <input
              type="password"
              name="password"
              placeholder="Contraseña"
              style={{ 
                width: '100%', 
                padding: '12px', 
                marginBottom: '20px', 
                borderRadius: '6px', 
                border: '1px solid #30363d',
                backgroundColor: '#0d1117',
                color: 'white',
                fontSize: '14px'
              }}
              required
            />
            
            <button
              type="submit"
              style={{ 
                width: '100%', 
                padding: '12px', 
                backgroundColor: '#238636', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer', 
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Ingresar
            </button>
          </form>
          
          <p style={{ 
            textAlign: 'center', 
            marginTop: '20px', 
            color: '#8b949e',
            fontSize: '12px'
          }}>
            Demo: usa cualquier email y contraseña
          </p>
        </div>
      </div>
    );
  }

  // Dashboard principal
  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#0d1117'
    }}>
      {/* Sidebar izquierdo */}
      <div style={{ 
        width: '300px', 
        backgroundColor: '#161b22', 
        borderRight: '1px solid #30363d',
        display: 'flex', 
        flexDirection: 'column'
      }}>
        {/* Header del workspace */}
        <div style={{ 
          padding: '20px', 
          borderBottom: '1px solid #30363d',
          backgroundColor: '#161b22'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: 'white' }}>{workspace?.name}</h2>
          <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#8b949e' }}>
            Plan: {user?.plan || 'Free'} • {user?.name}
          </p>
          <button 
            onClick={handleLogout}
            style={{ 
              marginTop: '10px', 
              padding: '6px 12px', 
              fontSize: '12px', 
              cursor: 'pointer',
              backgroundColor: '#21262d',
              color: '#c9d1d9',
              border: '1px solid #30363d',
              borderRadius: '6px'
            }}
          >
            Cerrar sesión
          </button>
        </div>

        {/* Stats cards */}
        <div style={{ padding: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ backgroundColor: '#21262d', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>{stats.total}</div>
            <div style={{ fontSize: '11px', color: '#8b949e' }}>Total</div>
          </div>
          <div style={{ backgroundColor: '#21262d', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>{stats.open}</div>
            <div style={{ fontSize: '11px', color: '#8b949e' }}>Abiertas</div>
          </div>
          <div style={{ backgroundColor: '#21262d', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>{stats.pending}</div>
            <div style={{ fontSize: '11px', color: '#8b949e' }}>Pendientes</div>
          </div>
          <div style={{ backgroundColor: '#21262d', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196f3' }}>{stats.resolved}</div>
            <div style={{ fontSize: '11px', color: '#8b949e' }}>Resueltas</div>
          </div>
        </div>

        {/* Filtros */}
        <div style={{ padding: '15px', borderTop: '1px solid #30363d', borderBottom: '1px solid #30363d' }}>
          <div style={{ marginBottom: '10px' }}>
            <select 
              value={filterChannel} 
              onChange={(e) => setFilterChannel(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '6px', 
                border: '1px solid #30363d',
                backgroundColor: '#0d1117',
                color: 'white'
              }}
            >
              <option value="all">📱 Todos los canales</option>
              <option value="whatsapp">💚 WhatsApp</option>
              <option value="telegram">💙 Telegram</option>
              <option value="messenger">💜 Messenger</option>
            </select>
          </div>
          <div>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '6px', 
                border: '1px solid #30363d',
                backgroundColor: '#0d1117',
                color: 'white'
              }}
            >
              <option value="all">📊 Todos los estados</option>
              <option value="open">🟢 Abiertas</option>
              <option value="pending">🟡 Pendientes</option>
              <option value="resolved">🔵 Resueltas</option>
            </select>
          </div>
        </div>

        {/* Lista de conversaciones */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredConversations.map(conv => (
            <div 
              key={conv.id}
              onClick={() => selectConversation(conv)}
              style={{
                padding: '15px',
                borderBottom: '1px solid #21262d',
                cursor: 'pointer',
                backgroundColor: selectedConversation?.id === conv.id ? '#1f6feb20' : 'transparent',
                transition: 'background-color 0.2s',
                borderLeft: selectedConversation?.id === conv.id ? `3px solid ${getChannelColor(conv.channel)}` : '3px solid transparent'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: getChannelColor(conv.channel),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: 'white'
                  }}>
                    {conv.avatar}
                  </div>
                  <strong style={{ color: 'white' }}>{conv.name}</strong>
                </div>
                <span style={{ fontSize: '16px' }}>{getChannelIcon(conv.channel)}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '5px', marginLeft: '40px' }}>
                {conv.lastMessage}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginLeft: '40px' }}>
                <span style={{ fontSize: '10px', color: '#6e7681' }}>{conv.time}</span>
                <span style={{ fontSize: '11px', color: getStatusColor(conv.status) }}>
                  {getStatusText(conv.status)}
                </span>
                {conv.unread > 0 && (
                  <span style={{ 
                    backgroundColor: '#1f6feb', 
                    color: 'white', 
                    borderRadius: '10px', 
                    padding: '2px 6px', 
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}>
                    {conv.unread}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel central - Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0d1117' }}>
        {/* Header del chat */}
        {selectedConversation && (
          <div style={{ 
            padding: '16px 20px', 
            borderBottom: '1px solid #30363d', 
            backgroundColor: '#161b22'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: getChannelColor(selectedConversation.channel),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: 'white'
                }}>
                  {selectedConversation.avatar}
                </div>
                <div>
                  <h3 style={{ margin: 0, color: 'white' }}>{selectedConversation.name}</h3>
                  <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '4px' }}>
                    {getChannelIcon(selectedConversation.channel)} {selectedConversation.channel} • {selectedConversation.channelId}
                  </div>
                </div>
              </div>
              <div>
                <select 
                  value={selectedConversation.status}
                  onChange={(e) => updateConversationStatus(selectedConversation.id, e.target.value)}
                  style={{ 
                    padding: '6px 12px', 
                    borderRadius: '6px', 
                    border: '1px solid #30363d',
                    backgroundColor: '#21262d',
                    color: 'white',
                    fontSize: '12px'
                  }}
                >
                  <option value="open">🟢 Abierta</option>
                  <option value="pending">🟡 Pendiente</option>
                  <option value="resolved">🔵 Resuelta</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Área de mensajes */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {selectedConversation ? (
            messages.map(msg => (
              <div 
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: msg.from === 'agent' ? 'flex-end' : 'flex-start',
                  marginBottom: '16px'
                }}
              >
                <div style={{
                  maxWidth: '65%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: msg.from === 'agent' ? '#1f6feb' : '#21262d',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '14px', lineHeight: 1.4 }}>{msg.text}</div>
                  <div style={{ fontSize: '10px', marginTop: '6px', opacity: 0.7 }}>
                    {msg.time}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ 
              textAlign: 'center', 
              color: '#8b949e', 
              marginTop: '100px',
              fontSize: '14px'
            }}>
              💬 Selecciona una conversación para comenzar
            </div>
          )}
        </div>

        {/* Input de mensaje */}
        {selectedConversation && (
          <div style={{ 
            padding: '16px 20px', 
            borderTop: '1px solid #30363d', 
            backgroundColor: '#161b22',
            display: 'flex', 
            gap: '10px'
          }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Escribe un mensaje..."
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #30363d',
                backgroundColor: '#0d1117',
                color: 'white',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <button
              onClick={sendMessage}
              style={{
                padding: '12px 24px',
                backgroundColor: '#1f6feb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              Enviar →
            </button>
          </div>
        )}
      </div>

      {/* Sidebar derecho - Info y acciones rápidas */}
      <div style={{ 
        width: '280px', 
        backgroundColor: '#161b22', 
        borderLeft: '1px solid #30363d', 
        padding: '20px'
      }}>
        {selectedConversation ? (
          <>
            <h4 style={{ marginTop: 0, marginBottom: '16px', color: 'white' }}>ℹ️ Información</h4>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px' }}>Nombre</div>
              <div style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>{selectedConversation.name}</div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px' }}>Canal</div>
              <div style={{ fontSize: '14px', color: 'white' }}>
                {getChannelIcon(selectedConversation.channel)} {selectedConversation.channel}
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px' }}>ID / Teléfono</div>
              <div style={{ fontSize: '13px', color: '#c9d1d9' }}>{selectedConversation.channelId}</div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px' }}>Desde</div>
              <div style={{ fontSize: '13px', color: '#c9d1d9' }}>{selectedConversation.time}</div>
            </div>
            
            <h4 style={{ marginTop: '24px', marginBottom: '12px', color: 'white' }}>⚡ Respuestas rápidas</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                'Gracias por contactarnos',
                'En breve te atenderemos',
                '¿En qué más puedo ayudarte?',
                'Tu pedido está en proceso',
                'Por favor comparte tu número de pedido'
              ].map((respuesta, idx) => (
                <button
                  key={idx}
                  onClick={() => setNewMessage(respuesta)}
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    backgroundColor: '#21262d',
                    border: '1px solid #30363d',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#c9d1d9',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#30363d'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#21262d'}
                >
                  {respuesta}
                </button>
              ))}
            </div>

            <h4 style={{ marginTop: '24px', marginBottom: '12px', color: 'white' }}>📝 Notas internas</h4>
            <textarea
              placeholder="Agregar notas sobre este contacto..."
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #30363d',
                backgroundColor: '#0d1117',
                color: 'white',
                fontSize: '12px',
                minHeight: '100px',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </>
        ) : (
          <div style={{ textAlign: 'center', color: '#8b949e', marginTop: '100px', fontSize: '13px' }}>
            📌 Selecciona una<br/>conversación para<br/>ver los detalles
          </div>
        )}
      </div>
    </div>
  );
}

export default App;