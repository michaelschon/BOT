/**
 * Sistema de Processamento de Mensagens - VERSÃO CORRIGIDA
 * Gerencia todas as mensagens recebidas: comandos, silenciamento, boas-vindas
 * 
 * CORREÇÕES APLICADAS:
 * - Sistema de boas-vindas agora respeita configurações por grupo
 * - Verificação rigorosa de grupos permitidos
 * - Logs detalhados para debug
 * - Por padrão, boas-vindas ficam DESABILITADAS
 * 
 * @author Volleyball Team & Gemini AI
 * @version 3.1 - Correção do sistema de boas-vindas
 */

const logger = require('../utils/logger');
const { sendWelcomeMessage } = require('./client');
const { getCommandConfig } = require('../config/commands');
const { getCurrentDateTimeBR } = require('../utils/date');

class MessageHandler {
  constructor(commandHandler, cache) {
    this.commandHandler = commandHandler;
    this.cache = cache;
    logger.info('✅ MessageHandler inicializado com correções aplicadas.');
  }

  /**
   * Ponto de entrada principal para processar qualquer mensagem recebida
   * Verifica silenciamento, processa comandos e sistema de figurinhas
   * @param {Client} client Cliente do WhatsApp
   * @param {Message} msg Mensagem recebida
   */
  async handle(client, msg) {
    try {
      // ===== VERIFICAÇÃO DE SILENCIAMENTO (PRIMEIRA PRIORIDADE) =====
      const isSilenced = await this.isSilenced(msg);
      if (isSilenced) {
        await this.deleteSilencedMessage(msg);
        return; // Para o processamento aqui - usuário silenciado
      }

      const body = msg.body?.trim() || '';

      // ===== SISTEMA DE FIGURINHAS =====
      // Verifica se é mídia com comando !figurinha na descrição
      if (msg.hasMedia && body.toLowerCase().includes('!figurinha')) {
        logger.info(`🎨 Processando figurinha de ${msg.author || msg.from}`);
        await this.commandHandler.handleSticker(client, msg);
        return; // Finaliza processamento após figurinha
      }

      // ===== SISTEMA DE COMANDOS =====
      // Verifica se a mensagem é um comando (começa com !)
      if (body.startsWith('!')) {
        logger.debug(`⚡ Comando detectado: "${body}" de ${msg.author || msg.from}`);
        await this.commandHandler.handle(client, msg);
        return; // Finaliza processamento após comando
      }

      // ===== OUTRAS MENSAGENS =====
      // Aqui você pode adicionar outros processamentos para mensagens não-comando
      // Por exemplo: respostas automáticas, contadores, etc.
      logger.debug(`💬 Mensagem comum processada de ${msg.author || msg.from}`);

    } catch (error) {
      logger.error(`❌ Erro ao processar mensagem: ${error.message}`);
      console.error('Stack trace:', error);
    }
  }

  /**
   * Verifica se o autor da mensagem está silenciado
   * Utiliza cache para performance otimizada
   * @param {Message} msg Mensagem a ser verificada
   * @returns {Promise<boolean>} True se o usuário está silenciado
   */
  async isSilenced(msg) {
    try {
      const chat = await msg.getChat();
      
      // Só verifica silenciamento em grupos
      if (!chat.isGroup) {
        return false;
      }

      const senderId = msg.author || msg.from;
      const groupId = chat.id._serialized;

      // Utiliza cache para verificação rápida
      const silenced = this.cache.isSilenced(groupId, senderId);
      
      if (silenced) {
        logger.debug(`🔇 Usuário silenciado detectado: ${senderId} no grupo ${groupId}`);
      }

      return silenced;

    } catch (error) {
      logger.error(`❌ Erro ao verificar silenciamento: ${error.message}`);
      return false; // Em caso de erro, não silencia (fail-safe)
    }
  }

