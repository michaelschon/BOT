/**
 * Sistema de apelidos para grupos de volleyball
 * Permite que usuários definam apelidos únicos por grupo
 * 
 * @author Volleyball Team
 */

const { statements } = require("../../core/db");
const { getSenderId } = require("../../config/auth");
const { checkCooldown, setCooldown, validateCommandArgs } = require("../../config/commands");
const logger = require("../../utils/logger");

// Frases divertidas para quando o usuário está bloqueado
const FRASES_BLOQUEIO = [
  "🏐 Eu até tentei trocar, mas a Julia iria ficar brava...",
  "🤔 Eu tentei... Mas você foi moleque!",
  "🤷‍♀️ A Julia deixou?",
  "🍕 Já pagou a pizza aos ADMs?",
  "📝 Sabe que o nome de alguém é bem importante né? No seu caso, melhor trocar no RG. Vou mudar não!!!",
  "🏐 O técnico não autorizou essa mudança!",
  "⚽ Isso aqui é volleyball, não futebol - não pode trocar de camisa!",
  "🧢 Seu apelido está mais fixo que o líbero na defesa!",
  "🏃‍♂️ Você correu atrás da bola, mas não conseguiu trocar o nome!",
  "🤝 Conversa com o capitão do time primeiro!",
  "🎯 Seu apelido foi 'bloqueado' igual uma cortada no meio da rede!",
  "🏆 Parabéns! Você ganhou o prêmio de 'Apelido Fixo' da temporada!",
  "⚡ Sistema offline para troca de apelidos... Ou será que não? 🤫",
  "🎭 Plot twist: Seu apelido virou personagem principal e não quer sair de cena!",
  "🔐 Cofre do apelido está trancado! Chave está com os ADMs! 🗝️",
  "🎪 Bem-vindo ao circo! Mas aqui o palhaço mantém o mesmo nome!",
  "🚫 Error 404: Permissão para trocar apelido não encontrada!",
  "🎲 Você jogou os dados... E deu 'apelido bloqueado'!",
  "🎯 Acertou em cheio! No bloqueio de apelidos! 😂",
  "🧙‍♂️ O mago dos apelidos disse: 'Não passarás!' (com sotaque do Gandalf)"
];

