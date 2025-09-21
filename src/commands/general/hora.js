/**
 * Comando para mostrar data e hora atual
 * Exibe informações de tempo no timezone de São Paulo
 * 
 * @author Volleyball Team
 */

const { checkCooldown, setCooldown } = require("../../config/commands");

module.exports = {
  name: "!hora",
  aliases: ["!time", "!agora", "!datetime"],
  description: "Mostra a data e hora atual no timezone de São Paulo",
  usage: "!hora [--completo]",
  category: "utilitários",
  requireAdmin: false,

  /**
   * Executa o comando hora
   * @param {Client} client Cliente do WhatsApp
   * @param {Message} msg Mensagem recebida
   * @param {Array} args Argumentos do comando
   * @param {string} senderId ID de quem enviou
   */
  async execute(client, msg, args, senderId) {
    try {
      // Verifica cooldown (2 segundos para evitar spam)
      const cooldownLeft = checkCooldown(senderId, "!hora");
      if (cooldownLeft > 0) {
        await msg.reply(`⏰ Aguarde ${cooldownLeft}s antes de consultar a hora novamente.`);
        return;
      }

      const showComplete = args.includes("--completo") || args.includes("-c");
      
      // Obter data/hora atual no timezone de São Paulo
      const now = new Date();
      const timezoneSP = 'America/Sao_Paulo';
      
      // Formatações diferentes para diferentes propósitos
      const horaCompleta = now.toLocaleString('pt-BR', {
        timeZone: timezoneSP,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      const horaSimples = now.toLocaleString('pt-BR', {
        timeZone: timezoneSP,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      const dataSimples = now.toLocaleDateString('pt-BR', {
        timeZone: timezoneSP,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      if (showComplete) {
        // Resposta completa com informações detalhadas
        let resposta = `🕐 **Data e Hora Completa**\n\n`;
        resposta += `📅 **${horaCompleta}**\n\n`;
        
        // Informações adicionais
        const diaSemana = now.toLocaleDateString('pt-BR', {
          timeZone: timezoneSP,
          weekday: 'long'
        });
        
        const mes = now.toLocaleDateString('pt-BR', {
          timeZone: timezoneSP,
          month: 'long'
        });
        
        const ano = now.getFullYear();
        const dia = now.toLocaleDateString('pt-BR', {
          timeZone: timezoneSP,
          day: 'numeric'
        });
        
        resposta += `📊 **Detalhes:**\n`;
        resposta += `• 📅 Data: ${dataSimples}\n`;
        resposta += `• 🕐 Hora: ${horaSimples}\n`;
        resposta += `• 📆 Dia da semana: ${diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)}\n`;
        resposta += `• 🗓️ Mês: ${mes.charAt(0).toUpperCase() + mes.slice(1)}\n`;
        resposta += `• 📈 Ano: ${ano}\n`;
        resposta += `• 🌍 Timezone: ${timezoneSP}\n\n`;
        
        // Informações do timestamp
        const timestamp = now.getTime();
        const timestampSeconds = Math.floor(timestamp / 1000);
        
        resposta += `⚙️ **Informações Técnicas:**\n`;
        resposta += `• Unix Timestamp: ${timestampSeconds}\n`;
        resposta += `• Milissegundos: ${timestamp}\n`;
        resposta += `• ISO String: ${now.toISOString()}\n\n`;
        
        // Cálculos interessantes
        const inicioAno = new Date(ano, 0, 1);
        const diasDoAno = Math.floor((now - inicioAno) / (1000 * 60 * 60 * 24)) + 1;
        const semanaDoAno = Math.ceil(diasDoAno / 7);
        
        resposta += `📈 **Estatísticas do Ano:**\n`;
        resposta += `• Dia ${diasDoAno} de ${ano}\n`;
        resposta += `• Semana ${semanaDoAno} do ano\n`;
        
        await msg.reply(resposta);
        
      } else {
        // Resposta simples e rápida
        let resposta = `🕐 **${horaSimples}**\n`;
        resposta += `📅 **${dataSimples}**\n\n`;
        resposta += `📍 *São Paulo, Brasil*\n\n`;
        resposta += `💡 Use \`!hora --completo\` para mais detalhes`;
        
        await msg.reply(resposta);
      }
      
      // Registra cooldown
      setCooldown(senderId, "!hora");
      
      // Log simples da consulta
      console.log(`🕐 ${senderId} consultou hora: ${horaSimples} - ${dataSimples}`);
      
    } catch (error) {
      console.error("Erro no comando hora:", error);
      await msg.reply("❌ Erro ao obter informações de data e hora.");
    }
  }
};
