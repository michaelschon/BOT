/**
 * Comando para silenciar usuário (apagar mensagens automaticamente)
 * Silencia por tempo determinado ou permanentemente
 * 
 * @author Volleyball Team
 */

const { normalizePhone } = require("../../utils/phone");
const { MASTER_USER_ID } = require("../../config/auth");
const { db } = require("../../core/db");

// Tempo máximo permitido (99999999999 minutos)
const MAX_SILENCE_MINUTES = 99999999999;

module.exports = {
  name: "!silenciar",
  aliases: ["!mute", "!calar"],
  description: "Silencia usuário por tempo determinado ou permanentemente",
  usage: "!silenciar <telefone> [minutos]",
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
          "⚠️ Uso correto: `!silenciar <telefone> [minutos]`\n\n" +
          "📋 **Exemplos:**\n" +
          "• `!silenciar +55 19 99999-9999 10` - Silenciar por 10 minutos\n" +
          "• `!silenciar 19999999999 60` - Silenciar por 1 hora\n" +
          "• `!silenciar 19 99999999` - Silenciar permanentemente\n\n" +
          "⚠️ **Efeito:** Todas as mensagens do usuário serão apagadas automaticamente"
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
          `📝 **Ação registrada:** ${senderId} tentou silenciar Master`
        );

        console.warn(
          `🚨 TENTATIVA DE SILENCIAR MASTER: ${senderId} tentou silenciar ` +
          `${targetId} no grupo ${chat.id._serialized}`
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
          tempoMinutos = MAX_SILENCE_MINUTES;
          await msg.reply(
            `⚠️ **Tempo ajustado automaticamente!**\n\n` +
            `📊 **Solicitado:** ${args[args.length - 1]} minutos\n` +
            `📏 **Máximo permitido:** ${MAX_SILENCE_MINUTES} minutos\n` +
            `✅ **Tempo aplicado:** ${MAX_SILENCE_MINUTES} minutos\n\n` +
            `💡 Continuando com o tempo máximo...`
          );
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
        // Calcular data de expiração
        let expiresAt = null;
        if (tempoMinutos !== null) {
          expiresAt = new Date(Date.now() + (tempoMinutos * 60 * 1000));
        }

        // Salvar no banco de dados
        this.addSilencedUser(groupId, targetId, senderId, expiresAt, tempoMinutos);

        // Obter nome do usuário
        const contact = await client.getContactById(targetId);
        const userName = contact.pushname || targetId.replace("@c.us", "");

        // Resposta de confirmação
        let resposta = `🔇 **Usuário silenciado!**\n\n`;
        resposta += `📱 **Usuário:** \`${targetId}\`\n`;
        resposta += `👤 **Nome:** ${userName}\n`;
        resposta += `👮 **Silenciado por:** ${senderId}\n`;
        resposta += `⏰ **Data:** ${new Date().toLocaleString('pt-BR')}\n\n`;
        
        if (tempoMinutos !== null) {
          resposta += `⏱️ **Duração:** ${tempoMinutos} minuto(s)\n`;
          resposta += `📅 **Expira em:** ${expiresAt.toLocaleString('pt-BR')}\n`;
        } else {
          resposta += `♾️ **Duração:** Permanente\n`;
          resposta += `📅 **Expira:** Nunca (até ser liberado manualmente)\n`;
        }
        
        resposta += `\n🔇 **Efeito:** Todas as mensagens do usuário serão apagadas automaticamente\n`;
        resposta += `💡 Use \`!falar ${rawPhone}\` para liberar quando necessário`;

        await msg.reply(resposta);

        // Log da operação
        console.log(
          `🔇 Usuário silenciado: ${senderId} silenciou ${targetId} (${userName}) ` +
          `no grupo ${groupId} por ${tempoMinutos || 'permanente'} minutos`
        );

      } catch (dbError) {
        console.error("Erro ao salvar silenciamento:", dbError);
        await msg.reply("❌ Erro ao salvar silenciamento no banco de dados.");
      }

    } catch (error) {
      console.error("Erro no comando silenciar:", error);
      await msg.reply("❌ Erro interno no sistema de silenciamento.");
    }
  },

  /**
   * Adiciona usuário silenciado ao banco
   */
  addSilencedUser(groupId, userId, silencedBy, expiresAt, minutes) {
    try {
      // Criar tabela se não existir
      db.prepare(`
        CREATE TABLE IF NOT EXISTS silenciados (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          grupo_id TEXT,
          usuario_id TEXT,
          silenciado_por TEXT,
          minutos INTEGER,
          expires_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(grupo_id, usuario_id)
        )
      `).run();

      // Inserir ou atualizar silenciamento
      db.prepare(`
        INSERT OR REPLACE INTO silenciados 
        (grupo_id, usuario_id, silenciado_por, minutos, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        groupId, 
        userId, 
        silencedBy, 
        minutes, 
        expiresAt ? expiresAt.toISOString() : null
      );

    } catch (error) {
      console.error("Erro ao adicionar usuário silenciado:", error);
      throw error;
    }
  },

  /**
   * Verifica se usuário está silenciado
   */
  isSilenced(groupId, userId) {
    try {
      const result = db.prepare(`
        SELECT * FROM silenciados 
        WHERE grupo_id = ? AND usuario_id = ?
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      `).get(groupId, userId);

      return !!result;
    } catch (error) {
      console.error("Erro ao verificar silenciamento:", error);
      return false;
    }
  },

  /**
   * Processa mensagem de usuário silenciado
   */
  async processSilencedMessage(client, msg) {
    try {
      const chat = await msg.getChat();
      if (!chat.isGroup) return false;

      const senderId = msg.author || msg.from;
      const groupId = chat.id._serialized;

      if (this.isSilenced(groupId, senderId)) {
        // Log da mensagem antes de apagar
        console.log(
          `🔇 MENSAGEM SILENCIADA - Grupo: ${groupId}, ` +
          `Usuário: ${senderId}, Conteúdo: "${msg.body}"`
        );

        // Apagar mensagem
        await msg.delete(true); // true = apagar para todos

        return true; // Mensagem foi processada (apagada)
      }

      return false; // Usuário não está silenciado
    } catch (error) {
      console.error("Erro ao processar mensagem silenciada:", error);
      return false;
    }
  }
};
