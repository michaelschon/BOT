// src/core/messageHandler.js
const logger = require('../utils/logger');
const { sendWelcomeMessage } = require('./client');
const { getCommandConfig } = require('../config/commands');
const { getCurrentDateTimeBR } = require('../utils/date');

class MessageHandler {
  constructor(commandHandler, cache) {
    this.commandHandler = commandHandler;
    this.cache = cache;
    logger.info('✅ MessageHandler inicializado.');
  }

  /**
   * Ponto de entrada para processar qualquer mensagem recebida.
   * @param {Client} client
   * @param {Message} msg
   */
  async handle(client, msg) {
    try {
      // 1. Verificar se o usuário está silenciado (usando o cache)
      const isSilenced = await this.isSilenced(msg);
      if (isSilenced) {
        await this.deleteSilencedMessage(msg);
        return; // Para o processamento aqui
      }

      const body = msg.body?.trim() || '';

      // 2. Processar sistema de figurinhas
      if (msg.hasMedia && body.toLowerCase().includes('!figurinha')) {
        await this.commandHandler.handleSticker(client, msg);
        return;
      }

      // 3. Processar comandos
      if (body.startsWith('!')) {
        await this.commandHandler.handle(client, msg);
      }
    } catch (error) {
      logger.error(`❌ Erro ao processar mensagem: ${error.message}`);
    }
  }

  /**
   * Verifica se o autor da mensagem está silenciado.
   * @param {Message} msg
   * @returns {Promise<boolean>}
   */
  async isSilenced(msg) {
    const chat = await msg.getChat();
    if (!chat.isGroup) return false;

    const senderId = msg.author || msg.from;
    const groupId = chat.id._serialized;

    return this.cache.isSilenced(groupId, senderId);
  }

  /**
   * Apaga a mensagem de um usuário silenciado e loga o evento.
   * @param {Message} msg
   */
  async deleteSilencedMessage(msg) {
    const chat = await msg.getChat();
    const senderId = msg.author || msg.from;
    const messagePreview = msg.body?.substring(0, 100) || '[mídia/sem texto]';

    logger.info(
      `🔇 MENSAGEM SILENCIADA - Grupo: ${chat.name}, Usuário: ${senderId}, Conteúdo: "${messagePreview}"`
    );

    try {
      await msg.delete(true); // Apaga para todos
    } catch (deleteError) {
      logger.error(`❌ Erro ao apagar mensagem de usuário silenciado: ${deleteError.message}`);
    }
  }

  /**
   * Lida com a entrada de novos membros em um grupo.
   * @param {Client} client
   * @param {object} notification
   */
  async handleGroupJoin(client, notification) {
    try {
        const chatId = notification.chatId;
        logger.info(`👥 Novos membros no grupo: ${chatId} em ${getCurrentDateTimeBR()}`);
        
        const chat = await client.getChatById(chatId);
        
        const welcomeConfig = getCommandConfig('!welcome');
        const isWelcomeEnabled = welcomeConfig.enabled && 
            (!welcomeConfig.allowedGroups || welcomeConfig.allowedGroups.length === 0 || 
             welcomeConfig.allowedGroups.includes(chatId));

        if (isWelcomeEnabled) {
            for (const userId of notification.recipientIds) {
                const contact = await client.getContactById(userId);
                const userName = contact.pushname || userId.replace('@c.us', '');
                
                await new Promise(resolve => setTimeout(resolve, 2000)); // Evita spam
                await sendWelcomeMessage(client, chat, userId, userName);
                
                logger.info(`👋 Boas-vindas enviadas para ${userName} (${userId})`);
            }
        }
    } catch (error) {
        logger.error(`❌ Erro ao processar entrada no grupo: ${error.message}`);
    }
  }
}

module.exports = MessageHandler;
