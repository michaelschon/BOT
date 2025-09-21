/**
 * Comando para adicionar admin ao grupo
 * Cadastra número como admin com acesso aos comandos
 * 
 * @author Volleyball Team
 */

const { statements } = require("../../core/db");
const { normalizePhone } = require("../../utils/phone");
const { addGroupAdmin } = require("../../config/auth");

module.exports = {
  name: "!addadm",
  aliases: ["!addadmin", "!adicionaradm"],
  description: "Adiciona um admin ao grupo",
  usage: "!addadm <telefone>",
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
          "⚠️ Uso correto: `!addadm <telefone>`\n\n" +
          "📱 Formatos aceitos:\n" +
          "• +55 19 9999-9999\n" +
          "• 551999999999\n" +
          "• 19 99999999\n\n" +
          "Exemplo: `!addadm 19999999999`"
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

      // Verificar se já é admin
      const jaEhAdmin = statements.isGroupAdmin.get(groupId, targetId);
      if (jaEhAdmin) {
        await msg.reply(
          `ℹ️ **Usuário já é admin!**\n\n` +
          `📱 **Número:** \`${targetId}\`\n` +
          `👑 **Status:** Já possui permissões de admin neste grupo\n\n` +
          `💡 Use \`!listadm\` para ver todos os admins cadastrados.`
        );
        return;
      }

      // Cadastrar usuário se não existir
      try {
        statements.insertUser.run(targetId, null, targetId.replace("@c.us", ""));
      } catch (error) {
        // Usuário já existe, tudo bem
      }

      // Adicionar como admin
      const sucesso = addGroupAdmin(groupId, targetId, senderId);
      
      if (sucesso) {
        // Debug: verificar se foi realmente adicionado
        const verificacao = statements.isGroupAdmin.get(groupId, targetId);
        console.log(`🔍 Debug addadm: Admin ${targetId} adicionado? ${!!verificacao} no grupo ${groupId}`);
        
        await msg.reply(
          `👑 **Admin adicionado com sucesso!**\n\n` +
          `📱 **Número:** \`${targetId}\`\n` +
          `✅ **Status:** Agora é admin deste grupo\n` +
          `👮 **Adicionado por:** ${senderId}\n` +
          `⏰ **Data:** ${new Date().toLocaleString('pt-BR')}\n\n` +
          `🎯 **Permissões concedidas:**\n` +
          `• Pode usar comandos de admin\n` +
          `• Pode gerenciar apelidos\n` +
          `• Pode bloquear/liberar usuários\n` +
          `• Pode ver listas e relatórios\n\n` +
          `💡 **Próximos passos:** O novo admin já pode usar os comandos!\n\n` +
          `🔍 **Debug:** Verificação = ${!!verificacao} | Use \`!listadm\` para confirmar`
        );

        console.log(
          `👑 Admin ${senderId} adicionou ${targetId} como admin ` +
          `no grupo ${groupId}`
        );
      } else {
        await msg.reply("❌ Erro ao adicionar admin. Tente novamente.");
      }

    } catch (error) {
      console.error("Erro no addadm:", error);
      await msg.reply("❌ Erro interno ao adicionar admin.");
    }
  }
};
