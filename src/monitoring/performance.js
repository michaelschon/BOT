// src/monitoring/performance.js
const logger = require('../utils/logger');

const SLOW_COMMAND_THRESHOLD_MS = 1000; // 1 segundo

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      commandsExecuted: 0,
      totalExecutionTime: 0,
      slowCommands: 0,
    };
    logger.info('✅ PerformanceMonitor inicializado.');
  }

  /**
   * Rastreia a execução de um comando para monitorar sua performance.
   * @param {string} commandName Nome do comando
   * @param {number} startTime Timestamp de início da execução
   */
  trackCommand(commandName, startTime) {
    const duration = Date.now() - startTime;

    this.metrics.commandsExecuted++;
    this.metrics.totalExecutionTime += duration;

    // Alerta se um comando demorou mais que o limite
    if (duration > SLOW_COMMAND_THRESHOLD_MS) {
      this.metrics.slowCommands++;
      logger.warn(`⚠️ Comando lento detectado: "${commandName}" demorou ${duration}ms para executar.`);
    }
  }

  /**
   * (Opcional) Retorna as métricas atuais.
   */
  getMetrics() {
    const avgTime = this.metrics.commandsExecuted > 0 
      ? (this.metrics.totalExecutionTime / this.metrics.commandsExecuted).toFixed(2) 
      : 0;

    return {
      ...this.metrics,
      averageExecutionTimeMs: parseFloat(avgTime),
    };
  }
}

module.exports = PerformanceMonitor;
