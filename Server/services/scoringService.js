const Interaction = require('../models/Interaction');
const Lead = require('../models/Lead');

// Puntuación por tipo de interacción
const SCORES = {
  message_received: 5,
  message_sent: 3,
  email_opened: 2,
  link_clicked: 4,
  form_submitted: 10,
  call_made: 8,
  quote_sent: 15,
  quote_viewed: 12,
  payment_made: 25
};

// Calcular score total de un lead
const calculateLeadScore = async (leadId) => {
  const interactions = await Interaction.find({ lead: leadId });
  
  let totalScore = 0;
  
  for (const interaction of interactions) {
    totalScore += interaction.points || SCORES[interaction.type] || 0;
  }
  
  // Bonificaciones adicionales
  const recentInteractions = interactions.filter(i => {
    return new Date(i.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  });
  
  // +10 si hay interacciones en los últimos 7 días
  if (recentInteractions.length > 0) {
    totalScore += 10;
  }
  
  // Penalización si no hay actividad en 30 días
  const lastInteraction = interactions.sort((a, b) => b.timestamp - a.timestamp)[0];
  if (lastInteraction) {
    const daysSinceLast = (Date.now() - new Date(lastInteraction.timestamp)) / (1000 * 60 * 60 * 24);
    if (daysSinceLast > 30) {
      totalScore -= 20;
    }
  }
  
  // Limitar entre 0 y 100
  return Math.min(100, Math.max(0, totalScore));
};

// Determinar stage basado en score
const getStageByScore = (score) => {
  if (score >= 80) return 'customer';
  if (score >= 60) return 'negotiation';
  if (score >= 40) return 'opportunity';
  if (score >= 20) return 'contacted';
  return 'lead';
};

// Actualizar score y stage de un lead
const updateLeadScoreAndStage = async (leadId) => {
  const score = await calculateLeadScore(leadId);
  const stage = getStageByScore(score);
  
  await Lead.findByIdAndUpdate(leadId, {
    score,
    stage,
    updatedAt: new Date()
  });
  
  return { score, stage };
};

// Registrar interacción y actualizar score
const recordInteraction = async (leadId, type, channel, details = {}) => {
  const interaction = new Interaction({
    lead: leadId,
    type,
    channel,
    details,
    points: SCORES[type] || 0,
    timestamp: new Date()
  });
  
  await interaction.save();
  await updateLeadScoreAndStage(leadId);
  
  return interaction;
};

module.exports = { calculateLeadScore, getStageByScore, updateLeadScoreAndStage, recordInteraction, SCORES };