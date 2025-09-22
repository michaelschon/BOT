// ===== src/commands/nickname/apelido.js =====
/**
 * Comando !apelido - Corrigido para usar o novo sistema
 * Permite definir e alterar apelidos no grupo de volleyball
 * 
 * @author Volleyball Team
 * @version 3.0 - Corrigido para o novo sistema otimizado
 */

const { statements } = require("../../core/db");
const { getCooldown, setCooldown } = require("../../core/cache");
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
  usage: '!apelido [seu apelido]',
  aliases: ['!setnick', '!nickname'],
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
      
      // ===== VALIDAÇÕES BÁSICAS =====
      if (!chat.isGroup) {
        await msg.reply('⚠️ Este comando só pode ser usado em grupos.');
        return;
      }
      
      // Verificar se forneceu apelido
      if (args.length === 0) {
        await msg.reply(
          `⚠️ **Uso correto:** \`!apelido SeuApelido\`\n\n` +
          `📝 **Exemplos:**\n` +
          `• \`!apelido João\`\n` +
          `• \`!apelido Ace\`\n` +
          `• \`!apelido ⚡Lightning⚡\`\n\n` +
          `💡 **Dicas:**\n` +
          `• Entre 2 e 30 caracteres\n` +
          `• Seja criativo mas respeitoso\n` +
          `• Emojis são bem-vindos! 🏐\n\n` +
          `📋 Para ver seu apelido atual: \`!nick\``
        );
        return;
      }
      
      const groupId = chat.id._serialized;
      const novoApelido = args.join(' ').trim();
      
      // ===== VERIFICAÇÃO DE COOLDOWN =====
      const cooldownLeft = getCooldown(senderId, "!apelido");
      if (cooldownLeft > 0) {
        const segundos = Math.ceil(cooldownLeft / 1000);
        await msg.reply(
          `⏰ **Cooldown ativo**\n\n` +
          `⏳ Aguarde **${segundos}s** antes de alterar o apelido novamente.\n\n` +
          `💡 Este limite evita spam e garante que todos tenham tempo de se acostumar com seu novo apelido!`
        );
        return;
      }
      
      // ===== VALIDAÇÕES DO APELIDO =====
      
      // Tamanho
      if (novoApelido.length < 2) {
        await msg.reply(
          `❌ **Apelido muito curto!**\n\n` +
          `📏 Mínimo: **2 caracteres**\n` +
          `📝 Você digitou: **${novoApelido.length} caractere(s)**\n\n` +
          `💡 Tente algo como: \`Ace\`, \`Jo\`, \`⚡\``
        );
        return;
      }
      
      if (novoApelido.length > 30) {
        await msg.reply(
          `❌ **Apelido muito longo!**\n\n` +
          `📏 Máximo: **30 caracteres**\n` +
          `📝 Você digitou: **${novoApelido.length} caracteres**\n\n` +
          `💡 Tente encurtá-lo: "${novoApelido.substring(0, 25)}..."`
        );
        return;
      }
      
      // Caracteres proibidos básicos
      const caracteresProibidos = /[<>{}\\]/;
      if (caracteresProibidos.test(novoApelido)) {
        await msg.reply(
          `❌ **Caracteres não permitidos!**\n\n` +
          `🚫 Evite: \`< > { } \\\`\n` +
          `✅ Permitidos: letras, números, emojis, espaços, _ - .\n\n` +
          `💡 Seja criativo mas use caracteres normais!`
        );
        return;
      }
      
      // ===== CONSULTAS AO BANCO =====
      
      // Verificar apelido atual
      const apelidoAnterior = statements.getNickname.get(groupId, senderId);
      
      // Verificar se o novo apelido já está em uso
      const apelidoEmUso = statements.isNicknameInUse.get(groupId, novoApelido, senderId);
      
      // ===== VALIDAÇÕES DE REGRAS DE NEGÓCIO =====
      
      // Se o apelido já está em uso por outra pessoa
      if (apelidoEmUso) {
        await msg.reply(
          `⚠️ **Apelido indisponível!**\n\n` +
          `🏷️ **"${novoApelido}"** já está sendo usado por outra pessoa no grupo.\n\n` +
          `💡 **Sugestões:**\n` +
          `• ${novoApelido}2\n` +
          `• ${novoApelido}_\n` +
          `• ${novoApelido}🏐\n` +
          `• ${novoApelido}Ace\n\n` +
          `🤝 Seja criativo e encontre uma variação única!`
        );
        return;
      }
      
      // Se o apelido atual está bloqueado por admin
      if (apelidoAnterior && apelidoAnterior.locked) {
        const frase = FRASES_BLOQUEIO[Math.floor(Math.random() * FRASES_BLOQUEIO.length)];
        await msg.reply(
          `🔒 **Apelido bloqueado para alteração!**\n\n` +
          `🏷️ **Apelido atual:** "${apelidoAnterior.nickname}"\n` +
          `👮 **Status:** Bloqueado por admin\n\n` +
          `${frase}\n\n` +
          `💡 **Para liberar:** Peça para um admin usar \`!desbloquear ${apelidoAnterior.nickname}\``
        );
        return;
      }
      
      // ===== EXECUTAR ALTERAÇÃO =====
      
      try {
        // Usar a query corrigida com os 6 parâmetros necessários
        statements.setNickname.run(
          groupId,        // grupo_id
          senderId,       // usuario_id  
          novoApelido,    // nickname
          senderId,       // set_by
          groupId,        // Para a subquery COALESCE (grupo_id)
          senderId        // Para a subquery COALESCE (usuario_id)
        );
        
        // ===== RESPOSTA DE SUCESSO =====
        
        let resposta;
        
        if (apelidoAnterior && apelidoAnterior.nickname) {
          // Usuário alterou apelido existente
          resposta = 
            `✅ **Apelido alterado com sucesso!**\n\n` +
            `🔄 **De:** "${apelidoAnterior.nickname}"\n` +
            `🔄 **Para:** "${novoApelido}"\n\n` +
            `🏐 Agora todos vão te chamar de **${novoApelido}** nas partidas!\n\n` +
            `💡 Lembre-se: você pode alterar novamente após o cooldown.`;
        } else {
          // Usuário definiu primeiro apelido
          resposta = 
            `🎉 **Bem-vindo(a) ao time, ${novoApelido}!**\n\n` +
            `✨ Seu apelido foi definido com sucesso!\n` +
            `🏐 Agora você faz parte oficial da família do volleyball!\n\n` +
            `🤝 **Próximos passos:**\n` +
            `• Participe das partidas\n` +
            `• Interaja com o pessoal\n` +
            `• Divirta-se jogando!\n\n` +
            `💡 Use \`!nick\` para ver detalhes do seu apelido.`;
        }
        
        await msg.reply(resposta);
        
        // ===== LOGS E REGISTRO =====
        
        // Log detalhado para admin
        if (apelidoAnterior && apelidoAnterior.nickname) {
          logger.info(
            `📝 Apelido alterado: ${senderId} de "${apelidoAnterior.nickname}" ` +
            `para "${novoApelido}" no grupo "${chat.name}" (${groupId})`
          );
        } else {
          logger.info(
            `🆕 Primeiro apelido definido: ${senderId} -> "${novoApelido}" ` +
            `no grupo "${chat.name}" (${groupId})`
          );
        }
        
        // Registrar cooldown
        setCooldown(senderId, "!apelido", 10000); // 10 segundos
        
      } catch (dbError) {
        logger.error("❌ Erro no banco ao definir apelido:", dbError.message);
        
        await msg.reply(
          `❌ **Erro interno do sistema**\n\n` +
          `🔧 Ocorreu um problema ao salvar seu apelido.\n\n` +
          `💡 **O que fazer:**\n` +
          `• Tente novamente em alguns segundos\n` +
          `• Se persistir, contate um admin\n` +
          `• Use \`!ping\` para testar conectividade`
        );
      }
      
    } catch (error) {
      logger.error("❌ Erro geral no comando apelido:", error.message);
      console.error(error);
      
      await msg.reply(
        `❌ **Erro inesperado**\n\n` +
        `🤖 O sistema detectou um problema interno.\n` +
        `👨‍💻 A equipe de desenvolvimento foi notificada automaticamente.\n\n` +
        `💡 Tente novamente em alguns minutos.`
      );
    }
  }
};
