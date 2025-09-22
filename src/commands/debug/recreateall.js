// ===== src/commands/debug/recreateall.js =====
/**
 * Comando para recriar TODOS os prepared statements
 * Solução definitiva para statements corrompidos
 * 
 * @author Volleyball Team
 * @version 1.0 - Recriação completa
 */

const { db } = require("../../core/db");
const logger = require("../../utils/logger");

module.exports = {
  name: "!recreateall",
  aliases: ["!rebuildall", "!recriarall"],
  description: "Recria TODOS os prepared statements (master only)",
  usage: "!recreateall",
  category: "admin",
  requireAdmin: true,

  async execute(client, msg, args, senderId) {
    try {
      // Apenas master
      if (senderId !== '5519999222004@c.us') {
        await msg.reply("❌ Comando restrito ao master.");
        return;
      }

      let resposta = "🔧 **RECRIANDO TODOS OS STATEMENTS**\n\n";
      
      try {
        // Obter referência do módulo atual
        const dbModule = require("../../core/db");
        
        // Criar statements completamente novos
        const novosStatements = {
          // ===== USUÁRIOS =====
          insertUser: db.prepare(`
            INSERT OR REPLACE INTO usuarios (id, name, phone, updated_at) 
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          `),
          getUser: db.prepare(`SELECT * FROM usuarios WHERE id = ? LIMIT 1`),
          getUserByPhone: db.prepare(`SELECT * FROM usuarios WHERE phone = ? LIMIT 1`),
          
          // ===== GRUPOS =====
          insertGroup: db.prepare(`
            INSERT OR REPLACE INTO grupos (id, name, description, updated_at) 
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          `),
          getGroup: db.prepare(`SELECT * FROM grupos WHERE id = ? LIMIT 1`),
          
          // ===== ADMINISTRADORES =====
          isGroupAdmin: db.prepare(`
            SELECT 1 FROM admins_grupos 
            WHERE grupo_id = ? AND usuario_id = ? 
            LIMIT 1
          `),
          addGroupAdmin: db.prepare(`
            INSERT OR REPLACE INTO admins_grupos (grupo_id, usuario_id, granted_by) 
            VALUES (?, ?, ?)
          `),
          removeGroupAdmin: db.prepare(`
            DELETE FROM admins_grupos 
            WHERE grupo_id = ? AND usuario_id = ?
          `),
          getAllGroupAdmins: db.prepare(`
            SELECT ag.usuario_id, ag.granted_by, ag.granted_at, u.name 
            FROM admins_grupos ag
            LEFT JOIN usuarios u ON ag.usuario_id = u.id
            WHERE ag.grupo_id = ?
            ORDER BY 
              CASE WHEN ag.usuario_id = ? THEN 0 ELSE 1 END,
              ag.granted_at ASC
          `),
          
          // ===== PERMISSÕES ESPECIAIS =====
          hasSpecialPermission: db.prepare(`
            SELECT permitido FROM permissoes_especiais 
            WHERE grupo_id = ? AND usuario_id = ? AND comando = ? 
            AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            LIMIT 1
          `),
          grantSpecialPermission: db.prepare(`
            INSERT OR REPLACE INTO permissoes_especiais 
            (grupo_id, usuario_id, comando, permitido, granted_by, expires_at) 
            VALUES (?, ?, ?, ?, ?, ?)
          `),
          revokeSpecialPermission: db.prepare(`
            DELETE FROM permissoes_especiais 
            WHERE grupo_id = ? AND usuario_id = ? AND comando = ?
          `),
          
          // ===== APELIDOS (CRÍTICO - VERSÃO SIMPLIFICADA) =====
          getNickname: db.prepare(`
            SELECT nickname, locked, created_at, updated_at, set_by 
            FROM apelidos 
            WHERE grupo_id = ? AND usuario_id = ? 
            LIMIT 1
          `),
          
          setNickname: db.prepare(`
            INSERT OR REPLACE INTO apelidos 
            (grupo_id, usuario_id, nickname, set_by, locked, created_at, updated_at) 
            VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `),
          
          isNicknameInUse: db.prepare(`
            SELECT 1 FROM apelidos 
            WHERE grupo_id = ? AND LOWER(nickname) = LOWER(?) AND usuario_id != ? 
            LIMIT 1
          `),
          
          lockNickname: db.prepare(`
            UPDATE apelidos 
            SET locked = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE grupo_id = ? AND usuario_id = ?
          `),
          
          getAllNicknamesInGroup: db.prepare(`
            SELECT a.usuario_id, a.nickname, a.locked, a.created_at, a.updated_at,
                   u.name as usuario_nome, set_by.name as definido_por_nome
            FROM apelidos a
            LEFT JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN usuarios set_by ON a.set_by = set_by.id
            WHERE a.grupo_id = ?
            ORDER BY LOWER(a.nickname) COLLATE NOCASE
          `),
          
          // ===== SILENCIAMENTO =====
          isSilenced: db.prepare(`
            SELECT 1 FROM silenciados 
            WHERE grupo_id = ? AND usuario_id = ? 
            AND (expires_at IS NULL OR expires_at > datetime('now'))
            LIMIT 1
          `),
          addSilenced: db.prepare(`
            INSERT OR REPLACE INTO silenciados 
            (grupo_id, usuario_id, silenciado_por, motivo, minutos, expires_at) 
            VALUES (?, ?, ?, ?, ?, ?)
          `),
          removeSilenced: db.prepare(`DELETE FROM silenciados WHERE grupo_id = ? AND usuario_id = ?`),
          getSilenced: db.prepare(`
            SELECT * FROM silenciados 
            WHERE grupo_id = ? AND usuario_id = ? 
            AND (expires_at IS NULL OR expires_at > datetime('now'))
            LIMIT 1
          `),
          getAllSilencedInGroup: db.prepare(`
            SELECT s.*, u.name as usuario_nome 
            FROM silenciados s 
            LEFT JOIN usuarios u ON s.usuario_id = u.id 
            WHERE s.grupo_id = ? 
            AND (s.expires_at IS NULL OR s.expires_at > datetime('now'))
            ORDER BY s.created_at DESC
          `),
          removeAllSilencedInGroup: db.prepare(`DELETE FROM silenciados WHERE grupo_id = ?`),
          
          // ===== AUDITORIA =====
          logCommand: db.prepare(`
            INSERT INTO auditoria 
            (usuario_id, grupo_id, comando, argumentos, sucesso, erro) 
            VALUES (?, ?, ?, ?, ?, ?)
          `),
          getCommandHistory: db.prepare(`
            SELECT * FROM auditoria 
            WHERE usuario_id = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
          `),
          
          // ===== LIMPEZA =====
          cleanExpiredSilenced: db.prepare(`
            DELETE FROM silenciados 
            WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')
          `),
          cleanOldAuditoria: db.prepare(`DELETE FROM auditoria WHERE timestamp < ?`)
        };
        
        // Substituir todos os statements
        Object.assign(dbModule.statements, novosStatements);
        
        resposta += `✅ ${Object.keys(novosStatements).length} statements recriados\n\n`;
        
        // Testar o statement crítico
        const chat = await msg.getChat();
        if (chat.isGroup) {
          const groupId = chat.id._serialized;
          
          try {
            const teste = dbModule.statements.getNickname.get(groupId, senderId);
            
            if (teste) {
              resposta += `✅ Teste bem-sucedido: "${teste.nickname}"\n`;
            } else {
              resposta += `⚠️ Teste: nenhum apelido encontrado\n`;
            }
          } catch (testError) {
            resposta += `❌ Erro no teste: ${testError.message}\n`;
          }
        }
        
        resposta += `\n🎉 **RECRIAÇÃO CONCLUÍDA!**\n`;
        resposta += `💡 Teste agora: \`!nick\``;
        
      } catch (error) {
        resposta += `❌ Erro na recriação: ${error.message}\n`;
      }
      
      await msg.reply(resposta);
      
    } catch (error) {
      logger.error("❌ Erro no recreateall:", error.message);
      await msg.reply(`❌ Erro: ${error.message}`);
    }
  }
};
