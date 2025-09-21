/**
 * Comando para notificar todos sobre partida de volleyball
 * Envia convocação marcando todos os membros do grupo
 * 
 * @author Volleyball Team
 */

const { checkCooldown, setCooldown } = require("../../config/commands");

module.exports = {
  name: "!notificar",
  aliases: ["!convocar", "!chamar", "!partida"],
  description: "Convoca todos para partida de volleyball",
  usage: "!notificar [mensagem personalizada]",
  category: "comunicação",
  requireAdmin: true,

  /**
   * Executa o comando notificar
   * @param {Client} client Cliente do WhatsApp
   * @param {Message} msg Mensagem recebida
   * @param {Array} args Argumentos do comando
   * @param {string} senderId ID de quem enviou
   */
  async execute(client, msg, args, senderId) {
    try {
      const chat = await msg.getChat();
      
      // Só funciona em grupos
      if (!chat.isGroup) {
        await msg.reply("⚠️ Este comando só funciona em grupos!");
        return;
      }

      // Verifica cooldown para evitar spam
      const cooldownLeft = checkCooldown(senderId, "!notificar");
      if (cooldownLeft > 0) {
        await msg.reply(`⏰ Aguarde ${cooldownLeft}s antes de enviar outra convocação.`);
        return;
      }

      try {
        // Obter informações do remetente
        const contact = await msg.getContact();
        const nomeRemetente = contact.pushname || senderId.replace("@c.us", "");

        // Obter todos os participantes do grupo
        const participantes = chat.participants || [];
        
        if (participantes.length === 0) {
          await msg.reply("⚠️ Não foi possível obter a lista de participantes do grupo.");
          return;
        }

        // Criar lista de menções (todos os participantes)
        const mentions = participantes.map(participant => participant.id._serialized);

        // Mensagem personalizada opcional
        const mensagemPersonalizada = args.length > 0 ? args.join(" ") : null;

        // Obter data/hora atual
        const agora = new Date();
        const dataHora = agora.toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          weekday: 'long',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        // Montar mensagem principal
        let convocacao = `🏐 **CONVOCAÇÃO PARA VOLLEYBALL!** 🏐\n\n`;
        
        if (mensagemPersonalizada) {
          convocacao += `💬 **Mensagem:** ${mensagemPersonalizada}\n\n`;
        }
        
        convocacao += `🎯 **Vamos lá, pessoal?**\n\n`;
        convocacao += `📋 **Como confirmar presença:**\n\n`;
        convocacao += `✅ Digite **euvou** para colocar seu nome na lista\n`;
        convocacao += `❌ Digite **naovou** para retirar seu nome da lista\n`;
        convocacao += `⏳ Digite **pendente** para dizer que talvez vá jogar\n`;
        convocacao += `🕐 Digite **horas xx:xx** para dizer a hora que pretende ir\n\n`;
        convocacao += `🏐 **Vamos fazer um jogão! Confirme sua presença!** 🏐\n\n`;

        // Enviar mensagem mencionando todos
        await client.sendMessage(chat.id._serialized, convocacao, {
          mentions: mentions
        });

        // Confirmar envio para quem enviou o comando (resposta separada)
        //await msg.reply(
        //  `✅ **Convocação enviada com sucesso!**\n\n` +
        //  `🏐 **Grupo:** ${chat.name}\n` +
        //  `👥 **Notificados:** ${mentions.length} pessoas\n` +
        //  `📱 Todos os membros receberam a convocação\n\n` +
        //  `💡 **Dica:** Os membros podem responder com:\n` +
        //  `• "euvou" para confirmar\n` +
        //  `• "naovou" para declinar\n` +
        //  `• "pendente" para talvez\n` +
        //  `• "horas XX:XX" para informar horário`
        //);

        // Registrar cooldown
        setCooldown(senderId, "!notificar");

        // Log da operação
        console.log(
          `🏐 Convocação enviada: ${senderId} (${nomeRemetente}) convocou todos ` +
          `no grupo ${chat.name} para ${mentions.length} pessoas` +
          `${mensagemPersonalizada ? ` - Mensagem: "${mensagemPersonalizada}"` : ''}`
        );

      } catch (sendError) {
        console.error("Erro ao enviar convocação:", sendError);
        
        let errorMessage = "❌ **Erro ao enviar convocação**\n\n";
        
        if (sendError.message.includes('mentions') || sendError.message.includes('mention')) {
          errorMessage += "⚠️ Problema com o sistema de menções\n\n" +
            "🔧 **Possíveis causas:**\n" +
            "• WhatsApp está instável\n" +
            "• Muitos participantes no grupo\n" +
            "• Erro temporário da API\n\n" +
            "💡 **Solução:** Tente novamente em alguns segundos.";
        } else {
          errorMessage += `⚠️ ${sendError.message}\n\n` +
            "💡 Tente novamente ou contate um administrador.";
        }
        
        await msg.reply(errorMessage);
      }

    } catch (error) {
      console.error("Erro no comando notificar:", error);
      await msg.reply("❌ Erro interno no sistema de convocação.");
    }
  }
};
