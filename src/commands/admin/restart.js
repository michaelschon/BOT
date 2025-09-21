/**
 * Comando para reiniciar o bot
 * Apenas o usuário master pode executar
 * 
 * @author Volleyball Team
 */

const { isMaster } = require("../../config/auth");
const logger = require("../../utils/logger");

module.exports = {
  name: "!restart",
  aliases: ["!reboot", "!reiniciar"],
  description: "Reinicia o bot (apenas Master)",
  usage: "!restart",
  category: "admin",
  requireAdmin: true,

  /**
   * Executa o comando restart
   * @param {Client} client Cliente do WhatsApp
   * @param {Message} msg Mensagem recebida
   * @param {Array} args Argumentos do comando
   * @param {string} senderId ID de quem enviou
   */
  async execute(client, msg, args, senderId) {
    try {
      // Verificação adicional: apenas o Master pode reiniciar
      if (!isMaster(msg)) {
        await msg.reply("❌ Apenas o Master pode reiniciar o bot.");
        return;
      }

      logger.info(`🔄 Bot sendo reiniciado pelo Master: ${senderId}`);
      
      await msg.reply("♻️ Reiniciando o bot... Aguarde alguns segundos.");

      // Aguarda a mensagem ser enviada antes de reiniciar
      setTimeout(() => {
        logger.info("🛑 Finalizando processo para reinicialização...");
        process.exit(0);
      }, 2000);

    } catch (error) {
      logger.error("❌ Erro no comando restart:", error.message);
      await msg.reply("❌ Erro ao tentar reiniciar o bot.");
    }
  }
};
