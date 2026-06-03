import React, { useState, useEffect } from 'react';

const PipelineKanban = ({ workspaceId, token }) => {
  const [leads, setLeads] = useState({});
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState(null);
  
  const stages = [
    { id: 'lead', name: '🟣 Lead', color: '#a855f7' },
    { id: 'contacted', name: '🔵 Contactado', color: '#3b82f6' },
    { id: 'opportunity', name: '🟡 Oportunidad', color: '#eab308' },
    { id: 'negotiation', name: '🟠 Negociación', color: '#f97316' },
    { id: 'customer', name: '🟢 Cliente', color: '#22c55e' },
    { id: 'lost', name: '⚪ Perdido', color: '#6b7280' }
  ];
  
  useEffect(() => {
    fetchLeads();
  }, []);
  
  const fetchLeads = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/leads/${workspaceId}/kanban`, {
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
  
  const handleDragStart = (lead, stage) => {
    setDraggedLead({ lead, sourceStage: stage });
  };
  
  const handleDrop = async (targetStage) => {
    if (!draggedLead) return;
    if (draggedLead.sourceStage === targetStage) return;
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/leads/${workspaceId}/${draggedLead.lead._id}/stage`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ stage: targetStage })
      });
      
      if (response.ok) {
        await fetchLeads();
      }
    } catch (error) {
      console.error('Error moving lead:', error);
    }
    
    setDraggedLead(null);
  };
  
  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };
  
  if (loading) return <div style={{ color: 'white', padding: '40px' }}>Cargando pipeline...</div>;
  
  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: 'white', marginBottom: '20px' }}>📊 Pipeline de Ventas</h2>
      
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', minHeight: '500px' }}>
        {stages.map(stage => (
          <div
            key={stage.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(stage.id)}
            style={{
              flex: 1,
              minWidth: '280px',
              backgroundColor: '#161b22',
              borderRadius: '12px',
              border: '1px solid #30363d',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#21262d',
              borderRadius: '12px 12px 0 0',
              borderBottom: `3px solid ${stage.color}`,
              fontWeight: 'bold',
              color: 'white'
            }}>
              {stage.name}
              <span style={{
                marginLeft: '8px',
                backgroundColor: '#30363d',
                padding: '2px 8px',
                borderRadius: '20px',
                fontSize: '12px'
              }}>
                {leads[stage.id]?.length || 0}
              </span>
            </div>
            
            <div style={{ flex: 1, padding: '12px', minHeight: '400px' }}>
              {(leads[stage.id] || []).map(lead => (
                <div
                  key={lead._id}
                  draggable
                  onDragStart={() => handleDragStart(lead, stage.id)}
                  style={{
                    backgroundColor: '#0d1117',
                    border: '1px solid #30363d',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '10px',
                    cursor: 'grab',
                    transition: 'transform 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong style={{ color: 'white' }}>{lead.contact?.name || 'Sin nombre'}</strong>
                    <span style={{
                      backgroundColor: getScoreColor(lead.score),
                      padding: '2px 8px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: 'white'
                    }}>
                      {lead.score}%
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '4px' }}>
                    📧 {lead.contact?.channelId || 'Sin contacto'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6e7681' }}>
                    Última actividad: {new Date(lead.lastActivity).toLocaleDateString()}
                  </div>
                  {lead.estimatedValue > 0 && (
                    <div style={{ fontSize: '12px', color: '#f0883e', marginTop: '8px' }}>
                      💰 ${lead.estimatedValue}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PipelineKanban;