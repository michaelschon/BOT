/**
 * Sistema de Cache de Alta Performance
 * Cache inteligente em memória para otimizar consultas frequentes do bot
 * 
 * @author Volleyball Team
 * @version 3.0 - Sistema avançado com TTL e limites de memória
 */

const logger = require('../utils/logger');

/**
 * Classe principal do sistema de cache
 * Implementa LRU (Least Recently Used) com TTL (Time To Live)
 */
class PerformanceCache {
  constructor(options = {}) {
    // Configurações do cache
    this.maxSize = options.maxSize || 1000;           // Máximo de itens
    this.defaultTTL = options.defaultTTL || 300000;   // TTL padrão: 5 minutos
    this.cleanupInterval = options.cleanupInterval || 60000; // Limpeza: 1 minuto
    
    // Armazenamento interno
    this.cache = new Map();
    this.accessOrder = new Map(); // Para implementar LRU
    this.timers = new Map();      // Timers para TTL
    
    // Estatísticas
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      expiredCleanups: 0
    };
    
    // Iniciar limpeza automática
    this.startCleanupTimer();
    
    logger.info(`🚀 Cache de performance inicializado (max: ${this.maxSize} itens, TTL: ${this.defaultTTL/1000}s)`);
  }
  
  /**
   * Gera chave única para cache
   * @param {string} type Tipo de cache (admin, nickname, etc)
   * @param {...any} parts Partes da chave
   * @returns {string} Chave única
   */
  generateKey(type, ...parts) {
    return `${type}:${parts.join(':')}`;
  }
  
  /**
   * Armazena valor no cache
   * @param {string} key Chave do cache
   * @param {any} value Valor a armazenar
   * @param {number} ttl TTL personalizado (ms)
   */
  set(key, value, ttl = this.defaultTTL) {
    // Remove entrada existente se houver
    if (this.cache.has(key)) {
      this.clearTTLTimer(key);
    }
    
    // Verifica limite de tamanho
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    // Armazena valor
    const entry = {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl
    };
    
    this.cache.set(key, entry);
    this.accessOrder.set(key, Date.now());
    
    // Configura timer de expiração
    this.setTTLTimer(key, ttl);
    
    this.stats.sets++;
    
    logger.debug(`💾 Cache SET: ${key} (TTL: ${ttl/1000}s)`);
  }
  
  /**
   * Recupera valor do cache
   * @param {string} key Chave do cache
   * @returns {any|null} Valor ou null se não encontrado/expirado
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      logger.debug(`❌ Cache MISS: ${key}`);
      return null;
    }
    
    // Verifica expiração
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      this.stats.misses++;
      this.stats.expiredCleanups++;
      logger.debug(`⏰ Cache EXPIRED: ${key}`);
      return null;
    }
    
    // Atualiza ordem de acesso (LRU)
    this.accessOrder.set(key, Date.now());
    
    this.stats.hits++;
    logger.debug(`✅ Cache HIT: ${key}`);
    
    return entry.value;
  }
  
  /**
   * Remove entrada do cache
   * @param {string} key Chave a remover
   */
  delete(key) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.clearTTLTimer(key);
      logger.debug(`🗑️ Cache DELETE: ${key}`);
    }
  }
  
  /**
   * Limpa todas as entradas do cache
   */
  clear() {
    this.cache.clear();
    this.accessOrder.clear();
    
    // Limpa todos os timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    
    logger.info('🧹 Cache completamente limpo');
  }
  
  /**
   * Remove entrada LRU (menos recentemente usada)
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
      this.stats.evictions++;
      logger.debug(`⚡ Cache LRU eviction: ${oldestKey}`);
    }
  }
  
  /**
   * Configura timer de TTL
   * @param {string} key Chave
   * @param {number} ttl TTL em ms
   */
  setTTLTimer(key, ttl) {
    const timer = setTimeout(() => {
      if (this.cache.has(key)) {
        this.delete(key);
        this.stats.expiredCleanups++;
        logger.debug(`⏰ Cache auto-expired: ${key}`);
      }
    }, ttl);
    
    this.timers.set(key, timer);
  }
  
  /**
   * Remove timer de TTL
   * @param {string} key Chave
   */
  clearTTLTimer(key) {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }
  
  /**
   * Inicia timer de limpeza automática
   */
  startCleanupTimer() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }
  
  /**
   * Remove entradas expiradas
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }
    
    if (expiredKeys.length > 0) {
      for (const key of expiredKeys) {
        this.delete(key);
      }
      this.stats.expiredCleanups += expiredKeys.length;
      logger.debug(`🧹 Cache cleanup: ${expiredKeys.length} entradas expiradas removidas`);
    }
  }
  
  /**
   * Obtém estatísticas do cache
   * @returns {object} Estatísticas detalhadas
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: `${hitRate}%`,
      ...this.stats,
      memoryUsage: `${(this.getMemoryUsage() / 1024).toFixed(2)} KB`
    };
  }
  
  /**
   * Estima uso de memória do cache
   * @returns {number} Bytes aproximados
   */
  getMemoryUsage() {
    let size = 0;
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // String UTF-16
      size += JSON.stringify(entry).length * 2;
    }
    return size;
  }
  
  // ===== MÉTODOS ESPECÍFICOS PARA O BOT =====
  
  /**
   * Cache para verificação de admin
   * @param {string} groupId ID do grupo
   * @param {string} userId ID do usuário
   * @param {boolean} isAdmin Se é admin
   */
  setAdminStatus(groupId, userId, isAdmin) {
    const key = this.generateKey('admin', groupId, userId);
    this.set(key, isAdmin, 300000); // 5 minutos
  }
  
  /**
   * Verifica se usuário é admin (cache)
   * @param {string} groupId ID do grupo
   * @param {string} userId ID do usuário
   * @returns {boolean|null} Status admin ou null se não cacheado
   */
  getAdminStatus(groupId, userId) {
    const key = this.generateKey('admin', groupId, userId);
    return this.get(key);
  }
  
  /**
   * Cache para apelidos
   * @param {string} groupId ID do grupo
   * @param {string} userId ID do usuário
   * @param {object} nicknameData Dados do apelido
   */
  setNickname(groupId, userId, nicknameData) {
    const key = this.generateKey('nickname', groupId, userId);
    this.set(key, nicknameData, 600000); // 10 minutos
  }
  
  /**
   * Obtém apelido do cache
   * @param {string} groupId ID do grupo
   * @param {string} userId ID do usuário
   * @returns {object|null} Dados do apelido ou null
   */
  getNickname(groupId, userId) {
    const key = this.generateKey('nickname', groupId, userId);
    return this.get(key);
  }
  
  /**
   * Cache para status de silenciamento
   * @param {string} groupId ID do grupo
   * @param {string} userId ID do usuário
   * @param {boolean} isSilenced Se está silenciado
   */
  setSilencedStatus(groupId, userId, isSilenced) {
    const key = this.generateKey('silenced', groupId, userId);
    this.set(key, isSilenced, 120000); // 2 minutos
  }
  
  /**
   * Verifica se usuário está silenciado (cache)
   * @param {string} groupId ID do grupo
   * @param {string} userId ID do usuário
   * @returns {boolean|null} Status silenciado ou null
   */
  getSilencedStatus(groupId, userId) {
    const key = this.generateKey('silenced', groupId, userId);
    return this.get(key);
  }
  
  /**
   * Cache para informações de usuário
   * @param {string} userId ID do usuário
   * @param {object} userData Dados do usuário
   */
  setUserInfo(userId, userData) {
    const key = this.generateKey('user', userId);
    this.set(key, userData, 900000); // 15 minutos
  }
  
  /**
   * Obtém informações do usuário (cache)
   * @param {string} userId ID do usuário
   * @returns {object|null} Dados do usuário ou null
   */
  getUserInfo(userId) {
    const key = this.generateKey('user', userId);
    return this.get(key);
  }
  
  /**
   * Cache para informações de grupo
   * @param {string} groupId ID do grupo
   * @param {object} groupData Dados do grupo
   */
  setGroupInfo(groupId, groupData) {
    const key = this.generateKey('group', groupId);
    this.set(key, groupData, 1800000); // 30 minutos
  }
  
  /**
   * Obtém informações do grupo (cache)
   * @param {string} groupId ID do grupo
   * @returns {object|null} Dados do grupo ou null
   */
  getGroupInfo(groupId) {
    const key = this.generateKey('group', groupId);
    return this.get(key);
  }
  
  /**
   * Invalida cache relacionado a um usuário
   * @param {string} userId ID do usuário
   */
  invalidateUser(userId) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.delete(key);
    }
    
    logger.debug(`🗑️ Cache invalidado para usuário: ${userId} (${keysToDelete.length} entradas)`);
  }
  
  /**
   * Invalida cache relacionado a um grupo
   * @param {string} groupId ID do grupo
   */
  invalidateGroup(groupId) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(groupId)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.delete(key);
    }
    
    logger.debug(`🗑️ Cache invalidado para grupo: ${groupId} (${keysToDelete.length} entradas)`);
  }
  
  /**
   * Pré-aquece cache com dados frequentes
   * @param {object} statements Prepared statements do banco
   * @param {Array} groups Lista de grupos ativos
   */
  async warmupCache(statements, groups = []) {
    logger.info('🔥 Aquecendo cache com dados frequentes...');
    
    try {
      // Pré-carrega admins dos grupos principais
      for (const groupId of groups) {
        const admins = statements.getAllGroupAdmins.all(groupId, '5519999222004@c.us');
        
        for (const admin of admins) {
          this.setAdminStatus(groupId, admin.usuario_id, true);
        }
      }
      
      logger.success(`✅ Cache aquecido para ${groups.length} grupos`);
      
    } catch (error) {
      logger.error('❌ Erro ao aquecer cache:', error.message);
    }
  }
}

