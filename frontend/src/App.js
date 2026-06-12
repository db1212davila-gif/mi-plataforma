import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from './components/Navbar';
import AdminDashboard from './pages/AdminDashboard';
import PipelineKanban from './components/PipelineKanban';
import LeadScoring from './components/LeadScoring';
import AgentsPanel from './pages/AgentsPanel';
import ReportsPanel from './pages/ReportsPanel';
import SettingsPanel from './pages/SettingsPanel';
import BillingPanel from './pages/BillingPanel';
import io from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4001';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const getChannelIcon  = (c) => ({ whatsapp: '💚', telegram: '💙', messenger: '💜', email: '📧' }[c] || '💬');
const getChannelColor = (c) => ({ whatsapp: '#25D366', telegram: '#0088cc', messenger: '#0084ff', email: '#EA4335' }[c] || '#666');
const getStatusColor  = (s) => ({ open: '#4caf50', pending: '#ff9800', resolved: '#2196f3' }[s] || '#9e9e9e');
const getStatusText   = (s) => ({ open: '🟢 Abierta', pending: '🟡 Pendiente', resolved: '🔵 Resuelta' }[s] || s);
const getContactName  = (contact) => contact?.name || contact?.nombre || 'Sin nombre';
const getContactInit  = (contact) => (contact?.name || contact?.nombre || '?').charAt(0).toUpperCase();
const formatTime      = (d) => d ? new Date(d).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '';

