/**
 * Comando para adicionar permissões específicas de comandos
 * Sistema granular de permissões por usuário
 * 
 * @author Volleyball Team
 */

const { normalizePhone } = require("../../utils/phone");
const { grantSpecialPermission } = require("../../config/auth");

module.exports = {
  name: "!addpermissao",
  aliases: ["!grantperm", "!addperm", "!addpermission"],
  description: "Adiciona permissões específicas para usuário",
  usage: "!addpermissao <telefone> <comando1,comando2,...>",
  category: "admin",
  requireAdmin: true,

  async execute(client, msg, args, senderId) {
    try {
      const chat = await msg.getChat();
      
      // Só funciona em grupos
      if (!chat.isGroup) {
        await msg.reply("⚠️ Este comando só funciona em grupos!");
        return;
      }

      if (args.length < 2) {
        await msg.reply(
          "⚠️ Uso correto: `!addpermissao <telefone> <comandos>`\n\n" +
          "📋 **Exemplos:**\n" +
          "• `!addpermissao +55 19 99999-9999 !ban`\n" +
          "• `!addpermissao 19999999999 !ban,!op,!apelidoadmin`\n" +
          "• `!addpermissao 19 99999999 !invite,!adicionar`\n\n" +
          "💡 **Comandos separados por vírgula (sem espaços)**"
        );
        return;
      }

      // Separar telefone dos comandos
      let rawPhone = "";
      let comandosStr = "";
      let targetId = null;
      
      // Tentar diferentes combinações para separar telefone dos comandos
      for (let i = 1; i <= args.length - 1; i++) {
        const phoneCandidate = args.slice(0, i).join(" ");
        const comandosCandidate = args.slice(i).join(" ");
        
        const normalizedPhone = normalizePhone(phoneCandidate);
        if (normalizedPhone) {
          rawPhone = phoneCandidate;
          comandosStr = comandosCandidate;
          targetId = normalizedPhone;
          break;
        }
      }

      if (!targetId) {
        await msg.reply(
          `⚠️ Número de telefone inválido nos argumentos: "${args.join(' ')}"\n\n` +
          "📱 Use um dos formatos:\n" +
          "• `!addpermissao +55 19 9999-9999 !ban,!op`\n" +
          "• `!addpermissao 19999999999 !invite`"
        );
        return;
      }

      if (!comandosStr) {
        await msg.reply(
          `⚠️ Nenhum comando especificado!\n\n` +
          "📋 **Exemplos válidos:**\n" +
          "• `!addpermissao ${rawPhone} !ban`\n" +
          "• `!addpermissao ${rawPhone} !ban,!op,!invite`"
        );
        return;
      }

      const groupId = chat.id._serialized;

      // Processar lista de comandos
      const comandos = comandosStr.split(',').map(cmd => {
        let cleanCmd = cmd.trim();
        if (!cleanCmd.startsWith('!')) {
          cleanCmd = '!' + cleanCmd;
        }
        return cleanCmd.toLowerCase();
      });

      // Validar comandos
      const { listCommands } = require("../../config/commands");
      const todosComandos = listCommands().map(c => c.name.toLowerCase());
      const comandosInvalidos = comandos.filter(cmd => !todosComandos.includes(cmd));

      if (comandosInvalidos.length > 0) {
        await msg.reply(
          `⚠️ **Comandos inválidos encontrados:**\n` +
          `${comandosInvalidos.map(c => `• \`${c}\``).join('\n')}\n\n` +
          "📋 **Comandos disponíveis:**\n" +
          `${todosComandos.slice(0, 10).map(c => `• \`${c}\``).join('\n')}\n` +
          `${todosComandos.length > 10 ? `... e mais ${todosComandos.length - 10}` : ''}\n\n` +
          `💡 Use \`!testaliases\` para ver todos os comandos disponíveis`
        );
        return;
      }

      // Mensagem de processamento
      const statusMsg = await msg.reply(
        `🔄 **Adicionando permissões...**\n\n` +
        `📱 **Usuário:** \`${targetId}\`\n` +
        `📋 **Comandos:** ${comandos.length}\n` +
        `👮 **Concedido por:** ${senderId}\n\n` +
        `⏳ Processando...`
      );

      try {
        let sucessos = 0;
        let falhas = 0;
        const resultados = [];

        // Adicionar cada permissão
        for (const comando of comandos) {
          try {
            const sucesso = grantSpecialPermission(groupId, targetId, comando, true, senderId);
            if (sucesso) {
              sucessos++;
              resultados.push(`✅ ${comando}`);
            } else {
              falhas++;
              resultados.push(`❌ ${comando} (falha)`);
            }
          } catch (error) {
            falhas++;
            resultados.push(`❌ ${comando} (erro: ${error.message})`);
          }
        }

        // Resposta final
        let resposta = `${sucessos > 0 ? '✅' : '❌'} **Permissões processadas!**\n\n`;
        resposta += `📱 **Usuário:** \`${targetId}\`\n`;
        resposta += `👥 **Grupo:** ${chat.name}\n`;
        resposta += `👮 **Concedido por:** ${senderId}\n`;
        resposta += `⏰ **Data:** ${new Date().toLocaleString('pt-BR')}\n\n`;
        resposta += `📊 **Resultados:**\n`;
        resposta += `• ✅ Sucessos: ${sucessos}\n`;
        resposta += `• ❌ Falhas: ${falhas}\n\n`;
        resposta += `📋 **Detalhes:**\n`;
        resposta += resultados.join('\n');

        if (sucessos > 0) {
          resposta += `\n\n🎯 **O usuário agora pode usar os comandos concedidos!**\n`;
          resposta += `💡 Use \`!listpermissao ${rawPhone}\` para ver todas as permissões.`;
        }

        await statusMsg.edit(resposta);

        // Log da operação
        console.log(
          `🔑 Permissões adicionadas: ${senderId} concedeu [${comandos.join(', ')}] ` +
          `para ${targetId} no grupo ${groupId} (${sucessos}/${comandos.length} sucessos)`
        );

      } catch (error) {
        console.error("Erro ao processar permissões:", error);
        await statusMsg.edit(
          `❌ **Erro ao processar permissões**\n\n` +
          `⚠️ Ocorreu um erro interno durante o processamento\n\n` +
          `🔧 **Erro:** ${error.message}\n\n` +
          `💡 **Solução:** Tente novamente ou contate o administrador.`
        );
      }

    } catch (error) {
      console.error("Erro no comando addpermissao:", error);
      await msg.reply("❌ Erro interno no sistema de permissões.");
    }
  }
};
