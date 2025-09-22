/**
 * Volleyball WhatsApp Bot - Arquivo Principal Otimizado
 * Sistema de bot de alta performance para grupo de volleyball
 * 
 * @author Volleyball Team
 * @version 3.0 - Arquitetura completamente otimizada
 */

// ===== CONFIGURAÇÕES DE AMBIENTE =====
process.env.TZ = 'America/Sao_Paulo'; // Timezone fixo
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// ===== IMPORTS OTIMIZADOS =====
const path = require('path');
const logger = require('./src/utils/logger');
const { initClient, getClientInfo } = require('./src/core/client');
const { loadCommands } = require('./src/core/loader');
const MessageHandler = require('./src/core/messageHandler');
const { cache, cooldown } = require('./src/core/cache');
const { syncCommandAliases, getConfigStats, GRUPO_AUTORIZADO } = require('./src/config/commands');
const { getCurrentDateTimeBR } = require('./src/utils/date');

// ===== HANDLER DE COMANDOS OTIMIZADO =====
class OptimizedCommandHandler {
  constructor(commands, performanceCache) {
    this.commands = commands;
    this.cache = performanceCache;
    this.stats = {
      commandsExecuted: 0,
      errors: 0,
      averageExecutionTime: 0
    };
    this.executionTimes = [];
    
    logger.info('⚡ Command Handler otimizado inicializado');
  }
  
  /**
   * Executa comando com máxima performance
   * @param {Client} client Cliente do WhatsApp
   * @param {Message} msg Mensagem
   * @param {Array} args Argumentos
   * @param {string} senderId ID do remetente
   * @param {string} commandName Nome do comando
   */
  async execute(client, msg, args, senderId, commandName) {
    const startTime = process.hrtime.bigint();
    
    try {
      // Buscar comando (com cache interno do JS)
      const command = this.commands[commandName];
      
      if (!command) {
        logger.warn(`⚠️ Comando não encontrado: ${commandName}`);
        return;
      }
      
      // Verificar se comando existe e tem função execute
      if (typeof command.execute !== 'function') {
        logger.error(`❌ Comando ${commandName} não tem função execute`);
        this.stats.errors++;
        return;
      }
      
      // Executar comando
      await command.execute(client, msg, args, senderId);
      
      this.stats.commandsExecuted++;
      
      // Log apenas comandos importantes (não !ping)
      if (commandName !== '!ping') {
        logger.info(`✅ Comando executado: ${commandName} por ${senderId}`);
      }
      
    } catch (error) {
      this.stats.errors++;
      logger.error(`❌ Erro na execução do comando ${commandName}:`, error.message);
      
      // Resposta de erro genérica
      try {
        await msg.reply('❌ Erro interno ao executar comando. Tente novamente.');
      } catch (replyError) {
        logger.error('❌ Erro ao enviar mensagem de erro:', replyError.message);
      }
    } finally {
      // Calcular tempo de execução
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000; // ms
      
      this.updateExecutionStats(executionTime);
      
      // Log se muito lento
      if (executionTime > 1000) {
        logger.warn(`⚠️ Comando lento: ${commandName} - ${executionTime.toFixed(2)}ms`);
      }
    }
  }
  
  /**
   * Atualiza estatísticas de execução
   * @param {number} executionTime Tempo em ms
   */
  updateExecutionStats(executionTime) {
    this.executionTimes.push(executionTime);
    
    // Manter apenas os últimos 100 tempos
    if (this.executionTimes.length > 100) {
      this.executionTimes.shift();
    }
    
    // Calcular média
    const sum = this.executionTimes.reduce((a, b) => a + b, 0);
    this.stats.averageExecutionTime = (sum / this.executionTimes.length).toFixed(2);
  }
  
  /**
   * Obtém estatísticas do handler
   * @returns {object} Estatísticas
   */
  getStats() {
    return {
      ...this.stats,
      totalCommands: Object.keys(this.commands).length,
      successRate: this.stats.commandsExecuted > 0 
        ? ((this.stats.commandsExecuted / (this.stats.commandsExecuted + this.stats.errors)) * 100).toFixed(2) + '%'
        : '100%'
    };
  }
}

