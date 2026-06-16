import React, { useState, useEffect } from 'react';

const Navbar = ({ user, workspace, activeTab, setActiveTab, onLogout }) => {
  const isSuperAdmin = user?.role === 'super_admin';
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Menús (definidos UNA sola vez)
  const superAdminMenu = [
    { id: 'global_dashboard', label: 'Dashboard Global', icon: '📊' },
    { id: 'clients', label: 'Clientes', icon: '🏢' },
    { id: 'workspaces', label: 'Workspaces', icon: '📁' },
    { id: 'users', label: 'Usuarios', icon: '👤' },
  ];

  const clientMenu = [
    { id: 'conversations', label: 'Conversaciones', icon: '💬' },
    { id: 'pipeline', label: 'Canalización', icon: '📊' },
    { id: 'scoring', label: 'Scoring', icon: '🎯' },
    { id: 'contacts', label: 'Contactos', icon: '📒' },
    { id: 'agents', label: 'Agentes', icon: '👥' },
    { id: 'reports', label: 'Reportes', icon: '📈' },
    { id: 'settings', label: 'Configuración', icon: '⚙️' },
    { id: 'billing', label: 'Facturación', icon: '💰' },
    { id: 'chatbot', label: 'Chatbot', icon: '🤖' },
  ];

  const menu = isSuperAdmin ? superAdminMenu : clientMenu;

  // Vista móvil
  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            position: 'fixed',
            top: '12px',
            left: '16px',
            zIndex: 1001,
            background: 'linear-gradient(135deg, #1f6feb, #3b82f6)',
            border: 'none',
            color: 'white',
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            fontSize: '20px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          ☰
        </button>
        
        {menuOpen && (
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              zIndex: 999,
              transition: '0.3s'
            }}
          />
        )}
        
        <div style={{
          position: 'fixed',
          top: 0,
          left: menuOpen ? 0 : '-280px',
          width: '280px',
          height: '100vh',
          backgroundColor: '#0d1117',
          borderRight: '1px solid #30363d',
          zIndex: 1000,
          transition: 'left 0.3s ease',
          padding: '20px',
          overflowY: 'auto'
        }}>
          {/* Logo en móvil */}
          <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #30363d' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                background: 'linear-gradient(135deg, #1f6feb, #3b82f6, #a855f7)',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}>
                <span style={{ fontSize: '20px' }}>💬</span>
                <span style={{ fontSize: '18px' }}>🚀</span>
              </div>
              <div>
                <span style={{ fontWeight: 700, color: 'white', fontSize: '18px' }}>OmniConnect</span>
                <span style={{ fontWeight: 500, color: '#8b949e', fontSize: '11px', marginLeft: '4px' }}>CRM</span>
              </div>
            </div>
            <p style={{ color: '#8b949e', fontSize: '12px', margin: '8px 0 0' }}>
              {user?.name} • {user?.role}
            </p>
          </div>
          
          {menu.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMenuOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px',
                marginBottom: '8px',
                borderRadius: '10px',
                backgroundColor: activeTab === item.id ? '#1f6feb20' : 'transparent',
                color: activeTab === item.id ? '#ffffff' : '#8b949e',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: activeTab === item.id ? 500 : 400,
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          
          <button
            onClick={onLogout}
            style={{
              width: '100%',
              padding: '12px',
              marginTop: '20px',
              borderRadius: '10px',
              backgroundColor: '#21262d',
              color: '#f85149',
              border: '1px solid #f8514933',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <span>🚪</span> Cerrar sesión
          </button>
        </div>
      </>
    );
  }

  // Vista escritorio
  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#0d1117',
      borderBottom: '1px solid #30363d',
      padding: '0 24px',
      height: '70px',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      {/* Logo mejorado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '44px',
          height: '44px',
          background: 'linear-gradient(135deg, #1f6feb, #3b82f6, #a855f7)',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          boxShadow: '0 4px 12px rgba(31, 111, 235, 0.25)'
        }}>
          <span style={{ fontSize: '20px' }}>💬</span>
          <span style={{ fontSize: '18px' }}>🚀</span>
        </div>
        <div>
          <span style={{ fontWeight: 700, color: 'white', fontSize: '18px', letterSpacing: '-0.3px' }}>
            OmniConnect
          </span>
          <span style={{ fontWeight: 500, color: '#8b949e', fontSize: '12px', marginLeft: '4px' }}>
            CRM
          </span>
        </div>
      </div>
      
      {/* Menú principal */}
      <div style={{ display: 'flex', gap: '6px', height: '100%', alignItems: 'center' }}>
        {menu.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 18px',
                height: '100%',
                backgroundColor: 'transparent',
                color: isActive ? '#ffffff' : '#8b949e',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: isActive ? 500 : 400,
                transition: 'all 0.2s ease',
                borderBottom: isActive ? '3px solid #1f6feb' : '3px solid transparent'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = '#c9d1d9';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = '#8b949e';
              }}
            >
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* Usuario */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>{user?.name}</div>
          <div style={{ color: '#8b949e', fontSize: '11px' }}>{user?.role}</div>
        </div>
        <button
          onClick={onLogout}
          style={{
            background: 'none',
            border: '1px solid #30363d',
            padding: '7px 16px',
            borderRadius: '10px',
            color: '#f85149',
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8514910'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
};

export default Navbar;