/**
 * Comando para mostrar informações do contexto
 * Exibe dados do grupo, usuário e bot
 * 
 * @author Volleyball Team
 */

const { checkCooldown, setCooldown } = require("../../config/commands");
const { formatPhoneDisplay, getRegionInfo } = require("../../utils/phone");

module.exports = {
  name: "!dados",
  aliases: ["!info", "!grupo"],
  description: "Mostra informações do grupo, usuário e contexto atual",
  usage: "!dados [--completo]",
  category: "básicos",
  requireAdmin: false,

  /**
   * Executa o comando dados
   * @param {Client} client Cliente do WhatsApp
   * @param {Message} msg Mensagem recebida
   * @param {Array} args Argumentos do comando
   * @param {string} senderId ID de quem enviou
   */
  async execute(client, msg, args, senderId) {
    try {
      // Verifica cooldown
      const cooldownLeft = checkCooldown(senderId, "!dados");
      if (cooldownLeft > 0) {
        await msg.reply(`⏰ Aguarde ${cooldownLeft}s antes de usar este comando novamente.`);
        return;
      }

      const chat = await msg.getChat();
      const contact = await msg.getContact();
      const showComplete = args.includes("--completo") || args.includes("-c");

      let response = "📋 *Informações do Contexto*\n\n";

      // ========== INFORMAÇÕES DO USUÁRIO ==========
      response += "👤 *Você:*\n";
      response += `• ID: \`${senderId}\`\n`;
      response += `• Nome: ${contact.pushname || 'Não definido'}\n`;
      response += `• Telefone: ${formatPhoneDisplay(senderId)}\n`;

      if (showComplete) {
        const regionInfo = getRegionInfo(senderId);
        if (regionInfo) {
          response += `• Região: ${regionInfo.city} - ${regionInfo.state}\n`;
        }
        response += `• É contato: ${contact.isMe ? 'Bot' : (contact.isMyContact ? 'Sim' : 'Não')}\n`;
      }

      response += "\n";

      // ========== INFORMAÇÕES DO CHAT ==========
      if (chat.isGroup) {
        response += "👥 *Grupo:*\n";
        response += `• Nome: ${chat.name}\n`;
        response += `• ID: \`${chat.id._serialized}\`\n`;
        response += `• Participantes: ${chat.participants?.length || 'N/A'}\n`;

        if (showComplete) {
          response += `• Criado em: ${chat.createdAt ? new Date(chat.createdAt * 1000).toLocaleDateString('pt-BR') : 'N/A'}\n`;
          response += `• Descrição: ${chat.description || 'Sem descrição'}\n`;
          
          // Informações de admin do grupo
          if (chat.participants) {
            const admins = chat.participants.filter(p => p.isAdmin);
            response += `• Admins do grupo: ${admins.length}\n`;
          }
        }
      } else {
        response += "💬 *Conversa Privada*\n";
        response += `• Chat ID: \`${chat.id._serialized}\`\n`;
      }

      response += "\n";

      // ========== INFORMAÇÕES DO BOT ==========
      if (showComplete) {
        response += "🤖 *Bot:*\n";
        response += `• Status: Online ✅\n`;
        response += `• Hora atual: ${new Date().toLocaleString('pt-BR')}\n`;
        
        try {
          const botInfo = client.info;
          if (botInfo) {
            response += `• Bot ID: \`${botInfo.wid._serialized}\`\n`;
            response += `• Plataforma: ${botInfo.platform || 'N/A'}\n`;
            response += `• Versão WA: ${botInfo.phone?.wa_version || 'N/A'}\n`;
          }
        } catch (e) {
          response += `• Informações técnicas: Não disponíveis\n`;
        }
      }

      // ========== INFORMAÇÕES DA MENSAGEM ==========
      if (showComplete) {
        response += "\n📨 *Mensagem:*\n";
        response += `• Timestamp: ${new Date(msg.timestamp * 1000).toLocaleString('pt-BR')}\n`;
        response += `• Tipo: ${msg.type}\n`;
        response += `• De mim: ${msg.fromMe ? 'Sim' : 'Não'}\n`;
        
        if (chat.isGroup) {
          response += `• Author: \`${msg.author}\`\n`;
          response += `• From: \`${msg.from}\`\n`;
        }
      }

      await msg.reply(response);

      // Registra cooldown
      setCooldown(senderId, "!dados");

    } catch (error) {
      console.error("Erro no comando dados:", error);
      await msg.reply("❌ Erro ao obter informações do contexto.");
    }
  }
};
