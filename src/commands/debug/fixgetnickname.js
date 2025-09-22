// ===== src/commands/debug/fixgetnickname.js =====
/**
 * Comando para diagnosticar e corrigir o prepared statement getNickname
 * O problema é que o statement está quebrado internamente
 * 
 * @author Volleyball Team
 * @version 1.0 - Correção do prepared statement
 */

const { db } = require("../../core/db");
const logger = require("../../utils/logger");

module.exports = {
  name: "!fixgetnickname",
  aliases: ["!fixget", "!corrigirget"],
  description: "Corrige o prepared statement getNickname (master only)",
  usage: "!fixgetnickname",
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

      let resposta = "🔧 **CORREÇÃO DO PREPARED STATEMENT**\n\n";
      
      // ===== PASSO 1: Testar statement atual =====
      resposta += `🔍 **PASSO 1: Testando statement atual**\n`;
      
      try {
        const { statements } = require("../../core/db");
        const resultado = statements.getNickname.get(groupId, senderId);
        
        if (resultado) {
          resposta += `✅ Statement atual funciona: "${resultado.nickname}"\n`;
        } else {
          resposta += `❌ Statement atual NÃO funciona\n`;
        }
      } catch (error) {
        resposta += `❌ Erro no statement atual: ${error.message}\n`;
      }
      
      // ===== PASSO 2: Verificar se dados existem =====
      resposta += `\n🔍 **PASSO 2: Verificando se dados existem**\n`;
      
      const dadosExistem = db.prepare(`
        SELECT usuario_id, nickname, locked, created_at 
        FROM apelidos 
        WHERE grupo_id = ? AND usuario_id = ?
      `).get(groupId, senderId);
      
      if (dadosExistem) {
        resposta += `✅ Dados existem: "${dadosExistem.nickname}"\n`;
        resposta += `📅 Criado: ${new Date(dadosExistem.created_at).toLocaleString('pt-BR')}\n`;
      } else {
        resposta += `❌ Dados NÃO existem no banco\n`;
        
        // Se não existem, criar um para teste
        resposta += `🔧 Criando apelido de teste...\n`;
        
        db.prepare(`
          INSERT OR REPLACE INTO apelidos 
          (grupo_id, usuario_id, nickname, set_by, locked, created_at, updated_at)
          VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(groupId, senderId, "TesteCorrecao", senderId);
        
        resposta += `✅ Apelido teste criado\n`;
      }
      
      // ===== PASSO 3: Criar novo statement do zero =====
      resposta += `\n🔧 **PASSO 3: Criando novo statement**\n`;
      
      try {
        // Criar statement completamente novo
        const novoGetNickname = db.prepare(`
          SELECT nickname, locked, created_at, updated_at, set_by 
          FROM apelidos 
          WHERE grupo_id = ? AND usuario_id = ? 
          LIMIT 1
        `);
        
        // Testar o novo statement
        const testNovo = novoGetNickname.get(groupId, senderId);
        
        if (testNovo) {
          resposta += `✅ Novo statement funciona: "${testNovo.nickname}"\n`;
          
          // Substituir o statement global
          const { statements } = require("../../core/db");
          statements.getNickname = novoGetNickname;
          
          resposta += `✅ Statement global substituído\n`;
          
          // Testar o statement substituído
          const testSubstituido = statements.getNickname.get(groupId, senderId);
          
          if (testSubstituido) {
            resposta += `✅ Statement substituído funciona: "${testSubstituido.nickname}"\n`;
          } else {
            resposta += `❌ Statement substituído NÃO funciona\n`;
          }
          
        } else {
          resposta += `❌ Novo statement NÃO funciona\n`;
        }
        
      } catch (error) {
        resposta += `❌ Erro ao criar novo statement: ${error.message}\n`;
      }
      
      // ===== PASSO 4: Testar outros statements críticos =====
      resposta += `\n🔍 **PASSO 4: Testando outros statements**\n`;
      
      try {
        const { statements } = require("../../core/db");
        
        // Testar isNicknameInUse
        const apelidoEmUso = statements.isNicknameInUse.get(groupId, "TesteUnico", senderId);
        resposta += `📝 isNicknameInUse: ${apelidoEmUso ? 'FUNCIONA' : 'FUNCIONA (não em uso)'}\n`;
        
        // Testar getUser
        const usuario = statements.getUser.get(senderId);
        resposta += `👤 getUser: ${usuario ? 'FUNCIONA' : 'NÃO FUNCIONA'}\n`;
        
      } catch (error) {
        resposta += `❌ Erro nos outros statements: ${error.message}\n`;
      }
      
      resposta += `\n🎉 **CORREÇÃO CONCLUÍDA!**\n`;
      resposta += `💡 Teste agora: \`!nick\``;
      
      await msg.reply(resposta);
      
    } catch (error) {
      logger.error("❌ Erro no fixgetnickname:", error.message);
      await msg.reply(`❌ Erro: ${error.message}`);
    }
  }
};
