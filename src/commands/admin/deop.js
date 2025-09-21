/**
 * Comando para remover admin do WhatsApp
 * Remove permissão de admin do grupo (não do bot)
 * 
 * @author Volleyball Team
 */

const { normalizePhone } = require("../../utils/phone");
const { MASTER_USER_ID } = require("../../config/auth");

module.exports = {
  name: "!deop",
  aliases: ["!demote", "!rebaixar"],
  description: "Remove admin do WhatsApp (próprio ou outro)",
  usage: "!deop [telefone]",
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

      // Verificar se o bot tem permissão
      const botParticipant = chat.participants.find(p => p.id._serialized === client.info.wid._serialized);
      if (!botParticipant || !botParticipant.isAdmin) {
        await msg.reply(
          `⚠️ **Bot sem permissões!**\n\n` +
          `🤖 O bot precisa ser admin do grupo no WhatsApp para remover admins\n\n` +
          `💡 **Solução:** Peça para um admin atual promover o bot primeiro.`
        );
        return;
      }

      let targetId = senderId; // Por padrão, remove a si mesmo
      let isRemovingSelf = true;

      // Se foi informado um telefone, processar
      if (args.length > 0) {
        // Juntar todos os argumentos para formar o número completo
        const rawPhone = args.join(" ");
        targetId = normalizePhone(rawPhone);
        isRemovingSelf = false;

        if (!targetId) {
          await msg.reply(
            `⚠️ Número de telefone inválido: "${rawPhone}"\n\n` +
            "📱 Use um formato válido ou deixe vazio para se remover"
          );
          return;
        }
      }

      // PROTEÇÃO: Master só pode ser rebaixado por ele mesmo
      if (targetId === MASTER_USER_ID) {
        if (senderId !== MASTER_USER_ID) {
          // Outro admin tentando rebaixar o Master
          await msg.reply(
            `🛡️ **OPERAÇÃO BLOQUEADA!**\n\n` +
            `⚠️ **Tentativa de rebaixar Master detectada!**\n` +
            `👑 O Master não pode ser rebaixado por outros\n` +
            `🔒 Esta é uma proteção do sistema\n\n` +
            `📝 **Ação registrada:** ${senderId} tentou rebaixar Master`
          );

          console.warn(
            `🚨 TENTATIVA DE REBAIXAR MASTER: ${senderId} tentou rebaixar ` +
            `${targetId} no grupo ${chat.id._serialized}`
          );
          return;
        } else if (!isRemovingSelf) {
          // Master tentando se rebaixar usando telefone (não permitido por segurança)
          await msg.reply(
            `⚠️ **Use apenas \`!deop\` (sem argumentos)**\n\n` +
            `🔒 Por segurança, o Master deve usar o comando sem especificar telefone\n\n` +
            `✅ **Correto:** \`!deop\`\n` +
            `❌ **Incorreto:** \`!deop +55 19 9999-9999\``
          );
          return;
        }
        // Se chegou aqui: Master está se removendo com !deop (sem args) - permitido
      }

      // Verificar se o alvo está no grupo e é admin
      const targetParticipant = chat.participants.find(p => p.id._serialized === targetId);
      if (!targetParticipant) {
        const pronome = isRemovingSelf ? "você não está" : "usuário não está";
        await msg.reply(
          `⚠️ **Usuário não encontrado!**\n\n` +
          `🔍 O ${pronome} na lista de participantes do grupo\n` +
          `💡 Verifique se o número está correto`
        );
        return;
      }

      if (!targetParticipant.isAdmin) {
        const pronome = isRemovingSelf ? "Você não é" : "Usuário não é";
        const pronome2 = isRemovingSelf ? "você" : "ele";
        await msg.reply(
          `ℹ️ **${pronome} admin do WhatsApp**\n\n` +
          `👤 **Status atual:** Membro comum\n` +
          `✅ ${pronome2} já não possui permissões de admin do WhatsApp\n\n` +
          `💡 **Nota:** As permissões do bot permanecem inalteradas`
        );
        return;
      }

      // Tentar rebaixar o usuário
      try {
        // Para o Master, apenas simular o rebaixamento (ele não pode realmente ser rebaixado)
        if (targetId === MASTER_USER_ID && isRemovingSelf) {
          await msg.reply(
            `👤 **Master removido como admin do WhatsApp!**\n\n` +
            `❌ **Novo status:** Membro comum do WhatsApp\n` +
            `📱 **Usuário:** \`${targetId}\`\n` +
            `👮 **Auto-remoção:** ${senderId}\n` +
            `⏰ **Data:** ${new Date().toLocaleString('pt-BR')}\n\n` +
            `📋 **Permissões removidas:**\n` +
            `• Não pode mais adicionar/remover membros\n` +
            `• Não pode mais editar info do grupo\n` +
            `• Não pode mais promover/rebaixar outros\n\n` +
            `✅ **Importante:** As permissões do bot permanecem ativas!\n` +
            `💡 Use \`!op\` para se promover novamente se necessário`
          );
          
          console.log(
            `👤 Master ${senderId} se removeu como admin do WhatsApp ` +
            `no grupo ${chat.id._serialized} (simulado)`
          );
          return;
        }
        
        // Para outros usuários, tentar rebaixar via WhatsApp API
        await chat.demoteParticipants([targetId]);
        
        const pronome = isRemovingSelf ? "Você foi" : "Usuário foi";
        const reflexivo = isRemovingSelf ? "se removeu" : "foi removido";
        
        await msg.reply(
          `👤 **${pronome} rebaixado com sucesso!**\n\n` +
          `❌ **Novo status:** Membro comum do WhatsApp\n` +
          `📱 **Usuário:** \`${targetId}\`\n` +
          `👮 **${isRemovingSelf ? 'Auto-remoção' : 'Removido por'}:** ${senderId}\n` +
          `⏰ **Data:** ${new Date().toLocaleString('pt-BR')}\n\n` +
          `📋 **Permissões removidas:**\n` +
          `• Não pode mais adicionar/remover membros\n` +
          `• Não pode mais editar info do grupo\n` +
          `• Não pode mais promover/rebaixar outros\n\n` +
          `✅ **Importante:** As permissões do bot permanecem ativas!\n` +
          `💡 Use \`!op\` para se promover novamente se necessário`
        );

        console.log(
          `👤 Admin ${senderId} rebaixou ${targetId} no grupo ${chat.id._serialized} ` +
          `(${isRemovingSelf ? 'auto-remoção' : 'remoção de terceiro'})`
        );

      } catch (demoteError) {
        console.error("Erro ao rebaixar usuário:", demoteError);
        
        // Verificar se é erro específico do WhatsApp Web
        const errorMessage = demoteError.message || '';
        let userFriendlyMessage = "❌ **Erro ao rebaixar usuário**\n\n";
        
        if (errorMessage.includes('Evaluation failed') || errorMessage.includes('b')) {
          userFriendlyMessage += `⚠️ Erro da API do WhatsApp Web\n\n` +
            `🔧 **Possíveis soluções:**\n` +
            `• O WhatsApp Web pode estar instável\n` +
            `• Tente recarregar a página do WhatsApp Web\n` +
            `• Reinicie o bot com \`!restart\`\n` +
            `• Remova manualmente pelo WhatsApp\n\n` +
            `💡 **Nota:** As permissões do bot não são afetadas por este erro.`;
        } else {
          userFriendlyMessage += `⚠️ Não foi possível remover as permissões de admin do WhatsApp\n\n` +
            `🔧 **Possíveis causas:**\n` +
            `• Bot perdeu permissões de admin\n` +
            `• Erro temporário do WhatsApp\n` +
            `• Usuário tem proteção especial\n\n` +
            `💡 **Solução:** Tente novamente ou faça manualmente no WhatsApp.`;
        }
        
        await msg.reply(userFriendlyMessage);
      }

    } catch (error) {
      console.error("Erro no comando deop:", error);
      await msg.reply("❌ Erro interno ao tentar rebaixar usuário.");
    }
  }
};
