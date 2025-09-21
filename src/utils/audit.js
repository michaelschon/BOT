/**
 * Sistema de auditoria para rastreamento de comandos
 * Registra todas as execuções e tentativas de uso
 * 
 * @author Volleyball Team
 */

const { statements } = require("../core/db");
const logger = require("./logger");

/**
 * Registra execução de comando no log de auditoria
 * @param {string} userId ID do usuário
 * @param {string} command Nome do comando
 * @param {string} groupId ID do grupo (null se PV)
 * @param {boolean} success Se a execução foi bem-sucedida
 * @param {Array} args Argumentos do comando
 * @param {string} error Mensagem de erro (se houver)
 * @returns {Promise<boolean>} True se registrado com sucesso
 */
async function auditCommand(userId, command, groupId = null, success = true, args = [], error = null) {
  try {
    // Serializa argumentos para JSON, removendo informações sensíveis
    const sanitizedArgs = args.map(arg => {
      // Remove números de telefone completos por segurança
      if (typeof arg === 'string' && /^\d{10,15}$/.test(arg)) {
        return `***${arg.slice(-4)}`;
      }
      return arg;
    });
    
    const argumentsJson = sanitizedArgs.length > 0 ? JSON.stringify(sanitizedArgs) : null;
    
    statements.logCommand.run(
      userId,
      groupId,
      command,
      argumentsJson,
      success ? 1 : 0,
      error
    );
    
    logger.debug(
      `📝 Auditoria registrada: ${userId} executou ${command} ` +
      `(sucesso: ${success}) em ${groupId || 'PV'}`
    );
    
    return true;
    
  } catch (err) {
    logger.error("❌ Erro ao registrar auditoria:", err.message);
    return false;
  }
}

/**
 * Obtém histórico de comandos de um usuário
 * @param {string} userId ID do usuário
 * @param {number} limit Limite de resultados
 * @param {string} groupId ID do grupo (opcional)
 * @returns {Array} Histórico de comandos
 */
function getUserCommandHistory(userId, limit = 50, groupId = null) {
  try {
    let query = `
      SELECT 
        a.*,
        g.name as grupo_nome,
        u.name as usuario_nome
      FROM auditoria a
      LEFT JOIN grupos g ON a.grupo_id = g.id
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.usuario_id = ?
    `;
    
    const params = [userId];
    
    if (groupId) {
      query += ` AND a.grupo_id = ?`;
      params.push(groupId);
    }
    
    query += ` ORDER BY a.timestamp DESC LIMIT ?`;
    params.push(limit);
    
    const results = statements.db.prepare(query).all(...params);
    
    return results.map(row => ({
      ...row,
      argumentos: row.argumentos ? JSON.parse(row.argumentos) : [],
      sucesso: row.sucesso === 1,
      timestamp: new Date(row.timestamp)
    }));
    
  } catch (error) {
    logger.error("❌ Erro ao obter histórico do usuário:", error.message);
    return [];
  }
}

/**
 * Obtém estatísticas de uso de comandos
 * @param {string} groupId ID do grupo (opcional)
 * @param {number} days Período em dias (padrão: 30)
 * @returns {object} Estatísticas de uso
 */
function getCommandStats(groupId = null, days = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    let baseQuery = `
      FROM auditoria a
      WHERE a.timestamp >= ?
    `;
    
    const params = [cutoffDate.toISOString()];
    
    if (groupId) {
      baseQuery += ` AND a.grupo_id = ?`;
      params.push(groupId);
    }
    
    // Comandos mais usados
    const topCommands = statements.db.prepare(`
      SELECT 
        comando,
        COUNT(*) as total_usos,
        COUNT(CASE WHEN sucesso = 1 THEN 1 END) as sucessos,
        COUNT(CASE WHEN sucesso = 0 THEN 1 END) as erros
      ${baseQuery}
      GROUP BY comando
      ORDER BY total_usos DESC
      LIMIT 10
    `).all(...params);
    
    // Usuários mais ativos
    const topUsers = statements.db.prepare(`
      SELECT 
        a.usuario_id,
        u.name as usuario_nome,
        COUNT(*) as total_comandos,
        COUNT(DISTINCT a.comando) as comandos_distintos
      ${baseQuery}
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      GROUP BY a.usuario_id
      ORDER BY total_comandos DESC
      LIMIT 10
    `).all(...params);
    
    // Estatísticas gerais
    const generalStats = statements.db.prepare(`
      SELECT 
        COUNT(*) as total_execucoes,
        COUNT(CASE WHEN sucesso = 1 THEN 1 END) as total_sucessos,
        COUNT(CASE WHEN sucesso = 0 THEN 1 END) as total_erros,
        COUNT(DISTINCT usuario_id) as usuarios_distintos,
        COUNT(DISTINCT comando) as comandos_distintos
      ${baseQuery}
    `).get(...params);
    
    // Atividade por dia
    const dailyActivity = statements.db.prepare(`
      SELECT 
        DATE(timestamp) as data,
        COUNT(*) as execucoes
      ${baseQuery}
      GROUP BY DATE(timestamp)
      ORDER BY data DESC
      LIMIT 30
    `).all(...params);
    
    return {
      periodo: `${days} dias`,
      geral: generalStats,
      comandos_populares: topCommands,
      usuarios_ativos: topUsers,
      atividade_diaria: dailyActivity,
      taxa_sucesso: generalStats.total_execucoes > 0 
        ? (generalStats.total_sucessos / generalStats.total_execucoes * 100).toFixed(1) + '%'
        : '0%'
    };
    
  } catch (error) {
    logger.error("❌ Erro ao obter estatísticas:", error.message);
    return {
      erro: "Erro ao carregar estatísticas",
      periodo: `${days} dias`
    };
  }
}

