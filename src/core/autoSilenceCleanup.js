/**
 * Sistema de Limpeza Automática de Silenciamentos
 * Gerencia a remoção automática de silenciamentos temporários expirados
 * 
 * @author Volleyball Team
 * @version 2.2 - Sistema Automático Otimizado
 */

const { statements, db } = require("./db");
const logger = require("../utils/logger");

// Armazenamento dos timeouts ativos para limpeza individual
const activeTimeouts = new Map();

/**
 * Agenda a remoção automática de um silenciamento específico
 * @param {string} groupId ID do grupo
 * @param {string} userId ID do usuário
 * @param {Date} expiresAt Data de expiração do silenciamento
 * @param {Client} client Cliente do WhatsApp (opcional para notificações)
 */
function scheduleAutoRemoval(groupId, userId, expiresAt, client = null) {
  try {
    const now = new Date();
    const msUntilExpiry = expiresAt.getTime() - now.getTime();
    
    // Se já expirou, remover imediatamente
    if (msUntilExpiry <= 0) {
      removeSilencedUser(groupId, userId, client, true);
      return;
    }
    
    // Criar chave única para identificar o timeout
    const timeoutKey = `${groupId}:${userId}`;
    
    // Cancelar timeout anterior se existir
    if (activeTimeouts.has(timeoutKey)) {
      clearTimeout(activeTimeouts.get(timeoutKey));
    }
    
    // Agendar remoção automática
    const timeoutId = setTimeout(() => {
      removeSilencedUser(groupId, userId, client, true);
      activeTimeouts.delete(timeoutKey);
    }, msUntilExpiry);
    
    // Armazenar timeout para possível cancelamento futuro
    activeTimeouts.set(timeoutKey, timeoutId);
    
    logger.info(
      `⏰ Agendada remoção automática: ${userId} no grupo ${groupId} ` +
      `em ${Math.ceil(msUntilExpiry / 1000)}s (${expiresAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })})`
    );
    
  } catch (error) {
    logger.error("❌ Erro ao agendar remoção automática:", error.message);
  }
}

/**
 * Cancela o agendamento de remoção automática de um usuário
 * @param {string} groupId ID do grupo
 * @param {string} userId ID do usuário
 */
function cancelAutoRemoval(groupId, userId) {
  try {
    const timeoutKey = `${groupId}:${userId}`;
    
    if (activeTimeouts.has(timeoutKey)) {
      clearTimeout(activeTimeouts.get(timeoutKey));
      activeTimeouts.delete(timeoutKey);
      
      logger.debug(`⏰ Agendamento cancelado: ${userId} no grupo ${groupId}`);
    }
    
  } catch (error) {
    logger.error("❌ Erro ao cancelar agendamento:", error.message);
  }
}

/**
 * Remove um usuário silenciado do banco de dados
 * @param {string} groupId ID do grupo
 * @param {string} userId ID do usuário
 * @param {Client} client Cliente do WhatsApp (opcional)
 * @param {boolean} isAutomatic Se a remoção é automática (expiração)
 * @returns {boolean} True se removido com sucesso
 */
function removeSilencedUser(groupId, userId, client = null, isAutomatic = false) {
  try {
    // Obter informações do silenciamento antes de remover
    const silencedInfo = statements.getSilenced.get(groupId, userId);
    
    if (!silencedInfo) {
      logger.debug(`⚠️ Usuário ${userId} não está silenciado no grupo ${groupId}`);
      return false;
    }
    
    // Remover do banco de dados
    const result = statements.removeSilenced.run(groupId, userId);
    
    if (result.changes > 0) {
      const tipoRemocao = isAutomatic ? 'automática' : 'manual';
      const duracao = calculateSilenceDuration(silencedInfo.created_at);
      
      logger.info(
        `🔊 Silenciamento removido (${tipoRemocao}): ${userId} no grupo ${groupId} ` +
        `(estava silenciado por ${duracao})`
      );
      
      // Log específico para remoção automática (mais detalhado)
      if (isAutomatic) {
        console.log(
          `🔊 EXPIRAÇÃO AUTOMÁTICA - ${userId} foi liberado automaticamente ` +
          `no grupo ${groupId} após ${duracao} de silenciamento`
        );
        
        // Opcional: Enviar notificação no grupo sobre a liberação automática
        if (client) {
          sendAutoRemovalNotification(client, groupId, userId, duracao);
        }
      }
      
      return true;
    }
    
    return false;
    
  } catch (error) {
    logger.error("❌ Erro ao remover usuário silenciado:", error.message);
    return false;
  }
}