// ===== SISTEMA DE COOLDOWN =====

/**
 * Sistema de cooldown para comandos
 */
class CooldownManager {
  constructor() {
    this.cooldowns = new Map();
    this.defaultCooldown = 3000; // 3 segundos padrão
  }
  
  /**
   * Define cooldown para usuário/comando
   * @param {string} userId ID do usuário
   * @param {string} command Comando
   * @param {number} duration Duração em ms
   */
  setCooldown(userId, command, duration = this.defaultCooldown) {
    const key = `${userId}:${command}`;
    const expiresAt = Date.now() + duration;
    
    this.cooldowns.set(key, expiresAt);
    
    // Auto-remove após expiração
    setTimeout(() => {
      this.cooldowns.delete(key);
    }, duration);
  }
  
  /**
   * Verifica se usuário está em cooldown
   * @param {string} userId ID do usuário
   * @param {string} command Comando
   * @returns {number} Tempo restante em ms (0 = sem cooldown)
   */
  getRemainingCooldown(userId, command) {
    const key = `${userId}:${command}`;
    const expiresAt = this.cooldowns.get(key);
    
    if (!expiresAt) return 0;
    
    const remaining = expiresAt - Date.now();
    return remaining > 0 ? remaining : 0;
  }
  
  /**
   * Verifica se usuário pode executar comando
   * @param {string} userId ID do usuário
   * @param {string} command Comando
   * @returns {boolean} Se pode executar
   */
  canExecute(userId, command) {
    return this.getRemainingCooldown(userId, command) === 0;
  }
  
