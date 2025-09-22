// ===== src/commands/debug/findlost.js =====
/**
 * Comando para encontrar apelidos "perdidos" por mudança de Group ID
 * Busca apelidos em todos os grupos e permite migração
 * 
 * @author Volleyball Team
 * @version 1.0 - Recuperação de apelidos perdidos
 */

const { db } = require("../../core/db");
const logger = require("../../utils/logger");

module.exports = {
  name: "!findlost",
  aliases: ["!recuperar", "!buscarapelidos"],
  description: "Busca apelidos perdidos em todos os grupos (master only)",
  usage: "!findlost [migrate]",
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
      const currentGroupId = chat.isGroup ? chat.id._serialized : null;
      
      if (!currentGroupId) {
        await msg.reply("⚠️ Este comando só funciona em grupos!");
        return;
      }

      let resposta = "🔍 **BUSCA POR APELIDOS PERDIDOS**\n\n";
      
      resposta += `🎯 **Grupo atual:**\n`;
      resposta += `📝 Nome: ${chat.name}\n`;
      resposta += `🆔 ID: \`${currentGroupId}\`\n\n`;
      
      // ===== BUSCAR SEU APELIDO EM TODOS OS GRUPOS =====
      resposta += `👤 **Seus apelidos em TODOS os grupos:**\n`;
      
      const meusApelidos = db.prepare(`
        SELECT a.grupo_id, a.nickname, a.locked, a.created_at, a.updated_at,
               g.name as grupo_nome
        FROM apelidos a
        LEFT JOIN grupos g ON a.grupo_id = g.id
        WHERE a.usuario_id = ?
        ORDER BY a.updated_at DESC
      `).all(senderId);
      
      if (meusApelidos.length === 0) {
        resposta += `❌ Nenhum apelido encontrado em lugar algum\n\n`;
      } else {
        resposta += `✅ Encontrados ${meusApelidos.length} apelidos:\n\n`;
        
        meusApelidos.forEach((apelido, index) => {
          const isCurrentGroup = apelido.grupo_id === currentGroupId;
          const status = isCurrentGroup ? "✅ ATUAL" : "⚠️ OUTRO GRUPO";
          const dataFormatada = new Date(apelido.created_at).toLocaleDateString('pt-BR');
          
          resposta += `${index + 1}. ${status}\n`;
          resposta += `   🏷️ Apelido: **"${apelido.nickname}"**\n`;
          resposta += `   📅 Criado: ${dataFormatada}\n`;
          resposta += `   🔒 Status: ${apelido.locked ? 'Bloqueado' : 'Livre'}\n`;
          resposta += `   👥 Grupo: ${apelido.grupo_nome || 'Nome não encontrado'}\n`;
          resposta += `   🆔 ID: \`${apelido.grupo_id}\`\n\n`;
        });
      }
      
      // ===== BUSCAR TODOS OS APELIDOS QUE PODERIAM SER DESTE GRUPO =====
      resposta += `🔍 **Apelidos que podem ser deste grupo:**\n`;
      
      // Buscar grupos com nomes similares ou que possam ser o mesmo grupo
      const gruposSimilares = db.prepare(`
        SELECT DISTINCT a.grupo_id, g.name as grupo_nome, COUNT(a.usuario_id) as total_apelidos
        FROM apelidos a
        LEFT JOIN grupos g ON a.grupo_id = g.id
        WHERE a.grupo_id != ? 
        AND (g.name LIKE '%${chat.name}%' OR g.name LIKE '%teste%' OR g.name LIKE '%bot%')
        GROUP BY a.grupo_id
        ORDER BY total_apelidos DESC
      `).all(currentGroupId);
      
      if (gruposSimilares.length === 0) {
        resposta += `❌ Nenhum grupo similar encontrado\n\n`;
      } else {
        resposta += `✅ Grupos similares encontrados:\n\n`;
        
        gruposSimilares.forEach((grupo, index) => {
          resposta += `${index + 1}. **${grupo.grupo_nome || 'Sem nome'}**\n`;
          resposta += `   👥 ${grupo.total_apelidos} apelidos\n`;
          resposta += `   🆔 \`${grupo.grupo_id}\`\n\n`;
        });
      }
      
      // ===== BUSCAR APELIDOS MAIS RECENTES =====
      resposta += `📅 **Apelidos criados recentemente (últimas 24h):**\n`;
      
      const apelidosRecentes = db.prepare(`
        SELECT a.grupo_id, a.usuario_id, a.nickname, a.created_at,
               g.name as grupo_nome,
               u.name as usuario_nome
        FROM apelidos a
        LEFT JOIN grupos g ON a.grupo_id = g.id
        LEFT JOIN usuarios u ON a.usuario_id = u.id
        WHERE datetime(a.created_at) > datetime('now', '-1 day')
        AND a.grupo_id != ?
        ORDER BY a.created_at DESC
      `).all(currentGroupId);
      
      if (apelidosRecentes.length === 0) {
        resposta += `❌ Nenhum apelido recente em outros grupos\n\n`;
      } else {
        resposta += `✅ ${apelidosRecentes.length} apelidos recentes:\n\n`;
        
        apelidosRecentes.forEach((apelido, index) => {
          const numero = apelido.usuario_id.replace('@c.us', '');
          const dataHora = new Date(apelido.created_at).toLocaleString('pt-BR');
          
          resposta += `${index + 1}. **"${apelido.nickname}"**\n`;
          resposta += `   👤 ${apelido.usuario_nome || numero}\n`;
          resposta += `   📅 ${dataHora}\n`;
          resposta += `   👥 ${apelido.grupo_nome || 'Grupo sem nome'}\n`;
          resposta += `   🆔 \`${apelido.grupo_id}\`\n\n`;
        });
      }
      
      // ===== OPÇÃO DE MIGRAÇÃO =====
      if (args.includes("migrate") || args.includes("migrar")) {
        resposta += `🔧 **EXECUTANDO MIGRAÇÃO...**\n\n`;
        
        try {
          let migradosCount = 0;
          
          // Migrar TODOS os apelidos do usuário master para o grupo atual
          for (const apelido of meusApelidos) {
            if (apelido.grupo_id !== currentGroupId) {
              // Verificar se já existe no grupo atual
              const jaExiste = db.prepare(`
                SELECT 1 FROM apelidos WHERE grupo_id = ? AND usuario_id = ?
              `).get(currentGroupId, senderId);
              
              if (!jaExiste) {
                // Migrar apelido mantendo dados originais
                db.prepare(`
                  INSERT INTO apelidos 
                  (grupo_id, usuario_id, nickname, set_by, locked, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `).run(
                  currentGroupId,
                  senderId,
                  apelido.nickname,
                  apelido.set_by || senderId,
                  apelido.locked,
                  apelido.created_at
                );
                
                migradosCount++;
                
                logger.info(`🔄 Apelido migrado: "${apelido.nickname}" de ${apelido.grupo_id} para ${currentGroupId}`);
              }
            }
          }
          
          // Migrar apelidos recentes que podem ser deste grupo
          for (const apelido of apelidosRecentes) {
            // Verificar se já existe
            const jaExiste = db.prepare(`
              SELECT 1 FROM apelidos WHERE grupo_id = ? AND usuario_id = ?
            `).get(currentGroupId, apelido.usuario_id);
            
            if (!jaExiste) {
              // Migrar se foi criado recentemente
              db.prepare(`
                INSERT INTO apelidos 
                (grupo_id, usuario_id, nickname, set_by, locked, created_at, updated_at)
                VALUES (?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP)
              `).run(
                currentGroupId,
                apelido.usuario_id,
                apelido.nickname,
                apelido.usuario_id,
                apelido.created_at
              );
              
              migradosCount++;
              
              logger.info(`🔄 Apelido recente migrado: "${apelido.nickname}" para ${currentGroupId}`);
            }
          }
          
          if (migradosCount > 0) {
            resposta += `✅ Migrados ${migradosCount} apelidos!\n`;
            resposta += `🎉 **Migração concluída!**\n`;
            resposta += `💡 Teste agora: \`!nick\`\n`;
          } else {
            resposta += `ℹ️ Nenhum apelido precisava ser migrado\n`;
          }
          
        } catch (migrateError) {
          resposta += `❌ Erro na migração: ${migrateError.message}\n`;
          logger.error("Erro na migração:", migrateError);
        }
      } else {
        resposta += `💡 **Para migrar automaticamente:**\n`;
        resposta += `🔧 Digite: \`!findlost migrate\`\n`;
      }
      
      await msg.reply(resposta);
      
    } catch (error) {
      logger.error("❌ Erro no comando findlost:", error.message);
      await msg.reply(`❌ Erro na busca: ${error.message}`);
    }
  }
};
