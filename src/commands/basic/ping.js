/**
 * Comando básico de teste
 * Verifica se o bot está respondendo
 * 
 * @author Volleyball Team
 */

const { checkCooldown, setCooldown } = require("../../config/commands");
const { getSenderId } = require("../../config/auth");

module.exports = {
  name: "!ping",
  aliases: ["!pong"],
  description: "Testa se o bot está funcionando",
  usage: "!ping",
  category: "básicos",
  requireAdmin: false,

  /**
   * Executa o comando ping
   * @param {Client} client Cliente do WhatsApp
   * @param {Message} msg Mensagem recebida
   * @param {Array} args Argumentos do comando
   * @param {string} senderId ID de quem enviou
   */
  async execute(client, msg, args, senderId) {
    try {
      // Verifica cooldown
      const cooldownLeft = checkCooldown(senderId, "!ping");
      if (cooldownLeft > 0) {
        await msg.reply(`⏰ Aguarde ${cooldownLeft}s antes de usar este comando novamente.`);
        return;
      }

      // Calcula tempo de resposta
      const startTime = Date.now();
      
      // Envia resposta
      await msg.reply("🏓 Pong! Bot funcionando perfeitamente!");
      
      const responseTime = Date.now() - startTime;
      
      // Envia informações adicionais se solicitado
      if (args.includes("--info") || args.includes("-i")) {
        const info = `
📊 *Informações do Ping:*
• Tempo de resposta: ${responseTime}ms
• Servidor: Online ✅
• Hora atual: ${new Date().toLocaleString('pt-BR')}
• Usuário: ${senderId}
        `.trim();
        
        await msg.reply(info);
      }

      // Registra cooldown
      setCooldown(senderId, "!ping");

    } catch (error) {
      console.error("Erro no comando ping:", error);
      await msg.reply("❌ Erro interno no comando ping.");
    }
  }
};
