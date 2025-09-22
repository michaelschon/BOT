// ===== src/commands/basic/dados.js =====
/**
 * Comando !dados - Informações do grupo e usuário
 * Otimizado com cache para resposta rápida
 * 
 * @author Volleyball Team  
 * @version 3.0 - Com cache inteligente
 */

const { cache } = require('../../core/cache');

module.exports = {
  name: "!dados",
  aliases: ["!info", "!dados_grupo"],
  description: "Mostra informações do grupo e usuário",
  usage: "!dados",
  category: "basic", 
  requireAdmin: false,
  
  /**
   * Execução otimizada com cache
   * @param {Client} client Cliente do WhatsApp
   * @param {Message} msg Mensagem recebida  
   * @param {Array} args Argumentos (não usado)
   * @param {string} senderId ID de quem enviou
   */
  async execute(client, msg, args, senderId) {
    const startTime = process.hrtime.bigint();
    
    try {
      const chat = await msg.getChat();
      
      // ===== INFORMAÇÕES BÁSICAS =====
      let dadosMsg = "📊 **DADOS DO SISTEMA**\n\n";
      
      // Informações do usuário (com cache)
      let userInfo = cache.getUserInfo(senderId);
      
      if (!userInfo) {
        // Cache miss - obter do contato
        const contact = await msg.getContact();
        userInfo = {
          name: contact.pushname || contact.name || 'Usuário',
          number: contact.number || senderId.replace('@c.us', '')
        };
        
        // Cachear para próximas consultas
        cache.setUserInfo(senderId, userInfo);
      }
      
      dadosMsg += `👤 **Solicitado por:** ${userInfo.name}\n`;
      dadosMsg += `📱 **Seu ID:** \`${senderId}\`\n\n`;
      
      // ===== INFORMAÇÕES DO CHAT =====
      if (chat.isGroup) {
        // Informações do grupo (com cache)
        let groupInfo = cache.getGroupInfo(chat.id._serialized);
        
        if (!groupInfo) {
          groupInfo = {
            name: chat.name,
            id: chat.id._serialized,
            participantCount: chat.participants.length,
            description: chat.description
          };
          
          // Cachear informações do grupo
          cache.setGroupInfo(chat.id._serialized, groupInfo);
        }
        
        dadosMsg += `👥 **Nome do Grupo:** ${groupInfo.name}\n`;
        dadosMsg += `🆔 **ID do Grupo:** \`${groupInfo.id}\`\n`;
        dadosMsg += `👫 **Participantes:** ${groupInfo.participantCount} pessoas\n`;
        
        if (groupInfo.description) {
          const descPreview = groupInfo.description.length > 100 
            ? groupInfo.description.substring(0, 100) + "..."
            : groupInfo.description;
          dadosMsg += `📝 **Descrição:** ${descPreview}\n`;
        }
        
      } else {
        dadosMsg += `💬 **Chat Privado**\n`;
        dadosMsg += `🆔 **ID do Chat:** \`${chat.id._serialized}\`\n`;
      }
      
      // ===== INFORMAÇÕES DO BOT =====
      dadosMsg += `\n🤖 **Bot Status:**\n`;
      dadosMsg += `✅ **Online e Funcionando**\n`;
      
      // Tempo de resposta
      const endTime = process.hrtime.bigint();
      const responseTime = Number(endTime - startTime) / 1000000; // ms
      dadosMsg += `⚡ **Tempo de resposta:** ${responseTime.toFixed(0)}ms\n`;
      
      // ===== CACHE STATS (apenas para debug se for admin) =====
      const isUserAdmin = senderId === '5519999222004@c.us'; // Master user
      if (isUserAdmin) {
        const cacheStats = cache.getStats();
        dadosMsg += `\n🔧 **Debug (Admin):**\n`;
        dadosMsg += `📊 Cache: ${cacheStats.hitRate} hit rate\n`;
        dadosMsg += `💾 Memória: ${cacheStats.memoryUsage}\n`;
      }
      
      dadosMsg += `\n🏐 *Volleyball Bot v3.0 - Otimizado*`;
      
      // Enviar resposta
      await msg.reply(dadosMsg);
      
      // Log de performance se muito lento
      if (responseTime > 500) {
        console.log(`⚠️ Comando !dados lento: ${responseTime.toFixed(2)}ms`);
      }
      
    } catch (error) {
      console.error('❌ Erro no comando dados:', error.message);
      
      // Resposta de fallback
      await msg.reply(
        "❌ Erro ao obter dados. Bot funcionando, mas com problema temporário.\n\n" +
        `👤 **Solicitado por:** ${senderId}\n` +
        `⏰ **Timestamp:** ${new Date().toLocaleString('pt-BR')}`
      );
    }
  }
};
