// ===== src/commands/basic/ping.js =====
/**
 * Comando !ping - Ultra otimizado
 * Resposta mais rápida possível para teste de conectividade
 * 
 * @author Volleyball Team
 * @version 3.0 - Máxima performance
 */

module.exports = {
  name: "!ping",
  aliases: ["!p"],
  description: "Testa conectividade do bot - resposta instantânea",
  usage: "!ping",
  category: "basic",
  requireAdmin: false,
  
  /**
   * Execução ultra-otimizada do ping
   * @param {Client} client Cliente do WhatsApp  
   * @param {Message} msg Mensagem recebida
   * @param {Array} args Argumentos (não usado)
   * @param {string} senderId ID de quem enviou
   */
  async execute(client, msg, args, senderId) {
    // Timestamp de início para medir latência
    const startTime = process.hrtime.bigint();
    
    try {
      // Resposta direta e imediata - sem consultas ao banco
      await msg.reply("🏐 Pong!");
      
      // Calcular latência real
      const endTime = process.hrtime.bigint();
      const latency = Number(endTime - startTime) / 1000000; // ms
      
      // Log apenas se latência alta (debug)
      if (latency > 1000) {
        console.log(`⚠️ Ping com alta latência: ${latency.toFixed(2)}ms`);
      }
      
    } catch (error) {
      // Falback simples se der erro
      console.error('❌ Erro no ping:', error.message);
    }
  }
};
