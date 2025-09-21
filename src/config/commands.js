/**
 * Configurações centralizadas dos comandos do bot
 * Define permissões, grupos permitidos e status de cada comando
 * 
 * @author Volleyball Team
 */

const logger = require("../utils/logger");

/**
 * Configurações dos comandos
 * Estrutura:
 * - enabled: Se o comando está ativo
 * - requireAdmin: Se requer permissão de admin
 * - allowedGroups: Array com IDs dos grupos permitidos (vazio = todos)
 * - description: Descrição do comando
 * - category: Categoria para organização
 * - cooldown: Cooldown em segundos (opcional)
 * - maxArgs: Número máximo de argumentos (opcional)
 * - minArgs: Número mínimo de argumentos (opcional)
 */
const COMMAND_CONFIGS = {
  // ========== COMANDOS BÁSICOS ==========
  "!ping": {
    enabled: true,
    requireAdmin: false,
    allowedGroups: [], // Todos os grupos
    description: "Testa se o bot está respondendo",
    category: "básicos",
    cooldown: 2
  },

  "!dados": {
    enabled: true,
    requireAdmin: false,
    allowedGroups: [],
    description: "Mostra informações do grupo e usuário",
    category: "básicos",
    cooldown: 5
  },

  // ========== SISTEMA DE APELIDOS ==========
  "!apelido": {
    enabled: true,
    requireAdmin: false,
    allowedGroups: [
      "120363415542889290@g.us" // Grupo principal de volleyball
    ],
    description: "Define seu próprio apelido no grupo",
    category: "apelidos",
    cooldown: 10,
    minArgs: 1,
    maxArgs: 3,
    aliases: ["!nick", "!nickname"]
  },

  "!meuapelido": {
    enabled: true,
    requireAdmin: false,
    allowedGroups: [
      "120363415542889290@g.us"
    ],
    description: "Mostra seu apelido atual",
    category: "apelidos",
    cooldown: 5,
    aliases: ["!meunick", "!apelido?"]
  },

  "!apelidoadmin": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [],
    description: "Admin define apelido de outro usuário",
    category: "apelidos",
    minArgs: 2,
    aliases: ["!setapelido", "!definirapelido"]
  },

  "!bloquearapelido": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [
      "120363415542889290@g.us"
    ],
    description: "Bloqueia usuário de trocar apelido",
    category: "apelidos",
    minArgs: 1,
    aliases: ["!lockapelido", "!bloquearnick"]
  },

  "!liberarapelido": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [
      "120363415542889290@g.us"
    ],
    description: "Libera usuário para trocar apelido",
    category: "apelidos",
    minArgs: 1,
    aliases: ["!desbloquearapelido", "!unlockapelido"]
  },

  "!listarapelidos": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [],
    description: "Lista todos os apelidos cadastrados",
    category: "apelidos",
    aliases: ["!listapelidos", "!apelidos", "!listnicks"]
  },

  // ========== ADMINISTRAÇÃO DE ADMINS ==========
  "!addadm": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [],
    description: "Adiciona admin ao grupo",
    category: "admin",
    minArgs: 1,
    aliases: ["!addadmin", "!adicionaradm"]
  },

  "!deladm": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [],
    description: "Remove admin do grupo",
    category: "admin",
    minArgs: 1,
    aliases: ["!removeadm", "!remadm"]
  },

  "!listadm": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [],
    description: "Lista admins do grupo",
    category: "admin",
    aliases: ["!listaradm", "!admins", "!listadmins"]
  },

  "!op": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [],
    description: "Promove admin a admin do WhatsApp (próprio ou outro)",
    usage: "!op [telefone]",
    category: "admin",
    aliases: ["!promote", "!promover"]
  },

  "!deop": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [],
    description: "Remove admin do WhatsApp",
    category: "admin",
    aliases: ["!demote", "!rebaixar"]
  },

  // ========== COMANDOS DE COMUNICAÇÃO ==========
  "!aviso": {
    enabled: true,
    requireAdmin: false,
    allowedGroups: [],
    description: "Envia aviso marcando todos do grupo",
    category: "comunicação",
    cooldown: 60, // 1 minuto de cooldown para evitar spam
    minArgs: 1,
    aliases: ["!alerta", "!todos", "!everyone"]
  },

  // ========== COMANDOS DE MÍDIA ==========
  "!figurinha": {
    enabled: true,
    requireAdmin: false,
    allowedGroups: [],
    description: "Converte imagem/vídeo em figurinha",
    category: "mídia",
    cooldown: 5,
    aliases: ["!sticker", "!fig"]
  },

  // ========== ADMINISTRAÇÃO ==========
  // ========== ADMINISTRAÇÃO DE GRUPO ==========
  "!ban": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [],
    description: "Remove usuário do grupo (com motivo opcional)",
    category: "admin",
    minArgs: 1,
    aliases: ["!kick", "!remover", "!expulsar"]
  },

  "!invite": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [],
    description: "Envia convite do grupo para usuário",
    category: "admin",
    minArgs: 1,
    aliases: ["!convidar", "!convite"]
  },

  "!adicionar": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [],
    description: "Adiciona usuário diretamente ao grupo",
    category: "admin",
    minArgs: 1,
    aliases: ["!adcionar", "!add"]
  },

  // ========== SISTEMA DE PERMISSÕES GRANULARES ==========
  "!addpermissao": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [],
    description: "Adiciona permissões específicas para usuário",
    category: "admin",
    minArgs: 2,
    aliases: ["!grantperm", "!addperm"]
  },

  "!delpermissao": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [],
    description: "Remove permissões específicas de usuário", 
    category: "admin",
    minArgs: 2,
    aliases: ["!removeperm", "!delperm"]
  },

  "!listpermissao": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [],
    description: "Lista todas as permissões de um usuário",
    category: "admin",
    minArgs: 1,
    aliases: ["!listperm", "!permissoes"]
  },

  "!welcome": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [
      "120363415542889290@g.us" // Apenas grupo principal por padrão
    ],
    description: "Configura sistema de boas-vindas automático",
    category: "admin",
    aliases: ["!boasvindas", "!bemvindo"]
  },

  // ========== ADMINISTRAÇÃO AVANÇADA ==========
  "!noturno": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [],
    description: "Configura modo noturno do grupo (restringe mensagens)",
    category: "admin",
    aliases: ["!nightmode", "!modonoturno"]
  },

  "!testaliases": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [],
    description: "Lista comandos e aliases disponíveis",
    category: "admin",
    aliases: ["!aliases", "!comandos"]
  },

  "!restart": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [],
    description: "Reinicia o bot (apenas Master)",
    category: "admin",
    masterOnly: true,
    aliases: ["!reboot", "!reiniciar"]
  },

  "!addadmin": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [],
    description: "Adiciona admin no grupo",
    category: "admin",
    minArgs: 1
  },

  "!removeadmin": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [],
    description: "Remove admin do grupo",
    category: "admin",
    minArgs: 1
  },

  "!listadmins": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [],
    description: "Lista admins do grupo",
    category: "admin"
  },

  // ========== PERMISSÕES ESPECIAIS ==========
  "!grantperm": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [],
    description: "Concede permissão especial para comando",
    category: "admin",
    minArgs: 2
  },

  "!revokeperm": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [],
    description: "Revoga permissão especial",
    category: "admin",
    minArgs: 2
  },

  // ========== UTILITÁRIOS ==========
  "!help": {
    enabled: true,
    requireAdmin: false,
    allowedGroups: [],
    description: "Mostra lista de comandos disponíveis",
    category: "utilitários",
    cooldown: 10
  },

  "!status": {
    enabled: true,
    requireAdmin: false,
    allowedGroups: [],
    description: "Mostra status do bot e estatísticas",
    category: "utilitários",
    cooldown: 15
  },

  "!audit": {
    enabled: true,
    requireAdmin: true,
    allowedGroups: [],
    description: "Mostra log de auditoria",
    category: "admin",
    cooldown: 30
  }
};

