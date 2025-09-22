/**
 * Bot de WhatsApp para Grupo de Volleyball - Otimizado
 * Arquivo principal que inicializa e orquestra os módulos do bot.
 *
 * @author Volleyball Team & Gemini AI
 * @version 3.0 - Arquitetura modular e otimizada
 */

const path = require('path');
const { initClient } = require('./src/core/client');
const { loadCommands } = require('./src/core/loader');
const logger = require('./src/utils/logger');
const PerformanceCache = require('./src/core/cache');
const MessageHandler = require('./src/core/messageHandler');
const CommandHandler = require('./src/core/commandHandler');
const { startCleanupJob } = require('./src/core/autoSilenceCleanup');
const { getCurrentDateTimeBR } = require('./src/utils/date');

// --- Ponto de Entrada Principal ---
(async () => {
  try {
    // 1. Log de Inicialização
    logger.info(`🌍 Timezone configurado: ${process.env.TZ || 'America/Sao_Paulo'}`);
    logger.info(`🕐 Data/hora atual: ${getCurrentDateTimeBR()}`);

    // 2. Carregar Comandos
    logger.info('🔄 Carregando comandos...');
    const commands = {};
    loadCommands(path.join(__dirname, 'src/commands'), commands);

    // 3. Inicializar Módulos de Performance e Lógica
    const cache = new PerformanceCache();
    const commandHandler = new CommandHandler(commands, cache);
    const messageHandler = new MessageHandler(commandHandler, cache);

    // 4. Inicializar Cliente do WhatsApp
    const client = await initClient();

    // 5. Registrar Event Handlers Principais
    // Processa mensagens recebidas (silenciamento, comandos, etc.)
    client.on('message_create', (msg) => {
      // Ignora as próprias mensagens para evitar loops
      if (msg.fromMe) return;
      messageHandler.handle(client, msg);
    });

    // Lógica de boas-vindas para novos membros
    client.on('group_join', (notification) => {
      messageHandler.handleGroupJoin(client, notification);
    });

    // 6. Iniciar Tarefas Agendadas
    const noturnoCommand = commands['!noturno'];
    if (noturnoCommand?.initializeSchedules) {
      noturnoCommand.initializeSchedules(client);
      logger.info('🌙 Agendamentos do modo noturno inicializados');
    }
    startCleanupJob(); // Inicia a limpeza de usuários silenciados expirados

    logger.success('🚀 Bot inicializado com sucesso e pronto para operar!');
    logger.info(`🕐 Hora de inicialização: ${getCurrentDateTimeBR()}`);

  } catch (err) {
    logger.error('💥 Erro fatal na inicialização:', err.message);
    console.error(err);
    process.exit(1);
  }
})();

// --- Handlers de Encerramento do Processo ---
const gracefulShutdown = (signal) => {
  logger.info(`🛑 Bot sendo finalizado (${signal}) em ${getCurrentDateTimeBR()}...`);
  // Aqui poderiam entrar rotinas de limpeza final, se necessário
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  logger.error('💥 Exceção não capturada:', err.message);
  console.error(err);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Promise rejeitada não tratada:', reason);
  console.error(promise);
});
