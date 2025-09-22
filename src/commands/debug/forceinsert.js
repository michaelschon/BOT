// ===== src/commands/debug/forceinsert.js =====
/**
 * Comando para forçar inserção de apelido no grupo atual
 * Para casos onde é necessário recriar dados perdidos
 * 
 * @author Volleyball Team
 * @version 1.0 - Inserção forçada de apelidos
 */

const { statements } = require("../../core/db");
const logger = require("../../utils/logger");

module.exports = {
  name: "!forceinsert",
  aliases: ["!forcar", "!criarapelido"],
  description: "Força criação de apelido no grupo atual (master only)",
  usage: "!forceinsert <apelido>",
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

      if (args.length === 0) {
        await msg.reply(
          `⚠️ **Uso:** \`!forceinsert SeuApelido\`\n\n` +
          `📝 **Exemplo:** \`!forceinsert TesteMaster\`\n\n` +
          `💡 Este comando força a criação de um apelido no grupo atual.`
        );
        return;
      }

      const novoApelido = args.join(' ').trim();
      
      let resposta = `🔧 **INSERÇÃO FORÇADA DE APELIDO**\n\n`;
      
      resposta += `👤 **Usuário:** ${senderId}\n`;
      resposta += `👥 **Grupo:** ${chat.name}\n`;
      resposta += `🆔 **Group ID:** \`${groupId}\`\n`;
      resposta += `🏷️ **Apelido:** "${novoApelido}"\n\n`;
      
      try {
        // Primeiro, verificar se já existe
        const { db } = require("../../core/db");
        
        const jaTem = db.prepare(`
          SELECT nickname FROM apelidos WHERE grupo_id = ? AND usuario_id = ?
        `).get(groupId, senderId);
        
        if (jaTem) {
          resposta += `⚠️ **Já existe:** "${jaTem.nickname}"\n`;
          resposta += `🔄 **Será substituído pelo novo**\n\n`;
        }
        
        // Inserir/substituir o apelido
        db.prepare(`
          INSERT OR REPLACE INTO apelidos 
          (grupo_id, usuario_id, nickname, set_by, locked, created_at, updated_at)
          VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(groupId, senderId, novoApelido, senderId);
        
        resposta += `✅ **Apelido criado com sucesso!**\n\n`;
        
        // Verificar se foi criado corretamente
        const verificacao = db.prepare(`
          SELECT nickname, created_at FROM apelidos WHERE grupo_id = ? AND usuario_id = ?
        `).get(groupId, senderId);
        
        if (verificacao) {
          resposta += `🎯 **Verificação:**\n`;
          resposta += `✅ Encontrado: "${verificacao.nickname}"\n`;
          resposta += `📅 Criado: ${new Date(verificacao.created_at).toLocaleString('pt-BR')}\n\n`;
          
          resposta += `💡 **Teste agora:** \`!nick\``;
        } else {
          resposta += `❌ **Erro:** Não foi possível verificar a criação\n`;
        }
        
      } catch (insertError) {
        resposta += `❌ **Erro na inserção:** ${insertError.message}\n`;
        logger.error("Erro no forceinsert:", insertError);
      }
      
      await msg.reply(resposta);
      
    } catch (error) {
      logger.error("❌ Erro no comando forceinsert:", error.message);
      await msg.reply(`❌ Erro: ${error.message}`);
    }
  }
};
