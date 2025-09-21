/**
 * Cliente WhatsApp Web.js
 * Inicializa e configura a conexão com o WhatsApp
 * 
 * @author Volleyball Team
 */

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const logger = require("../utils/logger");
const { statements } = require("./db");

/**
 * Configurações do cliente
 */
const CLIENT_CONFIG = {
  authStrategy: new LocalAuth({
    dataPath: '.wwebjs_auth'
  }),
  puppeteer: {
    headless: true,
  },
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
  }
};

/**
 * Salva informações do grupo no banco de dados
 * @param {object} chat Objeto do chat
 */
async function saveGroupInfo(chat) {
  try {
    if (chat.isGroup) {
      statements.insertGroup.run(
        chat.id._serialized,
        chat.name,
        chat.description || null
      );
      
      logger.debug(`💾 Grupo salvo/atualizado: ${chat.name} (${chat.id._serialized})`);
    }
  } catch (error) {
    logger.error("❌ Erro ao salvar grupo:", error.message);
  }
}

/**
 * Salva informações do usuário no banco de dados
 * @param {string} userId ID do usuário
 * @param {string} userName Nome do usuário (opcional)
 */
async function saveUserInfo(userId, userName = null) {
  try {
    // Extrai número do telefone do ID
    const phone = userId.replace('@c.us', '');
    
    statements.insertUser.run(
      userId,
      userName,
      phone
    );
    
    logger.debug(`👤 Usuário salvo/atualizado: ${userId}`);
  } catch (error) {
    logger.error("❌ Erro ao salvar usuário:", error.message);
  }
}

/**
 * Inicializa o cliente WhatsApp
 * @returns {Promise<Client>} Cliente inicializado
 */
