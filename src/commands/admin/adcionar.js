/**
 * Comando para adicionar usuário ao grupo
 * Adiciona usuário diretamente sem convite
 * 
 * @author Volleyball Team
 */

const { normalizePhone } = require("../../utils/phone");

module.exports = {
  name: "!adicionar",
  aliases: ["!adcionar"],
  description: "Adiciona usuário diretamente ao grupo",
  usage: "!adicionar <telefone>",
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

      if (args.length < 1) {
        await msg.reply(
          "⚠️ Uso correto: `!adicionar <telefone>`\n\n" +
          "📱 Formatos aceitos:\n" +
          "• `!adicionar +55 19 9999-9999`\n" +
          "• `!adicionar 19999999999`\n" +
          "• `!adcionar 19 99999999`\n\n" +
          "👥 O usuário será adicionado diretamente ao grupo"
        );
        return;
      }

      // Verificar se o bot tem permissão
      const botParticipant = chat.participants.find(p => p.id._serialized === client.info.wid._serialized);
      if (!botParticipant || !botParticipant.isAdmin) {
        await msg.reply(
          `⚠️ **Bot sem permissões!**\n\n` +
          `🤖 O bot precisa ser admin do grupo para adicionar usuários\n\n` +
          `💡 **Solução:** Peça para um admin do WhatsApp promover o bot primeiro.`
        );
        return;
      }

      // Normalizar telefone
      const rawPhone = args.join(" ");
      const targetId = normalizePhone(rawPhone);
      
      if (!targetId) {
        await msg.reply(
          `⚠️ Número de telefone inválido: "${rawPhone}"\n\n` +
          "📱 Use um formato válido:\n" +
          "• +55 19 9999-9999\n" +
          "• 19999999999"
        );
        return;
      }

      // Verificar se já não está no grupo
      const isAlreadyMember = chat.participants.find(p => p.id._serialized === targetId);
      if (isAlreadyMember) {
        await msg.reply(
          `ℹ️ **Usuário já está no grupo!**\n\n` +
          `📱 **Número:** \`${targetId}\`\n` +
          `👥 **Status:** Já é membro do grupo\n\n` +
          `💡 O usuário já está participando do grupo.`
        );
        return;
      }

      // Mensagem de processamento
      const statusMsg = await msg.reply(
        `🔄 **Adicionando usuário ao grupo...**\n\n` +
        `📱 **Usuário:** \`${targetId}\`\n` +
        `👮 **Adicionado por:** ${senderId}\n\n` +
        `⏳ Processando...`
      );

      try {
        // Adicionar usuário ao grupo
        await chat.addParticipants([targetId]);

        // Resposta de sucesso
        await statusMsg.edit(
          `✅ **Usuário adicionado com sucesso!**\n\n` +
          `📱 **Usuário:** \`${targetId}\`\n` +
          `👥 **Grupo:** ${chat.name}\n` +
          `👮 **Adicionado por:** ${senderId}\n` +
          `⏰ **Data:** ${new Date().toLocaleString('pt-BR')}\n\n` +
          `🎉 **O usuário foi adicionado diretamente ao grupo!**\n` +
          `💡 Ele receberá uma notificação automática do WhatsApp.`
        );

        // Log da operação
        console.log(
          `👥 Usuário adicionado: ${senderId} adicionou ${targetId} ` +
          `ao grupo ${chat.id._serialized}`
        );

      } catch (addError) {
        console.error("Erro ao adicionar usuário:", addError);
        
        let errorMsg = `❌ **Erro ao adicionar usuário**\n\n`;
        
        const errorMessage = addError.message || '';
        if (errorMessage.includes('not found') || errorMessage.includes('invalid number')) {
          errorMsg += `⚠️ Número de telefone não encontrado no WhatsApp\n\n` +
            `📱 **Número:** \`${targetId}\`\n\n` +
            `🔧 **Possíveis causas:**\n` +
            `• Número não tem WhatsApp ativo\n` +
            `• Número foi digitado incorretamente\n` +
            `• Usuário não existe no WhatsApp\n\n` +
            `💡 **Alternativa:** Use \`!invite ${rawPhone}\` para enviar um convite.`;
        } else if (errorMessage.includes('privacy') || errorMessage.includes('settings')) {
          errorMsg += `⚠️ Usuário não pode ser adicionado devido às configurações de privacidade\n\n` +
            `🔒 **Motivo:** O usuário configurou o WhatsApp para não ser adicionado a grupos\n\n` +
            `💡 **Solução:** Use \`!invite ${rawPhone}\` para enviar um convite que ele pode aceitar.`;
        } else if (errorMessage.includes('already')) {
          errorMsg += `ℹ️ Usuário já estava no grupo (erro de sincronização)\n\n` +
            `👥 O usuário provavelmente já é membro, mas pode não aparecer na lista por questões de sincronização.`;
        } else {
          errorMsg += `⚠️ Não foi possível adicionar o usuário\n\n` +
            `🔧 **Erro:** ${errorMessage}\n\n` +
            `💡 **Soluções:**\n` +
            `• Tente novamente em alguns segundos\n` +
            `• Use \`!invite ${rawPhone}\` como alternativa\n` +
            `• Verifique se o bot tem permissões adequadas`;
        }
        
        await statusMsg.edit(errorMsg);
      }

    } catch (error) {
      console.error("Erro no comando adicionar:", error);
      await msg.reply("❌ Erro interno no sistema de adição de usuários.");
    }
  }
};
