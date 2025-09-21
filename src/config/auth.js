/**
 * Sistema de autenticação e autorização do bot
 * Controla permissões de usuários, admins e comandos especiais
 * 
 * @author Volleyball Team
 */

const { statements } = require("../core/db");
const logger = require("../utils/logger");

// ID do usuário master (imutável e com poderes totais)
const MASTER_USER_ID = "5519999222004@c.us";

/**
 * Extrai o ID do remetente da mensagem
 * @param {object} msg Objeto da mensagem
 * @returns {string} ID do remetente
 */
function getSenderId(msg) {
  // Em grupos: msg.author, em conversas privadas: msg.from
  return msg.author || msg.from;
}

/**
 * Verifica se o usuário é o Master
 * @param {object} msg Objeto da mensagem
 * @returns {boolean} True se for o master
 */
function isMaster(msg) {
  const senderId = getSenderId(msg);
  return senderId === MASTER_USER_ID;
}

/**
 * Verifica se o usuário é admin do grupo
 * @param {string} groupId ID do grupo
 * @param {string} userId ID do usuário
 * @returns {boolean} True se for admin do grupo
 */
function isGroupAdmin(groupId, userId) {
  try {
    // Master sempre é admin
    if (userId === MASTER_USER_ID) return true;
    
    const result = statements.isGroupAdmin.get(groupId, userId);
    return !!result;
    
  } catch (error) {
    logger.error("❌ Erro ao verificar admin do grupo:", error.message);
    return false;
  }
}

/**
 * Verifica permissão especial para um comando específico
 * @param {string} groupId ID do grupo
 * @param {string} userId ID do usuário
 * @param {string} command Nome do comando
 * @returns {boolean|null} True/False para permissão, null se não há regra especial
 */
function hasSpecialPermission(groupId, userId, command) {
  try {
    // Master sempre tem todas as permissões
    if (userId === MASTER_USER_ID) return true;
    
    const result = statements.hasSpecialPermission.get(groupId, userId, command);
    
    if (result) {
      return result.permitido === 1;
    }
    
    return null; // Não há regra especial definida
    
  } catch (error) {
    logger.error("❌ Erro ao verificar permissão especial:", error.message);
    return null;
  }
}

/**
 * Função principal de verificação de autorização
 * @param {object} msg Objeto da mensagem
 * @param {object} chat Objeto do chat
 * @param {object} command Objeto do comando
 * @param {object} config Configuração do comando
 * @returns {boolean} True se autorizado
 */
async function authCheck(msg, chat, command, config) {
  try {
    const senderId = getSenderId(msg);
    const groupId = chat.isGroup ? chat.id._serialized : null;
    const commandName = command.name;
    
    logger.debug(`🔐 Verificando auth: usuário=${senderId}, comando=${commandName}`);
    
    // REGRA 1: Master sempre autorizado
    if (senderId === MASTER_USER_ID) {
      logger.debug("✅ Autorizado: usuário master");
      return true;
    }
    
    // REGRA 2: Verificar permissão especial primeiro (mais específica)
    const specialPerm = hasSpecialPermission(groupId, senderId, commandName);
    if (specialPerm === true) {
      logger.debug("✅ Autorizado: permissão especial concede acesso");
      return true;
    } else if (specialPerm === false) {
      logger.debug("❌ Negado: permissão especial nega acesso");
      return false;
    }
    
    // REGRA 3: Comando não requer admin - acesso público
    if (!command.requireAdmin && !config.requireAdmin) {
      logger.debug("✅ Autorizado: comando público");
      return true;
    }
    
    // REGRA 4: Comando requer admin e estamos em grupo
    if (chat.isGroup) {
      const isAdmin = isGroupAdmin(groupId, senderId);
      if (isAdmin) {
        logger.debug("✅ Autorizado: admin do grupo");
        return true;
      } else {
        logger.debug("❌ Negado: não é admin do grupo");
        return false;
      }
    }
    
    // REGRA 5: Comando de admin em conversa privada (apenas master)
    if (command.requireAdmin || config.requireAdmin) {
      logger.debug("❌ Negado: comando de admin em PV (apenas master)");
      return false;
    }
    
    logger.debug("✅ Autorizado: critérios padrão atendidos");
    return true;
    
  } catch (error) {
    logger.error("❌ Erro na verificação de autorização:", error.message);
    return false;
  }
}

/**
 * Adiciona um admin a um grupo
 * @param {string} groupId ID do grupo
 * @param {string} userId ID do usuário
 * @param {string} grantedBy Quem concedeu a permissão
 * @returns {boolean} True se sucesso
 */
