// ===== src/commands/debug/groupids.js =====
/**
 * Comando para diagnosticar e corrigir IDs de grupos
 * Identifica discrepâncias entre IDs salvos e IDs atuais
 * 
 * @author Volleyball Team
 * @version 1.0 - Correção crítica de Group IDs
 */

const { statements, db } = require("../../core/db");
const logger = require("../../utils/logger");

module.exports = {
  name: "!groupids",
  aliases: ["!checkids", "!ids"],
  description: "Verifica e corrige IDs de grupos (master only)",
  usage: "!groupids [fix]",
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

      let resposta = "🔍 **DIAGNÓSTICO DE GROUP IDs**\n\n";
      
      // ID atual do grupo
      resposta += `📱 **ID atual do grupo:**\n`;
      resposta += `\`${currentGroupId}\`\n\n`;
      
      // Verificar todos os grupos no banco
      resposta += `🗄️ **Grupos no banco de dados:**\n`;
      
      const gruposNoBanco = db.prepare(`
        SELECT id, name, 
               (SELECT COUNT(*) FROM apelidos WHERE grupo_id = grupos.id) as apelidos_count,
               (SELECT COUNT(*) FROM admins_grupos WHERE grupo_id = grupos.id) as admins_count
        FROM grupos
        ORDER BY name
      `).all();
      
      let grupoEncontrado = false;
      let grupoComApelidos = null;
      
      if (gruposNoBanco.length === 0) {
        resposta += `❌ Nenhum grupo encontrado no banco\n\n`;
      } else {
        gruposNoBanco.forEach((grupo, index) => {
          const isCurrentGroup = grupo.id === currentGroupId;
          const status = isCurrentGroup ? "✅ ATUAL" : "⚠️ ANTIGO";
          
          resposta += `${index + 1}. ${status}\n`;
          resposta += `   📝 Nome: ${grupo.name || 'Sem nome'}\n`;
          resposta += `   🆔 ID: \`${grupo.id}\`\n`;
          resposta += `   👥 Apelidos: ${grupo.apelidos_count}\n`;
          resposta += `   👮 Admins: ${grupo.admins_count}\n\n`;
          
          if (isCurrentGroup) {
            grupoEncontrado = true;
          }
          
          if (grupo.apelidos_count > 0) {
            grupoComApelidos = grupo;
          }
        });
      }
      
      // Verificar apelidos órfãos
      const apelidosOrfaos = db.prepare(`
        SELECT a.grupo_id, a.nickname, a.usuario_id,
               g.name as grupo_nome
        FROM apelidos a
        LEFT JOIN grupos g ON a.grupo_id = g.id
        WHERE a.grupo_id != ?
        ORDER BY a.created_at DESC
      `).all(currentGroupId);
      
      if (apelidosOrfaos.length > 0) {
        resposta += `🔍 **Apelidos em outros grupos:**\n`;
        
        apelidosOrfaos.forEach((apelido, index) => {
          const userNumber = apelido.usuario_id.replace('@c.us', '');
          resposta += `${index + 1}. **${apelido.nickname}** (${userNumber})\n`;
          resposta += `   🆔 Grupo: \`${apelido.grupo_id}\`\n`;
          resposta += `   📝 Nome: ${apelido.grupo_nome || 'Nome não encontrado'}\n\n`;
        });
      }
      
      // Verificar se o usuário atual tem apelido em outro grupo
      const meuApelidoEmOutroGrupo = db.prepare(`
        SELECT * FROM apelidos 
        WHERE usuario_id = ? AND grupo_id != ?
      `).get(senderId, currentGroupId);
      
      if (meuApelidoEmOutroGrupo) {
        resposta += `🎯 **SEU APELIDO ENCONTRADO:**\n`;
        resposta += `✅ Apelido: **"${meuApelidoEmOutroGrupo.nickname}"**\n`;
        resposta += `📅 Criado: ${new Date(meuApelidoEmOutroGrupo.created_at).toLocaleString('pt-BR')}\n`;
        resposta += `🆔 No grupo: \`${meuApelidoEmOutroGrupo.grupo_id}\`\n\n`;
        resposta += `🔧 **SOLUÇÃO:** Use \`!groupids fix\` para migrar dados\n\n`;
      }
      
      // Se foi solicitado para corrigir
      if (args.includes("fix") && (grupoComApelidos || meuApelidoEmOutroGrupo)) {
        resposta += `🔧 **EXECUTANDO CORREÇÃO...**\n\n`;
        
        try {
          let migradosCount = 0;
          
          // Migrar apelidos do grupo antigo para o atual
          if (grupoComApelidos && grupoComApelidos.id !== currentGroupId) {
            const apelidosParaMigrar = db.prepare(`
              SELECT * FROM apelidos WHERE grupo_id = ?
            `).all(grupoComApelidos.id);
            
            for (const apelido of apelidosParaMigrar) {
              // Verificar se já existe no grupo atual
              const jaExiste = db.prepare(`
                SELECT 1 FROM apelidos WHERE grupo_id = ? AND usuario_id = ?
              `).get(currentGroupId, apelido.usuario_id);
              
              if (!jaExiste) {
                // Migrar apelido
                db.prepare(`
                  INSERT OR REPLACE INTO apelidos 
                  (grupo_id, usuario_id, nickname, set_by, locked, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                  currentGroupId,
                  apelido.usuario_id,
                  apelido.nickname,
                  apelido.set_by,
                  apelido.locked,
                  apelido.created_at,
                  apelido.updated_at
                );
                
                migradosCount++;
              }
            }
            
            resposta += `✅ Migrados ${migradosCount} apelidos\n`;
          }
          
          // Migrar admins se necessário
          const adminsParaMigrar = db.prepare(`
            SELECT * FROM admins_grupos WHERE grupo_id != ?
          `).all(currentGroupId);
          
          let adminsMigrados = 0;
          for (const admin of adminsParaMigrar) {
            const jaExisteAdmin = db.prepare(`
              SELECT 1 FROM admins_grupos WHERE grupo_id = ? AND usuario_id = ?
            `).get(currentGroupId, admin.usuario_id);
            
            if (!jaExisteAdmin) {
              db.prepare(`
                INSERT OR REPLACE INTO admins_grupos 
                (grupo_id, usuario_id, granted_by, granted_at)
                VALUES (?, ?, ?, ?)
              `).run(
                currentGroupId,
                admin.usuario_id,
                admin.granted_by,
                admin.granted_at
              );
              
              adminsMigrados++;
            }
          }
          
          if (adminsMigrados > 0) {
            resposta += `✅ Migrados ${adminsMigrados} admins\n`;
          }
          
          // Atualizar registro do grupo atual
          db.prepare(`
            INSERT OR REPLACE INTO grupos (id, name, description, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          `).run(currentGroupId, chat.name, chat.description || null);
          
          resposta += `✅ Grupo atual atualizado no banco\n`;
          
          resposta += `\n🎉 **MIGRAÇÃO CONCLUÍDA!**\n`;
          resposta += `💡 Agora teste: \`!nick\`\n`;
          
        } catch (fixError) {
          resposta += `❌ Erro durante correção: ${fixError.message}\n`;
          logger.error("Erro na migração de IDs:", fixError);
        }
      } else if (!args.includes("fix") && (grupoComApelidos || meuApelidoEmOutroGrupo)) {
        resposta += `💡 **Para corrigir automaticamente:**\n`;
        resposta += `🔧 Digite: \`!groupids fix\`\n`;
      }
      
      await msg.reply(resposta);
      
    } catch (error) {
      logger.error("❌ Erro no comando groupids:", error.message);
      await msg.reply(`❌ Erro no diagnóstico: ${error.message}`);
    }
  }
};