  /**
   * Remove cooldown específico
   * @param {string} userId ID do usuário
   * @param {string} command Comando
   */
  removeCooldown(userId, command) {
    const key = `${userId}:${command}`;
    this.cooldowns.delete(key);
  }
  
  /**
   * Remove todos os cooldowns de um usuário
   * @param {string} userId ID do usuário
   */
  removeUserCooldowns(userId) {
    for (const key of this.cooldowns.keys()) {
      if (key.startsWith(userId + ':')) {
        this.cooldowns.delete(key);
      }
    }
  }
  
  /**
   * Obtém estatísticas dos cooldowns
   * @returns {object} Estatísticas
   */
  getStats() {
    return {
      activeCooldowns: this.cooldowns.size,
      defaultCooldown: this.defaultCooldown
    };
  }
}

// ===== INSTÂNCIAS GLOBAIS =====

// Cache principal do sistema
const cache = new PerformanceCache({
  maxSize: 2000,        // 2000 entradas
  defaultTTL: 300000,   // 5 minutos
  cleanupInterval: 30000 // Limpeza a cada 30 segundos
});

// Sistema de cooldown
const cooldown = new CooldownManager();

// ===== FUNÇÕES DE CONVENIÊNCIA =====

/**
 * Função de conveniência para definir cooldown
 * @param {string} userId ID do usuário
 * @param {string} command Comando
 * @param {number} duration Duração personalizada
 */
function setCooldown(userId, command, duration) {
  cooldown.setCooldown(userId, command, duration);
}

/**
 * Função de conveniência para verificar cooldown
 * @param {string} userId ID do usuário
 * @param {string} command Comando
 * @returns {number} Tempo restante
 */
function getCooldown(userId, command) {
  return cooldown.getRemainingCooldown(userId, command);
}

/**
 * Função de conveniência para verificar se pode executar
 * @param {string} userId ID do usuário
 * @param {string} command Comando
 * @returns {boolean} Se pode executar
 */
function canExecuteCommand(userId, command) {
  return cooldown.canExecute(userId, command);
}

module.exports = {
  PerformanceCache,
  CooldownManager,
  cache,
  cooldown,
  setCooldown,
  getCooldown,
  canExecuteCommand
};