// ===== FUNÇÃO PRINCIPAL =====
async function initializeBot() {
  try {
    // ===== LOGS INICIAIS =====
    console.log('\n' + '='.repeat(60));
    console.log('🏐 VOLLEYBALL WHATSAPP BOT v3.0');
    console.log('⚡ Sistema Otimizado de Alta Performance');
    console.log('='.repeat(60));
    
    logger.info(`🌍 Timezone: ${process.env.TZ}`);
    logger.info(`🕐 Data/hora: ${getCurrentDateTimeBR()}`);
    logger.info(`🔧 Ambiente: ${process.env.NODE_ENV}`);
    logger.info(`📁 Diretório: ${process.cwd()}`);
    
    // ===== CARREGAR COMANDOS =====
    logger.info('📦 Carregando comandos...');
    const commands = {};
    const commandsPath = path.join(__dirname, 'src/commands');
    
    loadCommands(commandsPath, commands);
    
    // Sincronizar aliases das configurações
    syncCommandAliases(commands);
    
    const commandCount = Object.keys(commands).length;
    logger.success(`✅ ${commandCount} comandos carregados`);
    
    // ===== INICIALIZAR MÓDULOS DE PERFORMANCE =====
    logger.info('🚀 Inicializando módulos de performance...');
    
    const commandHandler = new OptimizedCommandHandler(commands, cache);
    const messageHandler = new MessageHandler(commandHandler, cache);
    
    // ===== INICIALIZAR CLIENTE WHATSAPP =====
    logger.info('📱 Inicializando cliente WhatsApp...');
    const client = await initClient();
    
    // ===== CONFIGURAR EVENT HANDLERS =====
    logger.info('🔗 Configurando event handlers...');
    
    // Handler principal de mensagens (otimizado)
    client.on('message_create', async (msg) => {
      // Ignora próprias mensagens
      if (msg.fromMe) return;
      
      // Processa com handler otimizado
      await messageHandler.handle(client, msg);
    });
    
    // Handler de novos membros
    client.on('group_join', async (notification) => {
      await messageHandler.handleGroupJoin(client, notification);
    });
    
    // Handler de saída de membros
    client.on('group_leave', async (notification) => {
      try {
        logger.info(`👋 Usuários saíram do grupo: ${notification.chatId}`);
        
        // Invalidar caches relacionados ao grupo
        cache.invalidateGroup(notification.chatId);
        
      } catch (error) {
        logger.error('❌ Erro ao processar saída do grupo:', error.message);
      }
    });
    
    // ===== CONFIGURAR COMANDOS ESPECIAIS =====
    logger.info('⚙️ Configurando comandos especiais...');
    
    // Inicializar modo noturno se disponível
    const noturnoCommand = commands['!noturno'];
    if (noturnoCommand && typeof noturnoCommand.initializeSchedules === 'function') {
      try {
        noturnoCommand.initializeSchedules(client);
        logger.success('🌙 Modo noturno inicializado');
      } catch (error) {
        logger.warn('⚠️ Erro ao inicializar modo noturno:', error.message);
      }
    }
    
    // ===== PRÉ-AQUECER CACHES =====
    logger.info('🔥 Aquecendo caches...');
    
    // Aguardar cliente estar totalmente pronto
    setTimeout(async () => {
      try {
        const groupsToWarmup = [GRUPO_AUTORIZADO];
        await messageHandler.warmupCachesForGroups(groupsToWarmup);
        
        logger.success('✅ Caches aquecidos com sucesso');
      } catch (error) {
        logger.warn('⚠️ Erro ao aquecer caches:', error.message);
      }
    }, 5000);
    
    // ===== CONFIGURAR TAREFAS AUTOMÁTICAS =====
    logger.info('⏰ Configurando tarefas automáticas...');
    
    // Estatísticas a cada 5 minutos
    setInterval(() => {
      const stats = {
        message: messageHandler.getDetailedStats(),
        command: commandHandler.getStats(),
        config: getConfigStats()
      };
      
      logger.info('📊 Stats:', JSON.stringify(stats, null, 2));
    }, 5 * 60 * 1000);
    
    // Limpeza de performance a cada 30 minutos
    setInterval(() => {
      messageHandler.performMaintenanceCleanup();
    }, 30 * 60 * 1000);
    
    // ===== HANDLERS DE PROCESSO =====
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('🛑 Recebido SIGINT, encerrando graciosamente...');
      
      try {
        // Obter estatísticas finais
        const finalStats = {
          message: messageHandler.getDetailedStats(),
          command: commandHandler.getStats(),
          cache: cache.getStats()
        };
        
        logger.info('📊 Estatísticas finais:', JSON.stringify(finalStats, null, 2));
        
        // Fechar cliente
        if (client) {
          await client.destroy();
          logger.info('📱 Cliente WhatsApp fechado');
        }
        
        logger.success('✅ Bot encerrado graciosamente');
        process.exit(0);
        
      } catch (error) {
        logger.error('❌ Erro durante encerramento:', error.message);
        process.exit(1);
      }
    });
    
    // Error handlers
    process.on('uncaughtException', (error) => {
      logger.error('💥 Exceção não capturada:', error);
      console.error(error.stack);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('💥 Promise rejeitada não tratada:', reason);
      console.error('Promise:', promise);
    });
    
    // ===== LOG FINAL =====
    console.log('\n' + '='.repeat(60));
    console.log('🚀 BOT INICIADO COM SUCESSO!');
    console.log('⚡ Sistema operando em alta performance');
    console.log(`📊 ${commandCount} comandos disponíveis`);
    console.log(`🏐 Pronto para administrar o grupo de volleyball!`);
    console.log('='.repeat(60) + '\n');
    
    logger.success('🎯 Sistema completamente inicializado e otimizado!');
    
    return {
      client,
      messageHandler,
      commandHandler,
      commands,
      cache
    };
    
  } catch (error) {
    logger.error('💥 Erro fatal na inicialização:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// ===== PONTO DE ENTRADA =====
if (require.main === module) {
  // Executa apenas se for o arquivo principal
  initializeBot().catch((error) => {
    console.error('💥 Falha crítica na inicialização:', error);
    process.exit(1);
  });
}

// ===== EXPORTAÇÕES PARA TESTES =====
module.exports = {
  initializeBot,
  OptimizedCommandHandler
};
