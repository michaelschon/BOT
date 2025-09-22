/**
 * Configuração Centralizada de Comandos - Otimizada
 * Sistema de permissões granular por grupo com cache inteligente
 * 
 * @author Volleyball Team
 * @version 3.0 - Sistema avançado de permissões
 */

const logger = require('../utils/logger');

// ===== CONFIGURAÇÕES GLOBAIS =====

/**
 * Número master - tem poder absoluto e não pode ser prejudicado
 * Este número tem acesso total a TODOS os comandos em TODOS os grupos
 */
const MASTER_NUMBER = '5519999222004@c.us';

/**
 * Grupo principal autorizado por padrão
 * Comandos funcionam aqui por padrão, outros grupos precisam ser explicitamente habilitados
 */
const GRUPO_AUTORIZADO = '120363327947888891@g.us'; // Substitua pelo ID real do seu grupo

/**
 * Configurações específicas de cada comando
 * Estrutura: comando -> configuração detalhada
 */
const COMMAND_CONFIGS = {
  // ===== COMANDOS BÁSICOS (LIVRES PARA TODOS) =====
  '!ping': {
    enabled: true,
    requireAdmin: false,
    allowedGroups: [], // Vazio = permitido em todos os grupos
    description: "Testa conectividade do bot",
    category: "basic",
    cooldown: 1000, // 1 segundo
    masterOnly: false
  },
  
  '!dados': {
    enabled: true,
    requireAdmin: false,
    allowedGroups: [], // Permitido em todos os grupos
    description: "Informações do grupo e usuário",
    category: "basic",
    cooldown: 2000, // 2 segundos
    masterOnly: false
  },
  
  '!ajuda': {
    enabled: true,
    requireAdmin: false,
    allowedGroups: [],
    description: "Lista de comandos disponíveis",
    category: "basic",
    cooldown: 3000, // 3 segundos
    masterOnly: false,
    aliases: ['!help', '!comandos', '!?']
  },
  
  // ===== COMANDOS DE USUÁRIO =====
  '!apelido': {
    enabled: true,
    requireAdmin: false,
    allowedGroups: [GRUPO_AUTORIZADO], // Apenas no grupo principal
    description: "Define ou altera seu apelido",
    category: "user",
    cooldown: 10000, // 10 segundos
    minArgs: 1,
    maxArgs: 3,
    masterOnly: false
  },
  
  '!nick': {
    enabled: true,
    requireAdmin: false,
    allowedGroups: [GRUPO_AUTORIZADO],
    description: "Mostra seu apelido atual",
    category: "user",
    cooldown: 5000, // 5 segundos
    masterOnly: false
  },
  
  // ===== COMANDOS DE ADMINISTRAÇÃO =====
  '!status': {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [GRUPO_AUTORIZADO],
    description: "Status detalhado do sistema",
    category: "admin",
    cooldown: 5000,
    masterOnly: true // Apenas master
  },
  
  '!lista': {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [GRUPO_AUTORIZADO],
    description: "Lista usuários e apelidos do grupo",
    category: "admin",
    cooldown: 5000,
    masterOnly: false
  },
  
  '!silenciar': {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [GRUPO_AUTORIZADO],
    description: "Silencia usuário por tempo determinado",
    category: "moderation",
    cooldown: 2000,
    minArgs: 1,
    maxArgs: 2,
    masterOnly: false,
    aliases: ['!mute']
  },
  
  '!liberar': {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [GRUPO_AUTORIZADO],
    description: "Remove silenciamento de usuário",
    category: "moderation",
    cooldown: 2000,
    minArgs: 1,
    maxArgs: 1,
    masterOnly: false,
    aliases: ['!unmute', '!unsilenciar']
  },
  
  '!bloquear': {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [GRUPO_AUTORIZADO],
    description: "Bloqueia apelido específico",
    category: "moderation",
    cooldown: 3000,
    minArgs: 1,
    masterOnly: false,
    aliases: ['!lock']
  },
  
  '!desbloquear': {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [GRUPO_AUTORIZADO],
    description: "Desbloqueia apelido específico",
    category: "moderation",
    cooldown: 3000,
    minArgs: 1,
    masterOnly: false,
    aliases: ['!unlock']
  },
  
  // ===== COMANDOS MASTER EXCLUSIVOS =====
  '!restart': {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [], // Master pode usar em qualquer lugar
    description: "Reinicia o bot",
    category: "system",
    cooldown: 0, // Sem cooldown para emergências
    masterOnly: true,
    aliases: ['!reboot', '!reiniciar']
  },
  
  '!addadmin': {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [GRUPO_AUTORIZADO],
    description: "Adiciona administrador ao grupo",
    category: "system",
    cooldown: 5000,
    minArgs: 1,
    masterOnly: true
  },
  
  '!removeadmin': {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [GRUPO_AUTORIZADO],
    description: "Remove administrador do grupo",
    category: "system",
    cooldown: 5000,
    minArgs: 1,
    masterOnly: true
  },
  
  '!limpar': {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [GRUPO_AUTORIZADO],
    description: "Limpa quantidade específica de mensagens",
    category: "moderation",
    cooldown: 10000,
    minArgs: 1,
    maxArgs: 1,
    masterOnly: true
  },
  
  // ===== COMANDOS ESPECIAIS =====
  '!noturno': {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [GRUPO_AUTORIZADO],
    description: "Ativa/desativa modo noturno automático",
    category: "special",
    cooldown: 5000,
    masterOnly: false
  },
  
  '!invite': {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [GRUPO_AUTORIZADO],
    description: "Envia convite do grupo para usuário",
    category: "admin",
    cooldown: 30000, // 30 segundos para evitar spam
    minArgs: 1,
    masterOnly: false,
    aliases: ['!convidar', '!convite']
  }
};

