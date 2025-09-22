// ===== src/commands/basic/ajuda.js =====
/**
 * Comando !ajuda - Lista de comandos disponíveis
 * Mostra comandos baseados nas permissões do usuário
 * 
 * @author Volleyball Team
 * @version 3.0 - Ajuda inteligente
 */

module.exports = {
  name: "!help",
  aliases: ["!cmds", "!?"],
  description: "Lista de comandos disponíveis",
  usage: "!help [comando]",
  category: "basic",
  requireAdmin: false,
  
  /**
   * Mostra ajuda dos comandos
   * @param {Client} client Cliente do WhatsApp
   * @param {Message} msg Mensagem recebida
   * @param {Array} args Argumentos
   * @param {string} senderId ID de quem enviou
   */
  async execute(client, msg, args, senderId) {
    try {
      const chat = await msg.getChat();
      const isAdmin = senderId === '5519999222004@c.us'; // Simplificado para speed
      const isGroup = chat.isGroup;
      
      let helpMsg = "🏐 **COMANDOS DO VOLLEYBALL BOT**\n\n";
      
      // ===== COMANDOS BÁSICOS (TODOS) =====
      helpMsg += `🆓 **COMANDOS LIVRES**\n`;
      helpMsg += `• \`!ping\` - Testa conectividade\n`;
      helpMsg += `• \`!dados\` - Informações do grupo/usuário\n`;
      helpMsg += `• \`!ajuda\` - Esta mensagem\n\n`;
      
      // ===== COMANDOS DE USUÁRIO =====
      if (isGroup) {
        helpMsg += `👤 **COMANDOS DE USUÁRIO**\n`;
        helpMsg += `• \`!apelido [nome]\` - Define seu apelido\n`;
        helpMsg += `• \`!nick\` - Mostra seu apelido atual\n\n`;
      }
      
      // ===== COMANDOS DE ADMIN =====
      if (isAdmin) {
        helpMsg += `👮 **COMANDOS DE ADMIN**\n`;
        helpMsg += `• \`!status\` - Status detalhado do sistema\n`;
        helpMsg += `• \`!lista\` - Lista de usuários e apelidos\n`;
        helpMsg += `• \`!silenciar [user] [min]\` - Silencia usuário\n`;
        helpMsg += `• \`!liberar [user]\` - Remove silenciamento\n`;
        helpMsg += `• \`!bloquear [apelido]\` - Bloqueia apelido\n`;
        helpMsg += `• \`!desbloquear [apelido]\` - Desbloqueia apelido\n`;
        helpMsg += `• \`!restart\` - Reinicia o bot\n\n`;
      }
      
      // ===== COMANDOS MASTER =====
      if (senderId === '5519999222004@c.us') {
        helpMsg += `🔧 **COMANDOS MASTER**\n`;
        helpMsg += `• \`!addadmin [user]\` - Adiciona admin\n`;
        helpMsg += `• \`!removeadmin [user]\` - Remove admin\n`;
        helpMsg += `• \`!limpar [quantidade]\` - Limpa mensagens\n\n`;
      }
      
      helpMsg += `💡 **DICAS:**\n`;
      helpMsg += `• Use \`!ajuda [comando]\` para ajuda específica\n`;
      helpMsg += `• Todos os comandos começam com \`!\`\n`;
      helpMsg += `• Em caso de dúvidas, contacte um admin\n\n`;
      
      helpMsg += `🏐 *Bot otimizado para máxima velocidade!*`;
      
      await msg.reply(helpMsg);
      
    } catch (error) {
      console.error('❌ Erro no comando ajuda:', error.message);
      await msg.reply("❌ Erro ao mostrar ajuda. Use !ping para testar conectividade.");
    }
  }
};