/**
 * Envia notificação no grupo sobre liberação automática (opcional)
 * @param {Client} client Cliente do WhatsApp
 * @param {string} groupId ID do grupo
 * @param {string} userId ID do usuário liberado
 * @param {string} duration Duração que ficou silenciado
 */
async function sendAutoRemovalNotification(client, groupId, userId, duration) {
  try {
    // Obter informações do usuário
    let userName = userId.replace("@c.us", "");
    try {
      const contact = await client.getContactById(userId);
      userName = contact.pushname || userName;
    } catch (contactError) {
      // Usar ID se não conseguir obter o nome
    }
    
    // Enviar notificação discreta
    const notification = 
      `🔊 **Silenciamento expirado**\n\n` +
      `👤 **Usuário:** ${userName}\n` +
      `⏱️ **Duração:** ${duration}\n` +
      `⏰ **Liberado automaticamente:** ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n` +
      `✅ O usuário pode voltar a enviar mensagens normalmente.`;
    
    await client.sendMessage(groupId, notification);
    
    logger.debug(`📢 Notificação de liberação automática enviada para grupo ${groupId}`);
    
  } catch (error) {
    logger.warn("⚠️ Erro ao enviar notificação de liberação automática:", error.message);
    // Não propagar erro - notificação é opcional
  }
}

/**
 * Calcula duração do silenciamento de forma legível
 * @param {string} createdAt Data de criação do silenciamento
 * @returns {string} Duração formatada
 */
function calculateSilenceDuration(createdAt) {
  try {
    const inicio = new Date(createdAt);
    const fim = new Date();
    const diffMs = fim.getTime() - inicio.getTime();
    
    const minutos = Math.floor(diffMs / (1000 * 60));
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);
    
    if (dias > 0) {
      const horasRestantes = horas % 24;
      return `${dias} dia(s)${horasRestantes > 0 ? ` e ${horasRestantes} hora(s)` : ''}`;
    } else if (horas > 0) {
      const minutosRestantes = minutos % 60;
      return `${horas} hora(s)${minutosRestantes > 0 ? ` e ${minutosRestantes} minuto(s)` : ''}`;
    } else {
      return `${minutos} minuto(s)`;
    }
  } catch (error) {
    return "tempo indeterminado";
  }
}

/**
 * Executa limpeza em lote de todos os silenciamentos expirados
 * Chamada periodicamente como backup e na inicialização
 * @param {Client} client Cliente do WhatsApp (opcional para notificações)
 * @returns {number} Número de registros removidos
 */
function cleanExpiredSilences(client = null) {
  try {
    // Obter todos os silenciamentos expirados
    const expiredSilences = db.prepare(`
      SELECT grupo_id, usuario_id, created_at
      FROM silenciados 
      WHERE expires_at IS NOT NULL 
      AND expires_at <= datetime('now')
    `).all();
    
    if (expiredSilences.length === 0) {
      return 0;
    }
    
    // Remover em lote
    const result = db.prepare(`
      DELETE FROM silenciados 
      WHERE expires_at IS NOT NULL 
      AND expires_at <= datetime('now')
    `).run();
    
    if (result.changes > 0) {
      logger.info(
        `🧹 Limpeza em lote: ${result.changes} silenciamentos expirados removidos ` +
        `em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`
      );
      
      // Log individual para cada usuário liberado
      expiredSilences.forEach(silence => {
        const duracao = calculateSilenceDuration(silence.created_at);
        console.log(
          `🔊 LIMPEZA AUTOMÁTICA - ${silence.usuario_id} liberado ` +
          `no grupo ${silence.grupo_id} (silenciado por ${duracao})`
        );
      });
      
      // Opcional: Enviar notificações em grupos (se não for muitos)
      if (client && expiredSilences.length <= 5) {
        expiredSilences.forEach(silence => {
          const duracao = calculateSilenceDuration(silence.created_at);
          sendAutoRemovalNotification(client, silence.grupo_id, silence.usuario_id, duracao);
        });
      }
    }
    
    return result.changes;
    
  } catch (error) {
    logger.error("❌ Erro na limpeza em lote de silenciamentos:", error.message);
    return 0;
  }
}