// ===== CACHE DE CONFIGURAÇÕES =====
// Cache em memória para evitar recalcular configurações constantemente
const configCache = new Map();

/**
 * Obtém configuração de um comando com cache inteligente
 * @param {string} commandName Nome do comando (com ou sem !)
 * @returns {object} Configuração do comando
 */
function getCommandConfig(commandName) {
  // Normaliza nome do comando - remove ! se presente e converte para lowercase
  const cleanName = commandName.toLowerCase().replace(/^!/, "");
  const fullName = `!${cleanName}`;
  
  // Verifica cache primeiro
  if (configCache.has(fullName)) {
    return configCache.get(fullName);
  }
  
  // Busca configuração direta
  let config = COMMAND_CONFIGS[fullName];
  
  // Se não encontrou, procura nos aliases
  if (!config) {
    for (const [mainCommand, commandConfig] of Object.entries(COMMAND_CONFIGS)) {
      if (commandConfig.aliases && commandConfig.aliases.includes(fullName)) {
        config = commandConfig;
        logger.debug(`🔗 Alias detectado: ${fullName} -> ${mainCommand}`);
        break;
      }
    }
  }
  
  if (!config) {
    // Configuração padrão para comandos não listados
    const defaultConfig = {
      enabled: false,
      requireAdmin: true,
      allowedGroups: [GRUPO_AUTORIZADO], // Mesmo comandos não listados só funcionam no grupo autorizado
      description: "Comando não configurado",
      category: "outros",
      cooldown: 5000,
      masterOnly: false
    };
    
    logger.warn(`⚠️ Comando sem configuração: ${fullName}, usando padrão restrito`);
    configCache.set(fullName, defaultConfig);
    return defaultConfig;
  }
  
  // Adiciona configurações padrão se não especificadas
  const processedConfig = {
    enabled: true,
    requireAdmin: false,
    allowedGroups: [GRUPO_AUTORIZADO], // Padrão: apenas grupo autorizado
    description: "",
    category: "outros",
    cooldown: 3000,
    minArgs: 0,
    maxArgs: Infinity,
    masterOnly: false,
    aliases: [],
    ...config
  };
  
  configCache.set(fullName, processedConfig);
  return processedConfig;
}

/**
 * Verifica se comando está habilitado
 * @param {string} commandName Nome do comando
 * @returns {boolean} Se está habilitado
 */
function isCommandEnabled(commandName) {
  const config = getCommandConfig(commandName);
  return config.enabled;
}

/**
 * Verifica se comando requer permissões de admin
 * @param {string} commandName Nome do comando
 * @returns {boolean} Se requer admin
 */
function requiresAdmin(commandName) {
  const config = getCommandConfig(commandName);
  return config.requireAdmin;
}

/**
 * Verifica se comando é exclusivo do master
 * @param {string} commandName Nome do comando
 * @returns {boolean} Se é master only
 */
function isMasterOnly(commandName) {
  const config = getCommandConfig(commandName);
  return config.masterOnly;
}

/**
 * Verifica se comando é permitido no grupo específico
 * @param {string} commandName Nome do comando
 * @param {string} groupId ID do grupo
 * @returns {boolean} Se é permitido no grupo
 */
function isAllowedInGroup(commandName, groupId) {
  const config = getCommandConfig(commandName);
  
  // Se allowedGroups está vazio, é permitido em todos os grupos
  if (!config.allowedGroups || config.allowedGroups.length === 0) {
    return true;
  }
  
  // Verifica se o grupo está na lista de permitidos
  return config.allowedGroups.includes(groupId);
}

