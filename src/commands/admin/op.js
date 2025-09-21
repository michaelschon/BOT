/**
 * Comando para promover admin a admin do WhatsApp
 * Pode promover a si mesmo ou outro usuário (se especificar telefone)
 * 
 * @author Volleyball Team
 */

const { normalizePhone } = require("../../utils/phone");

module.exports = {
  name: "!op",
  aliases: ["!promote", "!promover"],
  description: "Promove admin do bot a admin do WhatsApp",
  usage: "!op [telefone]",
  category: "admin",
  requireAdmin: true,

  async execute(client, msg, args, senderId) {
    try {
      const chat = await msg.getChat();
      
      // Só funciona em grupos
      if (!chat.isGroup) {
        await msg.reply("⚠️ Este comando só funciona em grupos!");
        return;
      }

      // Determinar usuário alvo
      let targetId = senderId; // Por padrão, promove a si mesmo
      let isPromotingSelf = true;
      let rawPhone = "";

      // Se foi informado um telefone, processar
      if (args.length > 0) {
        rawPhone = args.join(" ");
        targetId = normalizePhone(rawPhone);
        isPromotingSelf = false;

        if (!targetId) {
          await msg.reply(
            `⚠️ Número de telefone inválido: "${rawPhone}"\n\n` +
            "📱 Use um formato válido:\n" +
            "• `!op +55 19 9999-9999`\n" +
            "• `!op 19999999999`\n" +
            "• `!op` (sem argumentos para se promover)"
          );
          return;
        }
      }

      // Verificar se o bot tem permissão para promover
      const botParticipant = chat.participants.find(p => p.id._serialized === client.info.wid._serialized);
      if (!botParticipant || !botParticipant.isAdmin) {
        await msg.reply(
          `⚠️ **Bot sem permissões!**\n\n` +
          `🤖 O bot precisa ser admin do grupo no WhatsApp para promover usuários\n\n` +
          `🔧 **Como resolver:**\n` +
          `1. Um admin atual do grupo deve promover o bot\n` +
          `2. Após isso, o bot poderá usar este comando\n\n` +
          `💡 **Dica:** Peça para um admin do WhatsApp adicionar o bot como admin primeiro.`
        );
        return;
      }

      // Verificar se o usuário alvo existe no grupo
      const userParticipant = chat.participants.find(p => p.id._serialized === targetId);
      if (!userParticipant) {
        const pronome = isPromotingSelf ? "você não está" : "usuário não está";
        await msg.reply(
          `⚠️ **Usuário não encontrado!**\n\n` +
          `🔍 O ${pronome} na lista de participantes do grupo\n` +
          `📱 **${isPromotingSelf ? 'Seu ID' : 'ID procurado'}:** \`${targetId}\`\n\n` +
          `💡 Verifique se ${isPromotingSelf ? 'você está' : 'o número está correto e a pessoa está'} no grupo`
        );
        return;
      }

      // Verificar se já é admin do WhatsApp
      if (userParticipant.isAdmin) {
        const pronome = isPromotingSelf ? "Você já é" : "Usuário já é";
        await msg.reply(
          `ℹ️ **${pronome} admin!**\n\n` +
          `👑 **Status atual:** Admin do WhatsApp\n` +
          `📱 **Usuário:** \`${targetId}\`\n` +
          `✅ ${isPromotingSelf ? 'Você já possui' : 'Usuário já possui'} todas as permissões de admin neste grupo\n\n` +
          `🎯 **Comandos disponíveis:**\n` +
          `• Pode usar \`!deop${isPromotingSelf ? '' : ' ' + rawPhone}\` para remover como admin\n` +
          `• Pode gerenciar outros membros do grupo\n` +
          `• Tem acesso a todos os comandos do bot`
        );
        return;
      }

      // Tentar promover o usuário
      try {
        await chat.promoteParticipants([targetId]);
        
        const pronome = isPromotingSelf ? "Você foi promovido" : "Usuário foi promovido";
        
        await msg.reply(
          `👑 **${pronome} com sucesso!**\n\n` +
          `✅ **Novo status:** Admin do WhatsApp\n` +
          `📱 **Usuário:** \`${targetId}\`\n` +
          `👮 **Promovido por:** ${senderId}\n` +
          `⏰ **Data:** ${new Date().toLocaleString('pt-BR')}\n\n` +
          `🎊 **Parabéns!** Agora ${isPromotingSelf ? 'você tem' : 'o usuário tem'} permissões completas:\n` +
          `• Admin do bot ✅\n` +
          `• Admin do WhatsApp ✅\n\n` +
          `💡 **Lembre-se:**\n` +
          `• Use \`!deop${isPromotingSelf ? '' : ' ' + rawPhone}\` para remover como admin do WhatsApp\n` +
          `• As permissões do bot continuam ativas\n` +
          `• Use os poderes com responsabilidade! 🏐`
        );

        console.log(
          `👑 Admin ${senderId} promoveu ${targetId} a admin do WhatsApp ` +
          `no grupo ${chat.id._serialized} (${isPromotingSelf ? 'auto-promoção' : 'promoção de terceiro'})`
        );

      } catch (promoteError) {
        console.error("Erro ao promover usuário:", promoteError);
        
        // Verificar tipo de erro
        const errorMessage = promoteError.message || '';
        let userFriendlyMessage = `❌ **Erro ao promover ${isPromotingSelf ? 'você' : 'usuário'}**\n\n`;
        
        if (errorMessage.includes('Evaluation failed') || errorMessage.includes('b')) {
          userFriendlyMessage += `⚠️ Erro da API do WhatsApp Web\n\n` +
            `🔧 **Possíveis soluções:**\n` +
            `• O WhatsApp Web pode estar instável\n` +
            `• Recarregue a página do WhatsApp Web\n` +
            `• Reinicie o bot com \`!restart\`\n` +
            `• ${isPromotingSelf ? 'Peça para outro admin te promover' : 'Promova'} manualmente pelo WhatsApp\n\n` +
            `💡 **Nota:** As permissões do bot não são afetadas.`;
        } else {
          userFriendlyMessage += `⚠️ Não foi possível promover ${isPromotingSelf ? 'você' : 'o usuário'} a admin do WhatsApp\n\n` +
            `🔧 **Possíveis causas:**\n` +
            `• Bot perdeu permissões de admin\n` +
            `• Erro temporário do WhatsApp\n` +
            `• Limite de admins do grupo atingido\n\n` +
            `💡 **Solução:** Tente novamente em alguns segundos ou ${isPromotingSelf ? 'peça para um admin do WhatsApp te promover' : 'promova'} manualmente.`;
        }
        
        await msg.reply(userFriendlyMessage);
      }

    } catch (error) {
      console.error("Erro no comando op:", error);
      await msg.reply("❌ Erro interno ao tentar promover usuário.");
    }
  }
};
