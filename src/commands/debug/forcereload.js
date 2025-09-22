// ===== src/commands/debug/forcereload.js =====
/**
 * Comando para forçar reload completo do módulo db.js
 * Último recurso para problemas de cache de módulo
 */

module.exports = {
  name: "!forcereload",
  aliases: ["!reload", "!refresh"],
  description: "Força reload do módulo de banco (master only)",
  usage: "!forcereload",
  category: "debug",
  requireAdmin: true,

  async execute(client, msg, args, senderId) {
    try {
      if (senderId !== '5519999222004@c.us') {
        await msg.reply("❌ Comando restrito ao master.");
        return;
      }

      let resposta = "🔄 **FORÇANDO RELOAD DO MÓDULO DB**\n\n";
      
      try {
        // Limpar cache do require
        const dbPath = require.resolve("../../core/db");
        delete require.cache[dbPath];
        
        resposta += `✅ Cache do módulo limpo\n`;
        
        // Recarregar módulo
        const dbModule = require("../../core/db");
        
        resposta += `✅ Módulo recarregado\n`;
        
        // Testar se funcionou
        const chat = await msg.getChat();
        if (chat.isGroup) {
          const groupId = chat.id._serialized;
          
          try {
            const teste = dbModule.statements.getNickname.get(groupId, senderId);
            
            if (teste) {
              resposta += `✅ Teste pós-reload: "${teste.nickname}"\n`;
            } else {
              resposta += `⚠️ Teste pós-reload: nenhum dado encontrado\n`;
            }
          } catch (testError) {
            resposta += `❌ Teste pós-reload: ${testError.message}\n`;
          }
        }
        
        resposta += `\n🎉 **RELOAD CONCLUÍDO!**\n`;
        resposta += `💡 Teste: \`!nick\``;
        
      } catch (reloadError) {
        resposta += `❌ Erro no reload: ${reloadError.message}\n`;
      }
      
      await msg.reply(resposta);
      
    } catch (error) {
      await msg.reply(`❌ Erro: ${error.message}`);
    }
  }
};