function App() {
  // ── Estado principal ──
  const [conversations, setConversations]         = useState([]);
  const [selectedConversation, setSelectedConv]   = useState(null);
  const [messages, setMessages]                   = useState([]);
  const [newMessage, setNewMessage]               = useState('');
  const [user, setUser]                           = useState(null);
  const [workspace, setWorkspace]                 = useState(null);
  const [loading, setLoading]                     = useState(true);
  const [sendingMsg, setSendingMsg]               = useState(false);
  const [isLoggedIn, setIsLoggedIn]               = useState(false);
  const [activeTab, setActiveTab]                 = useState('conversations');

  // ── Filtros y búsqueda ──
  const [filterChannel, setFilterChannel]         = useState('all');
  const [filterStatus, setFilterStatus]           = useState('all');
  const [searchQuery, setSearchQuery]             = useState('');

  // ── Stats ──
  const [stats, setStats] = useState({ total: 0, open: 0, pending: 0, resolved: 0 });

  // ── Notas internas ──
  const [activeRightTab, setActiveRightTab]       = useState('info'); // 'info' | 'notes'
  const [notes, setNotes]                         = useState([]);
  const [newNote, setNewNote]                     = useState('');

  // ── Refs ──
  const messagesEndRef = useRef(null);
  const socketRef      = useRef(null);

  // ── Scroll al último mensaje ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─────────────────────────────────────────────────────────────
  // SOCKET.IO — conectar al workspace como sala privada
  // ─────────────────────────────────────────────────────────────
  const connectSocket = useCallback((workspaceId, token) => {
    if (socketRef.current) socketRef.current.disconnect();

    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      console.log('🔌 Socket conectado');
      socket.emit('join_workspace', workspaceId); // entrar a la sala del workspace
    });

    socket.on('new_message', ({ conversationId, message, conversation }) => {
      // Actualizar mensajes si la conv está seleccionada
      setSelectedConv(prev => {
        if (prev?._id === conversationId) {
          setMessages(msgs => [...msgs, message]);
        }
        return prev;
      });

      // Actualizar lista de conversaciones
      setConversations(prev => prev.map(c =>
        c._id === conversationId
          ? { ...c, lastMessage: message.text, lastMessageTime: message.timestamp, unreadCount: (c.unreadCount || 0) + 1 }
          : c
      ).sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)));
    });

    socket.on('conversation_updated', (updated) => {
      setConversations(prev => prev.map(c => c._id === updated._id ? { ...c, ...updated } : c));
      setSelectedConv(prev => prev?._id === updated._id ? { ...prev, ...updated } : prev);
    });

    socketRef.current = socket;
  }, []);

  useEffect(() => () => socketRef.current?.disconnect(), []);

  // ─────────────────────────────────────────────────────────────
  // CARGAR CONVERSACIONES REALES (no solo contactos)
  // ─────────────────────────────────────────────────────────────
  const loadConversations = useCallback(async (workspaceId, token) => {
    try {
      const res = await fetch(`${API_URL}/api/conversations/${workspaceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data);
      setStats({
        total:    data.length,
        open:     data.filter(c => c.status === 'open').length,
        pending:  data.filter(c => c.status === 'pending').length,
        resolved: data.filter(c => c.status === 'resolved').length
      });
    } catch (err) {
      console.error('Error cargando conversaciones:', err);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────
  // VERIFICAR AUTENTICACIÓN AL CARGAR
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const token          = localStorage.getItem('token');
    const storedUser     = localStorage.getItem('user');
    const storedWS       = localStorage.getItem('workspace');

    if (token && storedUser && storedWS) {
      const parsedUser = JSON.parse(storedUser);
      const parsedWS   = JSON.parse(storedWS);
      setUser(parsedUser);
      setWorkspace(parsedWS);
      setIsLoggedIn(true);

      if (parsedUser.role === 'super_admin') {
        setActiveTab('global_dashboard');
      } else {
        loadConversations(parsedWS.id, token);
        connectSocket(parsedWS.id, token);
      }
    }
    setLoading(false);
  }, [loadConversations, connectSocket]);

  // ─────────────────────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────────────────────
  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token',     data.token);
        localStorage.setItem('user',      JSON.stringify(data.user));
        localStorage.setItem('workspace', JSON.stringify(data.workspace));
        setUser(data.user);
        setWorkspace(data.workspace);
        setIsLoggedIn(true);

        if (data.user.role === 'super_admin') {
          setActiveTab('global_dashboard');
        } else {
          await loadConversations(data.workspace.id, data.token);
          connectSocket(data.workspace.id, data.token);
        }
      } else {
        alert(data.error || 'Error al iniciar sesión');
      }
    } catch {
      alert('Error de conexión con el servidor');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    socketRef.current?.disconnect();
    localStorage.clear();
    setUser(null); setWorkspace(null); setIsLoggedIn(false);
    setSelectedConv(null); setConversations([]); setMessages([]);
  };

  // ─────────────────────────────────────────────────────────────
  // SELECCIONAR CONVERSACIÓN
  // ─────────────────────────────────────────────────────────────
  const selectConversation = async (conv) => {
    setSelectedConv(conv);
    setMessages([]);
    setNotes(conv.notes || []);
    setActiveRightTab('info');

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/conversations/${conv.workspace}/${conv._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setNotes(data.conversation?.notes || []);
        // Limpiar badge de no leídos localmente
        setConversations(prev => prev.map(c => c._id === conv._id ? { ...c, unreadCount: 0 } : c));
      }
    } catch (err) {
      console.error('Error cargando mensajes:', err);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // ENVIAR MENSAJE
  // ─────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sendingMsg) return;
    setSendingMsg(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/messages/${selectedConversation.workspace}/${selectedConversation._id}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ text: newMessage, from: 'agent' })
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => [...prev, msg]);
        setConversations(prev => prev.map(c =>
          c._id === selectedConversation._id
            ? { ...c, lastMessage: newMessage, lastMessageTime: new Date() }
            : c
        ));
        setNewMessage('');
      }
    } catch { alert('Error al enviar mensaje'); }
    setSendingMsg(false);
  };

  // ─────────────────────────────────────────────────────────────
  // ACTUALIZAR ESTADO O AGENTE
  // ─────────────────────────────────────────────────────────────
  const updateConversation = async (conversationId, updates) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/conversations/${workspace.id}/${conversationId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(updates)
      });
      if (res.ok) {
        const updated = await res.json();
        setConversations(prev => prev.map(c => c._id === conversationId ? { ...c, ...updated } : c));
        setSelectedConv(prev => prev?._id === conversationId ? { ...prev, ...updated } : prev);
      }
    } catch (err) { console.error('Error actualizando conversación:', err); }
  };

  // ─────────────────────────────────────────────────────────────
  // AGREGAR NOTA INTERNA
  // ─────────────────────────────────────────────────────────────
  const addNote = async () => {
    if (!newNote.trim() || !selectedConversation) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/conversations/${workspace.id}/${selectedConversation._id}/notes`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ text: newNote })
      });
      if (res.ok) {
        const note = await res.json();
        setNotes(prev => [...prev, note]);
        setNewNote('');
      }
    } catch (err) { console.error('Error agregando nota:', err); }
  };

  // ─────────────────────────────────────────────────────────────
  // FILTRADO LOCAL
  // ─────────────────────────────────────────────────────────────
  const filteredConversations = conversations.filter(c => {
    const matchChannel = filterChannel === 'all' || c.channel === filterChannel;
    const matchStatus  = filterStatus  === 'all' || c.status  === filterStatus;
    const matchSearch  = !searchQuery  || getContactName(c.contact).toLowerCase().includes(searchQuery.toLowerCase());
    return matchChannel && matchStatus && matchSearch;
  });

  // ─────────────────────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0d1117', color: 'white', fontSize: '16px' }}>
      Cargando OmniConnect CRM...
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // LOGIN SCREEN
  // ─────────────────────────────────────────────────────────────
  if (!isLoggedIn) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0d1117' }}>
      <div style={{ backgroundColor: '#161b22', padding: '40px', borderRadius: '12px', width: '400px', border: '1px solid #30363d' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{ width: '60px', height: '60px', background: 'linear-gradient(135deg, #1f6feb, #3b82f6, #a855f7)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '30px' }}>💬</span>
          </div>
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: '30px', color: 'white', fontSize: '24px' }}>OmniConnect CRM</h2>
        <form onSubmit={(e) => { e.preventDefault(); handleLogin(e.target.email.value, e.target.password.value); }}>
          <input type="email" name="email" placeholder="Email" required
            style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: 'white', boxSizing: 'border-box' }} />
          <input type="password" name="password" placeholder="Contraseña" required
            style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: 'white', boxSizing: 'border-box' }} />
          <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#1f6feb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // SUPER ADMIN
  // ─────────────────────────────────────────────────────────────
  if (user?.role === 'super_admin') return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0d1117' }}>
      <Navbar user={user} workspace={workspace} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      <div style={{ padding: '20px' }}>
        {activeTab === 'global_dashboard' && <AdminDashboard user={user} token={localStorage.getItem('token')} />}
        {activeTab === 'clients'    && <div style={{ color: 'white' }}>📋 Gestión de Clientes</div>}
        {activeTab === 'workspaces' && <div style={{ color: 'white' }}>🏭 Workspaces</div>}
        {activeTab === 'users'      && <div style={{ color: 'white' }}>👤 Usuarios</div>}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // VISTA CLIENTE
  // ─────────────────────────────────────────────────────────────
  const token = localStorage.getItem('token');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0d1117' }}>
      <Navbar user={user} workspace={workspace} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

      {activeTab === 'pipeline' && <PipelineKanban workspaceId={workspace?.id} token={token} />}
      {activeTab === 'scoring'  && <LeadScoring    workspaceId={workspace?.id} token={token} />}
      {activeTab === 'agents'   && <AgentsPanel    workspaceId={workspace?.id} token={token} userRole={user?.role} />}
      {activeTab === 'reports'  && <ReportsPanel   workspaceId={workspace?.id} token={token} />}
      {activeTab === 'settings' && <SettingsPanel  workspaceId={workspace?.id} token={token} />}
      {activeTab === 'billing'  && <BillingPanel   workspace={workspace} user={user} />}

      {activeTab === 'conversations' && (
        <div style={{ display: 'flex', height: 'calc(100vh - 70px)' }}>

          {/* ── SIDEBAR IZQUIERDO ── */}
          <div style={{ width: '320px', backgroundColor: '#161b22', borderRight: '1px solid #30363d', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header workspace */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #30363d' }}>
              <h3 style={{ margin: 0, color: 'white', fontSize: '15px' }}>{workspace?.name}</h3>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#8b949e' }}>
                {user?.name} · {user?.role}
              </p>
            </div>

            {/* Stats */}
            <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', borderBottom: '1px solid #30363d' }}>
              {[
                { label: 'Total',      value: stats.total,    color: 'white'   },
                { label: 'Abiertas',   value: stats.open,     color: '#4caf50' },
                { label: 'Pendientes', value: stats.pending,  color: '#ff9800' },
                { label: 'Resueltas',  value: stats.resolved, color: '#2196f3' }
              ].map(s => (
                <div key={s.label} style={{ backgroundColor: '#21262d', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '10px', color: '#8b949e' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Búsqueda */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #30363d' }}>
              <input
                type="text"
                placeholder="🔍 Buscar contacto..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: 'white', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            {/* Filtros */}
            <div style={{ padding: '10px 16px', display: 'flex', gap: '8px', borderBottom: '1px solid #30363d' }}>
              <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)}
                style={{ flex: 1, padding: '6px 8px', borderRadius: '8px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: 'white', fontSize: '12px' }}>
                <option value="all">Todos</option>
                <option value="whatsapp">💚 WhatsApp</option>
                <option value="telegram">💙 Telegram</option>
                <option value="messenger">💜 Messenger</option>
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ flex: 1, padding: '6px 8px', borderRadius: '8px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: 'white', fontSize: '12px' }}>
                <option value="all">Estados</option>
                <option value="open">🟢 Abiertas</option>
                <option value="pending">🟡 Pendientes</option>
                <option value="resolved">🔵 Resueltas</option>
              </select>
            </div>

            {/* Lista de conversaciones */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredConversations.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8b949e', fontSize: '13px' }}>
                  {searchQuery ? `Sin resultados para "${searchQuery}"` : 'Sin conversaciones aún'}
                </div>
              ) : filteredConversations.map(conv => {
                const contact  = conv.contact || {};
                const isActive = selectedConversation?._id === conv._id;
                return (
                  <div key={conv._id} onClick={() => selectConversation(conv)}
                    style={{ padding: '14px 16px', borderBottom: '1px solid #21262d', cursor: 'pointer', backgroundColor: isActive ? '#1f6feb18' : 'transparent', borderLeft: isActive ? '3px solid #1f6feb' : '3px solid transparent', transition: 'all 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* Avatar */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: getChannelColor(conv.channel), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 'bold', color: 'white' }}>
                          {getContactInit(contact)}
                        </div>
                        {conv.unreadCount > 0 && (
                          <span style={{ position: 'absolute', top: '-3px', right: '-3px', backgroundColor: '#1f6feb', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'white', fontWeight: '600', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {getContactName(contact)}
                          </span>
                          <span style={{ fontSize: '10px', color: '#6e7681', flexShrink: 0, marginLeft: '6px' }}>
                            {formatTime(conv.lastMessageTime)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                          <span style={{ fontSize: '12px', color: '#8b949e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {getChannelIcon(conv.channel)} {conv.lastMessage || 'Sin mensajes'}
                          </span>
                          <span style={{ fontSize: '10px', color: getStatusColor(conv.status), flexShrink: 0, marginLeft: '6px' }}>●</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── CHAT CENTRAL ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0d1117', minWidth: 0 }}>
            
            {/* Header del chat */}
            {selectedConversation ? (
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #30363d', backgroundColor: '#161b22', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: getChannelColor(selectedConversation.channel), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', fontWeight: 'bold', color: 'white', flexShrink: 0 }}>
                    {getContactInit(selectedConversation.contact)}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '16px' }}>{getContactName(selectedConversation.contact)}</h3>
                    <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '2px' }}>
                      {getChannelIcon(selectedConversation.channel)} {selectedConversation.channel}
                      {selectedConversation.contact?.channelId && ` · ${selectedConversation.contact.channelId}`}
                      {selectedConversation.assignedTo && ` · 👤 ${selectedConversation.assignedTo.name}`}
                    </div>
                  </div>
                </div>
                <select
                  value={selectedConversation.status}
                  onChange={e => updateConversation(selectedConversation._id, { status: e.target.value })}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #30363d', backgroundColor: '#21262d', color: 'white', fontSize: '13px', cursor: 'pointer' }}
                >
                  <option value="open">🟢 Abierta</option>
                  <option value="pending">🟡 Pendiente</option>
                  <option value="resolved">🔵 Resuelta</option>
                </select>
              </div>
            ) : (
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #30363d', backgroundColor: '#161b22', height: '70px' }} />
            )}

            {/* Mensajes */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedConversation ? (
                messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#8b949e', marginTop: '60px', fontSize: '14px' }}>
                    Sin mensajes aún. Espera el primer mensaje o escríbele.
                  </div>
                ) : messages.map(msg => (
                  <div key={msg._id || msg.timestamp} style={{ display: 'flex', justifyContent: msg.from === 'agent' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '70%', padding: '10px 14px', borderRadius: msg.from === 'agent' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', backgroundColor: msg.from === 'agent' ? '#1f6feb' : '#21262d', color: 'white' }}>
                      <div style={{ fontSize: '14px', lineHeight: '1.4' }}>{msg.text}</div>
                      <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.65, textAlign: 'right' }}>
                        {formatTime(msg.timestamp)}
                        {msg.from === 'agent' && ' ✓'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: '#8b949e', marginTop: '100px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
                  <div style={{ fontSize: '15px' }}>Selecciona una conversación para comenzar</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensaje */}
            {selectedConversation && (
              <div style={{ padding: '14px 20px', borderTop: '1px solid #30363d', backgroundColor: '#161b22' }}>
                {/* Respuestas rápidas */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  {(workspace?.settings?.quickReplies || ['Gracias por contactarnos', 'En breve te atenderemos', '¿En qué más puedo ayudarte?']).slice(0, 4).map((r, i) => (
                    <button key={i} onClick={() => setNewMessage(r)}
                      style={{ padding: '4px 10px', backgroundColor: '#21262d', border: '1px solid #30363d', borderRadius: '20px', color: '#c9d1d9', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {r}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Escribe un mensaje..."
                    style={{ flex: 1, padding: '11px 16px', borderRadius: '12px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: 'white', outline: 'none', fontSize: '14px' }}
                  />
                  <button onClick={sendMessage} disabled={sendingMsg || !newMessage.trim()}
                    style={{ padding: '11px 22px', backgroundColor: sendingMsg ? '#1a4a8a' : '#1f6feb', color: 'white', border: 'none', borderRadius: '12px', cursor: sendingMsg ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'background 0.2s' }}>
                    {sendingMsg ? '...' : 'Enviar →'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── SIDEBAR DERECHO ── */}
          <div style={{ width: '280px', backgroundColor: '#161b22', borderLeft: '1px solid #30363d', display: 'flex', flexDirection: 'column' }}>
            {selectedConversation ? (
              <>
                {/* Tabs info / notas */}
                <div style={{ display: 'flex', borderBottom: '1px solid #30363d' }}>
                  {['info', 'notes'].map(tab => (
                    <button key={tab} onClick={() => setActiveRightTab(tab)}
                      style={{ flex: 1, padding: '12px', border: 'none', backgroundColor: 'transparent', color: activeRightTab === tab ? '#1f6feb' : '#8b949e', fontWeight: activeRightTab === tab ? '600' : '400', cursor: 'pointer', borderBottom: activeRightTab === tab ? '2px solid #1f6feb' : '2px solid transparent', fontSize: '13px' }}>
                      {tab === 'info' ? 'ℹ️ Info' : `📝 Notas ${notes.length > 0 ? `(${notes.length})` : ''}`}
                    </button>
                  ))}
                </div>

                {/* Contenido tab */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                  {activeRightTab === 'info' ? (
                    <>
                      {/* Datos del contacto */}
                      {[
                        { label: 'Nombre',   value: getContactName(selectedConversation.contact) },
                        { label: 'Canal',    value: `${getChannelIcon(selectedConversation.channel)} ${selectedConversation.channel}` },
                        { label: 'Teléfono / ID', value: selectedConversation.contact?.channelId || selectedConversation.contact?.telefono },
                        { label: 'Estado',   value: getStatusText(selectedConversation.status) },
                        { label: 'Asignado', value: selectedConversation.assignedTo?.name || 'Sin asignar' }
                      ].map(item => item.value && (
                        <div key={item.label} style={{ marginBottom: '16px' }}>
                          <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '3px' }}>{item.label}</div>
                          <div style={{ fontSize: '13px', color: '#c9d1d9', fontWeight: '500' }}>{item.value}</div>
                        </div>
                      ))}

                      {/* Respuestas rápidas (vista completa) */}
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⚡ Respuestas rápidas</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {(workspace?.settings?.quickReplies || ['Gracias por contactarnos', 'En breve te atenderemos', '¿En qué más puedo ayudarte?', 'Tu pedido está en proceso']).map((r, i) => (
                            <button key={i} onClick={() => setNewMessage(r)}
                              style={{ padding: '8px 10px', textAlign: 'left', backgroundColor: '#21262d', border: '1px solid #30363d', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: '#c9d1d9' }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#30363d'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#21262d'}>
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Notas internas */
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                        {notes.length === 0 ? (
                          <div style={{ color: '#8b949e', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>Sin notas internas aún</div>
                        ) : notes.map((note, i) => (
                          <div key={i} style={{ backgroundColor: '#2d2a1e', border: '1px solid #4a4520', borderRadius: '8px', padding: '10px' }}>
                            <div style={{ fontSize: '12px', color: '#e3b341', lineHeight: '1.4' }}>{note.text}</div>
                            <div style={{ fontSize: '10px', color: '#8b949e', marginTop: '6px' }}>
                              {note.author?.name || 'Tú'} · {formatTime(note.createdAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Input nueva nota */}
                      <div style={{ borderTop: '1px solid #30363d', paddingTop: '12px' }}>
                        <textarea
                          value={newNote}
                          onChange={e => setNewNote(e.target.value)}
                          placeholder="Escribe una nota interna..."
                          rows={3}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: 'white', fontSize: '12px', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                        />
                        <button onClick={addNote} disabled={!newNote.trim()}
                          style={{ width: '100%', marginTop: '6px', padding: '8px', backgroundColor: '#2d2a1e', border: '1px solid #4a4520', borderRadius: '8px', color: '#e3b341', cursor: newNote.trim() ? 'pointer' : 'not-allowed', fontSize: '12px', fontWeight: '600' }}>
                          + Guardar nota
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8b949e', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                📌 Selecciona una<br />conversación para<br />ver los detalles
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

export default App;