function addGroupAdmin(groupId, userId, grantedBy = MASTER_USER_ID) {
  try {
    // Não pode remover poderes do master
    if (userId === MASTER_USER_ID) {
      logger.warn("⚠️ Tentativa de modificar permissões do master");
      return false;
    }
    
    console.log(`🔍 Debug addGroupAdmin: Tentando adicionar ${userId} ao grupo ${groupId} por ${grantedBy}`);
    
    const result = statements.addGroupAdmin.run(groupId, userId, grantedBy);
    console.log(`🔍 Debug addGroupAdmin: Resultado do SQL:`, result);
    
    // Verificar se foi inserido
    const verification = statements.isGroupAdmin.get(groupId, userId);
    console.log(`🔍 Debug addGroupAdmin: Verificação após inserção:`, verification);
    
    logger.info(`👑 Admin adicionado: ${userId} no grupo ${groupId} por ${grantedBy}`);
    return true;
    
  } catch (error) {
    logger.error("❌ Erro ao adicionar admin:", error.message);
    console.error("SQL Error details:", error);
    return false;
  }
}

/**
 * Remove um admin de um grupo
 * @param {string} groupId ID do grupo
 * @param {string} userId ID do usuário
 * @returns {boolean} True se sucesso
 */
function removeGroupAdmin(groupId, userId) {
  try {
    // Não pode remover o master
    if (userId === MASTER_USER_ID) {
      logger.warn("⚠️ Tentativa de remover master como admin - BLOQUEADO");
      return false;
    }
    
    statements.removeGroupAdmin.run(groupId, userId);
    logger.info(`👑 Admin removido: ${userId} do grupo ${groupId}`);
    return true;
    
  } catch (error) {
    logger.error("❌ Erro ao remover admin:", error.message);
    return false;
  }
}

/**
 * Concede permissão especial para um comando
 * @param {string} groupId ID do grupo
 * @param {string} userId ID do usuário
 * @param {string} command Nome do comando
 * @param {boolean} allowed Se é permitido
 * @param {string} grantedBy Quem concedeu
 * @param {Date|null} expiresAt Data de expiração
 * @returns {boolean} True se sucesso
 */
function grantSpecialPermission(groupId, userId, command, allowed = true, grantedBy = MASTER_USER_ID, expiresAt = null) {
  try {
    // Não pode modificar permissões do master
    if (userId === MASTER_USER_ID) {
      logger.warn("⚠️ Tentativa de modificar permissões do master");
      return false;
    }
    
    statements.grantSpecialPermission.run(
      groupId, 
      userId, 
      command, 
      allowed ? 1 : 0, 
      grantedBy, 
      expiresAt ? expiresAt.toISOString() : null
    );
    
    logger.info(
      `🔑 Permissão especial ${allowed ? 'concedida' : 'revogada'}: ` +
      `${userId} para comando ${command} no grupo ${groupId}`
    );
    
    return true;
    
  } catch (error) {
    logger.error("❌ Erro ao conceder permissão especial:", error.message);
    return false;
  }
}

/**
 * Lista todos os admins de um grupo
 * @param {string} groupId ID do grupo
 * @returns {Array} Lista de admins
 */
function getGroupAdmins(groupId) {
  try {
    const { db } = require("../core/db");
    
    const admins = db.prepare(`
      SELECT ag.usuario_id, ag.granted_by, ag.granted_at, u.name 
      FROM admins_grupos ag
      LEFT JOIN usuarios u ON ag.usuario_id = u.id
      WHERE ag.grupo_id = ?
      ORDER BY ag.granted_at
    `).all(groupId);
    
    // Sempre inclui o master
    const masterInList = admins.find(admin => admin.usuario_id === MASTER_USER_ID);
    if (!masterInList) {
      admins.unshift({
        usuario_id: MASTER_USER_ID,
        granted_by: 'SYSTEM',
        granted_at: '2024-01-01 00:00:00',
        name: 'Master Admin'
      });
    }
    
    console.log(`🔍 Debug getGroupAdmins para grupo ${groupId}:`, admins.length, "admins encontrados");
    return admins;
    
  } catch (error) {
    logger.error("❌ Erro ao listar admins do grupo:", error.message);
    console.error("SQL Error:", error);
    return [];
  }
}

module.exports = {
  getSenderId,
  isMaster,
  isGroupAdmin,
  hasSpecialPermission,
  authCheck,
  addGroupAdmin,
  removeGroupAdmin,
  grantSpecialPermission,
  getGroupAdmins,
  MASTER_USER_ID
};
