// ===== src/commands/debug/testquery.js =====
/**
 * Comando para testar queries e identificar problemas
 * Testa diferentes formas de consultar apelidos
 * 
 * @author Volleyball Team
 * @version 1.0 - Debug de queries SQL
 */

const { statements, db } = require("../../core/db");
const logger = require("../../utils/logger");

module.exports = {
  name: "!testquery",
  aliases: ["!querytest", "!sqltest"],
  description: "Testa queries SQL para debug (master only)",
  usage: "!testquery",
  category: "debug",
  requireAdmin: true,

  async execute(client, msg, args, senderId) {
    try {
      // Apenas master
      if (senderId !== '5519999222004@c.us') {
        await msg.reply("❌ Comando restrito ao master.");
        return;
      }

      const chat = await msg.getChat();
      const groupId = chat.isGroup ? chat.id._serialized : null;
      
      if (!groupId) {
        await msg.reply("⚠️ Este comando só funciona em grupos!");
        return;
      }

      let resposta = "🧪 **TESTE DE QUERIES SQL**\n\n";
      
      resposta += `🎯 **Testando com:**\n`;
      resposta += `📱 Group ID: \`${groupId}\`\n`;
      resposta += `👤 User ID: \`${senderId}\`\n\n`;
      
      // ===== TESTE 1: Query direta simples =====
      resposta += `🔍 **TESTE 1: Query direta**\n`;
      try {
        const resultado1 = db.prepare(`
          SELECT * FROM apelidos WHERE grupo_id = ? AND usuario_id = ?
        `).get(groupId, senderId);
        
        if (resultado1) {
          resposta += `✅ ENCONTRADO: "${resultado1.nickname}"\n`;
          resposta += `📊 Dados: locked=${resultado1.locked}, created_at=${resultado1.created_at}\n`;
        } else {
          resposta += `❌ NÃO ENCONTRADO\n`;
        }
      } catch (error) {
        resposta += `❌ ERRO: ${error.message}\n`;
      }
      
      // ===== TESTE 2: Prepared statement atual =====
      resposta += `\n🔍 **TESTE 2: Prepared statement atual**\n`;
      try {
        const resultado2 = statements.getNickname.get(groupId, senderId);
        
        if (resultado2) {
          resposta += `✅ ENCONTRADO: "${resultado2.nickname}"\n`;
          resposta += `📊 Dados: locked=${resultado2.locked}, created_at=${resultado2.created_at}\n`;
        } else {
          resposta += `❌ NÃO ENCONTRADO com prepared statement\n`;
        }
      } catch (error) {
        resposta += `❌ ERRO: ${error.message}\n`;
      }
      
      // ===== TESTE 3: Todos os apelidos do grupo =====
      resposta += `\n🔍 **TESTE 3: Todos apelidos do grupo**\n`;
      try {
        const todosApelidos = db.prepare(`
          SELECT usuario_id, nickname, locked, created_at 
          FROM apelidos 
          WHERE grupo_id = ?
        `).all(groupId);
        
        if (todosApelidos.length === 0) {
          resposta += `❌ Nenhum apelido encontrado no grupo\n`;
        } else {
          resposta += `✅ Encontrados ${todosApelidos.length} apelidos:\n`;
          todosApelidos.forEach((apelido, index) => {
            const isCurrentUser = apelido.usuario_id === senderId;
            const marker = isCurrentUser ? "👤 VOCÊ" : "👥";
            const number = apelido.usuario_id.replace('@c.us', '');
            
            resposta += `${index + 1}. ${marker} "${apelido.nickname}" (${number})\n`;
          });
        }
      } catch (error) {
        resposta += `❌ ERRO: ${error.message}\n`;
      }
      
      // ===== TESTE 4: Verificar prepared statement em detalhes =====
      resposta += `\n🔍 **TESTE 4: Debug do prepared statement**\n`;
      try {
        // Vamos recriar o prepared statement do zero
        const novoStatement = db.prepare(`
          SELECT nickname, locked, created_at, updated_at, set_by 
          FROM apelidos 
          WHERE grupo_id = ? AND usuario_id = ? 
          LIMIT 1
        `);
        
        const resultado4 = novoStatement.get(groupId, senderId);
        
        if (resultado4) {
          resposta += `✅ NOVO STATEMENT: "${resultado4.nickname}"\n`;
          resposta += `📊 Todos os campos funcionam\n`;
        } else {
          resposta += `❌ Nem o novo statement funciona\n`;
        }
      } catch (error) {
        resposta += `❌ ERRO: ${error.message}\n`;
      }
      
      // ===== TESTE 5: Verificar encoding/caracteres especiais =====
      resposta += `\n🔍 **TESTE 5: Verificar encoding**\n`;
      try {
        resposta += `📏 Group ID length: ${groupId.length}\n`;
        resposta += `📏 User ID length: ${senderId.length}\n`;
        resposta += `🔤 Group ID bytes: ${Buffer.from(groupId).length}\n`;
        resposta += `🔤 User ID bytes: ${Buffer.from(senderId).length}\n`;
        
        // Verificar se há caracteres invisíveis
        const cleanGroupId = groupId.trim();
        const cleanUserId = senderId.trim();
        
        if (groupId !== cleanGroupId) {
          resposta += `⚠️ Group ID tem espaços extras!\n`;
        }
        
        if (senderId !== cleanUserId) {
          resposta += `⚠️ User ID tem espaços extras!\n`;
        }
        
      } catch (error) {
        resposta += `❌ ERRO: ${error.message}\n`;
      }
      
      // ===== TESTE 6: Tentar inserir e consultar na hora =====
      resposta += `\n🔍 **TESTE 6: Inserir e consultar imediatamente**\n`;
      try {
        const testeNickname = `teste_${Date.now()}`;
        
        // Inserir
        db.prepare(`
          INSERT OR REPLACE INTO apelidos 
          (grupo_id, usuario_id, nickname, set_by, locked, created_at, updated_at) 
          VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(groupId, senderId, testeNickname, senderId);
        
        // Consultar imediatamente
        const consultaImediata = db.prepare(`
          SELECT nickname FROM apelidos WHERE grupo_id = ? AND usuario_id = ?
        `).get(groupId, senderId);
        
        if (consultaImediata && consultaImediata.nickname === testeNickname) {
          resposta += `✅ INSERT e SELECT funcionam perfeitamente\n`;
          resposta += `📝 Apelido teste criado: "${testeNickname}"\n`;
          
          // Limpar o teste
          db.prepare(`
            DELETE FROM apelidos WHERE grupo_id = ? AND usuario_id = ? AND nickname = ?
          `).run(groupId, senderId, testeNickname);
          
          resposta += `🧹 Apelido teste removido\n`;
        } else {
          resposta += `❌ Problema na inserção ou consulta\n`;
        }
        
      } catch (error) {
        resposta += `❌ ERRO: ${error.message}\n`;
      }
      
      await msg.reply(resposta);
      
    } catch (error) {
      logger.error("❌ Erro no comando testquery:", error.message);
      await msg.reply(`❌ Erro no teste: ${error.message}`);
    }
  }
};
