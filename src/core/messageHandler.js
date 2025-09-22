/**
 * Handler de Mensagens Otimizado
 * Processa todas as mensagens do WhatsApp com cache inteligente e alta performance
 * 
 * @author Volleyball Team
 * @version 3.0 - Completamente otimizado com cache
 */

const logger = require('../utils/logger');
const { statements } = require('./db');
const { isMaster, isAdmin } = require('../config/auth');
const { cache, setCooldown, getCooldown, canExecuteCommand } = require('./cache');

/**
 * Classe principal para handling de mensagens
 */
class MessageHandler {
  constructor(commandHandler, performanceCache) {
    this.commandHandler = commandHandler;
    this.cache = performanceCache;
    
    // Estatísticas de performance
    this.stats = {
      messagesProcessed: 0,
      commandsExecuted: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageProcessingTime: 0,
      silencedBlocked: 0
    };
    
    // Buffer para cálculo de média de tempo
    this.processingTimes = [];
    this.maxProcessingTimes = 100;
    
    logger.info('📨 Message Handler otimizado inicializado');
  }
  
  /**
   * Handler principal para mensagens
   * @param {Client} client Cliente do WhatsApp
   * @param {Message} msg Mensagem recebida
   */
  async handle(client, msg) {
    const startTime = process.hrtime.bigint();
    
    try {
      this.stats.messagesProcessed++;
      
      // ===== VALIDAÇÕES BÁSICAS =====
      if (msg.fromMe) return; // Ignora próprias mensagens
      if (!msg.body || msg.body.trim() === '') return; // Ignora mensagens vazias
      
      const senderId = msg.author || msg.from;
      const chat = await msg.getChat();
      const groupId = chat.isGroup ? chat.id._serialized : null;
      
      // ===== CACHE DE INFORMAÇÕES BÁSICAS =====
      await this.cacheBasicInfo(senderId, groupId, chat);
      
      // ===== VERIFICAÇÃO DE SILENCIAMENTO =====
      if (groupId && await this.isSilencedCached(groupId, senderId)) {
        this.stats.silencedBlocked++;
        logger.debug(`🔇 Mensagem bloqueada - usuário silenciado: ${senderId}`);
        return;
      }
      
      // ===== PROCESSAMENTO DE COMANDOS =====
      if (msg.body.startsWith('!')) {
        await this.handleCommand(client, msg, senderId, groupId);
      }
      
    } catch (error) {
      logger.error('❌ Erro no message handler:', error.message);
    } finally {
      // Calcular tempo de processamento
      const endTime = process.hrtime.bigint();
      const processingTime = Number(endTime - startTime) / 1000000; // ms
      
      this.updateProcessingStats(processingTime);
    }
  }
  
  /**
   * Processa comandos com cache e otimizações
   * @param {Client} client Cliente do WhatsApp
   * @param {Message} msg Mensagem
   * @param {string} senderId ID do remetente
   * @param {string} groupId ID do grupo (se aplicável)
   */
  async handleCommand(client, msg, senderId, groupId) {
    try {
      const args = msg.body.trim().split(/\s+/);
      const command = args[0].toLowerCase();
      const commandArgs = args.slice(1);
      
      this.stats.commandsExecuted++;
      
      // ===== VERIFICAÇÃO DE COOLDOWN =====
      const cooldownRemaining = getCooldown(senderId, command);
      if (cooldownRemaining > 0) {
        const seconds = Math.ceil(cooldownRemaining / 1000);
        await msg.reply(`⏰ Aguarde ${seconds}s antes de usar este comando novamente.`);
        return;
      }
      
      // ===== VERIFICAÇÃO DE PERMISSÕES COM CACHE =====
      const hasPermission = await this.checkPermissionsCached(senderId, groupId, command);
      if (!hasPermission) {
        await msg.reply('❌ Você não tem permissão para executar este comando.');
        return;
      }
      
      // ===== EXECUÇÃO DO COMANDO =====
      if (this.commandHandler && this.commandHandler.execute) {
        await this.commandHandler.execute(client, msg, commandArgs, senderId, command);
        
        // Definir cooldown após execução bem-sucedida
        setCooldown(senderId, command);
        
        // Log de auditoria (apenas comandos importantes)
        if (this.shouldLogCommand(command)) {
          this.logCommand(senderId, groupId, command, commandArgs.join(' '), true);
        }
      }
      
    } catch (error) {
      logger.error(`❌ Erro ao executar comando ${command}:`, error.message);
      
      // Log de erro na auditoria
      this.logCommand(senderId, groupId, command, '', false, error.message);
      
      await msg.reply('❌ Erro interno. Tente novamente em alguns segundos.');
    }
  }
  