async function initClient() {
  logger.info("🚀 Inicializando cliente WhatsApp...");
  
  try {
    const client = new Client(CLIENT_CONFIG);
    
    // ========== EVENT HANDLERS ==========
    
    /**
     * Evento: QR Code recebido
     */
    client.on("qr", (qr) => {
      logger.info("📱 QR Code recebido! Escaneie com seu celular:");
      qrcode.generate(qr, { small: true });
      
      console.log("\n" + "=".repeat(50));
      console.log("📱 INSTRUÇÕES:");
      console.log("1. Abra o WhatsApp no seu celular");
      console.log("2. Vá em Configurações > Aparelhos conectados");
      console.log("3. Toque em 'Conectar um aparelho'");
      console.log("4. Escaneie o QR Code acima");
      console.log("=".repeat(50) + "\n");
    });
    
    /**
     * Evento: Tela de carregamento
     */
    client.on("loading_screen", (percent, message) => {
      logger.info(`⌛ Carregando WhatsApp: ${percent}% - ${message}`);
    });
    
    /**
     * Evento: Autenticação bem-sucedida
     */
    client.on("authenticated", () => {
      logger.success("🔑 Autenticação realizada com sucesso!");
    });
    
    /**
     * Evento: Falha na autenticação
     */
    client.on("auth_failure", (msg) => {
      logger.error("❌ Falha na autenticação:", msg);
      logger.info("💡 Dica: Tente deletar a pasta 'data/wwebjs_auth' e reiniciar o bot");
    });
    
    /**
     * Evento: Cliente pronto
     */
    client.on("ready", async () => {
      try {
        logger.success("✅ Bot conectado e pronto para uso!");
        
        // Obtém informações do bot
        const info = client.info;
        logger.info(`👤 Bot logado como: ${info.pushname} (${info.wid.user})`);
        
        // Salva próprio usuário no banco
        await saveUserInfo(info.wid._serialized, info.pushname);
        
        // Estatísticas iniciais
        const chats = await client.getChats();
        const groups = chats.filter(chat => chat.isGroup);
        const privateChats = chats.filter(chat => !chat.isGroup);
        
        logger.info(`📊 Estatísticas iniciais:`);
        logger.info(`   • ${groups.length} grupos`);
        logger.info(`   • ${privateChats.length} conversas privadas`);
        logger.info(`   • ${chats.length} chats totais`);
        
        // Salva informações dos grupos
        for (const chat of groups) {
          await saveGroupInfo(chat);
        }
        
      } catch (error) {
        logger.error("❌ Erro na inicialização:", error.message);
      }
    });
    
    /**
     * Evento: Cliente desconectado
     */
    client.on("disconnected", (reason) => {
      logger.error("⚡ Cliente desconectado:", reason);
      
      if (reason === 'NAVIGATION') {
        logger.info("🔄 Tentando reconectar automaticamente...");
      } else {
        logger.warn("⚠️ Desconexão permanente. Reinicie o bot se necessário.");
      }
    });
    
    /**
     * Evento: Mudança de estado
     */
    client.on("change_state", (state) => {
      logger.debug(`🔄 Estado do cliente: ${state}`);
    });
    
    /**
     * Evento: Nova mensagem recebida
     */
    client.on("message", async (msg) => {
      try {
        // Salva informações do remetente
        const senderId = msg.author || msg.from;
        const contact = await msg.getContact();
        await saveUserInfo(senderId, contact.pushname);
        
        // Salva informações do grupo se aplicável
        const chat = await msg.getChat();
        if (chat.isGroup) {
          await saveGroupInfo(chat);
        }
        
      } catch (error) {
        logger.debug("❌ Erro ao processar mensagem recebida:", error.message);
      }
    });
    
    /**
     * Evento: Usuário adicionado ao grupo
     */
    client.on("group_join", async (notification) => {
      try {
        logger.info(`👥 Usuários adicionados ao grupo: ${notification.chatId}`);
        
        const chat = await client.getChatById(notification.chatId);
        await saveGroupInfo(chat);
        
        // Salva informações dos novos usuários
        for (const userId of notification.recipientIds) {
          const contact = await client.getContactById(userId);
          await saveUserInfo(userId, contact.pushname);
        }
        
      } catch (error) {
        logger.error("❌ Erro ao processar entrada no grupo:", error.message);
      }
    });
    
    /**
     * Evento: Usuário removido do grupo
     */
    client.on("group_leave", async (notification) => {
      try {
        logger.info(`👥 Usuários removidos do grupo: ${notification.chatId}`);
        
        // Atualiza informações do grupo
        const chat = await client.getChatById(notification.chatId);
        await saveGroupInfo(chat);
        
      } catch (error) {
        logger.error("❌ Erro ao processar saída do grupo:", error.message);
      }
    });
    
    /**
     * Evento: Informações do grupo atualizadas
     */
    client.on("group_update", async (notification) => {
      try {
        logger.info(`📝 Grupo atualizado: ${notification.chatId}`);
        
        const chat = await client.getChatById(notification.chatId);
        await saveGroupInfo(chat);
        
      } catch (error) {
        logger.error("❌ Erro ao processar atualização do grupo:", error.message);
      }
    });
    
    // ========== INICIALIZAÇÃO ==========
    
    logger.info("⏳ Inicializando conexão com WhatsApp...");
    await client.initialize();
    
    return client;
    
  } catch (error) {
    logger.error("💥 Erro fatal na inicialização do cliente:", error.message);
    throw error;
  }
}

/**
 * Função para obter informações do cliente
 * @param {Client} client Cliente WhatsApp
 * @returns {object} Informações do cliente
 */
async function getClientInfo(client) {
  try {
    const info = client.info;
    const state = await client.getState();
    const chats = await client.getChats();
    
    return {
      isReady: client.info !== null,
      state,
      user: {
        id: info?.wid?._serialized,
        name: info?.pushname,
        number: info?.wid?.user
      },
      stats: {
        totalChats: chats.length,
        groups: chats.filter(c => c.isGroup).length,
        privateChats: chats.filter(c => !c.isGroup).length
      },
      version: client.info?.phone?.wa_version,
      battery: info?.battery,
      platform: info?.platform
    };
    
  } catch (error) {
    logger.error("❌ Erro ao obter informações do cliente:", error.message);
    return null;
  }
}

