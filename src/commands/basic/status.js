// ===== src/commands/basic/status.js =====
/**
 * Comando !status - Status detalhado do sistema (apenas admin)
 * Mostra estatísticas avançadas de performance
 * 
 * @author Volleyball Team
 * @version 3.0 - Estatísticas detalhadas
 */

const { statements, getDatabaseStats } = require('../../core/db');
const { cache } = require('../../core/cache');

module.exports = {
  name: "!status",
  aliases: ["!stats", "!estatisticas"],
  description: "Status detalhado do sistema (admin only)",
  usage: "!status",
  category: "admin",
  requireAdmin: true,
  
  /**
   * Mostra status completo do sistema
   * @param {Client} client Cliente do WhatsApp
   * @param {Message} msg Mensagem recebida
   * @param {Array} args Argumentos
   * @param {string} senderId ID de quem enviou
   */
  async execute(client, msg, args, senderId) {
    try {
      // Apenas Master pode ver stats completas
      if (senderId !== '5519999222004@c.us') {
        await msg.reply("❌ Comando restrito ao administrador master.");
        return;
      }
      
      const startTime = process.hrtime.bigint();
      
      let statusMsg = "📊 **STATUS DETALHADO DO SISTEMA**\n\n";
      
      // ===== ESTATÍSTICAS DO CACHE =====
      const cacheStats = cache.getStats();
      statusMsg += `💾 **CACHE DE PERFORMANCE**\n`;
      statusMsg += `• **Hit Rate:** ${cacheStats.hitRate}\n`;
      statusMsg += `• **Tamanho:** ${cacheStats.size}/${cacheStats.maxSize} entradas\n`;
      statusMsg += `• **Hits:** ${cacheStats.hits} | **Misses:** ${cacheStats.misses}\n`;
      statusMsg += `• **Memória:** ${cacheStats.memoryUsage}\n\n`;
      
      // ===== ESTATÍSTICAS DO BANCO =====
      const dbStats = getDatabaseStats();
      if (dbStats) {
        statusMsg += `🗄️ **BANCO DE DADOS**\n`;
        statusMsg += `• **Usuários:** ${dbStats.usuarios}\n`;
        statusMsg += `• **Grupos:** ${dbStats.grupos}\n`;
        statusMsg += `• **Admins:** ${dbStats.admins}\n`;
        statusMsg += `• **Apelidos:** ${dbStats.apelidos}\n`;
        statusMsg += `• **Silenciados:** ${dbStats.silenciados}\n`;
        statusMsg += `• **Tamanho:** ${dbStats.tamanho}\n`;
        statusMsg += `• **Modo:** ${dbStats.config.journal_mode}\n\n`;
      }
      
      // ===== INFORMAÇÕES DO CLIENTE =====
      const clientInfo = client.info;
      statusMsg += `🤖 **CLIENTE WHATSAPP**\n`;
      statusMsg += `• **Nome:** ${clientInfo.pushname}\n`;
      statusMsg += `• **Número:** ${clientInfo.wid.user}\n`;
      statusMsg += `• **Versão WA:** ${clientInfo.phone?.wa_version || 'N/A'}\n`;
      statusMsg += `• **Plataforma:** ${clientInfo.platform || 'N/A'}\n\n`;
      
      // ===== ESTATÍSTICAS DE CHATS =====
      const chats = await client.getChats();
      const groups = chats.filter(c => c.isGroup);
      const privateChats = chats.filter(c => !c.isGroup);
      
      statusMsg += `💬 **CHATS CONECTADOS**\n`;
      statusMsg += `• **Grupos:** ${groups.length}\n`;
      statusMsg += `• **Chats Privados:** ${privateChats.length}\n`;
      statusMsg += `• **Total:** ${chats.length}\n\n`;
      
      // ===== PERFORMANCE =====
      const endTime = process.hrtime.bigint();
      const responseTime = Number(endTime - startTime) / 1000000;
      
      statusMsg += `⚡ **PERFORMANCE**\n`;
      statusMsg += `• **Tempo desta consulta:** ${responseTime.toFixed(2)}ms\n`;
      statusMsg += `• **Uptime:** ${Math.floor(process.uptime() / 60)} minutos\n`;
      statusMsg += `• **Memória Node.js:** ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n\n`;
      
      statusMsg += `🏐 *Sistema operando com alta performance!*`;
      
      await msg.reply(statusMsg);
      
    } catch (error) {
      console.error('❌ Erro no comando status:', error.message);
      await msg.reply("❌ Erro ao obter status do sistema.");
    }
  }
};
