/**
 * Comando para visualizar apelido atual do usuário
 * Mostra informações detalhadas sobre o apelido no grupo
 * 
 * @author Volleyball Team
 */

const { statements } = require("../../core/db");
const { checkCooldown, setCooldown } = require("../../config/commands");
const logger = require("../../utils/logger");

module.exports = {
  name: "!meuapelido",
  aliases: ["!meunick", "!apelido?", "!nick"],
  description: "Mostra seu apelido atual no grupo",
  usage: "!meuapelido",
  category: "apelidos",
  requireAdmin: false,

  /**
   * Executa o comando meuapelido
   * @param {Client} client Cliente do WhatsApp
   * @param {Message} msg Mensagem recebida
   * @param {Array} args Argumentos do comando
   * @param {string} senderId ID de quem enviou
   */
  async execute(client, msg, args, senderId) {
    try {
      const chat = await msg.getChat();
      
      // ========== VALIDAÇÕES BÁSICAS ==========
      
      // Só funciona em grupos
      if (!chat.isGroup) {
        await msg.reply("⚠️ Este comando só funciona em grupos!");
        return;
      }
      
      // Verifica cooldown (mais curto que o comando de definir)
      const cooldownLeft = checkCooldown(senderId, "!meuapelido");
      if (cooldownLeft > 0) {
        await msg.reply(`⏰ Aguarde ${cooldownLeft}s antes de consultar novamente.`);
        return;
      }
      
      const groupId = chat.id._serialized;
      
      // ========== CONSULTA O APELIDO ==========
      
      try {
        const resultado = statements.getNickname.get(groupId, senderId);
        
        if (!resultado || !resultado.nickname) {
          // Usuário não tem apelido definido
          const resposta = `
🏐 *Você ainda não tem um apelido!*

💡 **Como definir:**
• Digite \`!apelido SeuApelido\`
• Exemplo: \`!apelido Ace\` ou \`!apelido João\`

✨ **Dicas para um bom apelido:**
• Use entre 2 e 30 caracteres
• Seja criativo, mas respeitoso
• Emojis são bem-vindos 🏐
• Evite caracteres especiais

🤝 **Por que ter um apelido?**
Facilita a identificação nas partidas e torna o grupo mais divertido!
          `.trim();
          
          await msg.reply(resposta);
          return;
        }
        
        // ========== MONTA RESPOSTA DETALHADA ==========
        
        let resposta = `🏐 *Seu apelido no grupo:*\n\n`;
        resposta += `✨ **${resultado.nickname}**\n\n`;
        
        // Informações adicionais se disponíveis
        try {
          const { db } = require("../../core/db");
          const detalhes = db.prepare(`
            SELECT 
              a.nickname, 
              a.locked, 
              a.created_at, 
              a.updated_at,
              u.name as set_by_name
            FROM apelidos a
            LEFT JOIN usuarios u ON a.set_by = u.id
            WHERE a.grupo_id = ? AND a.usuario_id = ?
          `).get(groupId, senderId);
          
          if (detalhes) {
            // Status de bloqueio
            if (detalhes.locked === 1) {
              resposta += `🔒 **Status:** Bloqueado para alteração\n`;
              resposta += `💡 Apenas admins podem alterar\n\n`;
            } else {
              resposta += `🔓 **Status:** Pode ser alterado\n`;
              resposta += `💡 Use \`!apelido NovoNome\` para trocar\n\n`;
            }
            
            // Histórico
            if (detalhes.created_at) {
              const dataDefinido = new Date(detalhes.created_at);
              resposta += `📅 **Definido em:** ${dataDefinido.toLocaleDateString('pt-BR')}\n`;
            }
            
            if (detalhes.updated_at && detalhes.updated_at !== detalhes.created_at) {
              const dataAtualizado = new Date(detalhes.updated_at);
              resposta += `🔄 **Última alteração:** ${dataAtualizado.toLocaleDateString('pt-BR')}\n`;
            }
            
            // Quem definiu (se foi admin)
            if (detalhes.set_by_name && detalhes.set_by !== senderId) {
              resposta += `👤 **Definido por:** ${detalhes.set_by_name} (Admin)\n`;
            }
          }
          
        } catch (detailError) {
          logger.debug("Info adicional não disponível:", detailError.message);
        }
        
        // ========== ESTATÍSTICAS EXTRAS (se solicitado) ==========
        
        if (args.includes("--stats") || args.includes("-s")) {
          try {
            const { db } = require("../../core/db");
            // Quantos apelidos únicos no grupo
            const totalApelidos = db.prepare(`
              SELECT COUNT(*) as total FROM apelidos WHERE grupo_id = ?
            `).get(groupId);
            
            // Ranking de comprimento de apelidos (só por diversão)
            const rankingTamanho = db.prepare(`
              SELECT COUNT(*) as posicao FROM apelidos 
              WHERE grupo_id = ? AND LENGTH(nickname) <= LENGTH(?)
            `).get(groupId, resultado.nickname);
            
            resposta += `\n📊 **Estatísticas do grupo:**\n`;
            resposta += `• Total de apelidos: ${totalApelidos.total}\n`;
            resposta += `• Seu apelido tem ${resultado.nickname.length} caracteres\n`;
            
            if (rankingTamanho.posicao) {
              resposta += `• Ranking por tamanho: #${rankingTamanho.posicao}\n`;
            }
            
          } catch (statsError) {
            logger.debug("Erro ao obter estatísticas:", statsError.message);
          }
        }
        
        await msg.reply(resposta);
        
        // Log da consulta
        logger.debug(`👀 ${senderId} consultou apelido: "${resultado.nickname}" no grupo ${groupId}`);
        
        // Registra cooldown
        setCooldown(senderId, "!meuapelido");
        
      } catch (error) {
        logger.error("❌ Erro ao consultar apelido:", error.message);
        
        await msg.reply(
          `❌ Erro ao consultar seu apelido.\n\n` +
          `💡 Tente novamente ou contate um admin se o problema persistir.`
        );
      }
      
    } catch (error) {
      logger.error("❌ Erro geral no comando meuapelido:", error.message);
      console.error(error);
      
      await msg.reply("❌ Erro interno no sistema. Nossa equipe foi notificada.");
    }
  }
};