module.exports = {
  name: "!apelido",
  aliases: ["!nickname"],
  description: "Define seu apelido no grupo atual",
  usage: "!apelido <novo_apelido>",
  category: "apelidos",
  requireAdmin: false,

  /**
   * Executa o comando apelido
   * @param {Client} client Cliente do WhatsApp
   * @param {Message} msg Mensagem recebida
   * @param {Array} args Argumentos do comando
   * @param {string} senderId ID de quem enviou
   */
  async execute(client, msg, args, senderId) {
    try {
      const chat = await msg.getChat();
      
      // ========== VALIDAÇÕES BÁSICAS ==========
      
      // Só funciona em grupos
      if (!chat.isGroup) {
        await msg.reply("⚠️ Este comando só funciona em grupos de volleyball!");
        return;
      }
      
      // Verifica cooldown
      const cooldownLeft = checkCooldown(senderId, "!apelido");
      if (cooldownLeft > 0) {
        await msg.reply(`⏰ Calma aí, campeão! Aguarde ${cooldownLeft}s antes de trocar de apelido novamente.`);
        return;
      }
      
      // Valida argumentos
      const validation = validateCommandArgs("!apelido", args);
      if (!validation.valid) {
        await msg.reply(`⚠️ ${validation.errors.join(', ')}\n\nUso correto: \`!apelido Apelido Novo\``);
        return;
      }
      
      const novoApelido = args.join(" ").trim();
      const groupId = chat.id._serialized;
      
      // ========== VALIDAÇÕES DE APELIDO ==========
      
      // Verifica tamanho
      if (novoApelido.length < 2) {
        await msg.reply("⚠️ O apelido deve ter pelo menos 2 caracteres!");
        return;
      }
      
      if (novoApelido.length > 30) {
        await msg.reply("⚠️ O apelido não pode ter mais que 30 caracteres!");
        return;
      }
      
      // Verifica caracteres proibidos
      const caracteresProibidos = /[<>@#&*{}[\]\\]/;
      if (caracteresProibidos.test(novoApelido)) {
        await msg.reply("⚠️ O apelido contém caracteres não permitidos! Use apenas letras, números, espaços e emojis básicos.");
        return;
      }
      
      // Verifica se não é muito similar a um comando
      if (novoApelido.toLowerCase().startsWith('!')) {
        await msg.reply("⚠️ O apelido não pode começar com '!' (reservado para comandos).");
        return;
      }
      
      // ========== VERIFICAÇÃO DE BLOQUEIO ==========
      
      try {
        const bloqueado = statements.getNickname.get(groupId, senderId);
        
        if (bloqueado && bloqueado.locked === 1) {
          // Usuário está bloqueado - resposta divertida
          const fraseAleatoria = FRASES_BLOQUEIO[Math.floor(Math.random() * FRASES_BLOQUEIO.length)];
          await msg.reply(fraseAleatoria);
          
          logger.info(`🔒 Tentativa de troca de apelido bloqueada: ${senderId} no grupo ${groupId}`);
          return;
        }
        
      } catch (error) {
        logger.error("❌ Erro ao verificar bloqueio:", error.message);
        // Continua mesmo com erro na verificação
      }
      
      // ========== VERIFICAÇÃO DE DUPLICAÇÃO ==========
      
      try {
        const { db } = require("../../core/db");
        const apelidoExistente = db.prepare(`
          SELECT usuario_id, nickname FROM apelidos 
          WHERE grupo_id = ? AND LOWER(nickname) = LOWER(?) AND usuario_id != ?
        `).get(groupId, novoApelido, senderId);
        
        if (apelidoExistente) {
          await msg.reply(
            `⚠️ Ops! O apelido "${novoApelido}" já está sendo usado por outro jogador neste grupo.\n\n` +
            `💡 Que tal tentar "${novoApelido}2", "${novoApelido}_01" ou "${novoApelido}🏐"?`
          );
          return;
        }
        
      } catch (error) {
        logger.warn("⚠️ Erro ao verificar duplicação de apelido:", error.message);
        // Continua mesmo com erro na verificação
      }
      
      // ========== DEFINIR APELIDO ==========
      
      try {
        // Obtém apelido anterior para log
        const apelidoAnterior = statements.getNickname.get(groupId, senderId);
        
        // Define novo apelido
        statements.setNickname.run(groupId, senderId, novoApelido, senderId);
        
        // Resposta de sucesso personalizada
        let resposta;
        if (apelidoAnterior && apelidoAnterior.nickname) {
          resposta = `🏐 Perfeito! Seu apelido foi alterado de "${apelidoAnterior.nickname}" para "${novoApelido}"!\n\n`;
          resposta += `✨ Agora todos vão te chamar de ${novoApelido} nas partidas!`;
        } else {
          resposta = `🏐 Seja bem-vindo(a), ${novoApelido}!\n\n`;
          resposta += `✨ Seu apelido foi definido com sucesso! Agora você faz parte oficial do time!`;
        }
        
        await msg.reply(resposta);
        
        // Log detalhado
        logger.info(
          `✅ Apelido definido: ${senderId} -> "${novoApelido}" ` +
          `no grupo "${chat.name}" (${groupId})`
        );
        
        // Se mudou de um apelido existente, log adicional
        if (apelidoAnterior && apelidoAnterior.nickname) {
          logger.info(`📝 Mudança: "${apelidoAnterior.nickname}" -> "${novoApelido}"`);
        }
        
        // Registra cooldown
        setCooldown(senderId, "!apelido");
        
      } catch (error) {
        logger.error("❌ Erro ao definir apelido:", error.message);
        
        await msg.reply(
          `❌ Ops! Ocorreu um erro ao definir seu apelido.\n\n` +
          `💡 Tente novamente em alguns segundos ou contate um admin se o problema persistir.`
        );
      }
      
    } catch (error) {
      logger.error("❌ Erro geral no comando apelido:", error.message);
      console.error(error);
      
      await msg.reply(
        `❌ Erro interno no sistema de apelidos.\n\n` +
        `🔧 Nossa equipe técnica foi notificada. Tente novamente mais tarde.`
      );
    }
  }
};
