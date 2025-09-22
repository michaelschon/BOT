/**
 * Sistema de apelidos para grupos de volleyball
 * Permite que usuários definam apelidos únicos por grupo
 * * @author Volleyball Team
 * @version 3.2 - Corrigida a chamada ao DB mantendo a lógica original
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
  "🔐 Cofre do apelido está trancado! Chave está com a Julia. Boa sorte!",
];

module.exports = {
  name: '!apelido',
  description: 'Define ou altera seu apelido no grupo.',
  category: 'nickname',
  usage: '[seu apelido]',
  aliases: ['!setnick', '!nickname'],
  requireAdmin: false,

  async execute(client, msg, args, senderId) {
    try {
      const chat = await msg.getChat();
      if (!chat.isGroup) {
        return msg.reply('⚠️ Este comando só pode ser usado em grupos.');
      }
      
      const groupId = chat.id._serialized;
      const novoApelido = args.join(' ').trim();
      
      // Validação de cooldown
      if (checkCooldown(senderId, "!apelido")) {
        return msg.reply("⏳ Você trocou de apelido recentemente. Aguarde um pouco antes de trocar novamente.");
      }
      
      // Validações básicas do apelido
      const validation = validateCommandArgs(
        novoApelido,
        { min: 2, max: 30, regex: /^[a-zA-Z0-9À-ú\s_.-]+$/ },
        "apelido"
      );
      
      if (!validation.valid) {
        return msg.reply(validation.error);
      }
      
      // Consultas ao banco
      const apelidoAnterior = statements.getNickname.get(groupId, senderId);
      const isTaken = statements.isNicknameInUse.get(groupId, novoApelido, senderId);
      
      // Se o apelido já está em uso
      if (isTaken) {
        return msg.reply(`⚠️ O apelido "${novoApelido}" já está em uso por outra pessoa. Por favor, escolha outro.`);
      }
      
      // Se o apelido atual do usuário está bloqueado
      if (apelidoAnterior && apelidoAnterior.locked) {
        const frase = FRASES_BLOQUEIO[Math.floor(Math.random() * FRASES_BLOQUEIO.length)];
        return msg.reply(`🔒 Seu apelido atual ("${apelidoAnterior.nickname}") está bloqueado e não pode ser alterado.\n\n${frase}`);
      }
      
      try {
        // =================================================================
        // ===== INÍCIO DA SEÇÃO CORRIGIDA =====
        // =================================================================
        // Esta é a única linha que foi alterada para corrigir o bug.
        // Agora ela passa os 6 parâmetros que o 'db.js' espera.
        statements.setNickname.run(
          groupId,
          senderId,
          novoApelido,
          senderId, // set_by
          groupId,  // Parâmetro extra para a subquery COALESCE
          senderId  // Parâmetro extra para a subquery COALESCE
        );
        // ===============================================================
        // ===== FIM DA SEÇÃO CORRIGIDA =====
        // ===============================================================
        
        let resposta;
        if (apelidoAnterior && apelidoAnterior.nickname) {
          resposta = `✅ Apelido alterado de "${apelidoAnterior.nickname}" para "${novoApelido}"!\n\n`;
          resposta += `✨ Agora todos vão te chamar de ${novoApelido} nas partidas!`;
        } else {
          resposta = `🏐 Seja bem-vindo(a), ${novoApelido}!\n\n`;
          resposta += `✨ Seu apelido foi definido com sucesso! Agora você faz parte oficial do time!`;
        }
        
        await msg.reply(resposta);
        
        // Log detalhado
        logger.info(
          `✅ Apelido definido: ${senderId} -> \"${novoApelido}\" ` +
          `no grupo \"${chat.name}\" (${groupId})`
        );
        
        if (apelidoAnterior && apelidoAnterior.nickname) {
          logger.info(`📝 Mudança: \"${apelidoAnterior.nickname}\" -> \"${novoApelido}\"`);
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
        `❌ Ocorreu um erro inesperado. A equipe de desenvolvimento já foi notificada.`
      );
    }
  },
};
