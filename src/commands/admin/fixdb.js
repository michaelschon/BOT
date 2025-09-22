// ===== src/commands/admin/fixdb.js =====
/**
 * Comando para corrigir inconsistências no banco
 * Apenas para o master - operações de manutenção
 * 
 * @author Volleyball Team
 * @version 1.0 - Correção de inconsistências
 */

const { statements, db } = require("../../core/db");
const logger = require("../../utils/logger");

module.exports = {
  name: "!fixdb",
  aliases: ["!corrigirdb", "!repairdb"],
  description: "Corrige inconsistências no banco (master only)",
  usage: "!fixdb [apelidos|indexes|all]",
  category: "admin",
  requireAdmin: true,

  async execute(client, msg, args, senderId) {
    try {
      // Apenas master
      if (senderId !== '5519999222004@c.us') {
        await msg.reply("❌ Comando restrito ao master.");
        return;
      }

      const tipo = args[0] || "all";
      let resposta = "🔧 **CORREÇÃO DO BANCO DE DADOS**\n\n";
      
      if (tipo === "apelidos" || tipo === "all") {
        resposta += "📋 **Corrigindo apelidos...**\n";
        
        try {
          // Verificar e corrigir inconsistências na tabela apelidos
          const problemasApelidos = db.prepare(`
            SELECT usuario_id, grupo_id, nickname, COUNT(*) as duplicatas
            FROM apelidos 
            GROUP BY usuario_id, grupo_id 
            HAVING COUNT(*) > 1
          `).all();
          
          if (problemasApelidos.length > 0) {
            resposta += `⚠️ Encontradas ${problemasApelidos.length} duplicatas\n`;
            
            // Remover duplicatas mantendo o mais recente
            for (const problema of problemasApelidos) {
              db.prepare(`
                DELETE FROM apelidos 
                WHERE usuario_id = ? AND grupo_id = ? 
                AND id NOT IN (
                  SELECT id FROM apelidos 
                  WHERE usuario_id = ? AND grupo_id = ? 
                  ORDER BY updated_at DESC 
                  LIMIT 1
                )
              `).run(problema.usuario_id, problema.grupo_id, problema.usuario_id, problema.grupo_id);
            }
            
            resposta += `✅ Duplicatas removidas\n`;
          } else {
            resposta += `✅ Nenhuma duplicata encontrada\n`;
          }
          
        } catch (error) {
          resposta += `❌ Erro: ${error.message}\n`;
        }
      }
      
      if (tipo === "indexes" || tipo === "all") {
        resposta += "\n🚀 **Recriando índices...**\n";
        
        try {
          // Recriar índices críticos
          const indices = [
            `CREATE INDEX IF NOT EXISTS idx_apelidos_grupo_usuario ON apelidos(grupo_id, usuario_id)`,
            `CREATE INDEX IF NOT EXISTS idx_apelidos_nickname_lookup ON apelidos(grupo_id, LOWER(nickname))`,
            `CREATE INDEX IF NOT EXISTS idx_admins_grupo_usuario ON admins_grupos(grupo_id, usuario_id)`,
            `CREATE INDEX IF NOT EXISTS idx_usuarios_phone ON usuarios(phone)`,
            `CREATE INDEX IF NOT EXISTS idx_grupos_name ON grupos(name)`
          ];
          
          let criadosCount = 0;
          for (const indice of indices) {
            try {
              db.prepare(indice).run();
              criadosCount++;
            } catch (indexError) {
              // Índice já existe, tudo bem
            }
          }
          
          resposta += `✅ ${criadosCount} índices verificados/criados\n`;
          
        } catch (error) {
          resposta += `❌ Erro nos índices: ${error.message}\n`;
        }
      }
      
      if (tipo === "all") {
        resposta += "\n⚡ **Otimizando banco...**\n";
        
        try {
          // Executar otimizações
          db.pragma('optimize');
          db.pragma('wal_checkpoint(TRUNCATE)');
          
          resposta += `✅ Otimização executada\n`;
          
          // Estatísticas finais
          const stats = {
            usuarios: db.prepare('SELECT COUNT(*) as count FROM usuarios').get().count,
            grupos: db.prepare('SELECT COUNT(*) as count FROM grupos').get().count,
            apelidos: db.prepare('SELECT COUNT(*) as count FROM apelidos').get().count
          };
          
          resposta += `\n📊 **Estado final:**\n`;
          resposta += `• Usuários: ${stats.usuarios}\n`;
          resposta += `• Grupos: ${stats.grupos}\n`;
          resposta += `• Apelidos: ${stats.apelidos}\n`;
          
        } catch (error) {
          resposta += `❌ Erro na otimização: ${error.message}\n`;
        }
      }
      
      resposta += `\n✅ **Correção concluída!**\n`;
      resposta += `💡 Use \`!debug\` para verificar se os problemas foram resolvidos.`;
      
      await msg.reply(resposta);
      
      logger.info(`🔧 Correção do banco executada pelo master: ${tipo}`);
      
    } catch (error) {
      logger.error("❌ Erro no comando fixdb:", error.message);
      await msg.reply(`❌ Erro na correção: ${error.message}`);
    }
  }
};
