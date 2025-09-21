/**
 * Comando para liberar usuário silenciado
 * Remove silenciamento e permite que volte a falar
 * 
 * @author Volleyball Team
 */

const { normalizePhone } = require("../../utils/phone");
const { db } = require("../../core/db");

module.exports = {
  name: "!falar",
  aliases: ["!unmute", "!desilenciar"],
  description: "Remove silenciamento de usuário específico",
  usage: "!falar <telefone>",
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
          "⚠️ Uso correto: `!falar <telefone>`\n\n" +
          "📋 **Exemplos:**\n" +
          "• `!falar +55 19 99999-9999`\n" +
          "• `!falar 19999999999`\n" +
          "• `!desilenciar 19 99999999`\n\n" +
          "💡 Use `!silenciados` para ver lista de usuários silenciados"
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

      const groupId = chat.id._serialized;

      try {
        // Verificar se usuário está silenciado
        const silencedUser = db.prepare(`
          SELECT * FROM silenciados 
          WHERE grupo_id = ? AND usuario_id = ?
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        `).get(groupId, targetId);

        if (!silencedUser) {
          await msg.reply(
            `ℹ️ **Usuário não está silenciado**\n\n` +
            `📱 **Número:** \`${targetId}\`\n` +
            `👥 **Grupo:** ${chat.name}\n\n` +
            `💡 O usuário não precisa ser liberado pois não está silenciado.\n` +
            `🔍 Use \`!silenciados\` para ver quem está silenciado.`
          );
          return;
        }

        // Remover silenciamento
        db.prepare(`
          DELETE FROM silenciados 
          WHERE grupo_id = ? AND usuario_id = ?
        `).run(groupId, targetId);

        // Obter informações do usuário
        let userName = targetId.replace("@c.us", "");
        try {
          const contact = await client.getContactById(targetId);
          userName = contact.pushname || userName;
        } catch (contactError) {
          // Usar ID se não conseguir obter o nome
        }

        // Calcular tempo que ficou silenciado
        const tempoSilenciado = this.calculateSilenceDuration(silencedUser.created_at);
        const tipoDuracao = silencedUser.expires_at ? 'temporário' : 'permanente';

        // Resposta de confirmação
        let resposta = `🔊 **Usuário liberado!**\n\n`;
        resposta += `📱 **Usuário:** \`${targetId}\`\n`;
        resposta += `👤 **Nome:** ${userName}\n`;
        resposta += `👮 **Liberado por:** ${senderId}\n`;
        resposta += `⏰ **Data da liberação:** ${new Date().toLocaleString('pt-BR')}\n\n`;
        resposta += `📊 **Informações do silenciamento:**\n`;
        resposta += `• Silenciado por: ${silencedUser.silenciado_por}\n`;
        resposta += `• Tipo: ${tipoDuracao}\n`;
        resposta += `• Duração: ${tempoSilenciado}\n`;
        if (silencedUser.expires_at) {
          resposta += `• Expiraria em: ${new Date(silencedUser.expires_at).toLocaleString('pt-BR')}\n`;
        }
        resposta += `\n✅ **O usuário pode voltar a enviar mensagens normalmente!**`;

        await msg.reply(resposta);

        // Log da operação
        console.log(
          `🔊 Usuário liberado: ${senderId} liberou ${targetId} (${userName}) ` +
          `no grupo ${groupId} (estava silenciado por ${tempoSilenciado})`
        );

      } catch (dbError) {
        console.error("Erro ao liberar usuário:", dbError);
        await msg.reply("❌ Erro ao acessar banco de dados para liberar usuário.");
      }

    } catch (error) {
      console.error("Erro no comando falar:", error);
      await msg.reply("❌ Erro interno no sistema de liberação.");
    }
  },

  /**
   * Calcula duração do silenciamento
   */
  calculateSilenceDuration(createdAt) {
    try {
      const inicio = new Date(createdAt);
      const fim = new Date();
      const diffMs = fim.getTime() - inicio.getTime();
      
      const minutos = Math.floor(diffMs / (1000 * 60));
      const horas = Math.floor(minutos / 60);
      const dias = Math.floor(horas / 24);
      
      if (dias > 0) {
        const horasRestantes = horas % 24;
        return `${dias} dia(s)${horasRestantes > 0 ? ` e ${horasRestantes} hora(s)` : ''}`;
      } else if (horas > 0) {
        const minutosRestantes = minutos % 60;
        return `${horas} hora(s)${minutosRestantes > 0 ? ` e ${minutosRestantes} minuto(s)` : ''}`;
      } else {
        return `${minutos} minuto(s)`;
      }
    } catch (error) {
      return "tempo indeterminado";
    }
  }
};
