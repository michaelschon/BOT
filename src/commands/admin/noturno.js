/**
 * Comando para controlar modo noturno do grupo
 * Restringe mensagens apenas para admins durante horário específico
 * 
 * @author Volleyball Team
 */

const fs = require('fs');
const path = require('path');

// Armazenamento em memória dos agendamentos (em produção usar banco de dados)
const scheduledJobs = new Map();

module.exports = {
  name: "!noturno",
  aliases: ["!nightmode", "!modonoturno"],
  description: "Configura modo noturno do grupo (restringe mensagens)",
  usage: "!noturno [on HH:mm HH:mm | off | status]",
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

      // Verificar se bot é admin do grupo (necessário para alterar configurações)
      const botParticipant = chat.participants.find(p => p.id._serialized === client.info.wid._serialized);
      if (!botParticipant || !botParticipant.isAdmin) {
        await msg.reply(
          "⚠️ **Bot precisa ser admin do grupo!**\n\n" +
          "🤖 Para usar o modo noturno, o bot deve ter permissões de administrador no WhatsApp\n\n" +
          "💡 **Solução:** Promova o bot a admin do grupo primeiro"
        );
        return;
      }

      const action = args[0]?.toLowerCase();
      const groupId = chat.id._serialized;

      if (!action || action === 'status') {
        await this.showStatus(msg, chat, groupId);
        return;
      }

      if (action === 'off') {
        await this.disableNightMode(msg, chat, groupId);
        return;
      }

      if (action === 'on') {
        if (args.length < 3) {
          await msg.reply(
            "⚠️ Uso correto: `!noturno on HH:mm HH:mm`\n\n" +
            "📋 **Exemplos:**\n" +
            "• `!noturno on 23:30 05:00` - Das 23h30 às 05h00\n" +
            "• `!noturno on 22:00 06:30` - Das 22h00 às 06h30\n" +
            "• `!noturno on 00:00 07:00` - Da meia-noite às 07h00\n\n" +
            "⏰ **Formato:** HH:mm (24 horas)"
          );
          return;
        }

        const startTime = args[1];
        const endTime = args[2];

        // Validar formato de horário
        if (!this.isValidTime(startTime) || !this.isValidTime(endTime)) {
          await msg.reply(
            "⚠️ **Formato de horário inválido!**\n\n" +
            "📋 **Formato correto:** HH:mm (24 horas)\n" +
            "✅ **Exemplos válidos:** 23:30, 05:00, 22:15\n" +
            "❌ **Exemplos inválidos:** 23h30, 5:00, 25:00\n\n" +
            "💡 Use sempre dois dígitos para hora e minuto"
          );
          return;
        }

        await this.enableNightMode(client, msg, chat, groupId, startTime, endTime, senderId);
        return;
      }

      // Comando inválido
      await msg.reply(
        "⚠️ **Opção inválida!**\n\n" +
        "🎯 **Opções disponíveis:**\n" +
        "• `!noturno on 23:30 05:00` - Ativar das 23h30 às 05h00\n" +
        "• `!noturno off` - Desativar modo noturno\n" +
        "• `!noturno status` - Ver configuração atual\n\n" +
        "💡 Use `!noturno` sem argumentos para ver o status"
      );

    } catch (error) {
      console.error("Erro no comando noturno:", error);
      await msg.reply("❌ Erro interno no sistema de modo noturno.");
    }
  },

  /**
   * Valida formato de horário HH:mm
   */
  isValidTime(timeStr) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeStr);
  },

  /**
   * Mostra status atual do modo noturno
   */
  async showStatus(msg, chat, groupId) {
    const config = this.getNightModeConfig(groupId);
    
    let resposta = "🌙 **Status do Modo Noturno**\n\n";
    resposta += `👥 **Grupo:** ${chat.name}\n`;
    
    if (config.enabled) {
      resposta += `📊 **Status:** ✅ Ativo\n`;
      resposta += `⏰ **Horário:** ${config.startTime} às ${config.endTime}\n`;
      resposta += `👮 **Configurado por:** ${config.configuredBy}\n`;
      resposta += `📅 **Desde:** ${config.configuredAt}\n\n`;
      
      const isCurrentlyActive = this.isNightModeActiveNow(config.startTime, config.endTime);
      resposta += `🔍 **Status atual:** ${isCurrentlyActive ? '🌙 Modo noturno ativo' : '☀️ Modo normal'}\n\n`;
      
      resposta += `📋 **Durante o modo noturno:**\n`;
      resposta += `• Apenas admins podem enviar mensagens\n`;
      resposta += `• Grupo é automaticamente restrito às ${config.startTime}\n`;
      resposta += `• Liberado novamente às ${config.endTime}\n`;
    } else {
      resposta += `📊 **Status:** ❌ Inativo\n\n`;
      resposta += `💡 **Para ativar:**\n`;
      resposta += `\`!noturno on 23:30 05:00\`\n`;
    }
    
    resposta += `\n🎯 **Comandos:**\n`;
    resposta += `• \`!noturno on HH:mm HH:mm\` - Ativar\n`;
    resposta += `• \`!noturno off\` - Desativar\n`;
    resposta += `• \`!noturno status\` - Ver este status`;

    await msg.reply(resposta);
  },

  /**
   * Ativa o modo noturno
   */
  async enableNightMode(client, msg, chat, groupId, startTime, endTime, senderId) {
    try {
      // Cancelar agendamentos anteriores se existirem
      this.cancelScheduledJobs(groupId);
      
      // Salvar configuração
      const config = {
        enabled: true,
        startTime,
        endTime,
        configuredBy: senderId,
        configuredAt: new Date().toLocaleString('pt-BR'),
        groupId
      };
      
      this.saveNightModeConfig(groupId, config);
      
      // Agendar ativação e desativação
      this.scheduleNightModeJobs(client, groupId, startTime, endTime);
      
      await msg.reply(
        `✅ **Modo noturno ativado!**\n\n` +
        `👥 **Grupo:** ${chat.name}\n` +
        `⏰ **Horário:** ${startTime} às ${endTime}\n` +
        `👮 **Configurado por:** ${senderId}\n` +
        `📅 **Data:** ${new Date().toLocaleString('pt-BR')}\n\n` +
        `🌙 **Funcionamento:**\n` +
        `• Às ${startTime}: Grupo restrito apenas para admins\n` +
        `• Às ${endTime}: Grupo liberado para todos\n` +
        `• Processo automático diário\n\n` +
        `💡 **O modo noturno entrará em vigor a partir de hoje!**`
      );

      console.log(
        `🌙 Modo noturno ativado: ${senderId} configurou ${startTime}-${endTime} ` +
        `no grupo ${groupId}`
      );

    } catch (error) {
      console.error("Erro ao ativar modo noturno:", error);
      await msg.reply("❌ Erro ao ativar modo noturno. Tente novamente.");
    }
  },

  /**
   * Desativa o modo noturno
   */
  async disableNightMode(msg, chat, groupId) {
    try {
      const config = this.getNightModeConfig(groupId);
      
      if (!config.enabled) {
        await msg.reply(
          `ℹ️ **Modo noturno já está desativado**\n\n` +
          `👥 **Grupo:** ${chat.name}\n` +
          `📊 **Status:** Inativo\n\n` +
          `💡 Use \`!noturno on HH:mm HH:mm\` para ativar`
        );
        return;
      }
      
      // Cancelar agendamentos
      this.cancelScheduledJobs(groupId);
      
      // Remover configuração
      this.removeNightModeConfig(groupId);
      
      // Garantir que grupo esteja liberado
      await this.setGroupMessagingMode(msg.client || msg._client, groupId, false);
      
      await msg.reply(
        `❌ **Modo noturno desativado!**\n\n` +
        `👥 **Grupo:** ${chat.name}\n` +
        `📊 **Status:** Inativo\n` +
        `⏰ **Era ativo:** ${config.startTime} às ${config.endTime}\n\n` +
        `✅ **Resultado:**\n` +
        `• Agendamentos cancelados\n` +
        `• Grupo liberado para todos enviarem mensagens\n` +
        `• Modo noturno não funcionará mais\n\n` +
        `💡 Use \`!noturno on HH:mm HH:mm\` para reativar quando necessário`
      );

      console.log(`🌙 Modo noturno desativado no grupo ${groupId}`);

    } catch (error) {
      console.error("Erro ao desativar modo noturno:", error);
      await msg.reply("❌ Erro ao desativar modo noturno. Tente novamente.");
    }
  },

  /**
   * Agenda os jobs do modo noturno
   */
  scheduleNightModeJobs(client, groupId, startTime, endTime) {
    const now = new Date();
    
    // Calcular próxima execução para horário de início
    const startDate = this.getNextScheduleTime(startTime);
    const endDate = this.getNextScheduleTime(endTime);
    
    // Se o horário de fim é no dia seguinte (ex: 23:30 às 05:00)
    if (endTime < startTime) {
      if (endDate <= startDate) {
        endDate.setDate(endDate.getDate() + 1);
      }
    }
    
    // Agendar início do modo noturno
    const startTimeout = setTimeout(() => {
      this.activateNightMode(client, groupId);
      // Reagendar para próximo dia
      this.scheduleNightModeJobs(client, groupId, startTime, endTime);
    }, startDate.getTime() - now.getTime());
    
    // Agendar fim do modo noturno
    const endTimeout = setTimeout(() => {
      this.deactivateNightMode(client, groupId);
    }, endDate.getTime() - now.getTime());
    
    // Armazenar timeouts para poder cancelar depois
    scheduledJobs.set(groupId, {
      startTimeout,
      endTimeout,
      startTime,
      endTime
    });
    
    console.log(
      `🌙 Agendado para ${groupId}: Início ${startDate.toLocaleString('pt-BR')}, ` +
      `Fim ${endDate.toLocaleString('pt-BR')}`
    );
  },

  /**
   * Calcula próximo horário de execução
   */
  getNextScheduleTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const now = new Date();
    const scheduleTime = new Date();
    
    scheduleTime.setHours(hours, minutes, 0, 0);
    
    // Se o horário já passou hoje, agendar para amanhã
    if (scheduleTime <= now) {
      scheduleTime.setDate(scheduleTime.getDate() + 1);
    }
    
    return scheduleTime;
  },

  /**
   * Verifica se modo noturno está ativo agora
   */
  isNightModeActiveNow(startTime, endTime) {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (startTime < endTime) {
      // Mesmo dia (ex: 22:00 às 23:59)
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // Atravessa meia-noite (ex: 23:30 às 05:00)
      return currentTime >= startTime || currentTime < endTime;
    }
  },

  /**
   * Ativa o modo noturno (restringe grupo)
   */
  async activateNightMode(client, groupId) {
    try {
      await this.setGroupMessagingMode(client, groupId, true);
      
      // Enviar mensagem de modo noturno
      const config = this.getNightModeConfig(groupId);
      let mensagem = `🌙 **MODO NOTURNO ATIVADO**\n\n`;
      mensagem += `⏰ **Horário:** ${config.startTime} às ${config.endTime}\n`;
      mensagem += `🔇 **Grupo restrito:** Apenas admins podem enviar mensagens\n`;
      mensagem += `☀️ **Volta ao normal:** ${config.endTime}\n\n`;
      mensagem += `😴 Boa noite e descansem bem!`;
      
      await client.sendMessage(groupId, mensagem);
      
      // Tentar enviar figurinha de boa noite
      await this.sendNightSticker(client, groupId, 'night');
      
      console.log(`🌙 Modo noturno ativado no grupo ${groupId}`);
      
    } catch (error) {
      console.error("Erro ao ativar modo noturno:", error);
    }
  },

  /**
   * Desativa o modo noturno (libera grupo)
   */
  async deactivateNightMode(client, groupId) {
    try {
      await this.setGroupMessagingMode(client, groupId, false);
      
      // Enviar mensagem de bom dia
      let mensagem = `☀️ **BOM DIA!**\n\n`;
      mensagem += `🔊 **Grupo liberado:** Todos podem enviar mensagens novamente\n`;
      mensagem += `🌅 **Modo noturno finalizado**\n\n`;
      mensagem += `🏐 Bom dia, pessoal! Vamos começar mais um dia de volleyball!`;
      
      await client.sendMessage(groupId, mensagem);
      
      // Tentar enviar figurinha de bom dia
      await this.sendNightSticker(client, groupId, 'morning');
      
      console.log(`☀️ Modo noturno desativado no grupo ${groupId}`);
      
    } catch (error) {
      console.error("Erro ao desativar modo noturno:", error);
    }
  },

  /**
   * Altera configuração de mensagens do grupo
   */
  async setGroupMessagingMode(client, groupId, restrictToAdmins) {
    try {
      const chat = await client.getChatById(groupId);
      
      if (restrictToAdmins) {
        // Restringir para apenas admins
        await chat.setMessagesAdminsOnly(true);
      } else {
        // Liberar para todos
        await chat.setMessagesAdminsOnly(false);
      }
      
    } catch (error) {
      console.error("Erro ao alterar configuração do grupo:", error);
      throw error;
    }
  },

  /**
   * Envia figurinha do modo noturno (se existir)
   */
  async sendNightSticker(client, groupId, type) {
    try {
      const stickersDir = path.join(__dirname, '..', '..', 'assets', 'stickers');
      const stickerFile = type === 'night' ? 'boa-noite.webp' : 'bom-dia.webp';
      const stickerPath = path.join(stickersDir, stickerFile);
      
      if (fs.existsSync(stickerPath)) {
        const media = fs.readFileSync(stickerPath, { encoding: 'base64' });
        await client.sendMessage(groupId, media, {
          sendMediaAsSticker: true
        });
        console.log(`🎨 Figurinha de ${type} enviada para ${groupId}`);
      } else {
        console.log(`ℹ️ Figurinha ${stickerFile} não encontrada, apenas mensagem enviada`);
      }
      
    } catch (error) {
      console.error(`Erro ao enviar figurinha de ${type}:`, error);
      // Não propagar erro - figurinha é opcional
    }
  },

  /**
   * Cancela agendamentos do grupo
   */
  cancelScheduledJobs(groupId) {
    const jobs = scheduledJobs.get(groupId);
    if (jobs) {
      clearTimeout(jobs.startTimeout);
      clearTimeout(jobs.endTimeout);
      scheduledJobs.delete(groupId);
      console.log(`🗑️ Agendamentos cancelados para ${groupId}`);
    }
  },

  /**
   * Salva configuração do modo noturno (em memória - em produção usar banco)
   */
  saveNightModeConfig(groupId, config) {
    // Em produção, salvar no banco de dados
    // Por ora, usar arquivo JSON simples
    const configDir = path.join(__dirname, '..', '..', 'data');
    const configFile = path.join(configDir, 'night-mode-configs.json');
    
    let configs = {};
    if (fs.existsSync(configFile)) {
      configs = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    }
    
    configs[groupId] = config;
    
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(configFile, JSON.stringify(configs, null, 2));
  },

  /**
   * Obtém configuração do modo noturno
   */
  getNightModeConfig(groupId) {
    const configFile = path.join(__dirname, '..', '..', 'data', 'night-mode-configs.json');
    
    if (!fs.existsSync(configFile)) {
      return { enabled: false };
    }
    
    const configs = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    return configs[groupId] || { enabled: false };
  },

  /**
   * Remove configuração do modo noturno
   */
  removeNightModeConfig(groupId) {
    const configFile = path.join(__dirname, '..', '..', 'data', 'night-mode-configs.json');
    
    if (!fs.existsSync(configFile)) {
      return;
    }
    
    const configs = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    delete configs[groupId];
    
    fs.writeFileSync(configFile, JSON.stringify(configs, null, 2));
  },

  /**
   * Inicializa agendamentos do modo noturno ao iniciar o bot
   */
  initializeSchedules(client) {
    try {
      const configFile = path.join(__dirname, '..', '..', 'data', 'night-mode-configs.json');
      
      if (!fs.existsSync(configFile)) {
        console.log("🌙 Nenhuma configuração de modo noturno encontrada");
        return;
      }
      
      const configs = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      let count = 0;
      
      for (const [groupId, config] of Object.entries(configs)) {
        if (config.enabled) {
          this.scheduleNightModeJobs(client, groupId, config.startTime, config.endTime);
          count++;
          console.log(`🌙 Agendamento restaurado para grupo ${groupId}: ${config.startTime}-${config.endTime}`);
        }
      }
      
      console.log(`🌙 ${count} agendamentos de modo noturno inicializados`);
      
    } catch (error) {
      console.error("Erro ao inicializar agendamentos do modo noturno:", error);
    }
  }
};