/**
 * Obtém cooldown do comando
 * @param {string} commandName Nome do comando
 * @returns {number} Cooldown em ms
 */
function getCommandCooldown(commandName) {
  const config = getCommandConfig(commandName);
  return config.cooldown || 3000;
}

/**
 * Valida argumentos do comando
 * @param {string} commandName Nome do comando
 * @param {Array} args Argumentos fornecidos
 * @returns {object} Resultado da validação
 */
function validateCommandArgs(commandName, args) {
  const config = getCommandConfig(commandName);
  const argCount = args.length;
  
  const result = {
    valid: true,
    error: null,
    config
  };
  
  // Verifica argumentos mínimos
  if (config.minArgs && argCount < config.minArgs) {
    result.valid = false;
    result.error = `Comando requer pelo menos ${config.minArgs} argumento(s). Fornecidos: ${argCount}`;
    return result;
  }
  
  // Verifica argumentos máximos
  if (config.maxArgs && argCount > config.maxArgs) {
    result.valid = false;
    result.error = `Comando aceita no máximo ${config.maxArgs} argumento(s). Fornecidos: ${argCount}`;
    return result;
  }
  
  return result;
}

/**
 * Verificação completa de permissões para um comando
 * @param {string} commandName Nome do comando
 * @param {string} userId ID do usuário
 * @param {string} groupId ID do grupo (opcional)
 * @param {boolean} isUserAdmin Se o usuário é admin
 * @returns {object} Resultado da verificação
 */
function checkCommandPermissions(commandName, userId, groupId = null, isUserAdmin = false) {
  const result = {
    allowed: false,
    reason: null,
    config: null
  };
  
  try {
    const config = getCommandConfig(commandName);
    result.config = config;
    
    // ===== VERIFICAÇÃO 1: COMANDO HABILITADO =====
    if (!config.enabled) {
      result.reason = "Comando desabilitado";
      return result;
    }
    
    // ===== VERIFICAÇÃO 2: MASTER TEM PODER ABSOLUTO =====
    if (userId === MASTER_NUMBER) {
      result.allowed = true;
      return result;
    }
    
    // ===== VERIFICAÇÃO 3: COMANDO MASTER ONLY =====
    if (config.masterOnly) {
      result.reason = "Comando exclusivo do master";
      return result;
    }
    
    // ===== VERIFICAÇÃO 4: GRUPO PERMITIDO =====
    if (groupId && !isAllowedInGroup(commandName, groupId)) {
      result.reason = "Comando não permitido neste grupo";
      return result;
    }
    
    // ===== VERIFICAÇÃO 5: PERMISSÃO DE ADMIN =====
    if (config.requireAdmin && !isUserAdmin) {
      result.reason = "Comando requer permissões de administrador";
      return result;
    }
    
    // ===== TODAS AS VERIFICAÇÕES PASSARAM =====
    result.allowed = true;
    return result;
    
  } catch (error) {
    logger.error('❌ Erro na verificação de permissões:', error.message);
    result.reason = "Erro interno na verificação de permissões";
    return result;
  }
}

/**
 * Obtém lista de comandos disponíveis para um usuário
 * @param {string} userId ID do usuário
 * @param {string} groupId ID do grupo (opcional)
 * @param {boolean} isUserAdmin Se o usuário é admin
 * @returns {Array} Lista de comandos disponíveis
 */
