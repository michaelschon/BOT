/**
 * Comando para gerenciar o modo noturno do grupo
 * Fecha e abre o grupo em horários pré-determinados
 *
 * @version 3.1 - Corrigido bug de duplicação de agendamento
 * @author Volleyball Team & Gemini AI
 */

const schedule = require('node-schedule');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const { getCurrentDateTimeBR } = require('../../utils/date');

// Caminho para o arquivo de configuração
const configPath = path.join(__dirname, '..', '..', 'data', 'night-mode-configs.json');

// Objeto para manter os agendamentos em memória
let scheduledJobs = {};

/**
 * Carrega as configurações do arquivo JSON
 * @returns {object} Configurações carregadas
 */
function loadConfigs() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    logger.error('❌ Erro ao carregar configurações do modo noturno:', error.message);
  }
  return {};
}

/**
 * Salva as configurações no arquivo JSON
 * @param {object} configs Configurações a serem salvas
 */
function saveConfigs(configs) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(configs, null, 2), 'utf8');
  } catch (error) {
    logger.error('❌ Erro ao salvar configurações do modo noturno:', error.message);
  }
}

/**
 * Cancela agendamentos existentes para um grupo específico.
 * @param {string} groupId
 */
function cancelExistingJobs(groupId) {
  if (scheduledJobs[groupId]) {
    if (scheduledJobs[groupId].startJob) {
      scheduledJobs[groupId].startJob.cancel();
      logger.debug(`[Noturno] Agendamento de início cancelado para ${groupId}`);
    }
    if (scheduledJobs[groupId].endJob) {
      scheduledJobs[groupId].endJob.cancel();
      logger.debug(`[Noturno] Agendamento de término cancelado para ${groupId}`);
    }
  }
}

/**
 * Agenda o fechamento e abertura do grupo
 * @param {Client} client
 * @param {string} groupId
 * @param {string} startTime
 * @param {string} endTime
 */
function scheduleNightMode(client, groupId, startTime, endTime) {
  // ===== PONTO CRÍTICO DA CORREÇÃO =====
  // Cancela quaisquer jobs que já existam para este grupo antes de criar novos
  cancelExistingJobs(groupId);
  // =====================================

  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  const startRule = new schedule.RecurrenceRule();
  startRule.hour = startHour;
  startRule.minute = startMinute;
  startRule.tz = 'America/Sao_Paulo';

  const endRule = new schedule.RecurrenceRule();
  endRule.hour = endHour;
  endRule.minute = endMinute;
  endRule.tz = 'America/Sao_Paulo';

  const startJob = schedule.scheduleJob(startRule, async () => {
    try {
      const chat = await client.getChatById(groupId);
      await chat.setMessagesAdminsOnly(true);
      
      const msg = `🌙 *MODO NOTURNO ATIVADO*\n\n⏰ *Horário:* ${startTime} às ${endTime}\n🔇 *Grupo restrito:* Apenas admins podem enviar mensagens\n☀️ *Volta ao normal:* ${endTime}\n\n😴 Boa noite e descansem bem!`;
      await client.sendMessage(groupId, msg);

      logger.info(`🌙 Modo noturno ativado para o grupo ${groupId}`);
    } catch (err) {
      logger.error(`❌ Erro ao ativar modo noturno para ${groupId}:`, err.message);
    }
  });

  const endJob = schedule.scheduleJob(endRule, async () => {
    try {
      const chat = await client.getChatById(groupId);
      await chat.setMessagesAdminsOnly(false);

      const msg = `☀️ *BOM DIA!*\n\n🔊 *Grupo liberado:* Todos podem enviar mensagens novamente\n🌅 *Modo noturno finalizado*\n\n🏐 Bom dia, pessoal! Vamos começar mais um dia de volleyball!`;
      await client.sendMessage(groupId, msg);

      logger.info(`☀️ Modo noturno desativado para o grupo ${groupId}`);
    } catch (err) {
      logger.error(`❌ Erro ao desativar modo noturno para ${groupId}:`, err.message);
    }
  });

  // Armazena os novos jobs
  scheduledJobs[groupId] = { startJob, endJob };
  logger.info(`✅ Agendamentos do modo noturno criados para ${groupId} (${startTime} - ${endTime})`);
}

/**
 * Re-inicializa os agendamentos a partir do arquivo de configuração (ex: na inicialização do bot)
 * @param {Client} client
 */
function initializeSchedules(client) {
  const configs = loadConfigs();
  for (const groupId in configs) {
    const { enabled, startTime, endTime } = configs[groupId];
    if (enabled) {
      scheduleNightMode(client, groupId, startTime, endTime);
    }
  }
}

module.exports = {
  name: '!noturno',
  description: 'Gerencia o modo noturno, restringindo o grupo para admins em horários específicos.',
  requireAdmin: true,
  category: 'admin',
  usage: 'on [HH:MM] [HH:MM] | off | status',

  async execute(client, msg, args, senderId) {
    const chat = await msg.getChat();
    if (!chat.isGroup) {
      return msg.reply('⚠️ Este comando só pode ser usado em grupos.');
    }

    const groupId = chat.id._serialized;
    const action = args[0]?.toLowerCase();
    const configs = loadConfigs();

    switch (action) {
      case 'on':
        const startTime = args[1];
        const endTime = args[2];

        if (!startTime || !endTime || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
          return msg.reply('⚠️ Formato de hora inválido. Use `!noturno on HH:MM HH:MM` (ex: `22:00 06:00`).');
        }
        
        scheduleNightMode(client, groupId, startTime, endTime);

        configs[groupId] = { enabled: true, startTime, endTime, configuredBy: senderId };
        saveConfigs(configs);

        await msg.reply(`✅ *Modo noturno ativado!*\n\n👥 *Grupo:* ${chat.name}\n⏰ *Horário:* ${startTime} às ${endTime}\n👮 *Configurado por:* ${senderId}\n📅 *Data:* ${getCurrentDateTimeBR()}\n\n🌙 *Funcionamento:*\n* Às ${startTime}: Grupo restrito apenas para admins\n* Às ${endTime}: Grupo liberado para todos\n* Processo automático diário\n\n💡 *O modo noturno entrará em vigor a partir de hoje!*`);
        break;

      case 'off':
        cancelExistingJobs(groupId);
        
        if (configs[groupId]) {
          configs[groupId].enabled = false;
          saveConfigs(configs);
        }
        
        // Garante que o grupo seja aberto imediatamente caso o comando seja usado durante o modo noturno
        await chat.setMessagesAdminsOnly(false);
        logger.info(`🌙 Modo noturno desativado manualmente para ${groupId}`);
        await msg.reply('✅ *Modo noturno desativado!*\nTodos os agendamentos foram removidos e o grupo está liberado.');
        break;

      case 'status':
        const config = configs[groupId];
        if (config && config.enabled) {
          await msg.reply(`*Status do Modo Noturno:*\n\n🟢 *Ativado*\n⏰ *Horário configurado:* ${config.startTime} às ${config.endTime}\n👮 *Configurado por:* ${config.configuredBy || 'N/A'}`);
        } else {
          await msg.reply('*Status do Modo Noturno:*\n\n🔴 *Desativado*');
        }
        break;

      default:
        await msg.reply('⚠️ Comando inválido. Use:\n`!noturno on HH:MM HH:MM`\n`!noturno off`\n`!noturno status`');
        break;
    }
  },

  // Exporta a função para ser chamada no index.js
  initializeSchedules,
};