/**
 * Inicializa agendamentos para todos os silenciamentos temporários existentes
 * Chamada na inicialização do bot para recuperar agendamentos perdidos
 * @param {Client} client Cliente do WhatsApp
 */
function initializeAutoRemovals(client) {
  try {
    // Obter todos os silenciamentos temporários ativos
    const activeSilences = db.prepare(`
      SELECT grupo_id, usuario_id, expires_at
      FROM silenciados 
      WHERE expires_at IS NOT NULL 
      AND expires_at > datetime('now')
      ORDER BY expires_at
    `).all();
    
    if (activeSilences.length === 0) {
      logger.info("⏰ Nenhum silenciamento temporário ativo para agendar");
      return;
    }
    
    // Agendar remoção automática para cada um
    let scheduledCount = 0;
    activeSilences.forEach(silence => {
      try {
        const expiresAt = new Date(silence.expires_at);
        scheduleAutoRemoval(silence.grupo_id, silence.usuario_id, expiresAt, client);
        scheduledCount++;
      } catch (scheduleError) {
        logger.error(
          `❌ Erro ao agendar remoção para ${silence.usuario_id}: ${scheduleError.message}`
        );
      }
    });
    
    logger.info(
      `⏰ Sistema de limpeza automática inicializado: ${scheduledCount}/${activeSilences.length} ` +
      `agendamentos criados`
    );
    
  } catch (error) {
    logger.error("❌ Erro ao inicializar agendamentos automáticos:", error.message);
  }
}

/**
 * Obtém estatísticas dos agendamentos ativos
 * @returns {object} Estatísticas dos agendamentos
 */
function getScheduleStats() {
  try {
    const activeCount = activeTimeouts.size;
    
    // Obter contagem do banco para comparação
    const dbCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM silenciados 
      WHERE expires_at IS NOT NULL 
      AND expires_at > datetime('now')
    `).get().count;
    
    return {
      agendamentos_ativos: activeCount,
      silenciamentos_temporarios_db: dbCount,
      sincronizado: activeCount === dbCount,
      chaves_ativas: Array.from(activeTimeouts.keys())
    };
    
  } catch (error) {
    logger.error("❌ Erro ao obter estatísticas:", error.message);
    return {
      agendamentos_ativos: activeTimeouts.size,
      erro: error.message
    };
  }
}

/**
 * Força a limpeza de todos os agendamentos ativos
 * Útil para debug ou reinicialização
 */
function clearAllSchedules() {
  try {
    const count = activeTimeouts.size;
    
    activeTimeouts.forEach((timeoutId, key) => {
      clearTimeout(timeoutId);
    });
    
    activeTimeouts.clear();
    
    logger.info(`🧹 Todos os agendamentos limpos: ${count} timeouts cancelados`);
    return count;
    
  } catch (error) {
    logger.error("❌ Erro ao limpar agendamentos:", error.message);
    return 0;
  }
}

module.exports = {
  scheduleAutoRemoval,
  cancelAutoRemoval,
  removeSilencedUser,
  cleanExpiredSilences,
  initializeAutoRemovals,
  getScheduleStats,
  clearAllSchedules,
  sendAutoRemovalNotification,
  calculateSilenceDuration
};
