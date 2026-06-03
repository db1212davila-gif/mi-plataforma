import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AdminDashboard from './pages/AdminDashboard';
import PipelineKanban from './components/PipelineKanban';
import LeadScoring from './components/LeadScoring';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

function App() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterChannel, setFilterChannel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({ total: 0, open: 0, pending: 0, resolved: 0 });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('conversations');

  // CONTACTOS REALES - OmniConnect CRM
  const realContacts = [
    { id: 1, name: "Cristofer Davila", channel: "whatsapp", status: "open", lastMessage: "Cliente - Esperando respuesta", time: new Date().toLocaleTimeString(), unread: 0, avatar: "CD", channelId: "0963176949", phoneNumber: "0963176949" },
    { id: 2, name: "Bryan Davila", channel: "whatsapp", status: "open", lastMessage: "Administrador - Cliente potencial", time: new Date().toLocaleTimeString(), unread: 0, avatar: "BD", channelId: "0963117997", phoneNumber: "0963117997" },
    { id: 3, name: "Recor Digital", channel: "telegram", status: "pending", lastMessage: "Canal de Telegram - Recor Digital", time: new Date().toLocaleTimeString(), unread: 0, avatar: "RD", channelId: "@RecorDigital", username: "@RecorDigital" },
    { id: 4, name: "Contacto Email", channel: "email", status: "pending", lastMessage: "db1212davila@gmail.com", time: new Date().toLocaleTimeString(), unread: 0, avatar: "CE", channelId: "db1212davila@gmail.com" }
  ];

  const mockMessages = {
    1: [{ id: 1, from: "contact", text: "Hola, necesito información sobre sus servicios", time: "10:30" }, { id: 2, from: "agent", text: "¡Hola Cristofer! Claro, ¿en qué puedo ayudarte?", time: "10:32" }],
    2: [{ id: 1, from: "contact", text: "Buen día, quisiera una cotización", time: "09:15" }, { id: 2, from: "agent", text: "Hola Bryan, con gusto te ayudo con la cotización", time: "09:20" }]
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedWorkspace = localStorage.getItem('workspace');
    
    if (token && storedUser && storedWorkspace) {
      const parsedUser = JSON.parse(storedUser);
      const parsedWorkspace = JSON.parse(storedWorkspace);
      setUser(parsedUser);
      setWorkspace(parsedWorkspace);
      setIsLoggedIn(true);
      
      if (parsedUser.role === 'super_admin') {
        setActiveTab('global_dashboard');
      } else {
        const total = realContacts.length;
        const open = realContacts.filter(c => c.status === "open").length;
        const pending = realContacts.filter(c => c.status === "pending").length;
        const resolved = realContacts.filter(c => c.status === "resolved").length;
        setStats({ total, open, pending, resolved });
        setConversations(realContacts);
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
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
        
        if (data.user.role === 'super_admin') {
          setActiveTab('global_dashboard');
        }
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    if (selectedConversation.channel === 'email') {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`${API_URL}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ to: selectedConversation.channelId, subject: 'Mensaje de OmniConnect CRM', message: newMessage })
        });
        const data = await response.json();
        if (data.success) alert('✅ Email enviado correctamente');
        else alert('❌ Error al enviar email: ' + data.error);
      } catch (error) {
        alert('Error de conexión con el servidor');
      }
    }
    
    const newMsg = { id: Date.now(), from: "agent", text: newMessage, time: new Date().toLocaleTimeString() };
    setMessages([...messages, newMsg]);
    setNewMessage('');
  };

  const updateConversationStatus = (conversationId, status) => {
    setConversations(prev => prev.map(conv => conv.id === conversationId ? { ...conv, status } : conv));
    const updatedConvs = conversations.map(conv => conv.id === conversationId ? { ...conv, status } : conv);
    const open = updatedConvs.filter(c => c.status === "open").length;
    const pending = updatedConvs.filter(c => c.status === "pending").length;
    const resolved = updatedConvs.filter(c => c.status === "resolved").length;
    setStats({ total: conversations.length, open, pending, resolved });
  };

  const getChannelIcon = (channel) => {
    const icons = { whatsapp: '💚', telegram: '💙', messenger: '💜', instagram: '💗', email: '📧' };
    return icons[channel] || '💬';
  };

  const getChannelColor = (channel) => {
    const colors = { whatsapp: '#25D366', telegram: '#0088cc', messenger: '#0084ff', instagram: '#E4405F', email: '#EA4335' };
    return colors[channel] || '#666';
  };

  const getStatusColor = (status) => {
    const colors = { open: '#4caf50', pending: '#ff9800', resolved: '#2196f3' };
    return colors[status] || '#9e9e9e';
  };

  const getStatusText = (status) => {
    const texts = { open: '🟢 Abierta', pending: '🟡 Pendiente', resolved: '🔵 Resuelta' };
    return texts[status] || status;
  };

  const filteredConversations = conversations.filter(conv => {
    if (filterChannel !== 'all' && conv.channel !== filterChannel) return false;
    if (filterStatus !== 'all' && conv.status !== filterStatus) return false;
    return true;
  });

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0d1117', color: 'white' }}>Cargando OmniConnect CRM...</div>;
  }

  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0d1117' }}>
        <div style={{ backgroundColor: '#161b22', padding: '40px', borderRadius: '12px', width: '400px', border: '1px solid #30363d' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '30px', color: 'white' }}>🚀 OmniConnect CRM</h2>
          <form onSubmit={(e) => { e.preventDefault(); handleLogin(e.target.email.value, e.target.password.value); }}>
            <input type="email" name="email" placeholder="Email" style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: 'white' }} required />
            <input type="password" name="password" placeholder="Contraseña" style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '6px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: 'white' }} required />
            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#238636', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Ingresar</button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '20px', color: '#8b949e', fontSize: '12px' }}>Demo: usa cualquier email y contraseña</p>
        </div>
      </div>
    );
  }

  // VISTA PARA SUPER ADMIN
  if (user?.role === 'super_admin') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0d1117' }}>
        <Navbar user={user} workspace={workspace} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
        <div style={{ padding: '20px' }}>
          {activeTab === 'global_dashboard' && <AdminDashboard user={user} token={localStorage.getItem('token')} />}
          {activeTab === 'clients' && <div style={{ color: 'white' }}>📋 Gestión de Clientes (próximamente)</div>}
          {activeTab === 'workspaces' && <div style={{ color: 'white' }}>🏭 Workspaces (próximamente)</div>}
          {activeTab === 'users' && <div style={{ color: 'white' }}>👤 Usuarios (próximamente)</div>}
        </div>
      </div>
    );
  }

  // VISTA PARA CLIENTE (ADMIN, AGENT, VIEWER)
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0d1117' }}>
      <Navbar user={user} workspace={workspace} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      
      {/* Panel de contenido según pestaña seleccionada */}
      {activeTab === 'pipeline' && (
        <PipelineKanban workspaceId={user?.workspace} token={localStorage.getItem('token')} />
      )}
      
      {activeTab === 'scoring' && (
        <LeadScoring workspaceId={user?.workspace} token={localStorage.getItem('token')} />
      )}
      
      {(activeTab === 'conversations' || activeTab === 'contacts' || activeTab === 'agents' || activeTab === 'reports' || activeTab === 'settings' || activeTab === 'billing') && (
        <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
          {/* Sidebar izquierdo */}
          <div style={{ width: '320px', backgroundColor: '#161b22', borderRight: '1px solid #30363d', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #30363d' }}>
              <h3 style={{ margin: 0, color: 'white', fontSize: '16px' }}>{workspace?.name || 'Mi Empresa'}</h3>
              <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#8b949e' }}>Plan: {user?.plan || 'Free'} • {user?.name} • {user?.role}</p>
            </div>
            
            <div style={{ padding: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ backgroundColor: '#21262d', padding: '12px', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>{stats.total}</div><div style={{ fontSize: '11px', color: '#8b949e' }}>Total</div></div>
              <div style={{ backgroundColor: '#21262d', padding: '12px', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>{stats.open}</div><div style={{ fontSize: '11px', color: '#8b949e' }}>Abiertas</div></div>
              <div style={{ backgroundColor: '#21262d', padding: '12px', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>{stats.pending}</div><div style={{ fontSize: '11px', color: '#8b949e' }}>Pendientes</div></div>
              <div style={{ backgroundColor: '#21262d', padding: '12px', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196f3' }}>{stats.resolved}</div><div style={{ fontSize: '11px', color: '#8b949e' }}>Resueltas</div></div>
            </div>

            <div style={{ padding: '15px', borderTop: '1px solid #30363d', borderBottom: '1px solid #30363d' }}>
              <select value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: 'white', marginBottom: '10px' }}>
                <option value="all">📱 Todos los canales</option>
                <option value="whatsapp">💚 WhatsApp</option>
                <option value="telegram">💙 Telegram</option>
                <option value="messenger">💜 Messenger</option>
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: 'white' }}>
                <option value="all">📊 Todos los estados</option>
                <option value="open">🟢 Abiertas</option>
                <option value="pending">🟡 Pendientes</option>
                <option value="resolved">🔵 Resueltas</option>
              </select>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredConversations.map(conv => (
                <div key={conv.id} onClick={() => selectConversation(conv)} style={{ padding: '15px', borderBottom: '1px solid #21262d', cursor: 'pointer', backgroundColor: selectedConversation?.id === conv.id ? '#1f6feb20' : 'transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: getChannelColor(conv.channel), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: 'white' }}>{conv.avatar}</div>
                      <strong style={{ color: 'white' }}>{conv.name}</strong>
                    </div>
                    <span>{getChannelIcon(conv.channel)}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '5px', marginLeft: '40px' }}>{conv.lastMessage}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginLeft: '40px' }}>
                    <span style={{ fontSize: '10px', color: '#6e7681' }}>{conv.time}</span>
                    <span style={{ fontSize: '11px', color: getStatusColor(conv.status) }}>{getStatusText(conv.status)}</span>
                    {conv.unread > 0 && <span style={{ backgroundColor: '#1f6feb', color: 'white', borderRadius: '10px', padding: '2px 6px', fontSize: '10px' }}>{conv.unread}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Panel central - Chat */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {selectedConversation && (
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #30363d', backgroundColor: '#161b22' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: getChannelColor(selectedConversation.channel), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', color: 'white' }}>{selectedConversation.avatar}</div>
                    <div><h3 style={{ margin: 0, color: 'white' }}>{selectedConversation.name}</h3><div style={{ fontSize: '11px', color: '#8b949e' }}>{getChannelIcon(selectedConversation.channel)} {selectedConversation.channel} • {selectedConversation.channelId}</div></div>
                  </div>
                  <select value={selectedConversation.status} onChange={(e) => updateConversationStatus(selectedConversation.id, e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #30363d', backgroundColor: '#21262d', color: 'white' }}>
                    <option value="open">🟢 Abierta</option><option value="pending">🟡 Pendiente</option><option value="resolved">🔵 Resuelta</option>
                  </select>
                </div>
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {selectedConversation ? messages.map(msg => (
                <div key={msg.id} style={{ display: 'flex', justifyContent: msg.from === 'agent' ? 'flex-end' : 'flex-start', marginBottom: '16px' }}>
                  <div style={{ maxWidth: '65%', padding: '10px 14px', borderRadius: '12px', backgroundColor: msg.from === 'agent' ? '#1f6feb' : '#21262d', color: 'white' }}>
                    <div>{msg.text}</div><div style={{ fontSize: '10px', marginTop: '6px', opacity: 0.7 }}>{msg.time}</div>
                  </div>
                </div>
              )) : <div style={{ textAlign: 'center', color: '#8b949e', marginTop: '100px' }}>💬 Selecciona una conversación para comenzar</div>}
            </div>

            {selectedConversation && (
              <div style={{ padding: '16px 20px', borderTop: '1px solid #30363d', backgroundColor: '#161b22', display: 'flex', gap: '10px' }}>
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Escribe un mensaje..." style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: 'white', outline: 'none' }} />
                <button onClick={sendMessage} style={{ padding: '12px 24px', backgroundColor: '#1f6feb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Enviar →</button>
              </div>
            )}
          </div>

          {/* Sidebar derecho */}
          <div style={{ width: '280px', backgroundColor: '#161b22', borderLeft: '1px solid #30363d', padding: '20px' }}>
            {selectedConversation ? (
              <>
                <h4 style={{ marginTop: 0, marginBottom: '16px', color: 'white' }}>ℹ️ Información</h4>
                <div style={{ marginBottom: '20px' }}><div style={{ fontSize: '11px', color: '#8b949e' }}>Nombre</div><div style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>{selectedConversation.name}</div></div>
                <div style={{ marginBottom: '20px' }}><div style={{ fontSize: '11px', color: '#8b949e' }}>Canal</div><div style={{ fontSize: '14px', color: 'white' }}>{getChannelIcon(selectedConversation.channel)} {selectedConversation.channel}</div></div>
                <div style={{ marginBottom: '20px' }}><div style={{ fontSize: '11px', color: '#8b949e' }}>ID / Teléfono</div><div style={{ fontSize: '13px', color: '#c9d1d9' }}>{selectedConversation.channelId}</div></div>
                <h4 style={{ marginTop: '24px', marginBottom: '12px', color: 'white' }}>⚡ Respuestas rápidas</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {['Gracias por contactarnos', 'En breve te atenderemos', '¿En qué más puedo ayudarte?', 'Tu pedido está en proceso'].map((respuesta, idx) => (
                    <button key={idx} onClick={() => setNewMessage(respuesta)} style={{ padding: '8px 12px', textAlign: 'left', backgroundColor: '#21262d', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#c9d1d9' }}>{respuesta}</button>
                  ))}
                </div>
              </>
            ) : <div style={{ textAlign: 'center', color: '#8b949e', marginTop: '100px' }}>📌 Selecciona una conversación</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;