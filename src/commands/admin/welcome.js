/**
 * Comando para configurar sistema de boas-vindas do grupo
 * Controla se mensagens automáticas são enviadas quando alguém entra
 * 
 * VERSÃO CORRIGIDA: Estrutura de módulo adequada + vCard corrigido
 * 
 * @author Volleyball Team
 * @version 2.3 - vCard da Julia corrigido
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
        // ===== MOSTRAR STATUS ATUAL =====
        const { getCommandConfig } = require("../../config/commands");
        const welcomeConfig = getCommandConfig("!welcome");
        
        // Verificação rigorosa do status
        const isEnabledGlobally = welcomeConfig.enabled === true;
        const allowedGroups = welcomeConfig.allowedGroups || [];
        const isGroupInAllowedList = allowedGroups.includes(groupId);
        
        // Sistema só está ativo se AMBAS as condições forem verdadeiras
        const isEnabled = isEnabledGlobally && isGroupInAllowedList;

        await msg.reply(
          `👋 **Sistema de Boas-vindas**\n\n` +
          `👥 **Grupo:** ${chat.name}\n` +
          `📊 **Status:** ${isEnabled ? '✅ ATIVO' : '❌ INATIVO'}\n\n` +
          `🔧 **Configurações:**\n` +
          `• Sistema global: ${isEnabledGlobally ? 'Habilitado' : 'Desabilitado'}\n` +
          `• Neste grupo: ${isGroupInAllowedList ? 'Permitido' : 'Não permitido'}\n` +
          `• Total de grupos ativos: ${allowedGroups.length}\n\n` +
          `📋 **Como funciona:**\n` +
          `• Detecta novos membros automaticamente\n` +
          `• Envia mensagem personalizada de boas-vindas\n` +
          `• Compartilha contato da Julia (Admin)\n` +
          `• Orienta sobre regras e cadastro\n\n` +
          `🎯 **Comandos:**\n` +
          `• \`!welcome on\` - Ativar neste grupo\n` +
          `• \`!welcome off\` - Desativar neste grupo\n` +
          `• \`!welcome test\` - Testar mensagem\n\n` +
          `💡 **Nota:** Por padrão, novos grupos ficam com boas-vindas DESABILITADAS.`
        );
        return;
      }

      if (action === 'on') {
        // ===== ATIVAR BOAS-VINDAS =====
        const { COMMAND_CONFIGS } = require("../../config/commands");
        
        // Garantir que o array existe
        if (!COMMAND_CONFIGS["!welcome"].allowedGroups) {
          COMMAND_CONFIGS["!welcome"].allowedGroups = [];
        }
        
        // Adicionar grupo à lista se não estiver lá
        if (!COMMAND_CONFIGS["!welcome"].allowedGroups.includes(groupId)) {
          COMMAND_CONFIGS["!welcome"].allowedGroups.push(groupId);
        }
        
        // Garantir que está habilitado globalmente também
        COMMAND_CONFIGS["!welcome"].enabled = true;

        await msg.reply(
          `✅ **Boas-vindas ATIVADAS!**\n\n` +
          `👥 **Grupo:** ${chat.name}\n` +
          `📊 **Status:** Ativo ✅\n` +
          `👮 **Ativado por:** ${senderId}\n` +
          `⏰ **Data:** ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n` +
          `🎉 **A partir de agora:**\n` +
          `• Novos membros receberão boas-vindas automáticas\n` +
          `• Contato da Julia será compartilhado automaticamente\n` +
          `• Orientações sobre regras serão enviadas\n` +
          `• Sistema monitora entradas no grupo 24/7\n\n` +
          `💡 Use \`!welcome test\` para testar a mensagem.`
        );

        console.log(`👋 Boas-vindas ATIVADAS no grupo ${chat.name} (${groupId}) por ${senderId}`);
        return;
      }

      if (action === 'off') {
        // ===== DESATIVAR BOAS-VINDAS =====
        const { COMMAND_CONFIGS } = require("../../config/commands");
        
        // Remover grupo da lista de grupos permitidos
        if (COMMAND_CONFIGS["!welcome"].allowedGroups) {
          const index = COMMAND_CONFIGS["!welcome"].allowedGroups.indexOf(groupId);
          if (index > -1) {
            COMMAND_CONFIGS["!welcome"].allowedGroups.splice(index, 1);
          }
        }

        await msg.reply(
          `❌ **Boas-vindas DESATIVADAS!**\n\n` +
          `👥 **Grupo:** ${chat.name}\n` +
          `📊 **Status:** Inativo ❌\n` +
          `👮 **Desativado por:** ${senderId}\n` +
          `⏰ **Data:** ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n` +
          `⚠️ **A partir de agora:**\n` +
          `• Novos membros NÃO receberão mensagens automáticas\n` +
          `• Sistema de boas-vindas está completamente desabilitado\n` +
          `• Bot ainda detecta novos membros para o banco de dados\n` +
          `• Você pode reativar com \`!welcome on\` a qualquer momento\n\n` +
          `✅ **Confirmação:** Sistema desativado com sucesso!`
        );

        console.log(`👋 Boas-vindas DESATIVADAS no grupo ${chat.name} (${groupId}) por ${senderId}`);
        return;
      }

      if (action === 'test') {
        // ===== TESTAR SISTEMA =====
        await msg.reply(
          `🧪 **Testando sistema de boas-vindas...**\n\n` +
          `📤 Enviando sequência completa de exemplo\n` +
          `📝 Incluindo: mensagem + vCard da Júlia + orientações\n\n` +
          `⏳ Aguarde alguns segundos...`
        );

        try {
          // Obter nome do usuário que está testando
          const contact = await msg.getContact();
          const testName = contact.pushname || 'Usuário Teste';
          
          // ===== ENVIAR SEQUÊNCIA DE BOAS-VINDAS =====
          
          // 1. Mensagem principal de boas-vindas
          const welcomeMsg = 
            `🏐 Seja muito bem-vindo(a) ao nosso grupo de vôlei, ${testName || 'novo(a) membro'}!\n\n` +
            `Que alegria ter você aqui conosco! 🎉\n\n` +
            `📋 **Primeiros passos:**\n` +
            `• Leia a descrição do grupo - as regras estão lá\n` +
            `• Se tiver dúvidas, pode perguntar à vontade!\n` +
            `• Apresente-se para o pessoal quando quiser\n\n` +
            `📝 **Para participar das partidas:**\n` +
            `Procure a Júlia (ADM) para fazer seu cadastro e entrar na lista de jogadores!\n\n` +
            `🏐 Estamos ansiosos para jogar volleyball com você! Seja bem-vindo(a) à família! 🤗`;
          
          await client.sendMessage(chat.id._serialized, welcomeMsg);
          
          // Aguardar um pouco antes de enviar o contato
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // 2. vCard da Julia - FORMATO CORRIGIDO baseado no código antigo
          const juliaVCard = [
            'BEGIN:VCARD',
            'VERSION:3.0',
            'FN:Júlia (ADM)',
            'ORG:Amigos do Vôlei',
            'TEL;type=CELL;type=VOICE;waid=5519971548071:+55 19 97154-8071',
            'END:VCARD'
          ].join('\n');

          // Enviar vCard da Julia com parseVCards: true
          await client.sendMessage(chat.id._serialized, juliaVCard, { 
            parseVCards: true 
          });
          
          // 3. Mensagem explicativa sobre o contato
          await new Promise(resolve => setTimeout(resolve, 1000));
          await client.sendMessage(chat.id._serialized, 
            `☝️ **Este é o contato da Júlia!**\n\n` +
            `📱 Clique no cartão acima para adicionar aos seus contatos\n` +
            `💬 Entre em contato com ela para:\n` +
            `• Fazer seu cadastro no grupo\n` +
            `• Entrar na lista de jogadores\n` +
            `• Tirar dúvidas sobre partidas\n` +
            `• Qualquer questão administrativa\n\n` +
            `🏐 Júlia vai te ajudar com tudo que precisar!`
          );
          
          // Confirmar teste após delay
          setTimeout(async () => {
            await msg.reply(
              `✅ **Teste concluído com sucesso!**\n\n` +
              `📤 **Sequência enviada:**\n` +
              `1. ✅ Mensagem de boas-vindas personalizada\n` +
              `2. ✅ vCard da Júlia (formato corrigido)\n` +
              `3. ✅ Instruções sobre o contato\n\n` +
              `👤 **Testado para:** ${testName}\n` +
              `📅 **Data:** ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n` +
              `🎯 **Resultado:** Sistema funcionando perfeitamente!\n` +
              `🏐 Novos membros receberão esta sequência completa.`
            );
          }, 6000);
          
        } catch (testError) {
          console.error("Erro no teste de boas-vindas:", testError);
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
        `• \`!welcome on\` - Ativar neste grupo\n` +
        `• \`!welcome off\` - Desativar neste grupo\n` +
        `• \`!welcome status\` - Ver status atual\n` +
        `• \`!welcome test\` - Testar sistema\n\n` +
        `💡 Use \`!welcome\` sem argumentos para ver o status atual.`
      );

    } catch (error) {
      console.error("Erro no comando welcome:", error);
      await msg.reply("❌ Erro interno no sistema de boas-vindas.");
    }
  }
};
