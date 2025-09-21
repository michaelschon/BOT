/**
 * Comando para configurar sistema de boas-vindas
 * Controla se mensagens automáticas são enviadas quando alguém entra
 * 
 * @author Volleyball Team
 */

module.exports = {
  name: "!welcome",
  aliases: ["!boasvindas", "!bemvindo"],
  description: "Configura sistema de boas-vindas do grupo",
  usage: "!welcome [on|off|status|test]",
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

      const action = args[0]?.toLowerCase();
      const groupId = chat.id._serialized;

      if (!action || action === 'status') {
        // Mostrar status atual
        const { getCommandConfig } = require("../../config/commands");
        const welcomeConfig = getCommandConfig("!welcome");
        
        const isEnabled = welcomeConfig.enabled && 
          (welcomeConfig.allowedGroups.length === 0 || 
           welcomeConfig.allowedGroups.includes(groupId));

        await msg.reply(
          `👋 **Sistema de Boas-vindas**\n\n` +
          `👥 **Grupo:** ${chat.name}\n` +
          `📊 **Status:** ${isEnabled ? '✅ Ativo' : '❌ Inativo'}\n\n` +
          `📋 **Funcionamento:**\n` +
          `• Detecta quando alguém entra no grupo\n` +
          `• Envia mensagem de boas-vindas personalizada\n` +
          `• Compartilha contato da Julia (Admin)\n` +
          `• Orienta sobre regras e cadastro\n\n` +
          `🎯 **Comandos:**\n` +
          `• \`!welcome on\` - Ativar neste grupo\n` +
          `• \`!welcome off\` - Desativar neste grupo\n` +
          `• \`!welcome test\` - Testar mensagem\n\n` +
          `💡 **Nota:** Apenas admins podem configurar este sistema.`
        );
        return;
      }

      if (action === 'on') {
        // Ativar boas-vindas para este grupo
        const { COMMAND_CONFIGS } = require("../../config/commands");
        
        if (!COMMAND_CONFIGS["!welcome"].allowedGroups.includes(groupId)) {
          COMMAND_CONFIGS["!welcome"].allowedGroups.push(groupId);
        }
        COMMAND_CONFIGS["!welcome"].enabled = true;

        await msg.reply(
          `✅ **Boas-vindas ativadas!**\n\n` +
          `👥 **Grupo:** ${chat.name}\n` +
          `📊 **Status:** Ativo ✅\n\n` +
          `🎉 **A partir de agora:**\n` +
          `• Novos membros receberão boas-vindas automáticas\n` +
          `• Contato da Julia será compartilhado\n` +
          `• Orientações sobre regras serão enviadas\n\n` +
          `💡 Use \`!welcome test\` para testar a mensagem.`
        );

        console.log(`👋 Boas-vindas ativadas no grupo ${chat.name} (${groupId}) por ${senderId}`);
        return;
      }

      if (action === 'off') {
        // Desativar boas-vindas para este grupo
        const { COMMAND_CONFIGS } = require("../../config/commands");
        
        const index = COMMAND_CONFIGS["!welcome"].allowedGroups.indexOf(groupId);
        if (index > -1) {
          COMMAND_CONFIGS["!welcome"].allowedGroups.splice(index, 1);
        }

        await msg.reply(
          `❌ **Boas-vindas desativadas!**\n\n` +
          `👥 **Grupo:** ${chat.name}\n` +
          `📊 **Status:** Inativo ❌\n\n` +
          `⚠️ **A partir de agora:**\n` +
          `• Novos membros NÃO receberão mensagens automáticas\n` +
          `• Sistema de boas-vindas está desabilitado\n` +
          `• Você pode reativar com \`!welcome on\`\n\n` +
          `💡 O bot ainda detectará novos membros para o banco de dados.`
        );

        console.log(`👋 Boas-vindas desativadas no grupo ${chat.name} (${groupId}) por ${senderId}`);
        return;
      }

      if (action === 'test') {
        // Testar mensagem de boas-vindas
        const { sendWelcomeMessage } = require("../../core/client");
        
        await msg.reply(
          `🧪 **Testando sistema de boas-vindas...**\n\n` +
          `📤 Enviando mensagem completa de exemplo\n` +
          `📝 Incluindo: mensagem + vCard da Júlia + orientações\n\n` +
          `⏳ Aguarde alguns segundos...`
        );

        try {
          // Obter nome do usuário que está testando
          const contact = await msg.getContact();
          const testName = contact.pushname || 'Usuário Teste';
          
          // Enviar mensagem de boas-vindas como teste
          await sendWelcomeMessage(client, chat, senderId, testName);
          
          // Confirmar teste
          setTimeout(async () => {
            await msg.reply(
              `✅ **Teste concluído com sucesso!**\n\n` +
              `📤 **Sequência enviada:**\n` +
              `1. ✅ Mensagem de boas-vindas personalizada\n` +
              `2. ✅ vCard da Júlia (clicável)\n` +
              `3. ✅ Instruções sobre o contato\n\n` +
              `👤 **Testado para:** ${testName}\n\n` +
              `🎯 **Resultado:** Sistema funcionando perfeitamente!\n` +
              `🏐 Novos membros receberão esta sequência completa.`
            );
          }, 8000); // Mais tempo para ver toda a sequência
          
        } catch (testError) {
          await msg.reply(
            `❌ **Erro no teste!**\n\n` +
            `⚠️ Não foi possível enviar a sequência completa\n\n` +
            `🔧 **Erro:** ${testError.message}\n\n` +
            `💡 **Possíveis causas:**\n` +
            `• Problema no envio do vCard\n` +
            `• Erro temporário do WhatsApp\n` +
            `• Bot sem permissões adequadas\n\n` +
            `🔄 **Solução:** Tente novamente em alguns segundos.`
          );
        }
        return;
      }

      // Comando inválido
      await msg.reply(
        `⚠️ **Opção inválida:** "${action}"\n\n` +
        `🎯 **Opções válidas:**\n` +
        `• \`!welcome on\` - Ativar\n` +
        `• \`!welcome off\` - Desativar\n` +
        `• \`!welcome status\` - Ver status\n` +
        `• \`!welcome test\` - Testar sistema\n\n` +
        `💡 Use \`!welcome\` sem argumentos para ver o status atual.`
      );

    } catch (error) {
      console.error("Erro no comando welcome:", error);
      await msg.reply("❌ Erro interno no sistema de boas-vindas.");
    }
  }
};
