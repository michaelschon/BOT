/**
 * Comando para admins definirem apelido de outros usuários
 * Aceita vários formatos de telefone
 * 
 * @author Volleyball Team
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
      
      // Só funciona em grupos
      if (!chat.isGroup) {
        await msg.reply("⚠️ Este comando só funciona em grupos!");
        return;
      }

      // Validar argumentos
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

      // Encontrar onde termina o número e começa o apelido
      // Estratégia: Tentar normalizar cada combinação até encontrar uma válida
      let rawPhone = "";
      let novoApelido = "";
      let targetId = null;
      
      // Tenta diferentes combinações de argumentos para separar telefone do apelido
      for (let i = 1; i <= args.length - 1; i++) {
        const phoneCandidate = args.slice(0, i).join(" ");
        const nicknameCandidate = args.slice(i).join(" ");
        
        const normalizedPhone = normalizePhone(phoneCandidate);
        if (normalizedPhone) {
          rawPhone = phoneCandidate;
          novoApelido = nicknameCandidate;
          targetId = normalizedPhone;
          break;
        }
      }
      
      const groupId = chat.id._serialized;

      // Se não conseguiu normalizar nenhuma combinação
      if (!targetId) {
        await msg.reply(
          `⚠️ Não foi possível identificar um número válido nos argumentos: "${args.join(' ')}"\n\n` +
          "📱 Use um dos formatos:\n" +
          "• `!apelidoadmin +55 19 9999-9999 João`\n" +
          "• `!apelidoadmin 551999999999 João`\n" +
          "• `!apelidoadmin 19 99999999 João`"
        );
        return;
      }

      // Validar apelido
      if (novoApelido.length < 2) {
        await msg.reply("⚠️ O apelido deve ter pelo menos 2 caracteres!");
        return;
      }

      if (novoApelido.length > 30) {
        await msg.reply("⚠️ O apelido não pode ter mais que 30 caracteres!");
        return;
      }

      // Verificar caracteres proibidos
      const caracteresProibidos = /[<>@#&*{}[\]\\]/;
      if (caracteresProibidos.test(novoApelido)) {
        await msg.reply("⚠️ O apelido contém caracteres não permitidos!");
        return;
      }

      if (novoApelido.toLowerCase().startsWith('!')) {
        await msg.reply("⚠️ O apelido não pode começar com '!' (reservado para comandos).");
        return;
      }

      // Verificar se apelido já existe
      try {
        const { db } = require("../../core/db");
        const apelidoExistente = db.prepare(`
          SELECT usuario_id FROM apelidos 
          WHERE grupo_id = ? AND LOWER(nickname) = LOWER(?) AND usuario_id != ?
        `).get(groupId, novoApelido, targetId);

        if (apelidoExistente) {
          await msg.reply(
            `⚠️ O apelido "${novoApelido}" já está sendo usado por outro usuário.\n\n` +
            `💡 Tente: "${novoApelido}2", "${novoApelido}_ADM" ou "${novoApelido}🏐"`
          );
          return;
        }
      } catch (error) {
        console.warn("Erro ao verificar duplicação:", error.message);
      }

      // Obter apelido anterior
      const apelidoAnterior = statements.getNickname.get(groupId, targetId);
      
      // Definir novo apelido (admin sempre pode sobrescrever)
      statements.setNickname.run(groupId, targetId, novoApelido, senderId);
      
      // BLOQUEAR APELIDO POR PADRÃO quando definido por admin
      statements.lockNickname.run(1, groupId, targetId);

      // Resposta de sucesso
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
      resposta += `💡 **Para liberar:** Use \`!liberarapelido ${rawPhone}\``;

      await msg.reply(resposta);

      // Log detalhado
      console.log(
        `👑 Admin ${senderId} definiu apelido "${novoApelido}" ` +
        `para ${targetId} no grupo ${groupId}`
      );

    } catch (error) {
      console.error("Erro no apelidoadmin:", error);
      await msg.reply("❌ Erro ao definir apelido via admin.");
    }
  }
};
