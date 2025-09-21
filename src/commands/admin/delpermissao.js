/**
 * Comando para remover permissões específicas de comandos
 * Remove permissões granulares por usuário
 * 
 * @author Volleyball Team
 */

const { normalizePhone } = require("../../utils/phone");
const { grantSpecialPermission } = require("../../config/auth");

module.exports = {
  name: "!delpermissao",
  aliases: ["!removeperm", "!delperm", "!delpermission"],
  description: "Remove permissões específicas de usuário",
  usage: "!delpermissao <telefone> <comando1,comando2,...>",
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
          "⚠️ Uso correto: `!delpermissao <telefone> <comandos>`\n\n" +
          "📋 **Exemplos:**\n" +
          "• `!delpermissao +55 19 99999-9999 !ban`\n" +
          "• `!delpermissao 19999999999 !ban,!op,!apelidoadmin`\n" +
          "• `!delpermissao 19 99999999 !invite,!adicionar`\n\n" +
          "💡 **Comandos separados por vírgula (sem espaços)**\n" +
          "🔍 Use `!listpermissao <telefone>` para ver permissões atuais"
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
          "• `!delpermissao +55 19 9999-9999 !ban,!op`\n" +
          "• `!delpermissao 19999999999 !invite`"
        );
        return;
      }

      if (!comandosStr) {
        await msg.reply(
          `⚠️ Nenhum comando especificado!\n\n` +
          "📋 **Exemplos válidos:**\n" +
          "• `!delpermissao ${rawPhone} !ban`\n" +
          "• `!delpermissao ${rawPhone} !ban,!op,!invite`\n\n" +
          "🔍 Use `!listpermissao ${rawPhone}` para ver permissões atuais"
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

      // Verificar se usuário tem permissões atuais
      const { db } = require("../../core/db");
      const permissoesAtuais = db.prepare(`
        SELECT comando FROM permissoes_especiais 
        WHERE grupo_id = ? AND usuario_id = ? AND permitido = 1
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      `).all(groupId, targetId);

      if (permissoesAtuais.length === 0) {
        await msg.reply(
          `ℹ️ **Usuário não possui permissões especiais**\n\n` +
          `📱 **Usuário:** \`${targetId}\`\n` +
          `👥 **Grupo:** ${chat.name}\n\n` +
          `💡 O usuário não tem permissões granulares para remover.\n` +
          `🔍 Use \`!listpermissao ${rawPhone}\` para confirmar.`
        );
        return;
      }

      const comandosComPermissao = permissoesAtuais.map(p => p.comando);
      const comandosInexistentes = comandos.filter(cmd => !comandosComPermissao.includes(cmd));

      if (comandosInexistentes.length === comandos.length) {
        await msg.reply(
          `⚠️ **Nenhum dos comandos especificados possui permissão**\n\n` +
          `📱 **Usuário:** \`${targetId}\`\n` +
          `❌ **Comandos solicitados:** ${comandos.join(', ')}\n\n` +
          `✅ **Permissões atuais:**\n` +
          `${comandosComPermissao.map(c => `• \`${c}\``).join('\n')}\n\n` +
          `💡 Verifique os comandos e tente novamente.`
        );
        return;
      }

      // Mensagem de processamento
      const statusMsg = await msg.reply(
        `🔄 **Removendo permissões...**\n\n` +
        `📱 **Usuário:** \`${targetId}\`\n` +
        `📋 **Comandos:** ${comandos.length}\n` +
        `👮 **Removido por:** ${senderId}\n\n` +
        `⏳ Processando...`
      );

      try {
        let sucessos = 0;
        let falhas = 0;
        let naoEncontrados = 0;
        const resultados = [];

        // Remover cada permissão
        for (const comando of comandos) {
          if (!comandosComPermissao.includes(comando)) {
            naoEncontrados++;
            resultados.push(`⚠️ ${comando} (não tinha permissão)`);
            continue;
          }

          try {
            // Revogar permissão (definir como false)
            const sucesso = grantSpecialPermission(groupId, targetId, comando, false, senderId);
            if (sucesso) {
              sucessos++;
              resultados.push(`✅ ${comando} (removido)`);
            } else {
              falhas++;
              resultados.push(`❌ ${comando} (falha na remoção)`);
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
        resposta += `👮 **Removido por:** ${senderId}\n`;
        resposta += `⏰ **Data:** ${new Date().toLocaleString('pt-BR')}\n\n`;
        resposta += `📊 **Resultados:**\n`;
        resposta += `• ✅ Removidos: ${sucessos}\n`;
        resposta += `• ❌ Falhas: ${falhas}\n`;
        resposta += `• ⚠️ Não encontrados: ${naoEncontrados}\n\n`;
        resposta += `📋 **Detalhes:**\n`;
        resposta += resultados.join('\n');

        if (sucessos > 0) {
          resposta += `\n\n🚫 **O usuário perdeu acesso aos comandos removidos!**\n`;
          resposta += `💡 Use \`!listpermissao ${rawPhone}\` para ver permissões restantes.`;
        }

        await statusMsg.edit(resposta);

        // Log da operação
        console.log(
          `🔑 Permissões removidas: ${senderId} revogou [${comandos.join(', ')}] ` +
          `de ${targetId} no grupo ${groupId} (${sucessos}/${comandos.length} sucessos)`
        );

      } catch (error) {
        console.error("Erro ao processar remoção de permissões:", error);
        await statusMsg.edit(
          `❌ **Erro ao processar remoção**\n\n` +
          `⚠️ Ocorreu um erro interno durante o processamento\n\n` +
          `🔧 **Erro:** ${error.message}\n\n` +
          `💡 **Solução:** Tente novamente ou contate o administrador.`
        );
      }

    } catch (error) {
      console.error("Erro no comando delpermissao:", error);
      await msg.reply("❌ Erro interno no sistema de permissões.");
    }
  }
};