  /**
   * Verifica permissões usando cache inteligente
   * @param {string} senderId ID do usuário
   * @param {string} groupId ID do grupo
   * @param {string} command Comando
   * @returns {boolean} Se tem permissão
   */
  async checkPermissionsCached(senderId, groupId, command) {
    try {
      // Master sempre tem permissão total
      if (senderId === '5519999222004@c.us') {
        return true;
      }
      
      // Comandos livres (!ping, !dados)
      if (['!ping', '!dados'].includes(command)) {
        return true;
      }
      
      // Para outros comandos, verificar se requer admin
      const requiresAdmin = this.commandRequiresAdmin(command);
      if (!requiresAdmin) {
        return true;
      }
      
      // Se requer admin, verificar no cache primeiro
      if (groupId) {
        const cachedAdminStatus = this.cache.getAdminStatus(groupId, senderId);
        
        if (cachedAdminStatus !== null) {
          this.stats.cacheHits++;
          return cachedAdminStatus;
        }
        
        // Cache miss - consultar banco
        this.stats.cacheMisses++;
        const isGroupAdmin = statements.isGroupAdmin.get(groupId, senderId);
        const hasPermission = !!isGroupAdmin;
        
        // Cachear resultado
        this.cache.setAdminStatus(groupId, senderId, hasPermission);
        
        return hasPermission;
      }
      
      return false;
      
    } catch (error) {
      logger.error('❌ Erro na verificação de permissões:', error.message);
      return false;
    }
  }
  
  /**
   * Verifica se usuário está silenciado usando cache
   * @param {string} groupId ID do grupo
   * @param {string} senderId ID do usuário
   * @returns {boolean} Se está silenciado
   */
  async isSilencedCached(groupId, senderId) {
    try {
      // Master nunca pode ser silenciado
      if (senderId === '5519999222004@c.us') {
        return false;
      }
      
      // Verificar cache primeiro
      const cachedStatus = this.cache.getSilencedStatus(groupId, senderId);
      
      if (cachedStatus !== null) {
        this.stats.cacheHits++;
        return cachedStatus;
      }
      
      // Cache miss - consultar banco
      this.stats.cacheMisses++;
      const silencedRecord = statements.isSilenced.get(groupId, senderId);
      const isSilenced = !!silencedRecord;
      
      // Cachear resultado (TTL menor para silenciamento)
      this.cache.setSilencedStatus(groupId, senderId, isSilenced);
      
      return isSilenced;
      
    } catch (error) {
      logger.error('❌ Erro na verificação de silenciamento:', error.message);
      return false;
    }
  }
  
  /**
   * Cacheia informações básicas do usuário e grupo
   * @param {string} senderId ID do usuário
   * @param {string} groupId ID do grupo
   * @param {object} chat Objeto do chat
   */
  async cacheBasicInfo(senderId, groupId, chat) {
    try {
      // Cache info do usuário se não existir
      if (!this.cache.getUserInfo(senderId)) {
        const contact = await chat.getContact();
        const userData = {
          id: senderId,
          name: contact.pushname || contact.name || 'Desconhecido',
          number: contact.number || senderId.replace('@c.us', '')
        };
        
        this.cache.setUserInfo(senderId, userData);
        
        // Salvar no banco se necessário
        statements.insertUser.run(userData.id, userData.name, userData.number);
      }
      
      // Cache info do grupo se for grupo
      if (groupId && !this.cache.getGroupInfo(groupId)) {
        const groupData = {
          id: groupId,
          name: chat.name,
          description: chat.description || null
        };
        
        this.cache.setGroupInfo(groupId, groupData);
        
        // Salvar no banco se necessário
        statements.insertGroup.run(groupData.id, groupData.name, groupData.description);
      }
      
    } catch (error) {
      logger.debug('⚠️ Erro ao cachear info básica:', error.message);
    }
  }
  
  /**
   * Verifica se comando requer permissões de admin
   * @param {string} command Comando
   * @returns {boolean} Se requer admin
   */
  commandRequiresAdmin(command) {
    const adminCommands = [
      '!kick', '!ban', '!unban', '!mute', '!unmute', '!promote', '!demote',
      '!limpar', '!restart', '!invite', '!noturno', '!silenciar', '!liberar',
      '!bloquear', '!desbloquear', '!todos', '!lista'
    ];
    
    return adminCommands.includes(command);
  }
  