/**
 * Cache de configurações processadas
 */
const configCache = new Map();

/**
 * Obtém configuração de um comando
 * @param {string} commandName Nome do comando
 * @returns {object} Configuração do comando
 */
function getCommandConfig(commandName) {
  // Remove ! se presente e converte para lowercase
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
        console.log(`🔗 Alias detectado: ${fullName} -> ${mainCommand}`);
        break;
      }
    }
  }
  
  if (!config) {
    // Configuração padrão para comandos não listados
    const defaultConfig = {
      enabled: false,
      requireAdmin: true,
      allowedGroups: [],
      description: "Comando não configurado",
      category: "outros"
    };
    
    logger.warn(`⚠️ Comando sem configuração: ${fullName}, usando padrão`);
    configCache.set(fullName, defaultConfig);
    return defaultConfig;
  }
  
  // Adiciona configurações padrão se não especificadas
  const processedConfig = {
    enabled: true,
    requireAdmin: false,
    allowedGroups: [],
    description: "",
    category: "outros",
    cooldown: 0,
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
 * Sincroniza aliases dos comandos carregados com as configurações
 * @param {object} commands Objeto de comandos carregados
 */
function syncCommandAliases(commands) {
  console.log("🔗 Sincronizando aliases dos comandos...");
  
  for (const [commandKey, commandObj] of Object.entries(commands)) {
    // Pula se não é o comando principal (é um alias)
    if (commandKey !== commandObj.name) continue;
    
    const config = COMMAND_CONFIGS[commandObj.name];
    if (!config) continue;
    
    // Se o comando tem aliases definidos, adiciona eles às configurações
    if (commandObj.aliases && Array.isArray(commandObj.aliases)) {
      // Mescla aliases do comando com aliases da configuração
      const allAliases = [...new Set([
        ...(config.aliases || []),
        ...commandObj.aliases
      ])];
      
      config.aliases = allAliases;
      
      console.log(`🔗 Sincronizado ${commandObj.name}: ${allAliases.length} aliases`);
    }
  }
}

/**
 * Verifica se um comando está habilitado (incluindo aliases)
 * @param {string} commandName Nome do comando
 * @returns {boolean} True se habilitado
 */
function isCommandEnabled(commandName) {
  const config = getCommandConfig(commandName);
  return config.enabled === true;
}

/**
 * Verifica se comando é permitido em um grupo
 * @param {string} commandName Nome do comando
 * @param {string} groupId ID do grupo
 * @returns {boolean} True se permitido
 */
function isCommandAllowedInGroup(commandName, groupId) {
  const config = getCommandConfig(commandName);
  
  // Se não há restrições de grupo, é permitido
  if (!config.allowedGroups || config.allowedGroups.length === 0) {
    return true;
  }
  
  // Verifica se o grupo está na lista permitida
  return config.allowedGroups.includes(groupId);
}

/**
 * Lista todos os comandos disponíveis
 * @param {boolean} adminOnly Se deve mostrar apenas comandos de admin
 * @param {string} category Filtrar por categoria
 * @returns {Array} Lista de comandos
 */
function listCommands(adminOnly = false, category = null) {
  const commands = [];
  
  for (const [name, config] of Object.entries(COMMAND_CONFIGS)) {
    if (!config.enabled) continue;
    
    if (adminOnly && !config.requireAdmin) continue;
    
    if (category && config.category !== category) continue;
    
    commands.push({
      name,
      ...config
    });
  }
  
  return commands.sort((a, b) => a.category.localeCompare(b.category));
}

/**
 * Obtém categorias disponíveis
 * @returns {Array} Lista de categorias
 */
function getCategories() {
  const categories = new Set();
  
  for (const config of Object.values(COMMAND_CONFIGS)) {
    if (config.enabled) {
      categories.add(config.category);
    }
  }
  
  return Array.from(categories).sort();
}

/**
 * Valida argumentos de um comando
 * @param {string} commandName Nome do comando
 * @param {Array} args Argumentos fornecidos
 * @returns {object} Resultado da validação
 */
function validateCommandArgs(commandName, args) {
  const config = getCommandConfig(commandName);
  
  const result = {
    valid: true,
    errors: []
  };
  
  if (args.length < config.minArgs) {
    result.valid = false;
    result.errors.push(`Mínimo ${config.minArgs} argumento(s) necessário(s)`);
  }
  
  if (args.length > config.maxArgs) {
    result.valid = false;
    result.errors.push(`Máximo ${config.maxArgs} argumento(s) permitido(s)`);
  }
  
  return result;
}

/**
 * Sistema de cooldown para comandos
 */
const cooldowns = new Map();

/**
 * Verifica cooldown de um comando
 * @param {string} userId ID do usuário
 * @param {string} commandName Nome do comando
 * @returns {number} Segundos restantes (0 se não há cooldown)
 */
function checkCooldown(userId, commandName) {
  const config = getCommandConfig(commandName);
  
  if (!config.cooldown || config.cooldown <= 0) {
    return 0;
  }
  
  const key = `${userId}:${commandName}`;
  const lastUsed = cooldowns.get(key) || 0;
  const now = Date.now();
  const timeLeft = Math.max(0, (lastUsed + config.cooldown * 1000) - now);
  
  return Math.ceil(timeLeft / 1000);
}

/**
 * Registra uso de comando para cooldown
 * @param {string} userId ID do usuário
 * @param {string} commandName Nome do comando
 */
function setCooldown(userId, commandName) {
  const config = getCommandConfig(commandName);
  
  if (config.cooldown && config.cooldown > 0) {
    const key = `${userId}:${commandName}`;
    cooldowns.set(key, Date.now());
    
    // Remove cooldown expirado após 2x o tempo
    setTimeout(() => {
      cooldowns.delete(key);
    }, config.cooldown * 2000);
  }
}

module.exports = {
  getCommandConfig,
  isCommandEnabled,
  isCommandAllowedInGroup,
  listCommands,
  getCategories,
  validateCommandArgs,
  checkCooldown,
  setCooldown,
  syncCommandAliases,
  COMMAND_CONFIGS
};
