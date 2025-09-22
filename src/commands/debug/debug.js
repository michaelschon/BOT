// ===== src/commands/debug/debug.js =====
/**
 * Comando de debug para verificar problemas no banco
 * Apenas para o usuário master - diagnóstico completo
 * 
 * @author Volleyball Team
 * @version 1.0 - Diagnóstico completo
 */

const { statements, db } = require("../../core/db");
const logger = require("../../utils/logger");

module.exports = {
  name: "!debug",
  aliases: ["!diagnostico", "!check"],
  description: "Diagnóstico completo do sistema (master only)",
  usage: "!debug [apelidos|banco|user]",
  category: "debug",
  requireAdmin: true,

  async execute(client, msg, args, senderId) {
    try {
      // Apenas master pode usar
      if (senderId !== '5519999222004@c.us') {
        await msg.reply("❌ Comando restrito ao master.");
        return;
      }

      const chat = await msg.getChat();
      const groupId = chat.isGroup ? chat.id._serialized : null;
      
      let resposta = "🔍 **DIAGNÓSTICO DO SISTEMA**\n\n";
      
      const tipo = args[0] || "geral";
      
      if (tipo === "apelidos" || tipo === "geral") {
        resposta += "📋 **APELIDOS NO BANCO:**\n";
        
        if (groupId) {
          try {
            // Buscar todos os apelidos do grupo atual
            const apelidos = db.prepare(`
              SELECT usuario_id, nickname, locked, created_at, updated_at, set_by
              FROM apelidos 
              WHERE grupo_id = ?
              ORDER BY created_at DESC
            `).all(groupId);
            
            if (apelidos.length === 0) {
              resposta += "• Nenhum apelido encontrado neste grupo\n";
            } else {
              resposta += `• Total no grupo: ${apelidos.length}\n\n`;
              
              apelidos.forEach((apelido, index) => {
                const numero = apelido.usuario_id.replace('@c.us', '');
                const status = apelido.locked ? "🔒" : "🔓";
                const data = new Date(apelido.created_at).toLocaleDateString('pt-BR');
                
                resposta += `${index + 1}. ${status} **${apelido.nickname}**\n`;
                resposta += `   📱 ${numero}\n`;
                resposta += `   📅 ${data}\n\n`;
              });
            }
            
            // Verificar especificamente o usuário atual
            resposta += `🔍 **SEU APELIDO:**\n`;
            const meuApelido = statements.getNickname.get(groupId, senderId);
            
            if (meuApelido) {
              resposta += `✅ Encontrado: "${meuApelido.nickname}"\n`;
              resposta += `🔒 Bloqueado: ${meuApelido.locked ? 'Sim' : 'Não'}\n`;
              resposta += `📅 Criado: ${new Date(meuApelido.created_at).toLocaleString('pt-BR')}\n`;
            } else {
              resposta += `❌ Nenhum apelido encontrado para você\n`;
              
              // Verificar se existe na tabela com query direta
              const apelidoDireto = db.prepare(`
                SELECT * FROM apelidos WHERE grupo_id = ? AND usuario_id = ?
              `).get(groupId, senderId);
              
              if (apelidoDireto) {
                resposta += `⚠️ INCONSISTÊNCIA: Existe no banco mas getNickname não encontra\n`;
                resposta += `   Dados: ${JSON.stringify(apelidoDireto)}\n`;
              }
            }
            
          } catch (error) {
            resposta += `❌ Erro ao consultar apelidos: ${error.message}\n`;
          }
        } else {
          resposta += "⚠️ Comando executado fora de grupo\n";
        }
      }
      
      if (tipo === "banco" || tipo === "geral") {
        resposta += "\n🗄️ **STATUS DO BANCO:**\n";
        
        try {
          // Estatísticas das tabelas
          const usuarios = db.prepare('SELECT COUNT(*) as count FROM usuarios').get().count;
          const grupos = db.prepare('SELECT COUNT(*) as count FROM grupos').get().count;
          const apelidos = db.prepare('SELECT COUNT(*) as count FROM apelidos').get().count;
          const admins = db.prepare('SELECT COUNT(*) as count FROM admins_grupos').get().count;
          
          resposta += `• Usuários: ${usuarios}\n`;
          resposta += `• Grupos: ${grupos}\n`;
          resposta += `• Apelidos: ${apelidos}\n`;
          resposta += `• Admins: ${admins}\n`;
          
          // Verificar integridade da tabela apelidos
          const apelidosSchema = db.prepare(`
            PRAGMA table_info(apelidos)
          `).all();
          
          resposta += `\n📋 **ESTRUTURA TABELA APELIDOS:**\n`;
          apelidosSchema.forEach(col => {
            resposta += `• ${col.name}: ${col.type}\n`;
          });
          
        } catch (error) {
          resposta += `❌ Erro ao verificar banco: ${error.message}\n`;
        }
      }
      
      if (tipo === "user" || tipo === "geral") {
        resposta += `\n👤 **SEUS DADOS:**\n`;
        resposta += `• ID: \`${senderId}\`\n`;
        
        if (groupId) {
          resposta += `• Grupo ID: \`${groupId}\`\n`;
          resposta += `• Grupo Nome: ${chat.name}\n`;
        }
        
        // Verificar se está no banco de usuários
        const usuario = statements.getUser.get(senderId);
        if (usuario) {
          resposta += `• No banco: ✅ ${usuario.name || 'Sem nome'}\n`;
        } else {
          resposta += `• No banco: ❌ Não encontrado\n`;
        }
      }
      
      // Teste rápido de performance
      resposta += `\n⚡ **TESTE DE PERFORMANCE:**\n`;
      const start = process.hrtime.bigint();
      
      try {
        // Teste simples
        const testId = `test_${Date.now()}@c.us`;
        statements.insertUser.run(testId, 'Test', '5519999999999');
        const user = statements.getUser.get(testId);
        db.prepare('DELETE FROM usuarios WHERE id = ?').run(testId);
        
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000;
        
        resposta += `• Tempo: ${duration.toFixed(2)}ms\n`;
        resposta += `• Status: ${duration < 50 ? '🚀 Rápido' : '⚠️ Lento'}\n`;
        
      } catch (perfError) {
        resposta += `❌ Erro no teste: ${perfError.message}\n`;
      }
      
      await msg.reply(resposta);
      
    } catch (error) {
      logger.error("❌ Erro no comando debug:", error.message);
      await msg.reply(`❌ Erro no diagnóstico: ${error.message}`);
    }
  }
};
