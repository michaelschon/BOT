/**
 * Comando para liberar usuário para trocar apelido
 * Remove o bloqueio do !apelido
 * 
 * @author Volleyball Team
 */

const { statements } = require("../../core/db");
const { normalizePhone } = require("../../utils/phone");

module.exports = {
  name: "!liberarapelido",
  aliases: ["!desbloquearapelido", "!unlockapelido"],
  description: "Libera usuário para trocar o próprio apelido",
  usage: "!liberarapelido <telefone>",
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
          "⚠️ Uso correto: `!liberarapelido <telefone>`\n\n" +
          "📱 Formatos aceitos:\n" +
          "• +55 19 9999-9999\n" +
          "• 551999999999\n" +
          "• 19 99999999\n\n" +
          "Exemplo: `!liberarapelido 19999999999`"
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

      // Verificar se usuário tem apelido
      const apelidoAtual = statements.getNickname.get(groupId, targetId);
      
      if (!apelidoAtual) {
        await msg.reply(
          `⚠️ **Usuário não encontrado!**\n\n` +
          `📱 **Número:** \`${targetId}\`\n` +
          `💡 Este usuário ainda não tem apelido cadastrado neste grupo.\n\n` +
          `🎯 Use \`!apelidoadmin ${rawPhone} NomeDesejado\` para criar um apelido primeiro.`
        );
        return;
      }

      // Verificar se já está desbloqueado
      if (apelidoAtual.locked === 0) {
        await msg.reply(
          `ℹ️ **Usuário já está liberado!**\n\n` +
          `📱 **Número:** \`${targetId}\`\n` +
          `🏷️ **Apelido:** "${apelidoAtual.nickname}"\n` +
          `✅ **Status:** Pode alterar o apelido normalmente\n\n` +
          `💡 O usuário já pode usar \`!apelido NovoNome\` quando quiser.`
        );
        return;
      }

      // Liberar apelido
      statements.lockNickname.run(0, groupId, targetId);
      
      // Resposta de sucesso
      await msg.reply(
        `🔓 **Apelido liberado com sucesso!**\n\n` +
        `📱 **Usuário:** \`${targetId}\`\n` +
        `🏷️ **Apelido atual:** "${apelidoAtual.nickname}"\n` +
        `✅ **Novo status:** Pode alterar o apelido\n` +
        `👮 **Liberado por:** ${senderId}\n\n` +
        `🎉 **Efeito:** Agora pode usar \`!apelido NovoNome\` normalmente!`
      );

      // Log da ação
      console.log(
        `🔓 Admin ${senderId} liberou apelido do usuário ${targetId} ` +
        `("${apelidoAtual.nickname}") no grupo ${groupId}`
      );

    } catch (error) {
      console.error("Erro no liberarapelido:", error);
      await msg.reply("❌ Erro ao liberar apelido do usuário.");
    }
  }
};
