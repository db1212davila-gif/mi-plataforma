import { useState, useEffect } from 'react';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function ChatbotPanel({ workspaceId, token }) {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4001';

  const [config, setConfig] = useState({
    enabled:        false,
    mode:           'outside_hours',
    workingHours:   { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5] },
    systemPrompt:   '',
    welcomeMessage: '¡Hola! Soy el asistente virtual. ¿En qué te puedo ayudar?',
    model:          'claude-sonnet-4-6',
    anthropicApiKey: ''
  });
  const [saving,    setSaving]   = useState(false);
  const [saved,     setSaved]    = useState(false);
  const [testMsg,   setTestMsg]  = useState('');
  const [testReply, setTestReply] = useState('');
  const [testing,   setTesting]  = useState(false);

  // Cargar config al montar
  useEffect(() => {
    fetch(`${API_URL}/api/chatbot/config`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data._id) setConfig(c => ({ ...c, ...data, anthropicApiKey: '' }));
      })
      .catch(console.error);
  }, [workspaceId]);

  const toggleDay = (day) => {
    setConfig(c => ({
      ...c,
      workingHours: {
        ...c.workingHours,
        days: c.workingHours.days.includes(day)
          ? c.workingHours.days.filter(d => d !== day)
          : [...c.workingHours.days, day].sort((a, b) => a - b)
      }
    }));
  };

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      const res = await fetch(`${API_URL}/api/chatbot/config`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(config)
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
      else alert('Error al guardar');
    } catch (e) { alert('Error: ' + e.message); }
    finally { setSaving(false); }
  };

  const testBot = async () => {
    if (!testMsg.trim()) return;
    setTesting(true); setTestReply('');
    try {
      const res = await fetch(`${API_URL}/api/chatbot/test`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ message: testMsg })
      });
      const data = await res.json();
      setTestReply(data.reply || data.error || 'Sin respuesta');
    } catch (e) { setTestReply('Error: ' + e.message); }
    finally { setTesting(false); }
  };

  const s = {
    page:       { padding: '24px', color: '#e5e7eb', maxWidth: '960px', margin: '0 auto' },
    header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    title:      { fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0 },
    subtitle:   { fontSize: '13px', color: '#8b949e', marginTop: '4px' },
    grid:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
    card:       { backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '10px', padding: '18px' },
    cardTitle:  { fontSize: '14px', fontWeight: 600, color: '#f0f6fc', marginBottom: '4px', marginTop: 0 },
    hint:       { fontSize: '12px', color: '#8b949e', marginBottom: '12px', marginTop: '2px' },
    input:      { width: '100%', boxSizing: 'border-box', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '9px 12px', color: '#f0f6fc', fontSize: '13px', outline: 'none' },
    label:      { display: 'block', fontSize: '12px', color: '#8b949e', marginBottom: '5px' },
    row:        { display: 'flex', gap: '10px' },
    dayBtn:     (active) => ({ padding: '5px 9px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600, background: active ? '#1f6feb' : '#21262d', color: active ? '#fff' : '#8b949e' }),
    radioCard:  (active) => ({ display: 'block', cursor: 'pointer', padding: '10px 12px', borderRadius: '8px', border: `2px solid ${active ? '#1f6feb' : '#30363d'}`, background: active ? '#1f6feb18' : '#0d1117', marginBottom: '8px' }),
    radioLabel: { fontSize: '13px', fontWeight: 600, color: '#f0f6fc' },
    radioDesc:  { fontSize: '11px', color: '#8b949e', marginTop: '2px' },
    toggle:     { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' },
    track:      (on) => ({ width: '48px', height: '26px', borderRadius: '13px', background: on ? '#238636' : '#30363d', position: 'relative', transition: 'background .2s', flexShrink: 0 }),
    thumb:      (on) => ({ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '4px', left: on ? '26px' : '4px', transition: 'left .2s' }),
    btnPrimary: { padding: '10px 22px', background: '#1f6feb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 700 },
    btnTest:    { padding: '9px 16px', background: '#21262d', color: '#8b949e', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' },
    footer:     { backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '10px', padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    codeBox:    { fontSize: '11px', color: '#3fb950', background: '#0d1117', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace' }
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>🤖 Chatbot con IA</h1>
          <p style={s.subtitle}>Responde automáticamente en WhatsApp usando Claude</p>
        </div>
        <label style={s.toggle} onClick={() => setConfig(c => ({ ...c, enabled: !c.enabled }))}>
          <div style={s.track(config.enabled)}>
            <div style={s.thumb(config.enabled)} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: config.enabled ? '#3fb950' : '#8b949e' }}>
            {config.enabled ? 'Activo' : 'Inactivo'}
          </span>
        </label>
      </div>

      <div style={s.grid}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={s.card}>
            <h2 style={s.cardTitle}>¿Cuándo responde el bot?</h2>
            <p style={s.hint}>Elige cuándo se activa el chatbot</p>
            {[
              { value: 'always',        label: '⚡ Siempre',             desc: 'Responde todos los mensajes entrantes' },
              { value: 'outside_hours', label: '🕐 Fuera de horario',    desc: 'Solo cuando no estás disponible' },
              { value: 'no_agent',      label: '👤 Sin agente asignado', desc: 'Solo si nadie atiende la conversación' },
            ].map(opt => (
              <div key={opt.value} style={s.radioCard(config.mode === opt.value)}
                onClick={() => setConfig(c => ({ ...c, mode: opt.value }))}>
                <div style={s.radioLabel}>{opt.label}</div>
                <div style={s.radioDesc}>{opt.desc}</div>
              </div>
            ))}
          </div>

          {config.mode === 'outside_hours' && (
            <div style={s.card}>
              <h2 style={s.cardTitle}>Horario de trabajo</h2>
              <p style={s.hint}>El bot actúa fuera de este horario</p>
              <div style={{ ...s.row, marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Desde</label>
                  <input type="time" value={config.workingHours.start}
                    onChange={e => setConfig(c => ({ ...c, workingHours: { ...c.workingHours, start: e.target.value } }))}
                    style={s.input} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Hasta</label>
                  <input type="time" value={config.workingHours.end}
                    onChange={e => setConfig(c => ({ ...c, workingHours: { ...c.workingHours, end: e.target.value } }))}
                    style={s.input} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {DAYS.map((d, i) => (
                  <button key={i} onClick={() => toggleDay(i)}
                    style={s.dayBtn(config.workingHours.days.includes(i))}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={s.card}>
            <h2 style={s.cardTitle}>API Key de Anthropic</h2>
            <p style={s.hint}>
              Obtén la tuya en{' '}
              <a href="https://console.anthropic.com" target="_blank" rel="noreferrer"
                style={{ color: '#1f6feb', textDecoration: 'none' }}>console.anthropic.com</a>
            </p>
            <input type="password" placeholder="sk-ant-api03-..."
              value={config.anthropicApiKey}
              onChange={e => setConfig(c => ({ ...c, anthropicApiKey: e.target.value }))}
              style={s.input} />
            {config.anthropicApiKey === '' && (
              <p style={{ fontSize: '11px', color: '#8b949e', marginTop: '6px' }}>
                Deja vacío para mantener la key guardada
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={s.card}>
            <h2 style={s.cardTitle}>Personalidad del bot</h2>
            <p style={s.hint}>Describe quién es y qué puede responder</p>
            <textarea rows={8}
              placeholder={'Eres el asistente de [Tu empresa].\nPuedes ayudar con:\n- Preguntas frecuentes\n- Horarios\n- Precios\n\nResponde siempre en español, de forma breve y amable.'}
              value={config.systemPrompt}
              onChange={e => setConfig(c => ({ ...c, systemPrompt: e.target.value }))}
              style={{ ...s.input, resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }} />
          </div>

          <div style={s.card}>
            <h2 style={s.cardTitle}>Mensaje de bienvenida</h2>
            <p style={s.hint}>Primer mensaje que envía el bot</p>
            <input type="text" value={config.welcomeMessage}
              onChange={e => setConfig(c => ({ ...c, welcomeMessage: e.target.value }))}
              style={s.input} />
          </div>

          <div style={s.card}>
            <h2 style={s.cardTitle}>🧪 Probar el bot</h2>
            <p style={s.hint}>Simula un mensaje de cliente</p>
            <div style={{ ...s.row, marginBottom: '10px' }}>
              <input type="text" placeholder="Ej: ¿Cuál es el precio?" value={testMsg}
                onChange={e => setTestMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && testBot()}
                style={{ ...s.input, flex: 1 }} />
              <button onClick={testBot}
                disabled={testing || !testMsg.trim()}
                style={{ ...s.btnTest, opacity: (testing || !testMsg.trim()) ? 0.5 : 1 }}>
                {testing ? '...' : 'Enviar'}
              </button>
            </div>
            {testReply && (
              <div style={{ background: '#0d1117', borderRadius: '8px', padding: '10px 12px', display: 'flex', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🤖</span>
                <p style={{ fontSize: '13px', color: '#c9d1d9', margin: 0, lineHeight: 1.5 }}>{testReply}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={s.footer}>
        <div>
          <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px' }}>
            URL Webhook (Evolution API):
          </div>
          <code style={s.codeBox}>
            {(process.env.REACT_APP_API_URL || 'https://tu-servidor.onrender.com')}/webhook/chatbot
          </code>
        </div>
        <button onClick={save} disabled={saving} style={s.btnPrimary}>
          {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}