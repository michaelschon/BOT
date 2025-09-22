// ===== src/commands/admin/recreatedb.js =====
/**
 * Comando para recriar statements do banco
 * Corrige prepared statements com problemas
 * 
 * @author Volleyball Team
 * @version 1.0 - Recriação de statements
 */

const { db } = require("../../core/db");
const logger = require("../../utils/logger");

module.exports = {
  name: "!recreatedb",
  aliases: ["!recreate", "!rebuild"],
  description: "Recria statements do banco (master only)",
  usage: "!recreatedb",
  category: "admin",
  requireAdmin: true,

  async execute(client, msg, args, senderId) {
    try {
      // Apenas master
      if (senderId !== '5519999222004@c.us') {
        await msg.reply("❌ Comando restrito ao master.");
        return;
      }

      let resposta = "🔧 **RECRIANDO STATEMENTS DO BANCO**\n\n";
      
      try {
        // Recriar statements com versões corrigidas
        const { statements } = require("../../core/db");
        
        // Recriar o statement problemático
        statements.getNickname = db.prepare(`
          SELECT nickname, locked, created_at, updated_at, set_by 
          FROM apelidos 
          WHERE grupo_id = ? AND usuario_id = ? 
          LIMIT 1
        `);
        
        // Corrigir o setNickname também
        statements.setNickname = db.prepare(`
          INSERT OR REPLACE INTO apelidos 
          (grupo_id, usuario_id, nickname, set_by, locked, created_at, updated_at) 
          VALUES (?, ?, ?, ?, 
            COALESCE((SELECT locked FROM apelidos WHERE grupo_id = ? AND usuario_id = ?), 0),
            COALESCE((SELECT created_at FROM apelidos WHERE grupo_id = ? AND usuario_id = ?), CURRENT_TIMESTAMP),
            CURRENT_TIMESTAMP
          )
        `);
        
        resposta += `✅ Statements recriados\n`;
        
        // Testar o statement corrigido
        const chat = await msg.getChat();
        if (chat.isGroup) {
          const groupId = chat.id._serialized;
          const teste = statements.getNickname.get(groupId, senderId);
          
          if (teste) {
            resposta += `✅ Teste bem-sucedido: "${teste.nickname}"\n`;
          } else {
            resposta += `⚠️ Ainda não encontra apelidos\n`;
          }
        }
        
        resposta += `\n🎉 **Recriação concluída!**\n`;
        resposta += `💡 Teste agora: \`!nick\``;
        
      } catch (error) {
        resposta += `❌ Erro na recriação: ${error.message}\n`;
      }
      
      await msg.reply(resposta);
      
    } catch (error) {
      logger.error("❌ Erro no recreatedb:", error.message);
      await msg.reply(`❌ Erro: ${error.message}`);
    }
  }
};