/**
 * Função para restart do cliente
 * @param {Client} client Cliente WhatsApp
 */
async function restartClient(client) {
  try {
    logger.info("🔄 Reiniciando cliente...");
    
    await client.logout();
    await client.destroy();
    
    logger.info("✅ Cliente reiniciado com sucesso");
    
    // Retorna novo cliente
    return await initClient();
    
  } catch (error) {
    logger.error("❌ Erro ao reiniciar cliente:", error.message);
    throw error;
  }
}

/**
 * Envia mensagem de boas-vindas para novo membro
 * @param {Client} client Cliente do WhatsApp
 * @param {Chat} chat Chat do grupo
 * @param {string} userId ID do novo usuário
 * @param {string} userName Nome do usuário
 */
async function sendWelcomeMessage(client, chat, userId, userName) {
  try {
    logger.info(`👋 Enviando boas-vindas para ${userName} (${userId}) no grupo ${chat.name}`);
    
    // Mensagem principal de boas-vindas mais acolhedora
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
    
    // Enviar mensagem de boas-vindas
    await client.sendMessage(chat.id._serialized, welcomeMsg);
    
    // Aguardar um pouco antes de enviar o contato
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Criar vCard da Julia
    const juliaVCard = 
      `BEGIN:VCARD\n` +
      `VERSION:3.0\n` +
      `FN:Júlia (ADM)\n` +
      `N:Júlia;;;;;\n` +
      `ORG:Admin Amigos do Vôlei\n` +
      `TITLE:Julia ADM Amigos do Vôlei\n` +
      `TEL;TYPE=CELL:+5519971548071\n` +
      `NOTE:Admin do grupo de vôlei. Entre em contato para fazer seu cadastro e participar das partidas!\n` +
      `END:VCARD`;

    // Enviar vCard da Julia
    await client.sendMessage(chat.id._serialized, juliaVCard, {
      type: 'vcard',
      displayName: 'Júlia (ADM)',
      vcard: juliaVCard
    });
    
    // Mensagem explicativa sobre o contato
    await new Promise(resolve => setTimeout(resolve, 1000));
    await client.sendMessage(chat.id._serialized, 
      `☝️ **Este é o contato da Júlia!**\n\n` +
      `📱 Clique no cartão acima para adicionar aos seus contatos\n` +
      `💬 Entre em contato com ela para:\n` +
      `• Fazer seu cadastro no grupo\n` +
      `• Entrar na lista de jogadores\n` +
      `• Tirar dúvidas sobre partidas\n` +
      `• Qualquer questão administrativa\n\n` +
      `🏐 Júlia vai te ajudar com tudo que precisar!`
    );
    
    logger.success(`✅ Boas-vindas completas enviadas para ${userName} no grupo ${chat.name}`);
    
  } catch (error) {
    logger.error(`❌ Erro ao enviar boas-vindas para ${userId}:`, error.message);
    
    // Fallback: enviar mensagem simples se o vCard falhar
    try {
      await client.sendMessage(chat.id._serialized, 
        `🏐 Bem-vindo(a) ${userName || 'novo membro'}!\n\n` +
        `Entre em contato com a Júlia (Admin): +55 19 97154-8071\n\n` +
        `Leia as regras na descrição do grupo! 🏐`
      );
      logger.info(`📱 Fallback de boas-vindas enviado para ${userName}`);
    } catch (fallbackError) {
      logger.error(`❌ Erro também no fallback:`, fallbackError.message);
    }
  }
}

module.exports = {
  initClient,
  getClientInfo,
  restartClient,
  sendWelcomeMessage,
  CLIENT_CONFIG
};
