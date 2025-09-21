/**
 * Comando para enviar convite do grupo para usuário
 * Gera link de convite e envia para o número especificado
 * 
 * @author Volleyball Team
 */

const { normalizePhone } = require("../../utils/phone");

module.exports = {
  name: "!invite",
  aliases: ["!convidar", "!convite"],
  description: "Envia convite do grupo para usuário",
  usage: "!invite <telefone>",
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
          "⚠️ Uso correto: `!invite <telefone>`\n\n" +
          "📱 Formatos aceitos:\n" +
          "• `!invite +55 19 9999-9999`\n" +
          "• `!invite 19999999999`\n" +
          "• `!convidar 19 99999999`\n\n" +
          "👥 Um convite será enviado para o usuário"
        );
        return;
      }

      // Verificar se bot é admin do grupo
      const botParticipant = chat.participants.find(p => p.id._serialized === client.info.wid._serialized);
      if (!botParticipant || !botParticipant.isAdmin) {
        await msg.reply(
          "⚠️ **Bot sem permissões!**\n\n" +
          "🤖 O bot precisa ser admin do grupo para gerar convites\n\n" +
          "💡 **Solução:** Promova o bot a admin do WhatsApp primeiro"
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
          `👥 **Status:** Já é membro do grupo "${chat.name}"\n\n` +
          `💡 Não é necessário enviar convite.`
        );
        return;
      }

      // Mensagem de processamento
      const statusMsg = await msg.reply(
        `📨 **Gerando convite...**\n\n` +
        `📱 **Para:** \`${targetId}\`\n` +
        `👮 **Enviado por:** ${senderId}\n\n` +
        `⏳ Processando...`
      );

      try {
        // Gerar código de convite
        const inviteCode = await chat.getInviteCode();
        const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;

        // Preparar mensagem de convite
        const inviteMessage = 
          `🏐 **Convite para Grupo de Volleyball!**\n\n` +
          `👋 Olá! Você foi convidado(a) para participar do nosso grupo:\n\n` +
          `👥 **Grupo:** ${chat.name}\n` +
          `👤 **Convidado por:** Admin do grupo\n` +
          `⏰ **Data:** ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n` +
          `🔗 **Link do convite:**\n${inviteLink}\n\n` +
          `📱 **Como entrar:**\n` +
          `1. Clique no link acima\n` +
          `2. Ou abra o WhatsApp e cole o link\n` +
          `3. Toque em "Participar do grupo"\n\n` +
          `🏐 Estamos ansiosos para ter você no time!\n\n` +
          `💡 **Dica:** Leia as regras do grupo quando entrar.`;

        // Enviar convite
        await client.sendMessage(targetId, inviteMessage);

        // Atualizar mensagem de status
        await statusMsg.edit(
          `✅ **Convite enviado com sucesso!**\n\n` +
          `📱 **Para:** \`${targetId}\`\n` +
          `👥 **Grupo:** ${chat.name}\n` +
          `👮 **Enviado por:** ${senderId}\n` +
          `⏰ **Data:** ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n` +
          `📨 **O usuário recebeu:**\n` +
          `• Link de convite do grupo\n` +
          `• Instruções de como entrar\n` +
          `• Informações sobre o grupo\n\n` +
          `🎯 **Próximos passos:** Aguarde o usuário aceitar o convite!`
        );

        // Log da operação
        console.log(
          `📨 Convite enviado: ${senderId} enviou convite para ${targetId} ` +
          `do grupo ${chat.name} (${chat.id._serialized})`
        );

      } catch (inviteError) {
        console.error("Erro ao enviar convite:", inviteError);
        
        let errorMsg = `❌ **Erro ao enviar convite**\n\n`;
        
        const errorMessage = inviteError.message || '';
        if (errorMessage.includes('not found') || errorMessage.includes('invalid number')) {
          errorMsg += `⚠️ Número de telefone não encontrado no WhatsApp\n\n` +
            `📱 **Número:** \`${targetId}\`\n\n` +
            `🔧 **Possíveis causas:**\n` +
            `• Número não tem WhatsApp ativo\n` +
            `• Número foi digitado incorretamente\n` +
            `• Usuário não existe no WhatsApp\n\n` +
            `💡 **Solução:** Verifique o número e tente novamente.`;
        } else if (errorMessage.includes('privacy') || errorMessage.includes('blocked')) {
          errorMsg += `🔒 **Usuário não pode receber mensagens**\n\n` +
            `⚠️ **Motivo:** Configurações de privacidade ou bot bloqueado\n\n` +
            `💡 **Alternativas:**\n` +
            `• Peça para alguém que o usuário conhece enviar o convite\n` +
            `• Use \`!adicionar ${rawPhone}\` para adicionar diretamente\n` +
            `• Compartilhe o link manualmente: https://chat.whatsapp.com/${await chat.getInviteCode()}`;
        } else {
          errorMsg += `⚠️ Não foi possível enviar o convite\n\n` +
            `🔧 **Erro:** ${errorMessage}\n\n` +
            `💡 **Soluções:**\n` +
            `• Tente novamente em alguns segundos\n` +
            `• Verifique se o bot tem permissões adequadas\n` +
            `• Use \`!adicionar ${rawPhone}\` como alternativa`;
        }
        
        await statusMsg.edit(errorMsg);
      }

    } catch (error) {
      console.error("Erro no comando invite:", error);
      await msg.reply("❌ Erro interno no sistema de convites.");
    }
  }
};
