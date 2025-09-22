// src/core/cache.js
const { db, statements } = require('./db');
const logger = require('../utils/logger');

class PerformanceCache {
  constructor(ttl = 60 * 1000) { // Tempo de vida padrão de 1 minuto
    this.silencedCache = new Map();
    this.adminCache = new Map();
    this.ttl = ttl;
    logger.info(`✅ PerformanceCache inicializado (TTL: ${ttl / 1000}s).`);

    // Limpeza periódica para evitar memory leak
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Verifica se um usuário está silenciado, priorizando o cache.
   * @param {string} groupId
   * @param {string} userId
   * @returns {boolean}
   */
  isSilenced(groupId, userId) {
    const key = `${groupId}:${userId}`;
    const cached = this.silencedCache.get(key);

    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }

    // Cache miss: buscar no banco
    const result = statements.isSilenced.get(groupId, userId);
    const isSilenced = !!result;

    this.silencedCache.set(key, {
      value: isSilenced,
      expires: Date.now() + this.ttl,
    });

    return isSilenced;
  }

  /**
   * Verifica se um usuário é admin do grupo, priorizando o cache.
   * @param {string} groupId
   * @param {string} userId
   * @returns {boolean}
   */
  isAdmin(groupId, userId) {
    const key = `${groupId}:${userId}`;
    const cached = this.adminCache.get(key);

    if (cached && cached.expires > Date.now()) {
        return cached.value;
    }

    // Cache miss
    const result = statements.isGroupAdmin.get(groupId, userId);
    const isAdmin = !!result;

    this.adminCache.set(key, {
        value: isAdmin,
        expires: Date.now() + (this.ttl * 5), // Cache de admin pode durar mais
    });
    
    return isAdmin;
  }
    
  /**
   * Invalida o cache de um usuário específico (ex: após usar !silenciar).
   * @param {string} groupId
   * @param {string} userId
   */
  invalidateSilenced(groupId, userId) {
    const key = `${groupId}:${userId}`;
    this.silencedCache.delete(key);
    logger.debug(`[Cache] Cache de silenciamento invalidado para ${userId} em ${groupId}`);
  }

  invalidateAdmin(groupId, userId) {
    const key = `${groupId}:${userId}`;
    this.adminCache.delete(key);
    logger.debug(`[Cache] Cache de admin invalidado para ${userId} em ${groupId}`);
  }

  /**
   * Limpa entradas expiradas dos caches.
   */
  cleanup() {
    const now = Date.now();
    let silencedCleaned = 0;
    let adminCleaned = 0;

    for (const [key, value] of this.silencedCache.entries()) {
      if (value.expires < now) {
        this.silencedCache.delete(key);
        silencedCleaned++;
      }
    }
    for (const [key, value] of this.adminCache.entries()) {
        if (value.expires < now) {
            this.adminCache.delete(key);
            adminCleaned++;
        }
    }
    if (silencedCleaned > 0 || adminCleaned > 0) {
      logger.debug(`[Cache] Limpeza automática: ${silencedCleaned} registros de silenciados e ${adminCleaned} de admins removidos.`);
    }
  }
}

module.exports = PerformanceCache;
