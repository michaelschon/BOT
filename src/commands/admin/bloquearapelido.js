/**
 * Comando para bloquear usuário de trocar apelido
 * Impede que o usuário use !apelido
 * 
 * @author Volleyball Team
 */

const { statements } = require("../../core/db");
const { normalizePhone } = require("../../utils/phone");

module.exports = {
  name: "!bloquearapelido",
  aliases: ["!lockapelido", "!bloquearnick"],
  description: "Bloqueia usuário de trocar o próprio apelido",
  usage: "!bloquearapelido <telefone>",
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
          "⚠️ Uso correto: `!bloquearapelido <telefone>`\n\n" +
          "📱 Formatos aceitos:\n" +
          "• +55 19 9999-9999\n" +
          "• 551999999999\n" +
          "• 19 99999999\n\n" +
          "Exemplo: `!bloquearapelido 19999999999`"
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

      // Verificar se usuário já tem apelido
      const apelidoAtual = statements.getNickname.get(groupId, targetId);
      
      if (!apelidoAtual || !apelidoAtual.nickname) {
        // Criar entrada com apelido temporário e bloqueado
        const apelidoTemp = `Usuário_${targetId.slice(-4)}`;
        statements.setNickname.run(groupId, targetId, apelidoTemp, senderId);
        
        // Bloquear
        statements.lockNickname.run(1, groupId, targetId);
        
        await msg.reply(
          `🔒 **Usuário bloqueado para apelidos!**\n\n` +
          `📱 **Número:** \`${targetId}\`\n` +
          `⚠️ **Status:** Não poderá definir ou alterar apelido\n` +
          `👮 **Bloqueado por:** ${senderId}\n\n` +
          `💡 Use \`!apelidoadmin ${rawPhone} NomeDesejado\` para definir um apelido para este usuário.`
        );
        
      } else {
        // Bloquear apelido existente
        statements.lockNickname.run(1, groupId, targetId);
        
        await msg.reply(
          `🔒 **Apelido bloqueado!**\n\n` +
          `📱 **Usuário:** \`${targetId}\`\n` +
          `🏷️ **Apelido atual:** "${apelidoAtual.nickname}"\n` +
          `⚠️ **Status:** Bloqueado para alterações\n` +
          `👮 **Bloqueado por:** ${senderId}\n\n` +
          `🎭 **Efeito:** Se tentar trocar o apelido, receberá mensagens "especiais" 😏`
        );
      }

      // Log da ação
      console.log(
        `🔒 Admin ${senderId} bloqueou apelido do usuário ${targetId} ` +
        `no grupo ${groupId}`
      );

    } catch (error) {
      console.error("Erro no bloquearapelido:", error);
      await msg.reply("❌ Erro ao bloquear apelido do usuário.");
    }
  }
};
