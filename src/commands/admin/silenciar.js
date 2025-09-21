/**
 * Comando para silenciar usuário (apagar mensagens automaticamente)
 * Silencia por tempo determinado ou permanentemente
 * Integrado com o sistema de processamento automático de mensagens
 * 
 * @author Volleyball Team
 * @version 2.1 - Sistema Integrado
 */

const { normalizePhone } = require("../../utils/phone");
const { MASTER_USER_ID } = require("../../config/auth");
const { db, statements } = require("../../core/db");

// Tempo máximo permitido (99999999999 minutos)
const MAX_SILENCE_MINUTES = 99999999999;

module.exports = {
  name: "!silenciar",
  aliases: ["!mute", "!calar"],
  description: "Silencia usuário por tempo determinado ou permanentemente",
  usage: "!silenciar <telefone> [minutos]",
  category: "moderação",
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
          "⚠️ Uso correto: `!silenciar <telefone> [minutos]`\n\n" +
          "📋 **Exemplos:**\n" +
          "• `!silenciar +55 19 99999-9999 10` - Silenciar por 10 minutos\n" +
          "• `!silenciar 19999999999 60` - Silenciar por 1 hora\n" +
          "• `!silenciar 19 99999999` - Silenciar permanentemente\n\n" +
          "⚠️ **Efeito:** Todas as mensagens do usuário serão apagadas automaticamente\n\n" +
          "💡 **Tempo máximo:** 99.999.999.999 minutos"
        );
        return;
      }

      // Separar telefone do tempo
      let rawPhone = "";
      let tempoMinutos = null;
      let targetId = null;
      
      // Se há 2 ou mais argumentos, último pode ser o tempo
      if (args.length >= 2) {
        const ultimoArg = args[args.length - 1];
        if (/^\d+$/.test(ultimoArg)) {
          // Último argumento é número (tempo)
          tempoMinutos = parseInt(ultimoArg);
          rawPhone = args.slice(0, -1).join(" ");
        } else {
          // Todos os argumentos são parte do telefone
          rawPhone = args.join(" ");
        }
      } else {
        rawPhone = args[0];
      }

      // Normalizar telefone
      targetId = normalizePhone(rawPhone);
      if (!targetId) {
        await msg.reply(
          `⚠️ Número de telefone inválido: "${rawPhone}"\n\n` +
          "📱 Use um formato válido:\n" +
          "• +55 19 9999-9999\n" +
          "• 19999999999"
        );
        return;
      }

      // PROTEÇÃO: Não pode silenciar o Master
      if (targetId === MASTER_USER_ID) {
        await msg.reply(
          `🛡️ **OPERAÇÃO BLOQUEADA!**\n\n` +
          `⚠️ **Tentativa de silenciar Master detectada!**\n` +
          `👑 O Master não pode ser silenciado\n` +
          `🔒 Esta é uma proteção do sistema\n\n` +
          `📝 **Ação registrada:** ${senderId} tentou silenciar Master\n` +
          `⚡ **Consequência:** Este incidente foi registrado na auditoria`
        );

        console.warn(
          `🚨 TENTATIVA DE SILENCIAR MASTER: ${senderId} tentou silenciar ` +
          `${targetId} no grupo ${chat.id._serialized}`
        );
        
        // Registrar tentativa na auditoria como falha
        const { auditCommand } = require("../../utils/audit");
        await auditCommand(
          senderId, 
          "!silenciar", 
          chat.id._serialized, 
          false, 
          args, 
          "Tentativa de silenciar Master BLOQUEADA"
        );
        
        return;
      }

      // Validar tempo se fornecido
      if (tempoMinutos !== null) {
        if (tempoMinutos < 1) {
          await msg.reply("⚠️ O tempo deve ser pelo menos 1 minuto!");
          return;
        }
        
        if (tempoMinutos > MAX_SILENCE_MINUTES) {
          await msg.reply(
            `⚠️ **Tempo muito alto!**\n\n` +
            `📊 **Solicitado:** ${tempoMinutos.toLocaleString()} minutos\n` +
            `📏 **Máximo permitido:** ${MAX_SILENCE_MINUTES.toLocaleString()} minutos\n\n` +
            `💡 **Solução:** Use um tempo menor ou deixe em branco para silenciamento permanente`
          );
          return;
        }
      }

      const groupId = chat.id._serialized;
      
      // Verificar se usuário está no grupo
      const targetParticipant = chat.participants.find(p => p.id._serialized === targetId);
      if (!targetParticipant) {
        await msg.reply(
          `⚠️ **Usuário não encontrado no grupo!**\n\n` +
          `📱 **Número:** \`${targetId}\`\n\n` +
          `💡 O usuário precisa estar no grupo para ser silenciado.`
        );
        return;
      }

      try {
        // Verificar se já está silenciado
        const jaEstasilenciado = statements.isSilenced.get(groupId, targetId);
        
        if (jaEstasilenciado) {
          // Usuário já está silenciado - perguntar se quer atualizar
          const silenciadoInfo = statements.getSilenced.get(groupId, targetId);
          const tipoAtual = silenciadoInfo.expires_at ? 'temporário' : 'permanente';
          
          await msg.reply(
            `⚠️ **Usuário já está silenciado!**\n\n` +
            `📱 **Usuário:** \`${targetId}\`\n` +
            `🔇 **Status atual:** Silenciado (${tipoAtual})\n` +
            `📅 **Desde:** ${new Date(silenciadoInfo.created_at).toLocaleString('pt-BR')}\n\n` +
            `💡 **Para atualizar:** Use \`!falar ${rawPhone}\` primeiro, depois \`!silenciar\` novamente\n` +
            `🔍 **Para ver detalhes:** Use \`!silenciados\``
          );
          return;
        }

        // Calcular data de expiração usando timezone correto
        let expiresAt = null;
        if (tempoMinutos !== null) {
          const now = new Date();
          expiresAt = new Date(now.getTime() + (tempoMinutos * 60 * 1000));
        }

        // Cadastrar usuário se não existe (ANTES de salvar silenciamento)
        try {
          statements.insertUser.run(targetId, null, targetId.replace("@c.us", ""));
        } catch (userError) {
          // Usuário já existe, tudo bem
        }

        // Cadastrar usuário que está silenciando se não existe
        try {
          statements.insertUser.run(senderId, null, senderId.replace("@c.us", ""));
        } catch (userError) {
          // Usuário já existe, tudo bem
        }

        // Salvar no banco de dados
        statements.addSilenced.run(
          groupId, 
          targetId, 
          senderId, 
          tempoMinutos, 
          expiresAt ? expiresAt.toISOString() : null
        );

        // Cadastrar usuário se não existe
        try {
          statements.insertUser.run(targetId, null, targetId.replace("@c.us", ""));
        } catch (userError) {
          // Usuário já existe, tudo bem
        }

        // Obter nome do usuário
        let userName = targetId.replace("@c.us", "");
        try {
          const contact = await client.getContactById(targetId);
          userName = contact.pushname || userName;
        } catch (contactError) {
          // Usar ID se não conseguir obter o nome
        }

        // Resposta de confirmação
        let resposta = `🔇 **Usuário silenciado com sucesso!**\n\n`;
        resposta += `📱 **Usuário:** \`${targetId}\`\n`;
        resposta += `👤 **Nome:** ${userName}\n`;
        resposta += `👮 **Silenciado por:** ${senderId}\n`;
        resposta += `⏰ **Data:** ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n`;
        
        if (tempoMinutos !== null) {
          resposta += `⏱️ **Duração:** ${tempoMinutos.toLocaleString()} minuto(s)\n`;
          resposta += `📅 **Expira em:** ${expiresAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n`;
          resposta += `🎯 **Tipo:** Silenciamento temporário\n`;
        } else {
          resposta += `♾️ **Duração:** Permanente\n`;
          resposta += `📅 **Expira:** Nunca (até ser liberado manualmente)\n`;
          resposta += `🎯 **Tipo:** Silenciamento permanente\n`;
        }
        
        resposta += `\n🔇 **Efeito Imediato:**\n`;
        resposta += `• Todas as mensagens do usuário serão apagadas automaticamente\n`;
        resposta += `• O sistema monitorará continuamente as mensagens\n`;
        resposta += `• Logs das mensagens apagadas serão registrados\n\n`;
        
        resposta += `🔧 **Comandos relacionados:**\n`;
        resposta += `• \`!falar ${rawPhone}\` - Liberar este usuário\n`;
        resposta += `• \`!silenciados\` - Ver lista completa\n`;
        resposta += `• \`!liberar\` - Liberar todos os silenciados`;

        await msg.reply(resposta);

        // Log da operação
        console.log(
          `🔇 Usuário silenciado: ${senderId} silenciou ${targetId} (${userName}) ` +
          `no grupo ${groupId} por ${tempoMinutos || 'permanente'} minutos`
        );

      } catch (dbError) {
        console.error("Erro ao salvar silenciamento:", dbError);
        await msg.reply(
          "❌ **Erro ao salvar silenciamento**\n\n" +
          "🔧 Ocorreu um problema ao acessar o banco de dados\n\n" +
          "💡 Tente novamente em alguns segundos"
        );
      }

    } catch (error) {
      console.error("Erro no comando silenciar:", error);
      await msg.reply("❌ Erro interno no sistema de silenciamento.");
    }
  },

  /**
   * Verifica se usuário está silenciado
   * @param {string} groupId ID do grupo
   * @param {string} userId ID do usuário
   * @returns {boolean} True se está silenciado
   */
  isSilenced(groupId, userId) {
    try {
      const result = statements.isSilenced.get(groupId, userId);
      return !!result;
    } catch (error) {
      console.error("Erro ao verificar silenciamento:", error);
      return false;
    }
  },

  /**
   * Processa mensagem de usuário silenciado
   * Esta função é chamada automaticamente pelo sistema principal
   * @param {Client} client Cliente do WhatsApp
   * @param {Message} msg Mensagem recebida
   * @returns {boolean} True se a mensagem foi processada (apagada)
   */
  async processSilencedMessage(client, msg) {
    try {
      const chat = await msg.getChat();
      if (!chat.isGroup) return false;

      const senderId = msg.author || msg.from;
      const groupId = chat.id._serialized;

      if (this.isSilenced(groupId, senderId)) {
        // Log da mensagem antes de apagar
        const messagePreview = msg.body?.substring(0, 100) || '[mídia/sem texto]';
        
        console.log(
          `🔇 MENSAGEM SILENCIADA - Grupo: ${groupId}, ` +
          `Usuário: ${senderId}, Tipo: ${msg.type}, ` +
          `Conteúdo: "${messagePreview}"`
        );

        try {
          // Apagar mensagem para todos
          await msg.delete(true);
          
          console.log(`✅ Mensagem de usuário silenciado apagada: ${senderId}`);
          return true; // Mensagem foi processada (apagada)
          
        } catch (deleteError) {
          console.error("❌ Erro ao apagar mensagem de usuário silenciado:", deleteError.message);
          
          // Se não conseguir apagar, tentar enviar aviso temporário
          try {
            const warningMsg = await msg.reply("🔇 _Mensagem removida - usuário silenciado_");
            
            // Apagar o aviso após 3 segundos
            setTimeout(async () => {
              try {
                await warningMsg.delete(true);
              } catch (e) {
                console.debug("Não foi possível apagar mensagem de aviso");
              }
            }, 3000);
            
          } catch (replyError) {
            console.error("Erro ao enviar aviso de silenciamento:", replyError.message);
          }
          
          return true; // Considerar como processada mesmo com erro
        }
      }

      return false; // Usuário não está silenciado
      
    } catch (error) {
      console.error("Erro ao processar mensagem silenciada:", error);
      return false;
    }
  },

  /**
   * Obtém estatísticas de silenciamentos de um grupo
   * @param {string} groupId ID do grupo
   * @returns {object} Estatísticas
   */
  getSilenceStats(groupId) {
    try {
      const total = statements.getAllSilencedInGroup.all(groupId);
      const permanentes = total.filter(s => !s.expires_at);
      const temporarios = total.filter(s => s.expires_at);
      
      return {
        total: total.length,
        permanentes: permanentes.length,
        temporarios: temporarios.length,
        usuarios: total
      };
      
    } catch (error) {
      console.error("Erro ao obter estatísticas de silenciamento:", error);
      return {
        total: 0,
        permanentes: 0,
        temporarios: 0,
        usuarios: []
      };
    }
  },

  /**
   * Remove um usuário específico da lista de silenciados
   * @param {string} groupId ID do grupo
   * @param {string} userId ID do usuário
   * @returns {boolean} True se removido com sucesso
   */
  removeSilenced(groupId, userId) {
    try {
      const result = statements.removeSilenced.run(groupId, userId);
      return result.changes > 0;
    } catch (error) {
      console.error("Erro ao remover silenciamento:", error);
      return false;
    }
  },

  /**
   * Remove todos os silenciados de um grupo
   * @param {string} groupId ID do grupo
   * @returns {number} Número de usuários liberados
   */
  removeAllSilenced(groupId) {
    try {
      const result = statements.removeAllSilencedInGroup.run(groupId);
      return result.changes;
    } catch (error) {
      console.error("Erro ao remover todos os silenciamentos:", error);
      return 0;
    }
  }
};