/**
 * Obtém comandos com mais erros
 * @param {number} limit Limite de resultados
 * @param {number} days Período em dias
 * @returns {Array} Comandos com erros
 */
function getCommandsWithErrors(limit = 10, days = 7) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const results = statements.db.prepare(`
      SELECT 
        comando,
        COUNT(*) as total_erros,
        COUNT(DISTINCT usuario_id) as usuarios_afetados,
        MAX(timestamp) as ultimo_erro,
        GROUP_CONCAT(DISTINCT erro) as erros_distintos
      FROM auditoria
      WHERE sucesso = 0 AND timestamp >= ?
      GROUP BY comando
      ORDER BY total_erros DESC
      LIMIT ?
    `).all(cutoffDate.toISOString(), limit);
    
    return results.map(row => ({
      ...row,
      ultimo_erro: new Date(row.ultimo_erro),
      erros_distintos: row.erros_distintos ? row.erros_distintos.split(',') : []
    }));
    
  } catch (error) {
    logger.error("❌ Erro ao obter comandos com erros:", error.message);
    return [];
  }
}

/**
 * Limpa logs antigos da auditoria
 * @param {number} days Manter logs dos últimos N dias
 * @returns {number} Número de registros removidos
 */
function cleanOldAuditLogs(days = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const result = statements.db.prepare(`
      DELETE FROM auditoria 
      WHERE timestamp < ?
    `).run(cutoffDate.toISOString());
    
    if (result.changes > 0) {
      logger.info(`🧹 Limpeza de auditoria: ${result.changes} registros removidos`);
    }
    
    return result.changes;
    
  } catch (error) {
    logger.error("❌ Erro na limpeza de logs:", error.message);
    return 0;
  }
}

/**
 * Exporta relatório de auditoria
 * @param {string} groupId ID do grupo (opcional)
 * @param {number} days Período em dias
 * @returns {object} Relatório completo
 */
function generateAuditReport(groupId = null, days = 30) {
  try {
    const stats = getCommandStats(groupId, days);
    const errors = getCommandsWithErrors(5, days);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Atividade suspeita (muitas tentativas falhadas)
    let suspiciousQuery = `
      SELECT 
        usuario_id,
        COUNT(*) as tentativas_falhadas,
        COUNT(DISTINCT comando) as comandos_tentados,
        MAX(timestamp) as ultima_tentativa
      FROM auditoria
      WHERE sucesso = 0 AND timestamp >= ?
    `;
    
    const params = [cutoffDate.toISOString()];
    
    if (groupId) {
      suspiciousQuery += ` AND grupo_id = ?`;
      params.push(groupId);
    }
    
    suspiciousQuery += `
      GROUP BY usuario_id
      HAVING tentativas_falhadas >= 5
      ORDER BY tentativas_falhadas DESC
      LIMIT 10
    `;
    
    const suspiciousActivity = statements.db.prepare(suspiciousQuery).all(...params);
    
    return {
      ...stats,
      comandos_com_erros: errors,
      atividade_suspeita: suspiciousActivity.map(row => ({
        ...row,
        ultima_tentativa: new Date(row.ultima_tentativa)
      })),
      gerado_em: new Date(),
      grupo_id: groupId
    };
    
  } catch (error) {
    logger.error("❌ Erro ao gerar relatório:", error.message);
    return {
      erro: "Erro ao gerar relatório",
      gerado_em: new Date()
    };
  }
}

// Executa limpeza automática a cada 24 horas
setInterval(() => {
  cleanOldAuditLogs(90);
}, 24 * 60 * 60 * 1000);

module.exports = {
  auditCommand,
  getUserCommandHistory,
  getCommandStats,
  getCommandsWithErrors,
  cleanOldAuditLogs,
  generateAuditReport
};