  /**
   * Verifica se deve fazer log do comando
   * @param {string} command Comando
   * @returns {boolean} Se deve logar
   */
  shouldLogCommand(command) {
    // Não logar comandos muito frequentes
    const skipLog = ['!ping', '!dados'];
    return !skipLog.includes(command);
  }
  
  /**
   * Registra comando na auditoria
   * @param {string} senderId ID do usuário
   * @param {string} groupId ID do grupo
   * @param {string} command Comando
   * @param {string} args Argumentos
   * @param {boolean} success Se foi bem-sucedido
   * @param {string} error Mensagem de erro
   */
  logCommand(senderId, groupId, command, args, success = true, error = null) {
    try {
      statements.logCommand.run(
        senderId,
        groupId,
        command,
        args,
        success ? 1 : 0,
        error
      );
    } catch (logError) {
      logger.debug('⚠️ Erro ao registrar auditoria:', logError.message);
    }
  }
  
  /**
   * Atualiza estatísticas de processamento
   * @param {number} processingTime Tempo em ms
   */
  updateProcessingStats(processingTime) {
    this.processingTimes.push(processingTime);
    
    // Manter apenas os últimos N tempos
    if (this.processingTimes.length > this.maxProcessingTimes) {
      this.processingTimes.shift();
    }
    
    // Calcular média
    const sum = this.processingTimes.reduce((a, b) => a + b, 0);
    this.stats.averageProcessingTime = (sum / this.processingTimes.length).toFixed(2);
    
    // Log de performance se muito lento
    if (processingTime > 100) {
      logger.warn(`⚠️ Processamento lento: ${processingTime.toFixed(2)}ms`);
    }
  }
  
  /**
   * Handler para novos membros do grupo
   * @param {Client} client Cliente do WhatsApp
   * @param {object} notification Notificação de entrada
   */
  async handleGroupJoin(client, notification) {
    try {
      logger.info('👋 Novo membro detectado:', notification);
      
      const chat = await client.getChatById(notification.chatId);
      
      // Processar cada novo membro
      for (const participant of notification.recipientsIds) {
        const contact = await client.getContactById(participant);
        
        logger.info(`📝 Processando novo membro: ${contact.pushname} (${participant})`);
        
        // Salvar informações do usuário
        statements.insertUser.run(
          participant,
          contact.pushname || contact.name || 'Novo Membro',
          contact.number || participant.replace('@c.us', '')
        );
        
        // Invalidar cache relacionado ao grupo
        this.cache.invalidateGroup(notification.chatId);
        
        // Enviar mensagem de boas-vindas
        await this.sendWelcomeMessage(client, chat, participant, contact.pushname);
      }
      
    } catch (error) {
      logger.error('❌ Erro ao processar entrada no grupo:', error.message);
    }
  }
  
