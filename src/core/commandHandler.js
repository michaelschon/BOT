// src/core/commandHandler.js
const logger = require('../utils/logger');
const { getCommandConfig } = require('../config/commands');
const { authCheck } = require('../config/auth');
const { auditCommand } = require('../utils/audit');
const RateLimiter = require('./rateLimiter');
const PerformanceMonitor = require('../monitoring/performance');
const { getCurrentDateTimeBR } = require('../utils/date');

class CommandHandler {
  constructor(commands, cache) {
    this.commands = commands;
    this.cache = cache;
    this.rateLimiter = new RateLimiter();
    this.performanceMonitor = new PerformanceMonitor();

    // Cria comandos básicos se nenhum for carregado
    if (Object.keys(this.commands).length === 0) {
      this.createBasicCommands();
    }
    logger.info('✅ CommandHandler inicializado.');
  }

  /**
   * Ponto de entrada para processar um comando.
   * @param {Client} client
   * @param {Message} msg
   */
  async handle(client, msg) {
    const startTime = Date.now();
    const senderId = msg.author || msg.from;
    const body = msg.body.trim();
    const parts = body.split(' ');
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    try {
      const command = this.commands[commandName];
      if (!command) return;

      // 1. Rate Limiting
      if (!this.rateLimiter.isAllowed(senderId, commandName)) {
        logger.warn(`🚫 Rate limit atingido por ${senderId} para o comando ${commandName}`);
        await msg.reply('⏳ Você está enviando comandos muito rápido. Por favor, aguarde um momento.');
        return;
      }

      const chat = await msg.getChat();
      const config = getCommandConfig(commandName);

      // Lógica de verificação de grupo permitido (CORRIGIDA)
      if (chat.isGroup) {
        const groupId = chat.id._serialized;
        const globalConfig = getCommandConfig('!global'); // Pega a configuração global

        // VERIFICAÇÃO 1: Se a trava global para grupos específicos está ativa
        if (globalConfig.onlySpecificGroups) {
          if (!config.allowedGroups || !config.allowedGroups.includes(groupId)) {
            logger.warn(`[Bloqueado] Comando "${commandName}" tentou ser usado no grupo ${groupId} fora da sua lista permitida (trava global ativa).`);
            return; // Responde silenciosamente para não poluir o chat
          }
        }
        // VERIFICAÇÃO 2: Se a trava global NÃO está ativa, mas o comando tem uma lista específica
        else if (config.allowedGroups && config.allowedGroups.length > 0 && !config.allowedGroups.includes(groupId)) {
           return await msg.reply('⚠️ Este comando não pode ser usado neste grupo.');
        }
      }

      // 2. Validações (habilitado, autorização)
      if (!config.enabled) {
        return await msg.reply('⚠️ Este comando está desabilitado.');
      }
      
      const isAuthorized = await authCheck(msg, chat, command, config, this.cache);
      if (!isAuthorized) {
        await auditCommand(senderId, commandName, chat.id._serialized, false, args, 'Sem permissão');
        return await msg.reply('❌ Você não tem permissão para usar este comando.');
      }

      // 3. Execução e Logs
      logger.info(
        `⚡ Executando: ${commandName} | Usuário: ${senderId} | Chat: ${chat.name || 'PV'} | Hora: ${getCurrentDateTimeBR()}`
      );
      await command.execute(client, msg, args, senderId);
      await auditCommand(senderId, commandName, chat.id._serialized, true, args);

    } catch (err) {
      logger.error(`❌ Erro ao processar comando "${commandName}":`, err.message);
      console.error(err);
      if (msg && msg.to) {
        await auditCommand(senderId, commandName, msg.to, false, args, err.message);
        await msg.reply('❌ Ocorreu um erro interno ao processar seu comando.');
      }
    } finally {
      // 4. Monitoramento de Performance
      this.performanceMonitor.trackCommand(commandName, startTime);
    }
  }
    
  /**
   * Lida especificamente com o comando !figurinha em mídias.
   */
  async handleSticker(client, msg) {
      const figurinhaCommand = this.commands['!figurinha'];
      if (figurinhaCommand?.processMedia) {
          try {
              await figurinhaCommand.processMedia(client, msg);
          } catch (figError) {
              logger.error('❌ Erro no sistema de figurinhas:', figError.message);
          }
      }
  }
    
  /**
   * Cria comandos !ping e !dados em memória se nenhum arquivo de comando for encontrado.
   */
  createBasicCommands() {
    logger.warn('⚠️ Nenhum comando carregado! Criando comandos básicos em memória...');
    this.commands['!ping'] = {
      name: '!ping',
      requireAdmin: false,
      execute: async (client, msg) => msg.reply('🏓 Pong!'),
    };
    this.commands['!dados'] = {
      name: '!dados',
      requireAdmin: false,
      execute: async (client, msg) => {
        const chat = await msg.getChat();
        const senderId = msg.author || msg.from;
        let response = `📋 *Informações:*\n\n`;
        if (chat.isGroup) {
          response += `👥 Grupo: ${chat.name}\n🆔 ID do Grupo: \`${chat.id._serialized}\`\n`;
        } else {
          response += `💬 Conversa Privada\n`;
        }
        response += `🙋 Seu ID: \`${senderId}\`\n🕐 Data/hora: ${getCurrentDateTimeBR()}`;
        await msg.reply(response);
      },
    };
  }
}

module.exports = CommandHandler;
