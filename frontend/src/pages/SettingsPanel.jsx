import React, { useState, useEffect } from 'react';

const SettingsPanel = ({ workspaceId, token }) => {
  const [settings, setSettings] = useState({ timezone: 'America/Santiago', language: 'es', quickReplies: [] });
  const [loading, setLoading] = useState(true);
  const [newReply, setNewReply] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/workspaces/${workspaceId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setSettings(data.settings || { timezone: 'America/Santiago', language: 'es', quickReplies: [] });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/workspaces/${workspaceId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ [key]: value })
      });
      if (response.ok) {
        alert('✅ Configuración actualizada');
        setSettings({ ...settings, [key]: value });
      }
    } catch (error) {
      alert('Error al actualizar');
    }
  };

  const addQuickReply = () => {
    if (!newReply.trim()) return;
    const updatedReplies = [...settings.quickReplies, newReply.trim()];
    updateSetting('quickReplies', updatedReplies);
    setNewReply('');
  };

  const removeQuickReply = (index) => {
    const updatedReplies = settings.quickReplies.filter((_, i) => i !== index);
    updateSetting('quickReplies', updatedReplies);
  };

  if (loading) return <div style={{ color: 'white', padding: '40px' }}>Cargando configuración...</div>;

  return (
    <div style={{ padding: '20px', color: 'white' }}>
      <h2>⚙️ Configuración</h2>
      
      {/* Preferencias Generales */}
      <div style={{ backgroundColor: '#161b22', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
        <h3>Preferencias Generales</h3>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#8b949e' }}>Zona Horaria</label>
          <select
            value={settings.timezone}
            onChange={(e) => updateSetting('timezone', e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: 'white' }}
          >
            <option value="America/Santiago">Chile (Santiago)</option>
            <option value="America/Mexico_City">México (Ciudad de México)</option>
            <option value="America/Bogota">Colombia (Bogotá)</option>
            <option value="America/Argentina/Buenos_Aires">Argentina (Buenos Aires)</option>
            <option value="America/Lima">Perú (Lima)</option>
          </select>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#8b949e' }}>Idioma</label>
          <select
            value={settings.language}
            onChange={(e) => updateSetting('language', e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: 'white' }}
          >
            <option value="es">Español</option>
            <option value="en">English</option>
            <option value="pt">Português</option>
          </select>
        </div>
      </div>

      {/* Respuestas Rápidas */}
      <div style={{ backgroundColor: '#161b22', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
        <h3>⚡ Respuestas Rápidas</h3>
        <p style={{ color: '#8b949e', fontSize: '12px', marginBottom: '15px' }}>
          Estas respuestas aparecerán en el panel derecho al seleccionar un contacto.
        </p>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Nueva respuesta rápida..."
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: 'white' }}
            onKeyPress={(e) => e.key === 'Enter' && addQuickReply()}
          />
          <button
            onClick={addQuickReply}
            style={{ padding: '10px 20px', backgroundColor: '#238636', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer' }}
          >
            + Agregar
          </button>
        </div>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {settings.quickReplies.map((reply, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: '#21262d',
                padding: '8px 12px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '12px' }}>{reply}</span>
              <button
                onClick={() => removeQuickReply(idx)}
                style={{ background: 'none', border: 'none', color: '#f85149', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Canales de Comunicación */}
      <div style={{ backgroundColor: '#161b22', padding: '20px', borderRadius: '12px' }}>
        <h3>Canales de Comunicación</h3>
        <p style={{ color: '#8b949e', fontSize: '12px' }}>Próximamente: Configuración de WhatsApp, Telegram y Messenger</p>
      </div>
    </div>
  );
};

export default SettingsPanel;