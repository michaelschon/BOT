// src/core/autoSilenceCleanup.js
const { db } = require('./db');
const logger = require('../utils/logger');
const { getCurrentDateTimeBR } = require('../utils/date');

/**
 * Remove silenciamentos que já expiraram do banco de dados.
 */
function cleanExpiredSilences() {
  try {
    const result = db.prepare(`
      DELETE FROM silenciados 
      WHERE expires_at IS NOT NULL 
      AND expires_at <= datetime('now')
    `).run();

    if (result.changes > 0) {
      logger.info(`🧹 Limpeza automática: ${result.changes} silenciamentos expirados removidos em ${getCurrentDateTimeBR()}`);
    }
  } catch (error) {
    logger.error('❌ Erro na limpeza de silenciamentos expirados:', error.message);
  }
}

/**
 * Inicia o job agendado para limpar silenciamentos expirados.
 */
function startCleanupJob() {
  // Executa a cada 30 minutos em produção.
  const interval = 30 * 60 * 1000;
  
  // Executa uma vez logo após a inicialização
  setTimeout(cleanExpiredSilences, 5000); 

  // Configura o intervalo
  setInterval(cleanExpiredSilences, interval);
  
  logger.info(`🧹 Sistema de limpeza automática de silenciamentos configurado (a cada 30 min).`);
}

module.exports = {
  startCleanupJob,
  cleanExpiredSilences,
};
