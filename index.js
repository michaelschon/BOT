/**
 * Bot de WhatsApp para Grupo de Volleyball
 * Arquivo principal que inicializa o cliente e processa mensagens
 * 
 * @author Volleyball Team
 * @version 2.2 - Timezone e Statements Corrigidos
 */

const path = require("path");
const { initClient, sendWelcomeMessage } = require("./src/core/client");
const { loadCommands } = require("./src/core/loader");
const logger = require("./src/utils/logger");
const { authCheck } = require("./src/config/auth");
const { getCommandConfig } = require("./src/config/commands");
const { auditCommand } = require("./src/utils/audit");

// Configurar timezone para São Paulo
process.env.TZ = 'America/Sao_Paulo';

// Objeto global para armazenar todos os comandos carregados
const commands = {};

/**
 * Obtém data/hora atual formatada para timezone de São Paulo
 * @returns {string} Data formatada DD/MM/YYYY, HH:mm:ss
 */
function getCurrentDateTimeBR() {
  const now = new Date();
  return now.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Verifica se um usuário está silenciado e processa a mensagem se necessário
 * @param {Client} client Cliente do WhatsApp
 * @param {Message} msg Mensagem recebida
 * @returns {boolean} True se a mensagem foi processada (apagada), false caso contrário
 */
async function processSilencedUser(client, msg) {
  try {
    const chat = await msg.getChat();
    
    // Só processa silenciamento em grupos
    if (!chat.isGroup) return false;
    
    const senderId = msg.author || msg.from;
    const groupId = chat.id._serialized;
    
    // Importa db com verificação de inicialização
    let db, statements;
    try {
      const dbModule = require("./src/core/db");
      db = dbModule.db;
      statements = dbModule.statements;
      
      if (!statements || !statements.isSilenced) {
        logger.debug("⚠️ Statements não inicializados ainda, pulando verificação de silenciamento");
        return false;
      }
    } catch (dbError) {
      logger.debug("⚠️ Banco não disponível ainda, pulando verificação de silenciamento");
      return false;
    }
    
    // Verifica se o usuário está silenciado
    const silencedResult = statements.isSilenced.get(groupId, senderId);
    
    if (silencedResult) {
      
      // Log da mensagem antes de apagar (para auditoria)
      const messagePreview = msg.body?.substring(0, 100) || '[mídia/sem texto]';
      
      logger.info(
        `🔇 MENSAGEM SILENCIADA - Grupo: ${chat.name} (${groupId}), ` +
        `Usuário: ${senderId}, Tipo: ${msg.type}, ` +
        `Conteúdo: "${messagePreview}"`
      );
      
      // Log no console conforme solicitado (formato simplificado)
      console.log(
        `🔇 SILENCIADO - ${senderId} em ${groupId}: "${msg.body || '[mídia]'}"`
      );
      
      try {
        // Apagar mensagem para todos
        await msg.delete(true);
        logger.debug(`✅ Mensagem de usuário silenciado apagada: ${senderId}`);
        return true; // Mensagem foi processada (apagada)
        
      } catch (deleteError) {
        logger.error(`❌ Erro ao apagar mensagem de usuário silenciado:`, deleteError.message);
        
        // Se não conseguir apagar, registrar tentativa
        logger.warn(`⚠️ Não foi possível apagar mensagem de ${senderId}: ${deleteError.message}`);
        
        return true; // Considerar como processada mesmo com erro
      }
    }
    
    return false; // Usuário não está silenciado
    
  } catch (error) {
    logger.error("❌ Erro ao verificar usuário silenciado:", error.message);
    return false; // Em caso de erro, não bloquear o processamento normal
  }
}

/**
 * Limpa silenciamentos expirados automaticamente
 * Executa periodicamente para manter a base de dados limpa
 */
function cleanExpiredSilences() {
  try {
    const { db } = require("./src/core/db");
    
    // Remove silenciamentos expirados
    const result = db.prepare(`
      DELETE FROM silenciados 
      WHERE expires_at IS NOT NULL 
      AND expires_at <= datetime('now')
    `).run();
    
    if (result.changes > 0) {
      logger.info(`🧹 Limpeza automática: ${result.changes} silenciamentos expirados removidos em ${getCurrentDateTimeBR()}`);
      console.log(`🧹 Limpeza: ${result.changes} silenciamentos expirados removidos`);
    }
    
  } catch (error) {
    logger.error("❌ Erro na limpeza de silenciamentos expirados:", error.message);
  }
}

/**
 * Função principal que inicializa o bot
 */
(async () => {
  try {
    // Log do timezone configurado
    logger.info(`🌍 Timezone configurado: ${process.env.TZ}`);
    logger.info(`🕐 Data/hora atual: ${getCurrentDateTimeBR()}`);
    
    // Carrega todos os comandos dos diretórios
    logger.info("🔄 Carregando comandos...");
    loadCommands(path.join(__dirname, "src/commands"), commands);
    
    // Sincroniza aliases dos comandos carregados com as configurações
    const { syncCommandAliases } = require("./src/config/commands");
    syncCommandAliases(commands);
    
    // Exibe estatísticas do carregamento
    const { getLoadStats } = require("./src/core/loader");
    const stats = getLoadStats();
    
    if (stats.loadedCommands === 0) {
      logger.warn("⚠️ Nenhum comando carregado! Criando comandos básicos...");
      
      // Se não há comandos, cria comandos básicos em memória
      commands["!ping"] = {
        name: "!ping",
        requireAdmin: false,
        async execute(client, msg) {
          await msg.reply("🏓 Pong!");
        }
      };
      
      commands["!dados"] = {
        name: "!dados",
        requireAdmin: false,
        async execute(client, msg) {
          const chat = await msg.getChat();
          const senderId = msg.author || msg.from;
          let response = `📋 *Informações:*\n\n`;
          
          if (chat.isGroup) {
            response += `👥 Grupo: ${chat.name}\n`;
            response += `🆔 ID do Grupo: \`${chat.id._serialized}\`\n`;
          } else {
            response += `💬 Conversa Privada\n`;
          }
          
          response += `🙋 Seu ID: \`${senderId}\`\n`;
          response += `🕐 Data/hora: ${getCurrentDateTimeBR()}`;
          await msg.reply(response);
        }
      };
      
      logger.info("✅ Comandos básicos criados em memória");
    }
    
    // Inicializa o cliente do WhatsApp
    const client = await initClient();
    
    // Event listener para TODAS as mensagens (incluindo as do próprio bot)
    client.on("message", async (msg) => {
      try {
        // ========== VERIFICAÇÃO DE SILENCIAMENTO ==========
        // Processa usuários silenciados ANTES de qualquer outra coisa
        // Só processa se a mensagem não é do próprio bot
        if (!msg.fromMe) {
          const wasProcessed = await processSilencedUser(client, msg);
          if (wasProcessed) {
            return; // Mensagem foi apagada, não processar mais nada
          }
        }
        
      } catch (silenceError) {
        logger.error("❌ Erro no sistema de silenciamento:", silenceError.message);
        // Continua o processamento normal mesmo com erro no silenciamento
      }
    });
    
    // Event listener para processamento de comandos (apenas mensagens criadas/enviadas)
    client.on("message_create", async (msg) => {
      try {
        // Ignora mensagens do próprio bot para evitar loops
        if (msg.fromMe) return;
        
        // Obtém informações do chat
        const chat = await msg.getChat();
        const body = msg.body.trim();
        
        // ========== SISTEMA DE FIGURINHAS ==========
        // Detecta !figurinha na descrição de mídia
        if (msg.hasMedia && body.toLowerCase().includes("!figurinha")) {
          try {
            // Carrega o comando de figurinha
            const figurinhaCommand = commands["!figurinha"];
            if (figurinhaCommand && figurinhaCommand.processMedia) {
              await figurinhaCommand.processMedia(client, msg);
            }
          } catch (figError) {
            logger.error("❌ Erro no sistema de figurinhas:", figError.message);
          }
          return; // Não processar como comando normal
        }
        
        // ========== PROCESSAMENTO DE COMANDOS ==========
        // Ignora mensagens que não começam com !
        if (!body.startsWith("!")) return;
        
        // Parse do comando e argumentos
        const parts = body.split(" ");
        const commandName = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        // Verifica se o comando existe
        const command = commands[commandName];
        if (!command) {
          logger.warn(`❓ Comando não encontrado: ${commandName}`);
          return;
        }
        
        // Obtém configurações do comando
        const config = getCommandConfig(commandName);
        
        // Verifica se o comando está habilitado
        if (!config.enabled) {
          await msg.reply("⚠️ Este comando está desabilitado.");
          return;
        }
        
        // Verifica se o comando é permitido no grupo atual
        if (chat.isGroup && config.allowedGroups?.length > 0) {
          if (!config.allowedGroups.includes(chat.id._serialized)) {
            await msg.reply("⚠️ Este comando não pode ser usado neste grupo.");
            return;
          }
        }
        
        // Determina o ID do remetente (em grupo = author, em PV = from)
        const senderId = msg.author || msg.from;
        
        // Verifica autorização do usuário
        const isAuthorized = await authCheck(msg, chat, command, config);
        if (!isAuthorized) {
          await msg.reply("❌ Você não tem permissão para usar este comando.");
          
          // Registra tentativa de uso não autorizado
          await auditCommand(senderId, commandName, chat.id._serialized, false, args, "Sem permissão");
          return;
        }
        
        // Log da execução do comando
        logger.info(
          `⚡ Executando comando: ${commandName} | ` +
          `Usuário: ${senderId} | ` +
          `Chat: ${chat.name || 'PV'} (${chat.id._serialized}) | ` +
          `Hora: ${getCurrentDateTimeBR()}`
        );
        
        // Executa o comando
        await command.execute(client, msg, args, senderId);
        
        // Registra execução bem-sucedida
        await auditCommand(senderId, commandName, chat.id._serialized, true, args);
        
      } catch (err) {
        logger.error("❌ Erro ao processar comando:", err.message);
        console.error(err);
        
        try {
          await msg.reply("❌ Ocorreu um erro interno ao processar seu comando.");
          
          // Registra erro na auditoria
          const senderId = msg.author || msg.from;
          const commandName = msg.body.split(" ")[0];
          await auditCommand(senderId, commandName, msg.chat.id._serialized, false, [], err.message);
          
        } catch (replyErr) {
          logger.error("❌ Erro ao enviar mensagem de erro:", replyErr.message);
        }
      }
    });
    
    // Event listener para novos membros (sistema de boas-vindas)
    client.on("group_join", async (notification) => {
      try {
        logger.info(`👥 Novos membros no grupo: ${notification.chatId} em ${getCurrentDateTimeBR()}`);
        
        const chat = await client.getChatById(notification.chatId);
        
        // Verifica se o sistema de boas-vindas está ativo para este grupo
        const welcomeConfig = getCommandConfig("!welcome");
        const isWelcomeEnabled = welcomeConfig.enabled && 
          (welcomeConfig.allowedGroups.length === 0 || 
           welcomeConfig.allowedGroups.includes(notification.chatId));
        
        if (isWelcomeEnabled) {
          // Envia boas-vindas para cada novo membro
          for (const userId of notification.recipientIds) {
            try {
              const contact = await client.getContactById(userId);
              const userName = contact.pushname || userId.replace("@c.us", "");
              
              // Aguarda um pouco entre cada boas-vindas para não spammar
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              await sendWelcomeMessage(client, chat, userId, userName);
              
              logger.info(`👋 Boas-vindas enviadas para ${userName} (${userId}) em ${getCurrentDateTimeBR()}`);
              
            } catch (welcomeError) {
              logger.error(`❌ Erro ao enviar boas-vindas para ${userId}:`, welcomeError.message);
            }
          }
        }
        
      } catch (error) {
        logger.error("❌ Erro ao processar entrada no grupo:", error.message);
      }
    });
    
    // Inicializar agendamentos do modo noturno
    try {
      const noturnoCommand = commands["!noturno"];
      if (noturnoCommand && noturnoCommand.initializeSchedules) {
        noturnoCommand.initializeSchedules(client);
        logger.info("🌙 Agendamentos do modo noturno inicializados");
      }
    } catch (scheduleError) {
      logger.warn("⚠️ Erro ao inicializar agendamentos do modo noturno:", scheduleError.message);
    }
    
    // Configurar limpeza automática de silenciamentos expirados
    // Executa a cada 1 minuto para teste, depois pode mudar para 30 minutos
    const cleanupInterval = setInterval(cleanExpiredSilences, 60 * 1000); // 1 minuto
    logger.info("🧹 Sistema de limpeza automática de silenciamentos configurado (a cada 1 min)");
    
    // Executa limpeza inicial
    setTimeout(() => {
      cleanExpiredSilences();
    }, 5000); // Aguarda 5 segundos para o banco estar pronto
    
    logger.success("🚀 Bot inicializado com sucesso!");
    logger.info("🔇 Sistema de silenciamento ativo e monitorando mensagens");
    logger.info(`🕐 Hora de inicialização: ${getCurrentDateTimeBR()}`);
    
  } catch (err) {
    logger.error("💥 Erro fatal na inicialização:", err.message);
    console.error(err);
    process.exit(1);
  }
})();

// Handlers para sinais do sistema
process.on('SIGINT', () => {
  logger.info(`🛑 Bot sendo finalizado (SIGINT) em ${getCurrentDateTimeBR()}...`);
  
  // Executar limpeza final se necessário
  try {
    cleanExpiredSilences();
    logger.info("🧹 Limpeza final de silenciamentos executada");
  } catch (error) {
    logger.warn("⚠️ Erro na limpeza final:", error.message);
  }
  
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info(`🛑 Bot sendo finalizado (SIGTERM) em ${getCurrentDateTimeBR()}...`);
  
  // Executar limpeza final se necessário
  try {
    cleanExpiredSilences();
    logger.info("🧹 Limpeza final de silenciamentos executada");
  } catch (error) {
    logger.warn("⚠️ Erro na limpeza final:", error.message);
  }
  
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  logger.error("💥 Exceção não capturada:", err.message);
  console.error(err);
  
  // Tentar executar limpeza mesmo com erro
  try {
    cleanExpiredSilences();
  } catch (cleanupError) {
    // Falha silenciosa na limpeza durante exceção
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error("💥 Promise rejeitada não tratada:", reason);
  console.error(promise);
});