  /**
   * Envia mensagem de boas-vindas otimizada
   * @param {Client} client Cliente
   * @param {object} chat Chat do grupo
   * @param {string} userId ID do usuário
   * @param {string} userName Nome do usuário
   */
  async sendWelcomeMessage(client, chat, userId, userName) {
    try {
      logger.info(`👋 Enviando boas-vindas para ${userName} no grupo ${chat.name}`);
      
      const welcomeMsg = 
        `🏐 Seja muito bem-vindo(a) ao nosso grupo de vôlei, ${userName || 'novo(a) membro'}!\n\n` +
        `Que alegria ter você aqui conosco! 🎉\n\n` +
        `📋 **Primeiros passos:**\n` +
        `• Leia a descrição do grupo - as regras estão lá\n` +
        `• Se tiver dúvidas, pode perguntar à vontade!\n` +
        `• Apresente-se para o pessoal quando quiser\n\n` +
        `📝 **Para participar das partidas:**\n` +
        `Procure a Júlia (ADM) para fazer seu cadastro e entrar na lista de jogadores!\n\n` +
        `🏐 Estamos ansiosos para jogar volleyball com você! Seja bem-vindo(a) à família! 🤗`;
      
      await client.sendMessage(chat.id._serialized, welcomeMsg);
      
      // Aguardar antes de enviar o contato
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // vCard da Julia
      const juliaVCard = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        'FN:Júlia (ADM)',
        'ORG:Amigos do Vôlei',
        'TEL;type=CELL;type=VOICE;waid=5519971548071:+55 19 97154-8071',
        'END:VCARD'
      ].join('\n');

      await client.sendMessage(chat.id._serialized, juliaVCard, {
        parseVCards: true
      });
      
      logger.success(`✅ Boas-vindas enviadas para ${userName}`);
      
    } catch (error) {
      logger.error('❌ Erro ao enviar boas-vindas:', error.message);
    }
  }
  
  /**
   * Obtém estatísticas detalhadas do handler
   * @returns {object} Estatísticas completas
   */
  getDetailedStats() {
    const cacheStats = this.cache.getStats();
    
    return {
      messageHandler: this.stats,
      cache: cacheStats,
      performance: {
        cacheHitRate: this.stats.cacheHits + this.stats.cacheMisses > 0 
          ? ((this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)) * 100).toFixed(2) + '%'
          : '0%',
        averageProcessingTime: this.stats.averageProcessingTime + 'ms',
        messagesPerSecond: this.calculateMessagesPerSecond()
      }
    };
  }
  
  /**
   * Calcula mensagens por segundo (aproximado)
   * @returns {string} Taxa de mensagens
   */
  calculateMessagesPerSecond() {
    if (this.processingTimes.length === 0) return '0';
    
    const avgTime = parseFloat(this.stats.averageProcessingTime);
    const messagesPerSecond = (1000 / avgTime).toFixed(1);
    
    return messagesPerSecond;
  }
  
  /**
   * Invalida caches relacionados a mudanças específicas
   * @param {string} type Tipo de invalidação
   * @param {string} groupId ID do grupo
   * @param {string} userId ID do usuário
   */
  invalidateRelatedCaches(type, groupId, userId) {
    switch (type) {
      case 'admin_change':
        // Invalidar cache de admin para o usuário
        this.cache.delete(this.cache.generateKey('admin', groupId, userId));
        logger.debug(`🗑️ Cache de admin invalidado: ${userId} no grupo ${groupId}`);
        break;
        
      case 'silence_change':
        // Invalidar cache de silenciamento
        this.cache.delete(this.cache.generateKey('silenced', groupId, userId));
        logger.debug(`🗑️ Cache de silenciamento invalidado: ${userId} no grupo ${groupId}`);
        break;
        
      case 'nickname_change':
        // Invalidar cache de apelido
        this.cache.delete(this.cache.generateKey('nickname', groupId, userId));
        logger.debug(`🗑️ Cache de apelido invalidado: ${userId} no grupo ${groupId}`);
        break;
        
      case 'user_update':
        // Invalidar todos os caches do usuário
        this.cache.invalidateUser(userId);
        break;
        
      case 'group_update':
        // Invalidar todos os caches do grupo
        this.cache.invalidateGroup(groupId);
        break;
    }
  }
  
  /**
   * Pré-aquece caches para grupos específicos
   * @param {Array} groupIds Lista de IDs de grupos
   */
  async warmupCachesForGroups(groupIds) {
    logger.info('🔥 Aquecendo caches para grupos específicos...');
    
    try {
      for (const groupId of groupIds) {
        // Pré-carregar admins do grupo
        const admins = statements.getAllGroupAdmins.all(groupId, '5519999222004@c.us');
        
        for (const admin of admins) {
          this.cache.setAdminStatus(groupId, admin.usuario_id, true);
        }
        
        // Pré-carregar apelidos ativos
        const nicknames = statements.getAllNicknamesInGroup.all(groupId);
        
        for (const nickname of nicknames) {
          this.cache.setNickname(groupId, nickname.usuario_id, {
            nickname: nickname.nickname,
            locked: nickname.locked,
            set_by: nickname.set_by
          });
        }
      }
      
      logger.success(`✅ Caches aquecidos para ${groupIds.length} grupos`);
      
    } catch (error) {
      logger.error('❌ Erro ao aquecer caches:', error.message);
    }
  }
  
  /**
   * Executa limpeza de performance
   * Remove dados antigos e otimiza caches
   */
  performMaintenanceCleanup() {
    logger.info('🧹 Executando limpeza de manutenção...');
    
    try {
      // Limpar estatísticas antigas se muito grandes
      if (this.processingTimes.length > this.maxProcessingTimes * 2) {
        this.processingTimes = this.processingTimes.slice(-this.maxProcessingTimes);
        logger.debug('🗑️ Estatísticas de tempo limpas');
      }
      
      // Forçar limpeza do cache
      this.cache.cleanup();
      
      logger.success('✅ Limpeza de manutenção concluída');
      
    } catch (error) {
      logger.error('❌ Erro na limpeza de manutenção:', error.message);
    }
  }
}

module.exports = MessageHandler;
