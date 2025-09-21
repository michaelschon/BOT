/**
 * Comando para testar aliases
 * Lista todos os comandos e seus aliases
 * 
 * @author Volleyball Team
 */

const { listCommands } = require("../../config/commands");

module.exports = {
  name: "!testaliases",
  aliases: ["!aliases", "!comandos"],
  description: "Lista todos os comandos e aliases disponíveis",
  usage: "!testaliases [categoria]",
  category: "admin",
  requireAdmin: true,

  async execute(client, msg, args, senderId) {
    try {
      const chat = await msg.getChat();
      const categoria = args[0];
      
      // Lista todos os comandos
      const comandos = listCommands(false, categoria);
      
      if (comandos.length === 0) {
        await msg.reply(
          `📋 **Nenhum comando encontrado**\n\n` +
          `${categoria ? `Categoria "${categoria}" não encontrada.` : 'Nenhum comando disponível.'}\n\n` +
          `💡 Use \`!testaliases\` sem argumentos para ver todos.`
        );
        return;
      }

      let resposta = `📋 **Lista de Comandos${categoria ? ` - ${categoria}` : ''}**\n\n`;
      
      // Agrupar por categoria
      const categorias = {};
      comandos.forEach(cmd => {
        if (!categorias[cmd.category]) {
          categorias[cmd.category] = [];
        }
        categorias[cmd.category].push(cmd);
      });

      for (const [cat, cmds] of Object.entries(categorias)) {
        resposta += `🔹 **${cat.toUpperCase()}**\n`;
        
        cmds.forEach(cmd => {
          const adminIcon = cmd.requireAdmin ? '👑' : '👤';
          resposta += `${adminIcon} \`${cmd.name}\``;
          
          if (cmd.aliases && cmd.aliases.length > 0) {
            resposta += ` (aliases: ${cmd.aliases.map(a => `\`${a}\``).join(', ')})`;
          }
          
          resposta += `\n`;
          
          if (cmd.description) {
            resposta += `   📝 ${cmd.description}\n`;
          }
          
          resposta += `\n`;
        });
      }

      resposta += `\n📊 **Estatísticas:**\n`;
      resposta += `• Total de comandos: ${comandos.length}\n`;
      resposta += `• Categorias: ${Object.keys(categorias).length}\n`;
      
      const totalAliases = comandos.reduce((total, cmd) => total + (cmd.aliases?.length || 0), 0);
      resposta += `• Total de aliases: ${totalAliases}\n\n`;
      
      resposta += `💡 **Legenda:**\n`;
      resposta += `👑 = Comando de admin\n`;
      resposta += `👤 = Comando público\n\n`;
      
      resposta += `🎯 **Teste um alias:**\n`;
      resposta += `• \`!promover\` (alias de !op)\n`;
      resposta += `• \`!info\` (alias de !dados)\n`;
      resposta += `• \`!sticker\` (alias de !figurinha)`;

      // Quebrar mensagem se muito longa
      if (resposta.length > 4000) {
        const partes = [];
        const linhas = resposta.split('\n');
        let parteAtual = "";
        
        for (const linha of linhas) {
          if ((parteAtual + linha + '\n').length > 3500) {
            if (parteAtual) {
              partes.push(parteAtual);
              parteAtual = linha + '\n';
            }
          } else {
            parteAtual += linha + '\n';
          }
        }
        
        if (parteAtual) {
          partes.push(parteAtual);
        }
        
        // Enviar partes
        for (let i = 0; i < partes.length; i++) {
          const cabecalho = i === 0 ? "" : `📋 **Comandos (${i + 1}/${partes.length})**\n\n`;
          await msg.reply(cabecalho + partes[i]);
          
          if (i < partes.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
      } else {
        await msg.reply(resposta);
      }

    } catch (error) {
      console.error("Erro no testaliases:", error);
      await msg.reply("❌ Erro ao listar comandos e aliases.");
    }
  }
};
