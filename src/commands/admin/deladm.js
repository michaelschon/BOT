/**
 * Comando para remover admin do grupo
 * Remove permissões de admin do usuário
 * 
 * @author Volleyball Team
 */

const { statements } = require("../../core/db");
const { normalizePhone } = require("../../utils/phone");
const { removeGroupAdmin, MASTER_USER_ID } = require("../../config/auth");

module.exports = {
  name: "!deladm",
  aliases: ["!removeadm", "!remadm"],
  description: "Remove admin do grupo",
  usage: "!deladm <telefone>",
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
          "⚠️ Uso correto: `!deladm <telefone>`\n\n" +
          "📱 Formatos aceitos:\n" +
          "• +55 19 9999-9999\n" +
          "• 551999999999\n" +
          "• 19 99999999\n\n" +
          "Exemplo: `!deladm 19999999999`"
        );
        return;
      }

      // Juntar todos os argumentos para formar o número completo
      const rawPhone = args.join(" ");
      const groupId = chat.id._serialized;

      // Normalizar telefone
      const targetId = normalizePhone(rawPhone);
      if (!targetId) {
        await msg.reply(
          `⚠️ Número de telefone inválido: "${rawPhone}"\n\n` +
          "📱 Use um formato válido como: +55 19 9999-9999"
        );
        return;
      }

      // PROTEÇÃO: Não pode remover o Master
      if (targetId === MASTER_USER_ID) {
        await msg.reply(
          `🛡️ **OPERAÇÃO BLOQUEADA!**\n\n` +
          `⚠️ **Tentativa de remover Master detectada!**\n` +
          `👑 O Master não pode ser removido como admin\n` +
          `🔒 Esta é uma proteção do sistema\n\n` +
          `📝 **Ação registrada:** ${senderId} tentou remover Master`
        );

        // Log de segurança
        console.warn(
          `🚨 TENTATIVA DE REMOÇÃO DO MASTER: ${senderId} tentou remover ` +
          `${targetId} como admin no grupo ${groupId}`
        );
        return;
      }

      // Verificar se é admin
      const ehAdmin = statements.isGroupAdmin.get(groupId, targetId);
      if (!ehAdmin) {
        await msg.reply(
          `ℹ️ **Usuário não é admin**\n\n` +
          `📱 **Número:** \`${targetId}\`\n` +
          `👤 **Status:** Não possui permissões de admin neste grupo\n\n` +
          `💡 Use \`!listadm\` para ver quem são os admins atuais.`
        );
        return;
      }

      // Remover admin
      const sucesso = removeGroupAdmin(groupId, targetId);
      
      if (sucesso) {
        await msg.reply(
          `👤 **Admin removido com sucesso!**\n\n` +
          `📱 **Número:** \`${targetId}\`\n` +
          `❌ **Status:** Não é mais admin deste grupo\n` +
          `👮 **Removido por:** ${senderId}\n` +
          `⏰ **Data:** ${new Date().toLocaleString('pt-BR')}\n\n` +
          `📋 **Permissões removidas:**\n` +
          `• Comandos de admin bloqueados\n` +
          `• Não pode mais gerenciar apelidos\n` +
          `• Não pode mais adicionar/remover admins\n` +
          `• Acesso apenas a comandos públicos\n\n` +
          `✅ **Operação concluída com sucesso!**`
        );

        console.log(
          `👤 Admin ${senderId} removeu ${targetId} como admin ` +
          `no grupo ${groupId}`
        );
      } else {
        await msg.reply("❌ Erro ao remover admin. Tente novamente.");
      }

    } catch (error) {
      console.error("Erro no deladm:", error);
      await msg.reply("❌ Erro interno ao remover admin.");
    }
  }
};
