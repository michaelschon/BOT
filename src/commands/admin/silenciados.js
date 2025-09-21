/**
 * Comando para listar usuários silenciados no grupo
 * Mostra informações detalhadas de todos os usuários com silenciamento ativo
 * 
 * @author Volleyball Team
 */

const { db } = require("../../core/db");
const { formatPhoneDisplay } = require("../../utils/phone");

module.exports = {
  name: "!silenciados",
  aliases: ["!muted", "!silenced", "!mutedlist"],
  description: "Lista todos os usuários silenciados no grupo",
  usage: "!silenciados [--detalhado]",
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
      const showDetailed = args.includes("--detalhado") || args.includes("-d");

      try {
        // Buscar todos os usuários silenciados no grupo (incluindo expirados para histórico)
        const silencedUsers = db.prepare(`
          SELECT 
            s.*,
            u.name as usuario_nome
          FROM silenciados s
          LEFT JOIN usuarios u ON s.usuario_id = u.id
          WHERE s.grupo_id = ?
          ORDER BY 
            CASE 
              WHEN s.expires_at IS NULL THEN 0 
              WHEN s.expires_at <= datetime('now') THEN 2
              ELSE 1 
            END,
            s.created_at DESC
        `).all(groupId);

        if (silencedUsers.length === 0) {
          await msg.reply(
            `🔇 **Lista de Usuários Silenciados**\n\n` +
            `👥 **Grupo:** ${chat.name}\n` +
            `📊 **Status:** Nenhum usuário silenciado (histórico vazio)\n\n` +
            `✅ **Parabéns!** Todos podem falar livremente no grupo!\n\n` +
            `💡 **Comandos relacionados:**\n` +
            `• \`!silenciar <telefone> [minutos]\` - Silenciar usuário\n` +
            `• \`!falar <telefone>\` - Liberar usuário específico\n` +
            `• \`!liberar\` - Liberar todos os usuários`
          );
          return;
        }

        // Processar informações dos usuários silenciados
        const userDetails = [];
        for (const user of silencedUsers) {
          try {
            // Tentar obter nome do contato
            let userName = user.usuario_nome || user.usuario_id.replace("@c.us", "");
            try {
              const contact = await client.getContactById(user.usuario_id);
              userName = contact.pushname || userName;
            } catch (contactError) {
              // Usar nome do banco ou ID se não conseguir obter contato
            }

            // Calcular tempo restante e duração total
            const timeInfo = this.calculateTimeInfo(user.created_at, user.expires_at, user.minutos);
            
            userDetails.push({
              id: user.usuario_id,
              name: userName,
              silencedBy: user.silenciado_por,
              createdAt: user.created_at,
              expiresAt: user.expires_at,
              minutes: user.minutos,
              isPermanent: !user.expires_at,
              timeRemaining: timeInfo.remaining,
              totalDuration: timeInfo.total,
              isExpired: timeInfo.expired
            });

          } catch (userError) {
            console.error(`Erro ao processar usuário ${user.usuario_id}:`, userError);
            // Adicionar mesmo com erro, usando dados básicos
            userDetails.push({
              id: user.usuario_id,
              name: user.usuario_id.replace("@c.us", ""),
              silencedBy: user.silenciado_por,
              createdAt: user.created_at,
              expiresAt: user.expires_at,
              minutes: user.minutos,
              isPermanent: !user.expires_at,
              timeRemaining: "Erro ao calcular",
              totalDuration: "Indeterminado",
              isExpired: false
            });
          }
        }

        // Separar usuários permanentes, temporários ativos e expirados
        const permanentUsers = userDetails.filter(u => u.isPermanent);
        const activeUsers = userDetails.filter(u => !u.isPermanent && !u.isExpired);
        const expiredUsers = userDetails.filter(u => !u.isPermanent && u.isExpired);
        const totalActive = permanentUsers.length + activeUsers.length;

        // Montar resposta
        let resposta = `🔇 **Lista de Usuários Silenciados**\n\n`;
        resposta += `👥 **Grupo:** ${chat.name}\n`;
        resposta += `📊 **Total:** ${userDetails.length} registro(s)\n`;
        resposta += `🔇 **Ativos:** ${totalActive} usuário(s)\n`;
        resposta += `♾️ **Permanentes:** ${permanentUsers.length}\n`;
        resposta += `⏰ **Temporários ativos:** ${activeUsers.length}\n`;
        resposta += `⚠️ **Expirados:** ${expiredUsers.length}\n\n`;

        // Lista usuários permanentes primeiro
        if (permanentUsers.length > 0) {
          resposta += `♾️ **SILENCIAMENTOS PERMANENTES (${permanentUsers.length}):**\n\n`;
          
          permanentUsers.forEach((user, index) => {
            resposta += `${index + 1}. **${user.name}**\n`;
            resposta += `   📱 ${formatPhoneDisplay(user.id)}\n`;
            resposta += `   👮 Silenciado por: ${user.silencedBy.replace("@c.us", "")}\n`;
            resposta += `   📅 Desde: ${new Date(user.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n`;
            resposta += `   ♾️ **PERMANENTE** - Não expira\n`;
            
            if (showDetailed) {
              resposta += `   🆔 ID: \`${user.id}\`\n`;
            }
            
            resposta += `\n`;
          });
        }

        // Lista usuários temporários ativos
        if (activeUsers.length > 0) {
          resposta += `⏰ **SILENCIAMENTOS TEMPORÁRIOS ATIVOS (${activeUsers.length}):**\n\n`;
          
          activeUsers.forEach((user, index) => {
            resposta += `${index + 1}. **${user.name}** (🔇 ATIVO)\n`;
            resposta += `   📱 ${formatPhoneDisplay(user.id)}\n`;
            resposta += `   👮 Silenciado por: ${user.silencedBy.replace("@c.us", "")}\n`;
            resposta += `   📅 Início: ${new Date(user.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n`;
            resposta += `   ⏰ Expira: ${new Date(user.expiresAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n`;
            resposta += `   ⏳ Restam: ${user.timeRemaining}\n`;
            resposta += `   📊 Duração: ${user.minutes || 'N/A'} minuto(s)\n`;
            
            if (showDetailed) {
              resposta += `   🆔 ID: \`${user.id}\`\n`;
            }
            
            resposta += `\n`;
          });
        }

        // Lista usuários temporários expirados
        if (expiredUsers.length > 0) {
          resposta += `⚠️ **SILENCIAMENTOS EXPIRADOS (${expiredUsers.length}):**\n\n`;
          
          expiredUsers.forEach((user, index) => {
            resposta += `${index + 1}. **${user.name}** (⚠️ EXPIRADO)\n`;
            resposta += `   📱 ${formatPhoneDisplay(user.id)}\n`;
            resposta += `   👮 Silenciado por: ${user.silencedBy.replace("@c.us", "")}\n`;
            resposta += `   📅 Início: ${new Date(user.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n`;
            resposta += `   ⏰ Expirou: ${new Date(user.expiresAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n`;
            resposta += `   📊 Duração: ${user.minutes || 'N/A'} minuto(s)\n`;
            
            if (showDetailed) {
              resposta += `   🆔 ID: \`${user.id}\`\n`;
            }
            
            resposta += `\n`;
          });
        }

        // Rodapé com comandos
        resposta += `🔧 **Comandos de Gerenciamento:**\n`;
        resposta += `• \`!falar <telefone>\` - Liberar usuário específico\n`;
        resposta += `• \`!liberar\` - Liberar TODOS os usuários\n`;
        resposta += `• \`!silenciar <telefone> [minutos]\` - Silenciar usuário\n`;
        
        if (!showDetailed && userDetails.length > 0) {
          resposta += `\n💡 Use \`!silenciados --detalhado\` para ver IDs completos`;
        }

        // Quebrar mensagem se muito longa
        if (resposta.length > 4000) {
          const partes = this.splitMessage(resposta);
          for (let i = 0; i < partes.length; i++) {
            const cabecalho = i === 0 ? "" : `🔇 **Usuários Silenciados (${i + 1}/${partes.length})**\n\n`;
            await msg.reply(cabecalho + partes[i]);
            
            // Pequeno delay entre mensagens
            if (i < partes.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } else {
          await msg.reply(resposta);
        }

        // Log da consulta
        console.log(
          `🔍 Admin ${senderId} consultou lista de ${userDetails.length} usuários silenciados ` +
          `no grupo ${groupId} (${permanentUsers.length} permanentes, ${activeUsers.length} ativos, ${expiredUsers.length} expirados)`
        );

      } catch (dbError) {
        console.error("Erro ao consultar usuários silenciados:", dbError);
        await msg.reply(
          "❌ **Erro ao consultar usuários silenciados**\n\n" +
          "🔧 Ocorreu um problema ao acessar o banco de dados\n\n" +
          "💡 Tente novamente em alguns segundos"
        );
      }

    } catch (error) {
      console.error("Erro no comando silenciados:", error);
      await msg.reply("❌ Erro interno no sistema de consulta de silenciamentos.");
    }
  },

  /**
   * Calcula informações de tempo do silenciamento
   * @param {string} createdAt Data de criação do silenciamento
   * @param {string|null} expiresAt Data de expiração (null se permanente)
   * @param {number|null} minutes Duração em minutos
   * @returns {object} Informações de tempo calculadas
   */
  calculateTimeInfo(createdAt, expiresAt, minutes) {
    try {
      const now = new Date();
      const startDate = new Date(createdAt);
      
      // Calcular duração total já decorrida
      const elapsedMs = now.getTime() - startDate.getTime();
      const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
      const elapsedHours = Math.floor(elapsedMinutes / 60);
      const elapsedDays = Math.floor(elapsedHours / 24);
      
      let totalDuration;
      if (elapsedDays > 0) {
        const remainingHours = elapsedHours % 24;
        totalDuration = `${elapsedDays}d${remainingHours > 0 ? ` ${remainingHours}h` : ''}`;
      } else if (elapsedHours > 0) {
        const remainingMinutes = elapsedMinutes % 60;
        totalDuration = `${elapsedHours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`;
      } else {
        totalDuration = `${elapsedMinutes}m`;
      }

      // Se é permanente, retorna informações básicas
      if (!expiresAt) {
        return {
          remaining: "Permanente",
          total: totalDuration,
          expired: false
        };
      }

      // Calcular tempo restante para silenciamentos temporários
      const expireDate = new Date(expiresAt);
      const remainingMs = expireDate.getTime() - now.getTime();
      const isExpired = remainingMs <= 0;

      if (isExpired) {
        return {
          remaining: "EXPIRADO",
          total: totalDuration,
          expired: true
        };
      }

      // Calcular tempo restante
      const remainingMinutes = Math.floor(remainingMs / (1000 * 60));
      const remainingHours = Math.floor(remainingMinutes / 60);
      const remainingDays = Math.floor(remainingHours / 24);

      let remainingText;
      if (remainingDays > 0) {
        const remHours = remainingHours % 24;
        remainingText = `${remainingDays}d${remHours > 0 ? ` ${remHours}h` : ''}`;
      } else if (remainingHours > 0) {
        const remMinutes = remainingMinutes % 60;
        remainingText = `${remainingHours}h${remMinutes > 0 ? ` ${remMinutes}m` : ''}`;
      } else {
        remainingText = `${Math.max(0, remainingMinutes)}m`;
      }

      return {
        remaining: remainingText,
        total: totalDuration,
        expired: false
      };

    } catch (error) {
      console.error("Erro ao calcular tempo:", error);
      return {
        remaining: "Erro",
        total: "Erro",
        expired: false
      };
    }
  },

  /**
   * Divide mensagem longa em partes menores
   * @param {string} message Mensagem para dividir
   * @returns {Array} Array de partes da mensagem
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
