/**
 * Comando !nick - Mostra apelido atual do usuário
 * Versão simplificada e otimizada para máxima performance
 * 
 * @author Volleyball Team
 * @version 3.0 - Simplificado e funcional
 */

const { statements } = require("../../core/db");
const { getCooldown, setCooldown } = require("../../core/cache");
const logger = require("../../utils/logger");

module.exports = {
  name: "!nick",
  aliases: ["!meunick", "!apelido?", "!meuapelido"],
  description: "Mostra seu apelido atual no grupo",
  usage: "!nick",
  category: "apelidos",
  requireAdmin: false,

  /**
   * Executa o comando nick
   * @param {Client} client Cliente do WhatsApp
   * @param {Message} msg Mensagem recebida
   * @param {Array} args Argumentos do comando
   * @param {string} senderId ID de quem enviou
   */
  async execute(client, msg, args, senderId) {
    try {
      const chat = await msg.getChat();
      
      // ===== VALIDAÇÕES BÁSICAS =====
      if (!chat.isGroup) {
        await msg.reply("⚠️ Este comando só funciona em grupos!");
        return;
      }
      
      // ===== VERIFICAÇÃO DE COOLDOWN =====
      const cooldownLeft = getCooldown(senderId, "!nick");
      if (cooldownLeft > 0) {
        const segundos = Math.ceil(cooldownLeft / 1000);
        await msg.reply(`⏰ Aguarde ${segundos}s antes de consultar novamente.`);
        return;
      }
      
      const groupId = chat.id._serialized;
      
      // ===== DEBUG: LOG DOS IDs =====
      logger.debug(`🔍 Consultando nick - GroupID: ${groupId}, UserID: ${senderId}`);
      
      // ===== CONSULTA O APELIDO =====
      try {
        const resultado = statements.getNickname.get(groupId, senderId);
        
        logger.debug(`🔍 Resultado da consulta nick: ${JSON.stringify(resultado)}`);
        
        if (!resultado || !resultado.nickname) {
          // ===== VERIFICAÇÃO ADICIONAL PARA DEBUG =====
          // Consulta direta para verificar se o problema é na query
          const { db } = require("../../core/db");
          
          const consultaDireta = db.prepare(`
            SELECT * FROM apelidos WHERE grupo_id = ? AND usuario_id = ?
          `).get(groupId, senderId);
          
          logger.debug(`🔍 Consulta direta nick: ${JSON.stringify(consultaDireta)}`);
          
          if (consultaDireta) {
            // ENCONTROU na consulta direta, problema na prepared statement
            await msg.reply(
              `🔧 **Debug detectado!**\n\n` +
              `✅ Seu nick foi encontrado: **"${consultaDireta.nickname}"**\n\n` +
              `⚠️ Mas há um problema técnico na consulta otimizada.\n` +
              `👨‍💻 Admin notificado para correção.\n\n` +
              `💡 **Temporário:** Use \`!debug apelidos\` para ver todos os dados.`
            );
            
            logger.error(`❌ INCONSISTÊNCIA: getNickname não encontra mas existe na tabela`);
            logger.error(`   GroupID: ${groupId}`);
            logger.error(`   UserID: ${senderId}`);
            logger.error(`   Dados encontrados: ${JSON.stringify(consultaDireta)}`);
            
            return;
          }
          
          // ===== REALMENTE NÃO TEM APELIDO =====
          const resposta = 
            `🏐 **Você ainda não tem um nick!**\n\n` +
            `💡 **Como definir:**\n` +
            `• Digite: \`!apelido SeuNick\`\n` +
            `• Exemplo: \`!apelido Ace\` ou \`!apelido João\`\n\n` +
            `✨ **Dicas para um bom nick:**\n` +
            `• Use entre 2 e 30 caracteres\n` +
            `• Seja criativo, mas respeitoso\n` +
            `• Emojis são bem-vindos 🏐\n` +
            `• Evite caracteres especiais\n\n` +
            `🤝 **Por que ter um nick?**\n` +
            `Facilita a identificação nas partidas e torna o grupo mais divertido!\n\n` +
            `🔍 **Debug:** IDs verificados, realmente sem nick cadastrado.`;
          
          await msg.reply(resposta);
          return;
        }
        
        // ===== APELIDO ENCONTRADO - RESPOSTA DETALHADA =====
        let resposta = `🏐 **Seu nick no grupo:**\n\n✨ **${resultado.nickname}**\n\n`;
        
        // Status de bloqueio
        if (resultado.locked === 1) {
          resposta += `🔒 **Status:** Bloqueado para alteração\n`;
          resposta += `👮 **Motivo:** Definido/bloqueado por administrador\n`;
          resposta += `💡 **Para alterar:** Peça para um admin usar \`!desbloquear ${resultado.nickname}\`\n\n`;
        } else {
          resposta += `🔓 **Status:** Pode ser alterado\n`;
          resposta += `💡 **Como alterar:** Use \`!apelido NovoNick\`\n\n`;
        }
        
        // Informações de data
        if (resultado.created_at) {
          try {
            const dataDefinido = new Date(resultado.created_at);
            const dataFormatada = dataDefinido.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            resposta += `📅 **Definido em:** ${dataFormatada}\n`;
          } catch (dateError) {
            logger.debug("Erro ao formatar data:", dateError.message);
          }
        }
        
        if (resultado.updated_at && resultado.updated_at !== resultado.created_at) {
          try {
            const dataAtualizado = new Date(resultado.updated_at);
            const dataFormatada = dataAtualizado.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            resposta += `🔄 **Última alteração:** ${dataFormatada}\n`;
          } catch (dateError) {
            logger.debug("Erro ao formatar data de atualização:", dateError.message);
          }
        }
        
        // Estatísticas do grupo (se solicitado)
        if (args.includes("--stats") || args.includes("-s")) {
          try {
            const { db } = require("../../core/db");
            
            const totalNicks = db.prepare(`
              SELECT COUNT(*) as total FROM apelidos WHERE grupo_id = ?
            `).get(groupId);
            
            if (totalNicks && totalNicks.total > 0) {
              resposta += `\n📊 **Estatísticas do grupo:**\n`;
              resposta += `• Total de membros com nick: ${totalNicks.total}\n`;
              resposta += `• Seu nick tem ${resultado.nickname.length} caracteres\n`;
              
              // Ranking por tamanho (só por diversão)
              const rankingTamanho = db.prepare(`
                SELECT COUNT(*) as posicao FROM apelidos 
                WHERE grupo_id = ? AND LENGTH(nickname) <= LENGTH(?)
              `).get(groupId, resultado.nickname);
              
              if (rankingTamanho && rankingTamanho.posicao) {
                resposta += `• Ranking por tamanho: #${rankingTamanho.posicao}\n`;
              }
            }
            
          } catch (statsError) {
            logger.debug("Erro ao obter estatísticas:", statsError.message);
          }
        }
        
        // ===== DICAS FINAIS =====
        if (!resultado.locked) {
          resposta += `\n💡 **Dica:** Para alterar, use \`!apelido NovoNick\``;
        }
        
        await msg.reply(resposta);
        
        // ===== LOG E COOLDOWN =====
        logger.info(`👀 ${senderId} consultou nick: "${resultado.nickname}" no grupo ${groupId}`);
        
        // Registrar cooldown
        setCooldown(senderId, "!nick", 3000); // 3 segundos
        
      } catch (dbError) {
        logger.error("❌ Erro na consulta ao banco:", dbError.message);
        
        await msg.reply(
          `❌ **Erro na consulta ao banco**\n\n` +
          `🔧 Problema técnico detectado na consulta de nicks.\n\n` +
          `💡 **O que fazer:**\n` +
          `• Tente \`!debug apelidos\` para diagnóstico\n` +
          `• Use \`!ping\` para testar conectividade\n` +
          `• Contate o admin se persistir\n\n` +
          `📝 **Erro técnico:** ${dbError.message}`
        );
      }
      
    } catch (error) {
      logger.error("❌ Erro geral no comando nick:", error.message);
      console.error(error);
      
      await msg.reply(
        `❌ **Erro interno do sistema**\n\n` +
        `🤖 A equipe técnica foi notificada automaticamente.\n` +
        `💡 Tente novamente em alguns minutos.\n\n` +
        `🔍 Para diagnóstico: \`!debug user\``
      );
    }
  }
};
