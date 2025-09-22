// ===== src/commands/debug/ultimate.js =====
/**
 * Diagnóstico FINAL para resolver o problema de uma vez por todas
 * Identifica exatamente onde está a falha na comunicação INSERT/SELECT
 * 
 * @author Volleyball Team
 * @version 1.0 - Solução definitiva
 */

const { db, statements } = require("../../core/db");
const logger = require("../../utils/logger");

module.exports = {
  name: "!ultimate",
  aliases: ["!final", "!solver"],
  description: "Diagnóstico final e correção definitiva (master only)",
  usage: "!ultimate",
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

      let resposta = "🔬 **DIAGNÓSTICO FINAL - ULTIMATE DEBUG**\n\n";
      
      // ===== PASSO 1: Estado atual =====
      resposta += `🎯 **PASSO 1: Estado atual**\n`;
      resposta += `📱 Group ID: \`${groupId}\`\n`;
      resposta += `👤 User ID: \`${senderId}\`\n\n`;
      
      // ===== PASSO 2: Verificar se dados estão inseridos =====
      resposta += `🔍 **PASSO 2: Verificando dados no banco**\n`;
      
      const dadosRaw = db.prepare(`
        SELECT rowid, * FROM apelidos 
        WHERE grupo_id = ? AND usuario_id = ?
      `).all(groupId, senderId);
      
      if (dadosRaw.length === 0) {
        resposta += `❌ NENHUM dado encontrado\n`;
        resposta += `🔧 Inserindo dados de teste...\n`;
        
        // Inserir dados de teste
        db.prepare(`
          INSERT INTO apelidos 
          (grupo_id, usuario_id, nickname, set_by, locked, created_at, updated_at) 
          VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(groupId, senderId, "UltimateTest", senderId);
        
        resposta += `✅ Dados de teste inseridos\n`;
        
        // Verificar novamente
        const dadosAposInsert = db.prepare(`
          SELECT rowid, * FROM apelidos 
          WHERE grupo_id = ? AND usuario_id = ?
        `).get(groupId, senderId);
        
        if (dadosAposInsert) {
          resposta += `✅ Confirmado: dados inseridos (rowid: ${dadosAposInsert.rowid})\n`;
        } else {
          resposta += `❌ FALHA: dados não foram inseridos!\n`;
        }
      } else {
        resposta += `✅ Encontrados ${dadosRaw.length} registros:\n`;
        dadosRaw.forEach((dado, index) => {
          resposta += `${index + 1}. rowid:${dado.rowid} - "${dado.nickname}" (${dado.locked ? 'bloqueado' : 'livre'})\n`;
        });
      }
      
      // ===== PASSO 3: Testar prepared statements um por um =====
      resposta += `\n🧪 **PASSO 3: Testando prepared statements**\n`;
      
      // 3A. Testar getNickname atual
      try {
        const resultGetNickname = statements.getNickname.get(groupId, senderId);
        if (resultGetNickname) {
          resposta += `✅ statements.getNickname: "${resultGetNickname.nickname}"\n`;
        } else {
          resposta += `❌ statements.getNickname: NULL\n`;
        }
      } catch (error) {
        resposta += `❌ statements.getNickname: ERRO - ${error.message}\n`;
      }
      
      // 3B. Criar novo statement identico
      try {
        const novoGetNickname = db.prepare(`
          SELECT nickname, locked, created_at, updated_at, set_by 
          FROM apelidos 
          WHERE grupo_id = ? AND usuario_id = ?
        `);
        
        const resultNovo = novoGetNickname.get(groupId, senderId);
        if (resultNovo) {
          resposta += `✅ Novo statement: "${resultNovo.nickname}"\n`;
        } else {
          resposta += `❌ Novo statement: NULL\n`;
        }
      } catch (error) {
        resposta += `❌ Novo statement: ERRO - ${error.message}\n`;
      }
      
      // 3C. Statement ainda mais simples
      try {
        const superSimples = db.prepare(`SELECT nickname FROM apelidos WHERE grupo_id = ? AND usuario_id = ?`);
        const resultSimples = superSimples.get(groupId, senderId);
        if (resultSimples) {
          resposta += `✅ Super simples: "${resultSimples.nickname}"\n`;
        } else {
          resposta += `❌ Super simples: NULL\n`;
        }
      } catch (error) {
        resposta += `❌ Super simples: ERRO - ${error.message}\n`;
      }
      
      // ===== PASSO 4: Verificar parâmetros exatos =====
      resposta += `\n🔍 **PASSO 4: Verificando parâmetros**\n`;
      
      // Verificar se os parâmetros estão corretos
      const debugParams = db.prepare(`
        SELECT 
          CASE WHEN grupo_id = ? THEN 'OK' ELSE 'FALHA' END as grupo_match,
          CASE WHEN usuario_id = ? THEN 'OK' ELSE 'FALHA' END as usuario_match,
          grupo_id, usuario_id, nickname
        FROM apelidos 
        WHERE rowid = (SELECT MAX(rowid) FROM apelidos)
      `).get(groupId, senderId);
      
      if (debugParams) {
        resposta += `📋 **Último registro inserido:**\n`;
        resposta += `• Grupo match: ${debugParams.grupo_match}\n`;
        resposta += `• Usuário match: ${debugParams.usuario_match}\n`;
        resposta += `• Grupo no banco: \`${debugParams.grupo_id}\`\n`;
        resposta += `• Usuário no banco: \`${debugParams.usuario_id}\`\n`;
        resposta += `• Nickname: "${debugParams.nickname}"\n`;
        
        if (debugParams.grupo_match === 'FALHA') {
          resposta += `⚠️ **PROBLEMA ENCONTRADO: Group ID não confere!**\n`;
        }
        
        if (debugParams.usuario_match === 'FALHA') {
          resposta += `⚠️ **PROBLEMA ENCONTRADO: User ID não confere!**\n`;
        }
      }
      
      // ===== PASSO 5: Corrigir statements definitivamente =====
      resposta += `\n🔧 **PASSO 5: Aplicando correção definitiva**\n`;
      
      try {
        // Sobrescrever statements com versões que FUNCIONAM
        const dbModule = require("../../core/db");
        
        // Statement ultra-simples que sabemos que funciona
        const statementFuncional = db.prepare(`
          SELECT nickname, locked, created_at, updated_at, set_by 
          FROM apelidos 
          WHERE grupo_id = ? AND usuario_id = ?
          LIMIT 1
        `);
        
        // Testar antes de substituir
        const testeAntes = statementFuncional.get(groupId, senderId);
        
        if (testeAntes) {
          // Funciona - substituir
          dbModule.statements.getNickname = statementFuncional;
          resposta += `✅ Statement substituído e funcionando\n`;
          
          // Testar após substituição
          const testeDepois = dbModule.statements.getNickname.get(groupId, senderId);
          if (testeDepois) {
            resposta += `✅ Teste pós-substituição: "${testeDepois.nickname}"\n`;
          } else {
            resposta += `❌ Teste pós-substituição: FALHOU\n`;
          }
        } else {
          resposta += `❌ Statement funcional também não funciona!\n`;
          resposta += `🔍 Há algo fundamentalmente errado...\n`;
        }
        
      } catch (fixError) {
        resposta += `❌ Erro na correção: ${fixError.message}\n`;
      }
      
      // ===== PASSO 6: Teste final =====
      resposta += `\n🎯 **PASSO 6: Teste final**\n`;
      
      try {
        const dbModule = require("../../core/db");
        const testeFinal = dbModule.statements.getNickname.get(groupId, senderId);
        
        if (testeFinal) {
          resposta += `🎉 **SUCESSO! Statement corrigido e funcionando!**\n`;
          resposta += `✅ Resultado: "${testeFinal.nickname}"\n`;
          resposta += `💡 Teste agora: \`!nick\`\n`;
        } else {
          resposta += `❌ **FALHA: Problema persiste**\n`;
          resposta += `🔍 Necessária investigação mais profunda\n`;
          
          // Último recurso - verificar schema da tabela
          const schema = db.prepare(`PRAGMA table_info(apelidos)`).all();
          resposta += `\n📋 **Schema da tabela:**\n`;
          schema.forEach(col => {
            resposta += `• ${col.name}: ${col.type} (${col.notnull ? 'NOT NULL' : 'NULLABLE'})\n`;
          });
        }
        
      } catch (finalError) {
        resposta += `❌ Erro no teste final: ${finalError.message}\n`;
      }
      
      await msg.reply(resposta);
      
    } catch (error) {
      logger.error("❌ Erro no comando ultimate:", error.message);
      await msg.reply(`❌ Erro no diagnóstico: ${error.message}`);
    }
  }
};