  /**
   * Apaga mensagem de usuário silenciado e registra o evento
   * @param {Message} msg Mensagem a ser apagada
   */
  async deleteSilencedMessage(msg) {
    try {
      const chat = await msg.getChat();
      const senderId = msg.author || msg.from;
      const messagePreview = msg.body?.substring(0, 100) || '[mídia/sem texto]';

      // Log detalhado da mensagem silenciada
      logger.info(
        `🔇 MENSAGEM SILENCIADA DETECTADA:\n` +
        `   • Grupo: ${chat.name} (${chat.id._serialized})\n` +
        `   • Usuário: ${senderId}\n` +
        `   • Tipo: ${msg.type}\n` +
        `   • Conteúdo: "${messagePreview}"\n` +
        `   • Timestamp: ${getCurrentDateTimeBR()}`
      );

      try {
        // Tenta apagar a mensagem para todos
        await msg.delete(true);
        logger.success(`✅ Mensagem de usuário silenciado apagada com sucesso: ${senderId}`);
        
      } catch (deleteError) {
        logger.error(`❌ Erro ao apagar mensagem de usuário silenciado: ${deleteError.message}`);
        
        // Fallback: tentar enviar aviso temporário (opcional)
        try {
          const warningMsg = await msg.reply("🔇 _Mensagem removida - usuário silenciado_");
          
          // Apagar o aviso após 3 segundos
          setTimeout(async () => {
            try {
              await warningMsg.delete(true);
            } catch (warningDeleteError) {
              logger.debug("Não foi possível apagar mensagem de aviso");
            }
          }, 3000);
          
        } catch (replyError) {
          logger.error("Erro ao enviar aviso de silenciamento:", replyError.message);
        }
      }

    } catch (error) {
      logger.error(`❌ Erro geral ao processar mensagem silenciada: ${error.message}`);
    }
  }

