// ===== src/commands/debug/simplify.js =====
/**
 * Comando para criar statements SUPER SIMPLES que funcionam
 * Remove toda complexidade desnecessária
 * 
 * @author Volleyball Team
 * @version 1.0 - Solução definitiva e simples
 */

const { db } = require("../../core/db");
const logger = require("../../utils/logger");

module.exports = {
  name: "!simplify",
  aliases: ["!simples", "!fix"],
  description: "Cria statements super simples que funcionam (master only)",
  usage: "!simplify",
  category: "debug",
  requireAdmin: true,

  async execute(client, msg, args, senderId) {
    try {
      // Apenas master
      if (senderId !== '5519999222004@c.us') {
        await msg.reply("❌ Comando restrito ao master.");
        return;
      }

      let resposta = "🔧 **SIMPLIFICANDO STATEMENTS**\n\n";
      
      try {
        const dbModule = require("../../core/db");
        
        // ===== STATEMENTS SUPER SIMPLES E FUNCIONAIS =====
        const statementsSimples = {
          // Apelidos - VERSÃO ULTRA SIMPLES
          getNickname: db.prepare(`
            SELECT nickname, locked, created_at, updated_at, set_by 
            FROM apelidos 
            WHERE grupo_id = ? AND usuario_id = ?
          `),
          
          // setNickname SIMPLES - SEM COALESCE complicado
          setNickname: db.prepare(`
            INSERT OR REPLACE INTO apelidos 
            (grupo_id, usuario_id, nickname, set_by, locked, created_at, updated_at) 
            VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `),
          
          isNicknameInUse: db.prepare(`
            SELECT 1 FROM apelidos 
            WHERE grupo_id = ? AND LOWER(nickname) = LOWER(?) AND usuario_id != ?
          `),
          
          lockNickname: db.prepare(`
            UPDATE apelidos 
            SET locked = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE grupo_id = ? AND usuario_id = ?
          `),
          
          // Outros statements simples
          insertUser: db.prepare(`
            INSERT OR REPLACE INTO usuarios (id, name, phone, updated_at) 
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          `),
          
          getUser: db.prepare(`SELECT * FROM usuarios WHERE id = ?`),
          
          insertGroup: db.prepare(`
            INSERT OR REPLACE INTO grupos (id, name, description, updated_at) 
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          `),
          
          getGroup: db.prepare(`SELECT * FROM grupos WHERE id = ?`),
          
          isGroupAdmin: db.prepare(`
            SELECT 1 FROM admins_grupos 
            WHERE grupo_id = ? AND usuario_id = ?
          `),
          
          addGroupAdmin: db.prepare(`
            INSERT OR REPLACE INTO admins_grupos (grupo_id, usuario_id, granted_by) 
            VALUES (?, ?, ?)
          `),
          
          removeGroupAdmin: db.prepare(`
            DELETE FROM admins_grupos 
            WHERE grupo_id = ? AND usuario_id = ?
          `),
          
          isSilenced: db.prepare(`
            SELECT 1 FROM silenciados 
            WHERE grupo_id = ? AND usuario_id = ? 
            AND (expires_at IS NULL OR expires_at > datetime('now'))
          `),
          
          addSilenced: db.prepare(`
            INSERT OR REPLACE INTO silenciados 
            (grupo_id, usuario_id, silenciado_por, motivo, minutos, expires_at) 
            VALUES (?, ?, ?, ?, ?, ?)
          `),
          
          removeSilenced: db.prepare(`
            DELETE FROM silenciados 
            WHERE grupo_id = ? AND usuario_id = ?
          `),
          
          logCommand: db.prepare(`
            INSERT INTO auditoria 
            (usuario_id, grupo_id, comando, argumentos, sucesso, erro) 
            VALUES (?, ?, ?, ?, ?, ?)
          `)
        };
        
        // Substituir APENAS os statements essenciais
        Object.assign(dbModule.statements, statementsSimples);
        
        resposta += `✅ ${Object.keys(statementsSimples).length} statements simplificados\n\n`;
        
        // ===== TESTE COMPLETO =====
        const chat = await msg.getChat();
        if (chat.isGroup) {
          const groupId = chat.id._serialized;
          
          resposta += `🧪 **TESTE COMPLETO:**\n`;
          
          // 1. Limpar dados antigos
          try {
            db.prepare(`DELETE FROM apelidos WHERE grupo_id = ? AND usuario_id = ?`).run(groupId, senderId);
            resposta += `🧹 Dados antigos limpos\n`;
          } catch (cleanError) {
            resposta += `⚠️ Erro na limpeza: ${cleanError.message}\n`;
          }
          
          // 2. Inserir apelido com statement simples
          try {
            dbModule.statements.setNickname.run(groupId, senderId, "TesteSimples", senderId);
            resposta += `✅ INSERT funciona\n`;
          } catch (insertError) {
            resposta += `❌ INSERT falhou: ${insertError.message}\n`;
          }
          
          // 3. Consultar com statement simples
          try {
            const resultado = dbModule.statements.getNickname.get(groupId, senderId);
            
            if (resultado) {
              resposta += `✅ SELECT funciona: "${resultado.nickname}"\n`;
            } else {
              resposta += `❌ SELECT não encontra dados\n`;
            }
          } catch (selectError) {
            resposta += `❌ SELECT falhou: ${selectError.message}\n`;
          }
          
          // 4. Testar isNicknameInUse
          try {
            const emUso = dbModule.statements.isNicknameInUse.get(groupId, "TesteSimples", "outro@c.us");
            resposta += `📝 isNicknameInUse: ${emUso ? 'Detecta em uso' : 'Não em uso'}\n`;
          } catch (useError) {
            resposta += `❌ isNicknameInUse falhou: ${useError.message}\n`;
          }
        }
        
        resposta += `\n🎉 **SIMPLIFICAÇÃO CONCLUÍDA!**\n`;
        resposta += `💡 Teste agora: \`!nick\`\n`;
        resposta += `💡 Para definir: \`!apelido NovoNome\``;
        
      } catch (error) {
        resposta += `❌ Erro na simplificação: ${error.message}\n`;
        logger.error("Erro no simplify:", error);
      }
      
      await msg.reply(resposta);
      
    } catch (error) {
      logger.error("❌ Erro no comando simplify:", error.message);
      await msg.reply(`❌ Erro: ${error.message}`);
    }
  }
};
