/**
 * Comando para admins definirem apelido de outros usuários
 * CORRIGIDO: Lógica de parsing do telefone aprimorada
 *
 * @author Volleyball Team
 * @version 2.3 - Correção do parsing de telefone
 */

const { statements } = require("../../core/db");
const { normalizePhone } = require("../../utils/phone");
const logger = require("../../utils/logger");

module.exports = {
  name: "!apelidoadmin",
  aliases: ["!setapelido", "!definirapelido"],
  description: "Admin define apelido de outro usuário",
  usage: "!apelidoadmin <telefone> <apelido>",
  category: "admin",
  requireAdmin: true,

  async execute(client, msg, args, senderId) {
    try {
      const chat = await msg.getChat();
      
      if (!chat.isGroup) {
        await msg.reply("⚠️ Este comando só funciona em grupos!");
        return;
      }

      if (args.length < 2) {
        await msg.reply(
          "⚠️ Uso correto: `!apelidoadmin <telefone> <apelido>`\n\n" +
          "📱 **Formatos aceitos:**\n" +
          "• `!apelidoadmin +55 19 99999-9999 João`\n" +
          "• `!apelidoadmin 19999999999 João`\n" +
          "• `!apelidoadmin 19 99999999 João`\n" +
          "• `!apelidoadmin 19 9999-9999 João`\n\n" +
          "💡 **Exemplo:** `!apelidoadmin 19999999999 Cirilo`"
        );
        return;
      }

      const groupId = chat.id._serialized;
      
      // ===== CORREÇÃO PRINCIPAL: LÓGICA DE PARSING APRIMORADA =====
      
      let rawPhone = "";
      let novoApelido = "";
      let targetId = null;
      
      // Estratégia: Tentar diferentes combinações de argumentos para identificar telefone vs apelido
      // Começamos assumindo que o primeiro argumento é o telefone, depois vamos expandindo
      
      for (let i = 1; i <= Math.min(args.length - 1, 4); i++) {
        const phoneCandidate = args.slice(0, i).join(" ");
        const apelidoCandidate = args.slice(i).join(" ").trim();
        
        logger.debug(`🔍 Testando parsing: telefone="${phoneCandidate}", apelido="${apelidoCandidate}"`);
        
        // Tenta normalizar o candidato a telefone
        const normalizedPhone = normalizePhone(phoneCandidate);
        
        if (normalizedPhone && apelidoCandidate.length > 0) {
          // Sucesso! Encontramos uma combinação válida
          rawPhone = phoneCandidate;
          novoApelido = apelidoCandidate;
          targetId = normalizedPhone;
          
          logger.success(`✅ Parsing bem-sucedido: telefone="${rawPhone}" -> "${targetId}", apelido="${novoApelido}"`);
          break;
        }
      }

      // Se não conseguiu fazer o parsing
      if (!targetId || !novoApelido) {
        await msg.reply(
          `⚠️ **Não foi possível identificar telefone e apelido**\n\n` +
          `📝 **Argumentos recebidos:** ${args.join(' ')}\n\n` +
          `📱 **Formatos corretos:**\n` +
          `• \`!apelidoadmin +55 19 99184-5196 Cirilo\`\n` +
          `• \`!apelidoadmin 19991845196 Cirilo\`\n` +
          `• \`!apelidoadmin 19 99184-5196 Cirilo\`\n\n` +
          `💡 **Dica:** Certifique-se de que o telefone vem antes do apelido!`
        );
        
        logger.warn(`❌ Falha no parsing dos argumentos: ${JSON.stringify(args)}`);
        return;
      }

      // ===== VALIDAÇÕES DO APELIDO =====
      
      if (novoApelido.length < 2 || novoApelido.length > 30) {
        await msg.reply(
          `⚠️ **Apelido inválido**\n\n` +
          `📏 **Comprimento:** ${novoApelido.length} caracteres\n` +
          `📋 **Requisitos:** Entre 2 e 30 caracteres\n\n` +
          `✅ **Exemplos válidos:** João, Cirilo, Ace, MVP_2024`
        );
        return;
      }

      // Verificar se apelido não contém caracteres problemáticos
      const invalidChars = /[<>{}[\]\\\/]/;
      if (invalidChars.test(novoApelido)) {
        await msg.reply(
          `⚠️ **Caracteres inválidos no apelido**\n\n` +
          `🚫 **Não permitidos:** < > { } [ ] \\ /\n` +
          `✅ **Permitidos:** Letras, números, espaços, _ - .\n\n` +
          `💡 **Sugestão:** "${novoApelido.replace(invalidChars, '')}"`
        );
        return;
      }

      // ===== VERIFICAÇÕES NO BANCO DE DADOS =====

      try {
        // Verificar se apelido já está em uso
        const isTaken = statements.isNicknameInUse.get(groupId, novoApelido, targetId);
        if (isTaken) {
          await msg.reply(
            `⚠️ **Apelido já está em uso**\n\n` +
            `🏷️ **Apelido:** "${novoApelido}"\n` +
            `👥 **Grupo:** ${chat.name}\n\n` +
            `💡 **Sugestões:**\n` +
            `• "${novoApelido}2"\n` +
            `• "${novoApelido}_VB"\n` +
            `• "${novoApelido}2024"`
          );
          return;
        }

        // Verificar apelido anterior
        const apelidoAnterior = statements.getNickname.get(groupId, targetId);
        
        // Cadastrar usuário se não existir
        try {
          statements.insertUser.run(targetId, null, targetId.replace("@c.us", ""));
          logger.debug(`👤 Usuário ${targetId} cadastrado/atualizado no banco`);
        } catch (userError) {
          // Usuário já existe, tudo bem
          logger.debug(`👤 Usuário ${targetId} já existe no banco`);
        }

        // ===== DEFINIR NOVO APELIDO =====
        
        statements.setNickname.run(
          groupId,
          targetId,
          novoApelido,
          senderId, // set_by
          groupId,  // Para a subquery COALESCE
          targetId  // Para a subquery COALESCE
        );
        
        // Bloquear o apelido por padrão quando definido por admin
        statements.lockNickname.run(1, groupId, targetId);

        // ===== OBTER INFORMAÇÕES DO USUÁRIO PARA RESPOSTA =====
        
        let userName = targetId.replace("@c.us", "");
        try {
          const contact = await client.getContactById(targetId);
          userName = contact.pushname || userName;
        } catch (contactError) {
          logger.debug(`❌ Não foi possível obter contato para ${targetId}: ${contactError.message}`);
        }

        // ===== RESPOSTA DE SUCESSO =====
        
        let resposta = `👑 **Apelido definido pelo admin!**\n\n`;
        
        if (apelidoAnterior && apelidoAnterior.nickname) {
          resposta += `🔄 **Alteração:** "${apelidoAnterior.nickname}" → "${novoApelido}"\n`;
        } else {
          resposta += `✨ **Novo apelido:** "${novoApelido}"\n`;
        }
        
        resposta += `📱 **Telefone:** \`${rawPhone}\`\n`;
        resposta += `👤 **Usuário:** ${userName}\n`;
        resposta += `🆔 **ID:** \`${targetId}\`\n`;
        resposta += `👮 **Admin responsável:** ${senderId}\n`;
        resposta += `🔒 **Status:** Bloqueado para alteração (padrão)\n`;
        resposta += `⏰ **Data:** ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n`;
        resposta += `🏐 **${userName}** agora será conhecido como **${novoApelido}** no grupo!\n\n`;
        resposta += `💡 **Para liberar edição:** Use \`!liberarapelido ${rawPhone}\``;

        await msg.reply(resposta);

        // ===== LOG DA OPERAÇÃO =====
        
        logger.success(
          `👑 Admin ${senderId} definiu apelido "${novoApelido}" ` +
          `para ${targetId} (${userName}) no grupo ${groupId}`
        );

        // Log detalhado para debug
        logger.info(
          `📝 Detalhes da operação:\n` +
          `   • Argumentos originais: [${args.join(', ')}]\n` +
          `   • Telefone parseado: "${rawPhone}" -> "${targetId}"\n` +
          `   • Apelido definido: "${novoApelido}"\n` +
          `   • Apelido anterior: ${apelidoAnterior?.nickname || 'nenhum'}\n` +
          `   • Status bloqueado: sim`
        );

      } catch (dbError) {
        logger.error("❌ Erro no banco de dados:", dbError.message);
        console.error(dbError);
        
        await msg.reply(
          `❌ **Erro no banco de dados**\n\n` +
          `⚠️ Não foi possível salvar o apelido\n\n` +
          `🔧 **Erro:** ${dbError.message}\n\n` +
          `💡 **Solução:** Tente novamente em alguns segundos`
        );
      }

    } catch (error) {
      logger.error("❌ Erro geral no apelidoadmin:", error.message);
      console.error(error);
      
      await msg.reply(
        `❌ **Erro interno**\n\n` +
        `⚠️ Ocorreu um erro inesperado\n\n` +
        `🔧 **Erro:** ${error.message}\n\n` +
        `💡 A equipe técnica foi notificada`
      );
    }
  },
};
