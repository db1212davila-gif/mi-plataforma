import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AdminDashboard from './pages/AdminDashboard';
import PipelineKanban from './components/PipelineKanban';
import LeadScoring from './components/LeadScoring';
import AgentsPanel from './pages/AgentsPanel';
import ReportsPanel from './pages/ReportsPanel';
import SettingsPanel from './pages/SettingsPanel';
import BillingPanel from './pages/BillingPanel';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4001';

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

  // ============================================================
  // CARGAR CONTACTOS REALES DESDE EL BACKEND
  // ============================================================
  const loadRealContacts = async (workspaceId, token) => {
    try {
      const response = await fetch(`${API_URL}/api/contacts/${workspaceId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const contacts = await response.json();
        const convFormat = contacts.map(contact => ({
          _id: contact._id,
          contact: contact,
          channel: contact.canal,
          status: 'open',
          lastMessage: 'Sin mensajes aún',
          lastMessageTime: contact.createdAt,
          unreadCount: 0,
          workspace: workspaceId
        }));
        setConversations(convFormat);
        setStats({
          total: contacts.length,
          open: contacts.length,
          pending: 0,
          resolved: 0
        });
      }
    } catch (error) {
      console.error('Error cargando contactos:', error);
    }
  };

  // ============================================================
  // VERIFICAR AUTENTICACIÓN AL CARGAR
  // ============================================================
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
        loadRealContacts(parsedWorkspace.id, token);
      }
    }
    setLoading(false);
  }, []);

  // ============================================================
  // LOGIN REAL
  // ============================================================
  const handleLogin = async (email, password) => {
    setLoading(true);
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
        } else {
          await loadRealContacts(data.workspace.id, data.token);
        }
      } else {
        alert(data.error || 'Error al iniciar sesión');
      }
    } catch (error) {
      alert('Error de conexión con el servidor');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setWorkspace(null);
    setIsLoggedIn(false);
    setSelectedConversation(null);
    setConversations([]);
  };

  const selectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/messages/${conversation.workspace}/${conversation._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error cargando mensajes:', error);
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/messages/${selectedConversation.workspace}/${selectedConversation._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: newMessage, from: 'agent' })
      });
      
      if (response.ok) {
        const newMsg = await response.json();
        setMessages([...messages, newMsg]);
        setNewMessage('');
      }
    } catch (error) {
      alert('Error al enviar mensaje');
    }
  };

  const updateConversationStatus = async (conversationId, status) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/api/conversations/${workspace.id}/${conversationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      
      setConversations(prev => prev.map(conv => 
        conv._id === conversationId ? { ...conv, status } : conv
      ));
    } catch (error) {
      console.error('Error actualizando estado:', error);
    }
  };

  const getChannelIcon = (c) => ({ whatsapp: '💚', telegram: '💙', messenger: '💜', email: '📧' }[c] || '💬');
  const getChannelColor = (c) => ({ whatsapp: '#25D366', telegram: '#0088cc', messenger: '#0084ff', email: '#EA4335' }[c] || '#666');
  const getStatusColor = (s) => ({ open: '#4caf50', pending: '#ff9800', resolved: '#2196f3' }[s] || '#9e9e9e');
  const getStatusText = (s) => ({ open: '🟢 Abierta', pending: '🟡 Pendiente', resolved: '🔵 Resuelta' }[s] || s);

  const filteredConversations = conversations.filter(c => 
    (filterChannel === 'all' || c.channel === filterChannel) && 
    (filterStatus === 'all' || c.status === filterStatus)
  );

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0d1117', color: 'white' }}>Cargando OmniConnect CRM...</div>;
  }

  // ============================================================
  // PANTALLA DE LOGIN
  // ============================================================
  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0d1117' }}>
        <div style={{ backgroundColor: '#161b22', padding: '40px', borderRadius: '12px', width: '400px', border: '1px solid #30363d' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #1f6feb, #3b82f6, #a855f7)',
              borderRadius: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '30px' }}>💬🚀</span>
            </div>
          </div>
          <h2 style={{ textAlign: 'center', marginBottom: '30px', color: 'white', fontSize: '24px' }}>OmniConnect CRM</h2>
          <form onSubmit={(e) => { e.preventDefault(); handleLogin(e.target.email.value, e.target.password.value); }}>
            <input type="email" name="email" placeholder="Email" style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: 'white' }} required />
            <input type="password" name="password" placeholder="Contraseña" style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: 'white' }} required />
            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#1f6feb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>Ingresar</button>
          </form>
        </div>
      </div>
    );
  }

  // ============================================================
  // VISTA PARA SUPER ADMIN
  // ============================================================
  if (user?.role === 'super_admin') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0d1117' }}>
        <Navbar user={user} workspace={workspace} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
        <div style={{ padding: '20px' }}>
          {activeTab === 'global_dashboard' && <AdminDashboard user={user} token={localStorage.getItem('token')} />}
          {activeTab === 'clients' && <div style={{ color: 'white' }}>📋 Gestión de Clientes</div>}
          {activeTab === 'workspaces' && <div style={{ color: 'white' }}>🏭 Workspaces</div>}
          {activeTab === 'users' && <div style={{ color: 'white' }}>👤 Usuarios</div>}
        </div>
      </div>
    );
  }

  // ============================================================
  // VISTA PARA CLIENTE
  // ============================================================
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0d1117' }}>
      <Navbar user={user} workspace={workspace} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      
      {activeTab === 'pipeline' && <PipelineKanban workspaceId={workspace?.id} token={localStorage.getItem('token')} />}
      {activeTab === 'scoring' && <LeadScoring workspaceId={workspace?.id} token={localStorage.getItem('token')} />}
      {activeTab === 'agents' && <AgentsPanel workspaceId={workspace?.id} token={localStorage.getItem('token')} userRole={user?.role} />}
      {activeTab === 'reports' && <ReportsPanel workspaceId={workspace?.id} token={localStorage.getItem('token')} />}
      {activeTab === 'settings' && <SettingsPanel workspaceId={workspace?.id} token={localStorage.getItem('token')} />}
      {activeTab === 'billing' && <BillingPanel workspace={workspace} user={user} />}
      
      {activeTab === 'conversations' && (
        <div style={{ display: 'flex', height: 'calc(100vh - 70px)' }}>
          {/* Sidebar izquierdo - Lista de contactos */}
          <div style={{ width: '340px', backgroundColor: '#161b22', borderRight: '1px solid #30363d', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #30363d' }}>
              <h3 style={{ margin: 0, color: 'white', fontSize: '16px' }}>{workspace?.name}</h3>
              <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#8b949e' }}>Plan: {user?.plan || 'Free'} • {user?.name} • {user?.role}</p>
            </div>
            
            <div style={{ padding: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ backgroundColor: '#21262d', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>{stats.total}</div>
                <div style={{ fontSize: '11px', color: '#8b949e' }}>Total</div>
              </div>
              <div style={{ backgroundColor: '#21262d', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>{stats.open}</div>
                <div style={{ fontSize: '11px', color: '#8b949e' }}>Abiertas</div>
              </div>
              <div style={{ backgroundColor: '#21262d', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>{stats.pending}</div>
                <div style={{ fontSize: '11px', color: '#8b949e' }}>Pendientes</div>
              </div>
              <div style={{ backgroundColor: '#21262d', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196f3' }}>{stats.resolved}</div>
                <div style={{ fontSize: '11px', color: '#8b949e' }}>Resueltas</div>
              </div>
            </div>

            <div style={{ padding: '15px', borderTop: '1px solid #30363d', borderBottom: '1px solid #30363d' }}>
              <select value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: 'white', marginBottom: '10px' }}>
                <option value="all">📱 Todos los canales</option>
                <option value="whatsapp">💚 WhatsApp</option>
                <option value="telegram">💙 Telegram</option>
                <option value="messenger">💜 Messenger</option>
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: 'white' }}>
                <option value="all">📊 Todos los estados</option>
                <option value="open">🟢 Abiertas</option>
                <option value="pending">🟡 Pendientes</option>
                <option value="resolved">🔵 Resueltas</option>
              </select>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredConversations.map(conv => {
                const contact = conv.contact || {};
                return (
                  <div key={conv._id} onClick={() => selectConversation(conv)} style={{ 
                    padding: '15px', borderBottom: '1px solid #21262d', cursor: 'pointer', 
                    backgroundColor: selectedConversation?._id === conv._id ? '#1f6feb20' : 'transparent',
                    transition: 'all 0.2s'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: getChannelColor(conv.channel), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', color: 'white' }}>
                          {contact.name?.charAt(0) || contact.nombre?.charAt(0) || '?'}
                        </div>
                        <strong style={{ color: 'white' }}>{contact.name || contact.nombre || 'Sin nombre'}</strong>
                      </div>
                      <span style={{ fontSize: '18px' }}>{getChannelIcon(conv.channel)}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '5px', marginLeft: '46px' }}>
                      {conv.lastMessage || 'Sin mensajes'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginLeft: '46px' }}>
                      <span style={{ fontSize: '10px', color: '#6e7681' }}>
                        {conv.lastMessageTime ? new Date(conv.lastMessageTime).toLocaleTimeString() : ''}
                      </span>
                      <span style={{ fontSize: '11px', color: getStatusColor(conv.status) }}>
                        {getStatusText(conv.status)}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span style={{ backgroundColor: '#1f6feb', color: 'white', borderRadius: '20px', padding: '2px 8px', fontSize: '11px' }}>
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel central - Chat */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0d1117' }}>
            {selectedConversation && (
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #30363d', backgroundColor: '#161b22' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: getChannelColor(selectedConversation.channel), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', color: 'white' }}>
                      {selectedConversation.contact?.name?.charAt(0) || selectedConversation.contact?.nombre?.charAt(0) || '?'}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, color: 'white', fontSize: '18px' }}>{selectedConversation.contact?.name || selectedConversation.contact?.nombre || 'Contacto'}</h3>
                      <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '2px' }}>
                        {getChannelIcon(selectedConversation.channel)} {selectedConversation.channel} • {selectedConversation.contact?.channelId}
                      </div>
                    </div>
                  </div>
                  <select value={selectedConversation.status} onChange={(e) => updateConversationStatus(selectedConversation._id, e.target.value)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #30363d', backgroundColor: '#21262d', color: 'white' }}>
                    <option value="open">🟢 Abierta</option>
                    <option value="pending">🟡 Pendiente</option>
                    <option value="resolved">🔵 Resuelta</option>
                  </select>
                </div>
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {selectedConversation ? (
                messages.map(msg => (
                  <div key={msg._id} style={{ display: 'flex', justifyContent: msg.from === 'agent' ? 'flex-end' : 'flex-start', marginBottom: '16px' }}>
                    <div style={{ maxWidth: '70%', padding: '12px 16px', borderRadius: '16px', backgroundColor: msg.from === 'agent' ? '#1f6feb' : '#21262d', color: 'white' }}>
                      <div>{msg.text}</div>
                      <div style={{ fontSize: '10px', marginTop: '6px', opacity: 0.7 }}>{new Date(msg.timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: '#8b949e', marginTop: '100px', fontSize: '14px' }}>
                  💬 Selecciona un contacto para comenzar
                </div>
              )}
            </div>

            {selectedConversation && (
              <div style={{ padding: '16px 20px', borderTop: '1px solid #30363d', backgroundColor: '#161b22', display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Escribe un mensaje..."
                  style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: 'white', outline: 'none', fontSize: '14px' }}
                />
                <button onClick={sendMessage} style={{ padding: '12px 24px', backgroundColor: '#1f6feb', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                  Enviar →
                </button>
              </div>
            )}
          </div>

          {/* Sidebar derecho - Info y Respuestas Rápidas DINÁMICAS */}
          <div style={{ width: '280px', backgroundColor: '#161b22', borderLeft: '1px solid #30363d', padding: '20px', overflowY: 'auto' }}>
            {selectedConversation ? (
              <>
                <h4 style={{ marginTop: 0, marginBottom: '16px', color: 'white' }}>ℹ️ Información</h4>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px' }}>Nombre</div>
                  <div style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>{selectedConversation.contact?.name || selectedConversation.contact?.nombre}</div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px' }}>Canal</div>
                  <div style={{ fontSize: '14px', color: 'white' }}>{getChannelIcon(selectedConversation.channel)} {selectedConversation.channel}</div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px' }}>ID / Teléfono</div>
                  <div style={{ fontSize: '13px', color: '#c9d1d9' }}>{selectedConversation.contact?.channelId}</div>
                </div>
                
                {/* ============================================================ */}
                {/* RESPUESTAS RÁPIDAS DINÁMICAS DESDE WORKSPACE */}
                {/* ============================================================ */}
                <h4 style={{ marginTop: '24px', marginBottom: '12px', color: 'white' }}>⚡ Respuestas rápidas</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(workspace?.settings?.quickReplies && workspace.settings.quickReplies.length > 0 
                    ? workspace.settings.quickReplies 
                    : ['Gracias por contactarnos', 'En breve te atenderemos', '¿En qué más puedo ayudarte?', 'Tu pedido está en proceso']
                  ).map((respuesta, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setNewMessage(respuesta)} 
                      style={{ 
                        padding: '8px 12px', 
                        textAlign: 'left', 
                        backgroundColor: '#21262d', 
                        border: '1px solid #30363d', 
                        borderRadius: '8px', 
                        cursor: 'pointer', 
                        fontSize: '12px', 
                        color: '#c9d1d9', 
                        transition: 'all 0.2s' 
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#30363d'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#21262d'}
                    >
                      {respuesta}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: '#8b949e', marginTop: '100px', fontSize: '13px' }}>
                📌 Selecciona un<br/>contacto para<br/>ver los detalles
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;