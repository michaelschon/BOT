/**
 * Comando para resetar completamente o sistema de apelidos
 * Remove todos os apelidos e recria estrutura do zero
 * 
 * @author Volleyball Team
 * @version 1.0 - Reset completo e seguro
 */

const { db } = require("../../core/db");
const logger = require("../../utils/logger");

module.exports = {
  name: "!resetapelidos",
  aliases: ["!limparapelidos", "!reset", "!clearapelidos"],
  description: "Reseta sistema de apelidos completamente (master only)",
  usage: "!resetapelidos [confirm] [--all]",
  category: "admin",
  requireAdmin: true,

  /**
   * Executa o comando resetapelidos
   * @param {Client} client Cliente do WhatsApp
   * @param {Message} msg Mensagem recebida
   * @param {Array} args Argumentos do comando
   * @param {string} senderId ID de quem enviou
   */
  async execute(client, msg, args, senderId) {
    try {
      // Apenas master pode usar este comando
      if (senderId !== '5519999222004@c.us') {
        await msg.reply("❌ Comando restrito ao usuário master.");
        return;
      }

      const chat = await msg.getChat();
      const groupId = chat.isGroup ? chat.id._serialized : null;
      const resetAll = args.includes("--all") || args.includes("-a");

      // Verificar confirmação
      if (!args.includes("confirm")) {
        let warningMsg = "⚠️ **ATENÇÃO: Comando destrutivo!**\n\n";
        
        if (resetAll) {
          warningMsg += "🗑️ Isso vai deletar **TODOS os apelidos** de **TODOS os grupos** do banco.\n\n";
          warningMsg += "💥 **OPERAÇÃO IRREVERSÍVEL!**\n\n";
          warningMsg += "📊 Para confirmar o reset completo: `!resetapelidos confirm --all`";
        } else if (groupId) {
          warningMsg += `🗑️ Isso vai deletar **todos os apelidos** do grupo atual.\n\n`;
          warningMsg += `👥 **Grupo:** ${chat.name}\n`;
          warningMsg += `🆔 **ID:** \`${groupId}\`\n\n`;
          warningMsg += "📊 Para confirmar: `!resetapelidos confirm`\n";
          warningMsg += "📊 Para resetar TUDO: `!resetapelidos confirm --all`";
        } else {
          warningMsg += "⚠️ Execute este comando em um grupo ou use `--all` para resetar tudo.\n\n";
          warningMsg += "📊 Para resetar tudo: `!resetapelidos confirm --all`";
        }
        
        await msg.reply(warningMsg);
        return;
      }

      let resposta = "🗑️ **RESETANDO SISTEMA DE APELIDOS**\n\n";
      
      try {
        if (resetAll) {
          // ===== RESET COMPLETO DE TODOS OS GRUPOS =====
          resposta += "💥 **RESET COMPLETO - TODOS OS GRUPOS**\n\n";
          
          // Obter estatísticas antes da limpeza
          const statsAntes = {
            totalApelidos: db.prepare("SELECT COUNT(*) as count FROM apelidos").get().count,
            totalGrupos: db.prepare("SELECT COUNT(DISTINCT grupo_id) as count FROM apelidos").get().count,
            totalUsuarios: db.prepare("SELECT COUNT(DISTINCT usuario_id) as count FROM apelidos").get().count
          };
          
          resposta += `📊 **Estatísticas atuais:**\n`;
          resposta += `• Total de apelidos: ${statsAntes.totalApelidos}\n`;
          resposta += `• Grupos com apelidos: ${statsAntes.totalGrupos}\n`;
          resposta += `• Usuários com apelidos: ${statsAntes.totalUsuarios}\n\n`;
          
          // Listar grupos que serão afetados
          const gruposAfetados = db.prepare(`
            SELECT g.name, g.id, COUNT(a.usuario_id) as total_apelidos
            FROM apelidos a
            LEFT JOIN grupos g ON a.grupo_id = g.id
            GROUP BY a.grupo_id
            ORDER BY total_apelidos DESC
          `).all();
          
          if (gruposAfetados.length > 0) {
            resposta += `🎯 **Grupos que serão afetados:**\n`;
            gruposAfetados.forEach((grupo, index) => {
              resposta += `${index + 1}. ${grupo.name || 'Sem nome'} (${grupo.total_apelidos} apelidos)\n`;
            });
            resposta += `\n`;
          }
          
          // Executar limpeza completa
          const resultadoDelete = db.prepare("DELETE FROM apelidos").run();
          resposta += `✅ **${resultadoDelete.changes} apelidos removidos de TODOS os grupos**\n\n`;
          
        } else if (groupId) {
          // ===== RESET APENAS DO GRUPO ATUAL =====
          resposta += `🎯 **RESET DO GRUPO ATUAL**\n\n`;
          resposta += `👥 **Grupo:** ${chat.name}\n`;
          resposta += `🆔 **ID:** \`${groupId}\`\n\n`;
          
          // Obter apelidos do grupo antes da limpeza
          const apelidosGrupo = db.prepare(`
            SELECT usuario_id, nickname, locked, created_at
            FROM apelidos 
            WHERE grupo_id = ?
            ORDER BY created_at DESC
          `).all(groupId);
          
          if (apelidosGrupo.length === 0) {
            resposta += `ℹ️ **Nenhum apelido encontrado neste grupo.**\n`;
            await msg.reply(resposta);
            return;
          }
          
          resposta += `📊 **Apelidos que serão removidos:**\n`;
          apelidosGrupo.forEach((apelido, index) => {
            const numero = apelido.usuario_id.replace('@c.us', '');
            const status = apelido.locked ? '🔒' : '🔓';
            const data = new Date(apelido.created_at).toLocaleDateString('pt-BR');
            
            resposta += `${index + 1}. ${status} **"${apelido.nickname}"** (${numero}) - ${data}\n`;
          });
          resposta += `\n`;
          
          // Executar limpeza do grupo
          const resultadoDelete = db.prepare("DELETE FROM apelidos WHERE grupo_id = ?").run(groupId);
          resposta += `✅ **${resultadoDelete.changes} apelidos removidos do grupo atual**\n\n`;
          
        } else {
          resposta += `❌ **Erro:** Não foi possível determinar o escopo do reset.\n`;
          await msg.reply(resposta);
          return;
        }
        
        // ===== OTIMIZAÇÃO PÓS-LIMPEZA =====
        resposta += `🔧 **Otimizando banco de dados...**\n`;
        
        try {
          // Vacuum para recuperar espaço
          db.prepare("VACUUM").run();
          resposta += `✅ Espaço em disco recuperado\n`;
          
          // Recriar índices se necessário
          db.prepare(`
            CREATE INDEX IF NOT EXISTS idx_apelidos_grupo_usuario ON apelidos(grupo_id, usuario_id)
          `).run();
          
          db.prepare(`
            CREATE INDEX IF NOT EXISTS idx_apelidos_nickname_lookup ON apelidos(grupo_id, LOWER(nickname))
          `).run();
          
          resposta += `✅ Índices otimizados\n`;
          
          // Otimização geral
          db.pragma('optimize');
          resposta += `✅ Banco otimizado\n\n`;
          
        } catch (optimizeError) {
          resposta += `⚠️ Erro na otimização: ${optimizeError.message}\n\n`;
        }
        
        // ===== ESTATÍSTICAS FINAIS =====
        const statsFinais = {
          totalApelidos: db.prepare("SELECT COUNT(*) as count FROM apelidos").get().count,
          totalUsuarios: db.prepare("SELECT COUNT(*) as count FROM usuarios").get().count,
          totalGrupos: db.prepare("SELECT COUNT(*) as count FROM grupos").get().count
        };
        
        resposta += `📊 **Estado final do banco:**\n`;
        resposta += `• Apelidos restantes: ${statsFinais.totalApelidos}\n`;
        resposta += `• Usuários cadastrados: ${statsFinais.totalUsuarios}\n`;
        resposta += `• Grupos cadastrados: ${statsFinais.totalGrupos}\n\n`;
        
        resposta += `🎉 **RESET CONCLUÍDO COM SUCESSO!**\n\n`;
        resposta += `💡 **Próximos passos:**\n`;
        resposta += `• Sistema de apelidos limpo e pronto\n`;
        resposta += `• Use \`!apelido NovoNome\` para criar apelidos\n`;
        resposta += `• Use \`!nick\` para verificar apelidos atuais\n`;
        resposta += `• Use \`!debug apelidos\` para diagnósticos`;
        
        // Log da operação para auditoria
        logger.warn(`🗑️ RESET DE APELIDOS executado pelo master ${senderId}`);
        logger.warn(`   Escopo: ${resetAll ? 'TODOS OS GRUPOS' : `Grupo ${groupId}`}`);
        logger.warn(`   Timestamp: ${new Date().toISOString()}`);
        
      } catch (resetError) {
        resposta += `❌ **Erro durante o reset:** ${resetError.message}\n\n`;
        resposta += `💡 **Recomendações:**\n`;
        resposta += `• Tente novamente\n`;
        resposta += `• Verifique integridade do banco\n`;
        resposta += `• Contate suporte técnico se necessário`;
        
        logger.error("Erro no reset de apelidos:", resetError);
      }
      
      await msg.reply(resposta);
      
    } catch (error) {
      logger.error("❌ Erro no comando resetapelidos:", error.message);
      await msg.reply(
        `❌ **Erro interno no comando**\n\n` +
        `🔧 Problema: ${error.message}\n\n` +
        `💡 Tente novamente ou contate o suporte técnico.`
      );
    }
  }
};
