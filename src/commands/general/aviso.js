/**
 * Comando para enviar aviso marcando todos do grupo
 * Permite que qualquer membro envie notificação para todos
 * 
 * @author Volleyball Team
 */

const { checkCooldown, setCooldown } = require("../../config/commands");

module.exports = {
  name: "!aviso",
  aliases: ["!alerta", "!todos", "!everyone"],
  description: "Envia aviso marcando todos do grupo",
  usage: "!aviso <mensagem>",
  category: "comunicação",
  requireAdmin: false,

  async execute(client, msg, args, senderId) {
    try {
      const chat = await msg.getChat();
      
      // Só funciona em grupos
      if (!chat.isGroup) {
        await msg.reply("⚠️ Este comando só funciona em grupos!");
        return;
      }

      // Verificar cooldown para evitar spam
      const cooldownLeft = checkCooldown(senderId, "!aviso");
      if (cooldownLeft > 0) {
        await msg.reply(`⏰ Aguarde ${cooldownLeft}s antes de enviar outro aviso.`);
        return;
      }

      if (args.length < 1) {
        await msg.reply(
          "⚠️ Uso correto: `!aviso <mensagem>`\n\n" +
          "📢 **Exemplos:**\n" +
          "• `!aviso Jogo hoje às 19h no ginásio!`\n" +
          "• `!alerta Treino cancelado por causa da chuva`\n" +
          "• `!todos Quem pode jogar amanhã? Respondam!`\n\n" +
          "📱 **Importante:** Todos do grupo receberão notificação"
        );
        return;
      }

      const mensagem = args.join(" ").trim();

      // Validar tamanho da mensagem
      if (mensagem.length > 500) {
        await msg.reply(
          "⚠️ Mensagem muito longa!\n\n" +
          `📊 **Tamanho atual:** ${mensagem.length} caracteres\n` +
          `📏 **Limite:** 500 caracteres\n\n` +
          "💡 Reduza o texto e tente novamente."
        );
        return;
      }

      // Verificar conteúdo inadequado básico
      const conteudoProibido = /spam|hack|vírus|golpe|scam/i;
      if (conteudoProibido.test(mensagem)) {
        await msg.reply(
          "⚠️ Conteúdo não permitido detectado!\n\n" +
          "📋 **Regras para avisos:**\n" +
          "• Apenas conteúdo relacionado ao grupo\n" +
          "• Não spam ou conteúdo suspeito\n" +
          "• Use com responsabilidade\n\n" +
          "💡 Reformule sua mensagem e tente novamente."
        );
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

        // Montar mensagem com header informativo
        let avisoCompleto = `📢 **AVISO PARA TODOS**\n\n`;
        avisoCompleto += `💬 **Mensagem:** ${mensagem}\n\n`;
        avisoCompleto += `👤 **Enviado por:** ${nomeRemetente}\n`;
        avisoCompleto += `⏰ **Data:** ${new Date().toLocaleString('pt-BR')}\n`;
        avisoCompleto += `👥 **Grupo:** ${chat.name}\n\n`;
        avisoCompleto += `🔔 *Todos os membros do grupo foram notificados*`;

        // Enviar mensagem mencionando todos
        await client.sendMessage(chat.id._serialized, avisoCompleto, {
          mentions: mentions
        });

        // Confirmar envio para quem enviou o comando
        await msg.reply(
          `✅ **Aviso enviado com sucesso!**\n\n` +
          `📢 **Mensagem:** "${mensagem}"\n` +
          `👥 **Notificados:** ${mentions.length} pessoas\n` +
          `📱 Todos os membros receberam notificação`
        );

        // Registrar cooldown
        setCooldown(senderId, "!aviso");

        // Log da operação
        console.log(
          `📢 Aviso enviado: ${senderId} (${nomeRemetente}) enviou aviso ` +
          `"${mensagem.substring(0, 50)}..." no grupo ${chat.name} ` +
          `para ${mentions.length} pessoas`
        );

      } catch (sendError) {
        console.error("Erro ao enviar aviso:", sendError);
        
        let errorMessage = "❌ **Erro ao enviar aviso**\n\n";
        
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
      console.error("Erro no comando aviso:", error);
      await msg.reply("❌ Erro interno no sistema de avisos.");
    }
  }
};
