/**
 * Comando para admins definirem apelido de outros usuários
 * Aceita varios formatos de telefone
 *
 * @author Volleyball Team
 * @version 2.2 - Corrigido erro de sintaxe na string de resposta
 */

const { statements } = require("../../core/db");
const { normalizePhone } = require("../../utils/phone");

module.exports = {
  name: "!apelidoadmin",
  aliases: ["!setapelido", "!definirapelido"],
  description: "Admin define apelido de outro usuário",
  usage: "!apelidoadmin <telefone> <apelido>",
  category: "admin",
  requireAdmin: true,

  async execute(client, msg, args, senderId) {
    try {
      const chat = await msg.getChat();
      
      if (!chat.isGroup) {
        await msg.reply("⚠️ Este comando só funciona em grupos!");
        return;
      }

      if (args.length < 2) {
        await msg.reply(
          "⚠️ Uso correto: `!apelidoadmin <telefone> <apelido>`\n\n" +
          "📱 Formatos aceitos:\n" +
          "• +55 19 9999-9999\n" +
          "• 551999999999\n" +
          "• 19 99999999\n" +
          "• 19 9999-9999\n\n" +
          "Exemplo: `!apelidoadmin 19999999999 João`"
        );
        return;
      }

      const rawPhone = args.shift();
      const novoApelido = args.join(" ").trim();
      const groupId = chat.id._serialized;

      const targetId = normalizePhone(rawPhone);
      if (!targetId) {
        await msg.reply("⚠️ Número de telefone inválido ou não reconhecido.");
        return;
      }

      // Validar apelido
      if (novoApelido.length < 2 || novoApelido.length > 30) {
        await msg.reply("⚠️ O apelido deve ter entre 2 e 30 caracteres.");
        return;
      }

      try {
        const isTaken = statements.isNicknameInUse.get(groupId, novoApelido, targetId);
        if (isTaken) {
          await msg.reply(`⚠️ O apelido "${novoApelido}" já está em uso por outro usuário.`);
          return;
        }
      } catch (error) {
        console.warn("Erro ao verificar duplicação:", error.message);
      }

      const apelidoAnterior = statements.getNickname.get(groupId, targetId);
      
      // Definir novo apelido
      statements.setNickname.run(
        groupId,
        targetId,
        novoApelido,
        senderId, // set_by
        groupId,
        targetId
      );
      
      // Bloquear o apelido por padrão
      statements.lockNickname.run(1, groupId, targetId);

      // Resposta de sucesso (SINTAXE CORRIGIDA)
      let resposta = `👑 *Apelido definido pelo admin!*\n\n`;
      
      if (apelidoAnterior && apelidoAnterior.nickname) {
        resposta += `🔄 **Alterado:** "${apelidoAnterior.nickname}" → "${novoApelido}"\n`;
      } else {
        resposta += `✨ **Novo apelido:** "${novoApelido}"\n`;
      }
      
      resposta += `📱 **Usuário:** \`${targetId}\`\n`;
      resposta += `👮 **Admin responsável:** ${senderId}\n`;
      resposta += `🔒 **Status:** Bloqueado para alteração (padrão)\n\n`;
      resposta += `🏐 O usuário agora será conhecido como **${novoApelido}** no grupo!\n\n`;
      resposta += `💡 *Para liberar:* Use \`!liberarapelido ${rawPhone}\``;

      await msg.reply(resposta);

      console.log(
        `👑 Admin ${senderId} definiu apelido "${novoApelido}" ` +
        `para ${targetId} no grupo ${groupId}`
      );

    } catch (error) {
      console.error("Erro no apelidoadmin:", error);
      await msg.reply("❌ Erro ao definir apelido via admin.");
    }
  },
};