function getAvailableCommands(userId, groupId = null, isUserAdmin = false) {
  const availableCommands = [];
  
  for (const [commandName, config] of Object.entries(COMMAND_CONFIGS)) {
    const permission = checkCommandPermissions(commandName, userId, groupId, isUserAdmin);
    
    if (permission.allowed) {
      availableCommands.push({
        name: commandName,
        description: config.description,
        category: config.category,
        usage: config.usage || commandName,
        aliases: config.aliases || []
      });
    }
  }
  
  // Ordenar por categoria e depois por nome
  return availableCommands.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Limpa cache de configurações
 * Útil para recarregar configurações em runtime
 */
function clearConfigCache() {
  configCache.clear();
  logger.info('🧹 Cache de configurações limpo');
}

/**
 * Obtém estatísticas das configurações
 * @returns {object} Estatísticas
 */
function getConfigStats() {
  const stats = {
    totalCommands: Object.keys(COMMAND_CONFIGS).length,
    enabledCommands: 0,
    adminCommands: 0,
    masterOnlyCommands: 0,
    freeCommands: 0,
    categoriesCount: {},
    cacheSize: configCache.size
  };
  
  for (const config of Object.values(COMMAND_CONFIGS)) {
    if (config.enabled) stats.enabledCommands++;
    if (config.requireAdmin) stats.adminCommands++;
    if (config.masterOnly) stats.masterOnlyCommands++;
    if (!config.requireAdmin && !config.masterOnly) stats.freeCommands++;
    
    // Contar categorias
    const category = config.category || 'outros';
    stats.categoriesCount[category] = (stats.categoriesCount[category] || 0) + 1;
  }
  
  return stats;
}

/**
 * Sincroniza aliases dos comandos carregados com as configurações
 * @param {object} commands Objeto de comandos carregados
 */
function syncCommandAliases(commands) {
  logger.info("🔗 Sincronizando aliases dos comandos...");
  
  let aliasCount = 0;
  
  for (const [commandName, config] of Object.entries(COMMAND_CONFIGS)) {
    if (config.aliases && Array.isArray(config.aliases)) {
      const mainCommand = commands[commandName];
      
      if (mainCommand) {
        // Adicionar aliases ao objeto de comandos
        for (const alias of config.aliases) {
          if (!commands[alias]) {
            commands[alias] = mainCommand;
            aliasCount++;
            logger.debug(`🔗 Alias adicionado: ${alias} -> ${commandName}`);
          }
        }
      }
    }
  }
  
  logger.success(`✅ ${aliasCount} aliases sincronizados`);
}

/**
 * Valida toda a configuração na inicialização
 * @returns {object} Resultado da validação
 */
function validateAllConfigs() {
  const validation = {
    valid: true,
    errors: [],
    warnings: []
  };
  
  try {
    // Verificar se MASTER_NUMBER está configurado
    if (!MASTER_NUMBER || MASTER_NUMBER === '') {
      validation.errors.push('MASTER_NUMBER não configurado');
      validation.valid = false;
    }
    
    // Verificar se GRUPO_AUTORIZADO está configurado
    if (!GRUPO_AUTORIZADO || GRUPO_AUTORIZADO === '') {
      validation.warnings.push('GRUPO_AUTORIZADO não configurado - alguns comandos podem não funcionar');
    }
    
    // Verificar configurações de cada comando
    for (const [commandName, config] of Object.entries(COMMAND_CONFIGS)) {
      // Verificar propriedades obrigatórias
      if (typeof config.enabled !== 'boolean') {
        validation.errors.push(`${commandName}: propriedade 'enabled' deve ser boolean`);
        validation.valid = false;
      }
      
      if (typeof config.requireAdmin !== 'boolean') {
        validation.errors.push(`${commandName}: propriedade 'requireAdmin' deve ser boolean`);
        validation.valid = false;
      }
      
      // Verificar cooldown
      if (config.cooldown && (typeof config.cooldown !== 'number' || config.cooldown < 0)) {
        validation.warnings.push(`${commandName}: cooldown deve ser número >= 0`);
      }
      
      // Verificar aliases
      if (config.aliases && !Array.isArray(config.aliases)) {
        validation.warnings.push(`${commandName}: aliases deve ser array`);
      }
    }
    
    logger.info(`✅ Validação de configurações: ${validation.valid ? 'APROVADA' : 'REPROVADA'}`);
    
    if (validation.warnings.length > 0) {
      logger.warn(`⚠️ ${validation.warnings.length} avisos encontrados`);
    }
    
    if (validation.errors.length > 0) {
      logger.error(`❌ ${validation.errors.length} erros encontrados`);
    }
    
  } catch (error) {
    validation.valid = false;
    validation.errors.push(`Erro durante validação: ${error.message}`);
  }
  
  return validation;
}

// ===== VALIDAÇÃO NA INICIALIZAÇÃO =====
const validationResult = validateAllConfigs();
if (!validationResult.valid) {
  logger.error('❌ Configurações inválidas detectadas!');
  for (const error of validationResult.errors) {
    logger.error(`  • ${error}`);
  }
}

// ===== EXPORTAÇÕES =====
module.exports = {
  // Constantes
  MASTER_NUMBER,
  GRUPO_AUTORIZADO,
  COMMAND_CONFIGS,
  
  // Funções principais
  getCommandConfig,
  isCommandEnabled,
  requiresAdmin,
  isMasterOnly,
  isAllowedInGroup,
  getCommandCooldown,
  validateCommandArgs,
  checkCommandPermissions,
  
  // Funções utilitárias
  getAvailableCommands,
  clearConfigCache,
  getConfigStats,
  syncCommandAliases,
  validateAllConfigs
};