  /**
   * Lida com a entrada de novos membros em um grupo
   * CORREÇÃO PRINCIPAL: Agora verifica corretamente se boas-vindas estão habilitadas
   * @param {Client} client Cliente do WhatsApp
   * @param {object} notification Notificação de entrada no grupo
   */
  async handleGroupJoin(client, notification) {
    try {
      const chatId = notification.chatId;
      const membersCount = notification.recipientIds.length;
      
      logger.info(
        `👥 ENTRADA NO GRUPO DETECTADA:\n` +
        `   • Grupo: ${chatId}\n` +
        `   • Novos membros: ${membersCount}\n` +
        `   • Timestamp: ${getCurrentDateTimeBR()}`
      );
      
      const chat = await client.getChatById(chatId);
      logger.info(`   • Nome do grupo: ${chat.name}`);
      
      // ===== VERIFICAÇÃO CORRIGIDA DO STATUS DE BOAS-VINDAS =====
      
      const welcomeConfig = getCommandConfig('!welcome');
      
      // Sistema só está ativo se AMBAS as condições forem verdadeiras:
      // 1. Sistema globalmente habilitado E
      // 2. Grupo está explicitamente na lista de grupos permitidos
      const isEnabledGlobally = welcomeConfig.enabled === true;
      const allowedGroups = welcomeConfig.allowedGroups || [];
      const isGroupAllowed = allowedGroups.includes(chatId);
      const isWelcomeEnabled = isEnabledGlobally && isGroupAllowed;

      // Log detalhado da verificação para debug
      logger.info(
        `🔍 VERIFICAÇÃO DE BOAS-VINDAS:\n` +
        `   • Sistema global habilitado: ${isEnabledGlobally}\n` +
        `   • Grupos permitidos: ${allowedGroups.length} grupo(s)\n` +
        `   • Este grupo está permitido: ${isGroupAllowed}\n` +
        `   • Resultado final: ${isWelcomeEnabled ? '✅ ATIVO' : '❌ INATIVO'}`
      );

      if (isWelcomeEnabled) {
        // ===== BOAS-VINDAS ATIVAS - PROCESSAR NOVOS MEMBROS =====
        
        logger.success(`✅ Boas-vindas ativas - processando ${membersCount} novo(s) membro(s)`);
        
        for (let i = 0; i < notification.recipientIds.length; i++) {
          const userId = notification.recipientIds[i];
          
          try {
            // Obter informações do novo membro
            let userName = userId.replace('@c.us', '');
            try {
              const contact = await client.getContactById(userId);
              userName = contact.pushname || userName;
            } catch (contactError) {
              logger.debug(`⚠️ Não foi possível obter nome do contato ${userId}: ${contactError.message}`);
            }
            
            logger.info(`👋 Processando boas-vindas para: ${userName} (${userId})`);
            
            // Delay entre mensagens para evitar spam (2 segundos por membro)
            if (i > 0) {
              logger.debug(`⏳ Aguardando 2 segundos antes do próximo membro...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            // Enviar sequência completa de boas-vindas
            await sendWelcomeMessage(client, chat, userId, userName);
            
            logger.success(`✅ Boas-vindas enviadas com sucesso para ${userName}`);
            
          } catch (memberError) {
            logger.error(`❌ Erro ao processar membro ${userId}: ${memberError.message}`);
            console.error('Stack trace do erro do membro:', memberError);
            
            // Continua para o próximo membro mesmo com erro
            continue;
          }
        }
        
        logger.success(`🎉 Processamento de boas-vindas concluído para ${membersCount} membro(s)`);
        
      } else {
        // ===== BOAS-VINDAS INATIVAS - APENAS LOG =====
        
        logger.info(
          `⏭️ BOAS-VINDAS DESABILITADAS:\n` +
          `   • Motivo: ${!isEnabledGlobally ? 'Sistema globalmente desabilitado' : 'Grupo não está na lista permitida'}\n` +
          `   • Ação: Pulando ${membersCount} novo(s) membro(s)\n` +
          `   • Para ativar: Use "!welcome on" neste grupo`
        );
      }
      
    } catch (error) {
      logger.error(`❌ ERRO AO PROCESSAR ENTRADA NO GRUPO: ${error.message}`);
      console.error('Stack trace completo:', error);
      
      // Log adicional para debug
      logger.error(
        `📋 Detalhes do erro:\n` +
        `   • Grupo: ${notification.chatId}\n` +
        `   • Membros: ${notification.recipientIds?.length || 0}\n` +
        `   • Timestamp: ${getCurrentDateTimeBR()}`
      );
    }
  }

  /**
   * Lida com a saída de membros do grupo (opcional)
   * Pode ser usado para logs ou outras ações quando alguém sai
   * @param {Client} client Cliente do WhatsApp
   * @param {object} notification Notificação de saída do grupo
   */
  async handleGroupLeave(client, notification) {
    try {
      const chatId = notification.chatId;
      const leftMembers = notification.recipientIds.length;
      
      logger.info(
        `👋 SAÍDA DO GRUPO DETECTADA:\n` +
        `   • Grupo: ${chatId}\n` +
        `   • Membros que saíram: ${leftMembers}\n` +
        `   • Timestamp: ${getCurrentDateTimeBR()}`
      );
      
      // Aqui você pode adicionar lógica adicional para quando alguém sai
      // Por exemplo: limpar dados do usuário, logs especiais, etc.
      
    } catch (error) {
      logger.error(`❌ Erro ao processar saída do grupo: ${error.message}`);
    }
  }

  /**
   * Lida com atualizações de informações do grupo
   * @param {Client} client Cliente do WhatsApp
   * @param {object} notification Notificação de atualização do grupo
   */
  async handleGroupUpdate(client, notification) {
    try {
      const chatId = notification.chatId;
      
      logger.info(
        `📝 ATUALIZAÇÃO DO GRUPO DETECTADA:\n` +
        `   • Grupo: ${chatId}\n` +
        `   • Timestamp: ${getCurrentDateTimeBR()}`
      );
      
      // Atualizar informações do grupo no banco de dados
      const chat = await client.getChatById(chatId);
      const { saveGroupInfo } = require('./client');
      await saveGroupInfo(chat);
      
    } catch (error) {
      logger.error(`❌ Erro ao processar atualização do grupo: ${error.message}`);
    }
  }

  /**
   * Método utilitário para invalidar cache quando necessário
   * @param {string} groupId ID do grupo
   * @param {string} userId ID do usuário
   * @param {string} type Tipo de cache a invalidar ('silenced' ou 'admin')
   */
  invalidateCache(groupId, userId, type = 'silenced') {
    try {
      if (type === 'silenced') {
        this.cache.invalidateSilenced(groupId, userId);
        logger.debug(`🗑️ Cache de silenciamento invalidado para ${userId} em ${groupId}`);
      } else if (type === 'admin') {
        this.cache.invalidateAdmin(groupId, userId);
        logger.debug(`🗑️ Cache de admin invalidado para ${userId} em ${groupId}`);
      }
    } catch (error) {
      logger.error(`❌ Erro ao invalidar cache: ${error.message}`);
    }
  }

  /**
   * Obtém estatísticas do MessageHandler
   * @returns {object} Estatísticas de uso
   */
  getStats() {
    return {
      cacheStats: {
        silencedCacheSize: this.cache.silencedCache.size,
        adminCacheSize: this.cache.adminCache.size,
      },
      timestamp: getCurrentDateTimeBR()
    };
  }
}

module.exports = MessageHandler;
