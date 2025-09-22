// ===== src/commands/debug/showme.js =====
/**
 * Comando simples para mostrar os IDs atuais
 * Útil para debug rápido
 * 
 * @author Volleyball Team
 * @version 1.0 - Debug rápido
 */

module.exports = {
  name: "!showme",
  aliases: ["!me", "!mydata"],
  description: "Mostra seus dados e IDs atuais",
  usage: "!showme",
  category: "debug",
  requireAdmin: false,

  async execute(client, msg, args, senderId) {
    try {
      const chat = await msg.getChat();
      
      let resposta = "👤 **SEUS DADOS ATUAIS**\n\n";
      
      resposta += `🆔 **Seu ID:**\n\`${senderId}\`\n\n`;
      
      if (chat.isGroup) {
        resposta += `👥 **Grupo atual:**\n`;
        resposta += `📝 Nome: ${chat.name}\n`;
        resposta += `🆔 ID: \`${chat.id._serialized}\`\n`;
        resposta += `👫 Membros: ${chat.participants.length}\n\n`;
      } else {
        resposta += `💬 **Chat privado**\n\n`;
      }
      
      // Verificar se tem apelido no grupo atual
      if (chat.isGroup) {
        const { statements } = require("../../core/db");
        const apelido = statements.getNickname.get(chat.id._serialized, senderId);
        
        if (apelido) {
          resposta += `🏷️ **Apelido atual:** "${apelido.nickname}"\n`;
          resposta += `🔒 **Status:** ${apelido.locked ? 'Bloqueado' : 'Livre'}\n`;
        } else {
          resposta += `🏷️ **Apelido:** Não definido neste grupo\n`;
        }
      }
      
      resposta += `\n🕐 **Hora:** ${new Date().toLocaleString('pt-BR')}`;
      
      await msg.reply(resposta);
      
    } catch (error) {
      await msg.reply(`❌ Erro: ${error.message}`);
    }
  }
};
