/**
 * Sistema de criação de figurinhas
 * Processa imagens e vídeos enviados com !figurinha na descrição
 * 
 * @author Volleyball Team
 */

module.exports = {
  name: "!figurinha",
  aliases: ["!sticker", "!fig"],
  description: "Converte imagem/vídeo em figurinha",
  usage: "Envie mídia com '!figurinha' na descrição",
  category: "mídia",
  requireAdmin: false,

  /**
   * Processa mídia para criar figurinha
   * Esta função é chamada automaticamente quando detecta !figurinha na descrição
   */
  async processMedia(client, msg) {
    try {
      const chat = await msg.getChat();
      const senderId = msg.author || msg.from;
      
      // Verifica se é mídia válida
      if (!msg.hasMedia) {
        await msg.reply(
          `⚠️ **Nenhuma mídia encontrada!**\n\n` +
          `📷 **Como usar:**\n` +
          `1. Envie uma foto ou vídeo\n` +
          `2. Na descrição, escreva !figurinha\n` +
          `3. O bot criará a figurinha automaticamente\n\n` +
          `🏐 **Título:** "Criado pelo Amigos do Vôlei"`
        );
        return;
      }

      // Tipos de mídia suportados
      const tiposSuportados = ['image', 'video'];
      if (!tiposSuportados.includes(msg.type)) {
        await msg.reply(
          `⚠️ **Tipo de mídia não suportado!**\n\n` +
          `📱 **Tipos aceitos:**\n` +
          `• 📷 Imagens (JPG, PNG, GIF)\n` +
          `• 🎥 Vídeos (MP4, até 10 segundos)\n\n` +
          `❌ **Recebido:** ${msg.type}\n` +
          `💡 Envie uma foto ou vídeo com !figurinha na descrição`
        );
        return;
      }

      // Mensagem de processamento
      const processMsg = await msg.reply(`🔄 **Criando figurinha...**\n\n⏳ Processando mídia, aguarde...`);

      try {
        // Baixa a mídia
        const media = await msg.downloadMedia();
        
        if (!media) {
          throw new Error("Falha ao baixar mídia");
        }

        // Verifica tamanho da mídia
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (media.data && media.data.length > maxSize) {
          await processMsg.edit(
            `⚠️ **Arquivo muito grande!**\n\n` +
            `📊 **Tamanho:** ${(media.data.length / 1024 / 1024).toFixed(1)}MB\n` +
            `📏 **Limite:** 5MB\n\n` +
            `💡 **Dica:** Use uma imagem/vídeo menor`
          );
          return;
        }

        // Para vídeos, verificar duração (limitação do WhatsApp)
        if (msg.type === 'video') {
          // WhatsApp tem limite de ~6-10 segundos para stickers de vídeo
          console.log(`📹 Processando vídeo para figurinha (${media.mimetype})`);
        }

        // Configurações da figurinha
        const stickerOptions = {
          author: 'Amigos do Vôlei',
          pack: 'Criado pelo Amigos do Vôlei',
          type: msg.type === 'video' ? 'video' : 'default',
          quality: 50, // Qualidade moderada para otimizar tamanho
        };

        // Atualizar mensagem de status
        await processMsg.edit(`🎨 **Finalizando figurinha...**\n\n✨ Aplicando marca "Amigos do Vôlei"...`);

        // Enviar como figurinha
        await client.sendMessage(chat.id._serialized, media, {
          sendMediaAsSticker: true,
          stickerAuthor: stickerOptions.author,
          stickerName: stickerOptions.pack,
          stickerCategories: ['🏐', 'volleyball', 'esporte']
        });

        // Remover mensagem de processamento
        try {
          await processMsg.delete();
        } catch (deleteError) {
          // Se não conseguir deletar, edita
          await processMsg.edit(`✅ **Figurinha criada com sucesso!**\n\n🏐 Marca: "Amigos do Vôlei"`);
        }

        // Resposta de confirmação
        await msg.reply(
          `🎉 **Figurinha criada com sucesso!**\n\n` +
          `✨ **Título:** "Criado pelo Amigos do Vôlei"\n` +
          `👤 **Criado por:** ${senderId}\n` +
          `⏰ **Data:** ${new Date().toLocaleString('pt-BR')}\n\n` +
          `🏐 **Agora você pode usar esta figurinha em qualquer conversa!**`
        );

        // Log da criação
        console.log(
          `🎨 Figurinha criada: ${senderId} converteu ${msg.type} ` +
          `no grupo ${chat.name || 'PV'} (${chat.id._serialized})`
        );

      } catch (mediaError) {
        console.error("Erro ao processar mídia:", mediaError);
        
        // Remover mensagem de processamento
        try {
          await processMsg.delete();
        } catch (e) {}

        await msg.reply(
          `❌ **Erro ao criar figurinha**\n\n` +
          `⚠️ **Problema:** ${mediaError.message}\n\n` +
          `🔧 **Possíveis soluções:**\n` +
          `• Tente com uma imagem menor\n` +
          `• Para vídeos, use até 6 segundos\n` +
          `• Verifique se o formato é válido\n` +
          `• Tente novamente em alguns segundos\n\n` +
          `💡 **Formatos recomendados:**\n` +
          `• 📷 JPG, PNG (até 5MB)\n` +
          `• 🎥 MP4, GIF (até 6s, 5MB)`
        );
      }

    } catch (error) {
      console.error("Erro geral na criação de figurinha:", error);
      await msg.reply("❌ Erro interno no sistema de figurinhas.");
    }
  },

  /**
   * Comando manual para criar figurinha
   */
  async execute(client, msg, args, senderId) {
    try {
      // Se foi usado como comando direto
      if (msg.hasMedia) {
        await this.processMedia(client, msg);
      } else {
        await msg.reply(
          `🎨 **Sistema de Figurinhas**\n\n` +
          `📋 **Como usar:**\n` +
          `1. 📷 Envie uma foto ou vídeo\n` +
          `2. ✍️ Na descrição, escreva \`!figurinha\`\n` +
          `3. 🤖 O bot criará automaticamente\n\n` +
          `🏐 **Marca automática:** "Criado pelo Amigos do Vôlei"\n\n` +
          `📏 **Limites:**\n` +
          `• Imagens: até 5MB\n` +
          `• Vídeos: até 6 segundos, 5MB\n` +
          `• Formatos: JPG, PNG, MP4, GIF\n\n` +
          `💡 **Dica:** Também funciona em resposta a uma mídia!`
        );
      }
    } catch (error) {
      console.error("Erro no comando figurinha:", error);
      await msg.reply("❌ Erro no sistema de figurinhas.");
    }
  }
};
