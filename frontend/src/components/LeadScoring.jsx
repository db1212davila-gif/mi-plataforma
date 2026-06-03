import React, { useState, useEffect } from 'react';

const LeadScoring = ({ workspaceId, token }) => {
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState('all');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchLeads();
    fetchMetrics();
  }, [filter]);
  
  const fetchLeads = async () => {
    try {
      let url = `${process.env.REACT_APP_API_URL}/api/leads/${workspaceId}`;
      if (filter === 'hot') url += '?minScore=70';
      if (filter === 'cold') url += '?maxScore=30';
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setLeads(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leads:', error);
      setLoading(false);
    }
  };
  
  const fetchMetrics = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/leads/${workspaceId}/metrics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };
  
  const getScoreLabel = (score) => {
    if (score >= 80) return { label: '🔥 Caliente', color: '#22c55e' };
    if (score >= 60) return { label: '📈 Cálido', color: '#eab308' };
    if (score >= 40) return { label: '🌡️ Tibio', color: '#f97316' };
    return { label: '❄️ Frío', color: '#ef4444' };
  };
  
  if (loading) return <div style={{ color: 'white', padding: '40px' }}>Cargando leads...</div>;
  
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: 'white' }}>🎯 Lead Scoring</h2>
        <div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#21262d', color: 'white', border: '1px solid #30363d' }}
          >
            <option value="all">Todos los leads</option>
            <option value="hot">🔥 Calientes (70-100)</option>
            <option value="cold">❄️ Fríos (0-30)</option>
          </select>
        </div>
      </div>
      
      {/* Tarjetas de métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '30px' }}>
        <div style={{ backgroundColor: '#161b22', padding: '16px', borderRadius: '12px', border: '1px solid #30363d' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f6feb' }}>{metrics?.hotLeads || 0}</div>
          <div style={{ fontSize: '12px', color: '#8b949e' }}>🔥 Leads Calientes</div>
        </div>
        <div style={{ backgroundColor: '#161b22', padding: '16px', borderRadius: '12px', border: '1px solid #30363d' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f0883e' }}>${metrics?.pipelineValue || 0}</div>
          <div style={{ fontSize: '12px', color: '#8b949e' }}>💰 Valor del Pipeline</div>
        </div>
        <div style={{ backgroundColor: '#161b22', padding: '16px', borderRadius: '12px', border: '1px solid #30363d' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#22c55e' }}>{metrics?.stages?.customer || 0}</div>
          <div style={{ fontSize: '12px', color: '#8b949e' }}>✅ Clientes Convertidos</div>
        </div>
        <div style={{ backgroundColor: '#161b22', padding: '16px', borderRadius: '12px', border: '1px solid #30363d' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#eab308' }}>{metrics?.stages?.opportunity || 0}</div>
          <div style={{ fontSize: '12px', color: '#8b949e' }}>🎯 Oportunidades</div>
        </div>
      </div>
      
      {/* Tabla de leads */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #30363d', textAlign: 'left' }}>
              <th style={{ padding: '12px', color: '#8b949e' }}>Contacto</th>
              <th style={{ padding: '12px', color: '#8b949e' }}>Canal</th>
              <th style={{ padding: '12px', color: '#8b949e' }}>Score</th>
              <th style={{ padding: '12px', color: '#8b949e' }}>Estado</th>
              <th style={{ padding: '12px', color: '#8b949e' }}>Etapa</th>
              <th style={{ padding: '12px', color: '#8b949e' }}>Última Actividad</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => {
              const scoreInfo = getScoreLabel(lead.score);
              return (
                <tr key={lead._id} style={{ borderBottom: '1px solid #21262d' }}>
                  <td style={{ padding: '12px', color: 'white', fontWeight: 500 }}>{lead.contact?.name || 'N/A'}</td>
                  <td style={{ padding: '12px', color: '#c9d1d9' }}>{lead.contact?.channel || 'N/A'}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', backgroundColor: '#30363d', borderRadius: '3px' }}>
                        <div style={{ width: `${lead.score}%`, height: '6px', backgroundColor: scoreInfo.color, borderRadius: '3px' }}></div>
                      </div>
                      <span style={{ color: scoreInfo.color, fontWeight: 'bold' }}>{lead.score}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ color: scoreInfo.color }}>{scoreInfo.label}</span>
                  </td>
                  <td style={{ padding: '12px', color: '#c9d1d9' }}>{lead.stage}</td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#8b949e' }}>
                    {new Date(lead.lastActivity).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {leads.length === 0 && (
        <div style={{ textAlign: 'center', color: '#8b949e', padding: '60px' }}>
          No hay leads aún. Convierte contactos en leads para empezar.
        </div>
      )}
    </div>
  );
};

export default LeadScoring;