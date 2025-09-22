// src/core/rateLimiter.js
const logger = require('../utils/logger');

// Configurações (comandos por período de tempo)
const USER_COMMAND_LIMIT = 5; // max 5 comandos
const USER_WINDOW_MS = 10 * 1000; // em 10 segundos

class RateLimiter {
  constructor() {
    this.userLimits = new Map();
    logger.info('✅ RateLimiter inicializado.');
  }

  /**
   * Verifica se um usuário tem permissão para executar um comando.
   * @param {string} userId ID do usuário
   * @param {string} commandName Nome do comando
   * @returns {boolean} True se permitido, false se bloqueado
   */
  isAllowed(userId, commandName) {
    const now = Date.now();
    const userRecord = this.userLimits.get(userId);

    if (!userRecord || now - userRecord.windowStart > USER_WINDOW_MS) {
      // Se não há registro ou a janela de tempo expirou, reinicia a contagem
      this.userLimits.set(userId, {
        count: 1,
        windowStart: now,
      });
      return true;
    }

    // Se a janela de tempo ainda é válida, incrementa a contagem
    userRecord.count++;

    // Verifica se o limite foi excedido
    if (userRecord.count > USER_COMMAND_LIMIT) {
      return false; // Bloqueia
    }

    return true; // Permite
  }
}

module.exports = RateLimiter;
