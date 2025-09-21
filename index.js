/**
 * Bot de WhatsApp para Grupo de Volleyball
 * Arquivo principal que inicializa o cliente e processa mensagens
 * 
 * @author Volleyball Team
 * @version 2.0
 */

const path = require("path");
const { initClient, sendWelcomeMessage } = require("./src/core/client");
const { loadCommands } = require("./src/core/loader");
const logger = require("./src/utils/logger");
const { authCheck } = require("./src/config/auth");
const { getCommandConfig } = require("./src/config/commands");
const { auditCommand } = require("./src/utils/audit");

// Objeto global para armazenar todos os comandos carregados
const commands = {};

/**
 * Função principal que inicializa o bot
 */
(async () => {
  try {
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
          let response = `📋 *Informações:*\n\n`;
          
          if (chat.isGroup) {
            response += `👥 Grupo: ${chat.name}\n`;
            response += `🆔 ID do Grupo: \`${chat.id._serialized}\`\n`;
          } else {
            response += `💬 Conversa Privada\n`;
          }
          
          response += `🙋 Seu ID: \`${msg.author || msg.from}\``;
          await msg.reply(response);
        }
      };
      
      logger.info("✅ Comandos básicos criados em memória");
    }
    
    // Inicializa o cliente do WhatsApp
    const client = await initClient();
    
    // Event listener para mensagens recebidas
    client.on("message_create", async (msg) => {
      try {
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
          await auditCommand(senderId, commandName, chat.id._serialized, false);
          return;
        }
        
        // Log da execução do comando
        logger.info(
          `⚡ Executando comando: ${commandName} | ` +
          `Usuário: ${senderId} | ` +
          `Chat: ${chat.name || 'PV'} (${chat.id._serialized})`
        );
        
        // Executa o comando
        await command.execute(client, msg, args, senderId);
        
        // Registra execução bem-sucedida
        await auditCommand(senderId, commandName, chat.id._serialized, true);
        
      } catch (err) {
        logger.error("❌ Erro ao processar mensagem:", err.message);
        console.error(err);
        
        try {
          await msg.reply("❌ Ocorreu um erro interno ao processar seu comando.");
        } catch (replyErr) {
          logger.error("❌ Erro ao enviar mensagem de erro:", replyErr.message);
        }
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
    
    logger.info("🚀 Bot inicializado com sucesso!");
    
  } catch (err) {
    logger.error("💥 Erro fatal na inicialização:", err.message);
    console.error(err);
    process.exit(1);
  }
})();

// Handlers para sinais do sistema
process.on('SIGINT', () => {
  logger.info("🛑 Bot sendo finalizado (SIGINT)...");
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info("🛑 Bot sendo finalizado (SIGTERM)...");
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  logger.error("💥 Exceção não capturada:", err.message);
  console.error(err);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error("💥 Promise rejeitada não tratada:", reason);
  console.error(promise);
});
