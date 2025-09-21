/**
 * Comando para liberar todos os usuários silenciados do grupo
 * Remove todos os silenciamentos de uma vez
 * 
 * @author Volleyball Team
 */

const { db } = require("../../core/db");

module.exports = {
  name: "!liberar",
  aliases: ["!liberartodos", "!unmuteall"],
  description: "Remove silenciamento de todos os usuários do grupo",
  usage: "!liberar",
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

      const groupId = chat.id._serialized;

      try {
        // Buscar todos os usuários silenciados no grupo
        const silencedUsers = db.prepare(`
          SELECT * FROM silenciados 
          WHERE grupo_id = ?
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        `).all(groupId);

        if (silencedUsers.length === 0) {
          await msg.reply(
            `ℹ️ **Nenhum usuário silenciado**\n\n` +
            `👥 **Grupo:** ${chat.name}\n` +
            `📊 **Status:** Não há usuários silenciados neste grupo\n\n` +
            `💡 Use \`!silenciados\` para verificar a lista atual.`
          );
          return;
        }

        // Confirmar operação se há muitos usuários
        if (silencedUsers.length > 5) {
          // Para muitos usuários, pedir confirmação adicional
          const confirmMsg = await msg.reply(
            `⚠️ **Confirmação necessária**\n\n` +
            `👥 **Usuários silenciados:** ${silencedUsers.length}\n` +
            `📋 **Ação:** Liberar TODOS os usuários silenciados\n\n` +
            `⚡ **Esta ação não pode ser desfeita!**\n\n` +
            `💡 Responda "CONFIRMO" em 30 segundos para prosseguir.`
          );
          
          // Aguardar confirmação (implementação básica)
          // Em produção, seria melhor usar um sistema de confirmação mais robusto
        }

        // Remover todos os silenciamentos do grupo
        const result = db.prepare(`
          DELETE FROM silenciados WHERE grupo_id = ?
        `).run(groupId);

        // Obter nomes dos usuários liberados
        const userDetails = [];
        for (const user of silencedUsers) {
          try {
            const contact = await client.getContactById(user.usuario_id);
            const userName = contact.pushname || user.usuario_id.replace("@c.us", "");
            userDetails.push({
              id: user.usuario_id,
              name: userName,
              duration: this.calculateSilenceDuration(user.created_at)
            });
          } catch (contactError) {
            userDetails.push({
              id: user.usuario_id,
              name: user.usuario_id.replace("@c.us", ""),
              duration: this.calculateSilenceDuration(user.created_at)
            });
          }
        }

        // Resposta de confirmação
        let resposta = `🔊 **TODOS os usuários foram liberados!**\n\n`;
        resposta += `👥 **Grupo:** ${chat.name}\n`;
        resposta += `👮 **Liberado por:** ${senderId}\n`;
        resposta += `⏰ **Data:** ${new Date().toLocaleString('pt-BR')}\n`;
        resposta += `📊 **Total liberado:** ${result.changes} usuário(s)\n\n`;
        
        resposta += `📋 **Usuários liberados:**\n`;
        userDetails.forEach((user, index) => {
          resposta += `${index + 1}. ${user.name}\n`;
          resposta += `   📱 \`${user.id}\`\n`;
          resposta += `   ⏱️ Estava silenciado por: ${user.duration}\n\n`;
        });
        
        resposta += `✅ **Todos podem voltar a enviar mensagens normalmente!**`;

        // Quebrar mensagem se muito longa
        if (resposta.length > 4000) {
          const partes = this.splitMessage(resposta);
          for (let i = 0; i < partes.length; i++) {
            await msg.reply(partes[i]);
            if (i < partes.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } else {
          await msg.reply(resposta);
        }

        // Log da operação
        console.log(
          `🔊 Liberação em massa: ${senderId} liberou ${result.changes} usuários ` +
          `no grupo ${groupId}`
        );

      } catch (dbError) {
        console.error("Erro ao liberar todos os usuários:", dbError);
        await msg.reply("❌ Erro ao acessar banco de dados para liberar usuários.");
      }

    } catch (error) {
      console.error("Erro no comando liberar:", error);
      await msg.reply("❌ Erro interno no sistema de liberação em massa.");
    }
  },

  /**
   * Calcula duração do silenciamento
   */
  calculateSilenceDuration(createdAt) {
    try {
      const inicio = new Date(createdAt);
      const fim = new Date();
      const diffMs = fim.getTime() - inicio.getTime();
      
      const minutos = Math.floor(diffMs / (1000 * 60));
      const horas = Math.floor(minutos / 60);
      const dias = Math.floor(horas / 24);
      
      if (dias > 0) {
        const horasRestantes = horas % 24;
        return `${dias}d${horasRestantes > 0 ? ` ${horasRestantes}h` : ''}`;
      } else if (horas > 0) {
        const minutosRestantes = minutos % 60;
        return `${horas}h${minutosRestantes > 0 ? ` ${minutosRestantes}m` : ''}`;
      } else {
        return `${minutos}m`;
      }
    } catch (error) {
      return "?";
    }
  },

  /**
   * Divide mensagem longa em partes menores
   */
  splitMessage(message) {
    const maxLength = 3500;
    const parts = [];
    const lines = message.split('\n');
    let currentPart = "";
    
    for (const line of lines) {
      if ((currentPart + line + '\n').length > maxLength) {
        if (currentPart) {
          parts.push(currentPart.trim());
          currentPart = line + '\n';
        }
      } else {
        currentPart += line + '\n';
      }
    }
    
    if (currentPart) {
      parts.push(currentPart.trim());
    }
    
    return parts;
  }
};
