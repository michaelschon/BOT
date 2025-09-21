/**
 * Comando para banir usuário do grupo
 * Remove admin se necessário e depois expulsa do grupo
 * 
 * @author Volleyball Team
 */

const { normalizePhone } = require("../../utils/phone");
const { removeGroupAdmin, MASTER_USER_ID } = require("../../config/auth");

module.exports = {
  name: "!ban",
  aliases: ["!kick", "!remover", "!expulsar"],
  description: "Remove usuário do grupo (com motivo opcional)",
  usage: "!ban <telefone> [motivo]",
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

      if (args.length < 1) {
        await msg.reply(
          "⚠️ Uso correto: `!ban <telefone> [motivo]`\n\n" +
          "📱 Formatos aceitos:\n" +
          "• `!ban +55 19 9999-9999 Spam`\n" +
          "• `!ban 19999999999 Comportamento inadequado`\n" +
          "• `!ban 19 99999999` (sem motivo)\n\n" +
          "⚠️ **ATENÇÃO:** Esta ação remove permanentemente o usuário do grupo!"
        );
        return;
      }

      // Verificar se o bot tem permissão
      const botParticipant = chat.participants.find(p => p.id._serialized === client.info.wid._serialized);
      if (!botParticipant || !botParticipant.isAdmin) {
        await msg.reply(
          `⚠️ **Bot sem permissões!**\n\n` +
          `🤖 O bot precisa ser admin do grupo para remover usuários\n\n` +
          `💡 **Solução:** Peça para um admin do WhatsApp promover o bot primeiro.`
        );
        return;
      }

      // Separar telefone do motivo
      let rawPhone = "";
      let motivo = "";
      let targetId = null;
      
      // Tentar diferentes combinações para separar telefone do motivo
      for (let i = 1; i <= args.length; i++) {
        const phoneCandidate = args.slice(0, i).join(" ");
        const motivoCandidate = args.slice(i).join(" ");
        
        const normalizedPhone = normalizePhone(phoneCandidate);
        if (normalizedPhone) {
          rawPhone = phoneCandidate;
          motivo = motivoCandidate.trim();
          targetId = normalizedPhone;
          break;
        }
      }

      if (!targetId) {
        await msg.reply(
          `⚠️ Número de telefone inválido: "${args.join(' ')}"\n\n` +
          "📱 Use um formato válido:\n" +
          "• `!ban +55 19 9999-9999 motivo`\n" +
          "• `!ban 19999999999 motivo`"
        );
        return;
      }

      // PROTEÇÃO: Não pode banir o Master
      if (targetId === MASTER_USER_ID) {
        await msg.reply(
          `🛡️ **OPERAÇÃO BLOQUEADA!**\n\n` +
          `⚠️ **Tentativa de banir Master detectada!**\n` +
          `👑 O Master não pode ser removido do grupo\n` +
          `🔒 Esta é uma proteção do sistema\n\n` +
          `📝 **Ação registrada:** ${senderId} tentou banir Master`
        );

        console.warn(
          `🚨 TENTATIVA DE BANIR MASTER: ${senderId} tentou banir ` +
          `${targetId} no grupo ${chat.id._serialized}`
        );
        return;
      }

      // Verificar se o usuário está no grupo
      const targetParticipant = chat.participants.find(p => p.id._serialized === targetId);
      if (!targetParticipant) {
        await msg.reply(
          `⚠️ **Usuário não encontrado!**\n\n` +
          `🔍 O usuário não está na lista de participantes\n` +
          `📱 **ID procurado:** \`${targetId}\`\n\n` +
          `💡 Verifique se o número está correto e a pessoa está no grupo`
        );
        return;
      }

      // Preparar informações do ban
      const isAdmin = targetParticipant.isAdmin;
      const groupId = chat.id._serialized;
      const timestamp = new Date().toLocaleString('pt-BR');
      
      let resposta = `🚫 **Usuário sendo removido do grupo...**\n\n`;
      resposta += `📱 **Usuário:** \`${targetId}\`\n`;
      resposta += `👮 **Removido por:** ${senderId}\n`;
      resposta += `⏰ **Data:** ${timestamp}\n`;
      
      if (motivo) {
        resposta += `📝 **Motivo:** ${motivo}\n`;
      }
      
      resposta += `\n🔄 **Processando...**`;

      // Enviar mensagem inicial
      const statusMsg = await msg.reply(resposta);

      try {
        let etapas = [];

        // ETAPA 1: Remover admin do bot se necessário
        const { statements } = require("../../core/db");
        const isBotAdmin = statements.isGroupAdmin.get(groupId, targetId);
        if (isBotAdmin) {
          removeGroupAdmin(groupId, targetId);
          etapas.push("✅ Removido como admin do bot");
        }

        // ETAPA 2: Rebaixar admin do WhatsApp se necessário
        if (isAdmin) {
          try {
            await chat.demoteParticipants([targetId]);
            etapas.push("✅ Removido como admin do WhatsApp");
          } catch (demoteError) {
            console.warn("Erro ao rebaixar admin:", demoteError.message);
            etapas.push("⚠️ Não foi possível remover admin do WhatsApp");
          }
        }

        // ETAPA 3: Remover do grupo
        await chat.removeParticipants([targetId]);
        etapas.push("✅ Removido do grupo");

        // Resposta final de sucesso
        let respostaFinal = `🚫 **Usuário banido com sucesso!**\n\n`;
        respostaFinal += `📱 **Usuário:** \`${targetId}\`\n`;
        respostaFinal += `👮 **Banido por:** ${senderId}\n`;
        respostaFinal += `⏰ **Data:** ${timestamp}\n`;
        
        if (motivo) {
          respostaFinal += `📝 **Motivo:** ${motivo}\n`;
        }
        
        respostaFinal += `\n📋 **Etapas executadas:**\n`;
        etapas.forEach(etapa => {
          respostaFinal += `${etapa}\n`;
        });
        
        respostaFinal += `\n✅ **Operação concluída!** O usuário foi removido permanentemente.`;

        await statusMsg.edit(respostaFinal);

        // Log detalhado
        console.log(
          `🚫 Ban executado: ${senderId} baniu ${targetId} ` +
          `no grupo ${groupId}${motivo ? ` (motivo: ${motivo})` : ''}`
        );

      } catch (removeError) {
        console.error("Erro ao remover usuário:", removeError);
        
        let errorMsg = `❌ **Erro ao banir usuário**\n\n`;
        
        const errorMessage = removeError.message || '';
        if (errorMessage.includes('Evaluation failed') || errorMessage.includes('b')) {
          errorMsg += `⚠️ Erro da API do WhatsApp Web\n\n` +
            `🔧 **Possíveis soluções:**\n` +
            `• Recarregue a página do WhatsApp Web\n` +
            `• Reinicie o bot com \`!restart\`\n` +
            `• Remova manualmente pelo WhatsApp\n\n` +
            `💡 **Nota:** O usuário pode não ter sido removido completamente.`;
        } else {
          errorMsg += `⚠️ Não foi possível remover o usuário\n\n` +
            `🔧 **Possíveis causas:**\n` +
            `• Bot perdeu permissões de admin\n` +
            `• Usuário saiu do grupo antes da remoção\n` +
            `• Erro temporário do WhatsApp\n\n` +
            `💡 **Solução:** Tente novamente ou remova manualmente.`;
        }
        
        await statusMsg.edit(errorMsg);
      }

    } catch (error) {
      console.error("Erro no comando ban:", error);
      await msg.reply("❌ Erro interno no sistema de ban.");
    }
  }
};
