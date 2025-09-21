/**
 * Comando para listar todos os apelidos do grupo
 * Mostra informações detalhadas para admins
 * 
 * @author Volleyball Team
 */

module.exports = {
  name: "!listarapelidos",
  aliases: ["!listapelidos", "!apelidos", "!listnicks"],
  description: "Lista todos os apelidos cadastrados no grupo",
  usage: "!listarapelidos [--detalhado]",
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
      const detalhado = args.includes("--detalhado") || args.includes("-d");

      // Buscar todos os apelidos do grupo
      const { db } = require("../../core/db");
      const apelidos = db.prepare(`
        SELECT 
          a.usuario_id,
          a.nickname,
          a.locked,
          a.created_at,
          a.updated_at,
          u.name as usuario_nome,
          set_by.name as definido_por_nome
        FROM apelidos a
        LEFT JOIN usuarios u ON a.usuario_id = u.id
        LEFT JOIN usuarios set_by ON a.set_by = set_by.id
        WHERE a.grupo_id = ?
        ORDER BY a.nickname COLLATE NOCASE
      `).all(groupId);

      if (apelidos.length === 0) {
        await msg.reply(
          `📝 **Lista de Apelidos**\n\n` +
          `👥 **Grupo:** ${chat.name}\n` +
          `📊 **Total:** 0 apelidos cadastrados\n\n` +
          `💡 **Dica:** Use \`!apelidoadmin <telefone> <apelido>\` para criar o primeiro apelido!`
        );
        return;
      }

      // Estatísticas
      const total = apelidos.length;
      const bloqueados = apelidos.filter(a => a.locked === 1).length;
      const livres = total - bloqueados;

      let resposta = `📝 **Lista de Apelidos**\n\n`;
      resposta += `👥 **Grupo:** ${chat.name}\n`;
      resposta += `📊 **Estatísticas:**\n`;
      resposta += `• Total: ${total} apelidos\n`;
      resposta += `• 🔓 Livres: ${livres}\n`;
      resposta += `• 🔒 Bloqueados: ${bloqueados}\n\n`;

      // Modo detalhado
      if (detalhado) {
        resposta += `📋 **Lista Detalhada:**\n\n`;
        
        apelidos.forEach((apelido, index) => {
          const numero = index + 1;
          const status = apelido.locked === 1 ? "🔒" : "🔓";
          const telefone = apelido.usuario_id.replace("@c.us", "");
          const dataFormatada = new Date(apelido.created_at).toLocaleDateString('pt-BR');
          
          resposta += `${numero}. ${status} **${apelido.nickname}**\n`;
          resposta += `   📱 \`${telefone}\`\n`;
          
          if (apelido.usuario_nome) {
            resposta += `   👤 ${apelido.usuario_nome}\n`;
          }
          
          if (apelido.definido_por_nome) {
            resposta += `   👮 Por: ${apelido.definido_por_nome}\n`;
          }
          
          resposta += `   📅 ${dataFormatada}\n\n`;
        });
        
      } else {
        // Modo simples
        resposta += `📋 **Lista Simples:**\n\n`;
        
        const apelidosLivres = apelidos.filter(a => a.locked === 0);
        const apelidosBloqueados = apelidos.filter(a => a.locked === 1);
        
        if (apelidosLivres.length > 0) {
          resposta += `🔓 **Livres (${apelidosLivres.length}):**\n`;
          apelidosLivres.forEach((apelido, index) => {
            resposta += `${index + 1}. ${apelido.nickname}\n`;
          });
          resposta += `\n`;
        }
        
        if (apelidosBloqueados.length > 0) {
          resposta += `🔒 **Bloqueados (${apelidosBloqueados.length}):**\n`;
          apelidosBloqueados.forEach((apelido, index) => {
            resposta += `${index + 1}. ${apelido.nickname}\n`;
          });
          resposta += `\n`;
        }
        
        resposta += `💡 **Dica:** Use \`!listarapelidos --detalhado\` para ver mais informações.`;
      }

      // Quebrar mensagem se muito longa
      if (resposta.length > 4000) {
        const partes = [];
        const linhas = resposta.split('\n');
        let parteAtual = "";
        
        for (const linha of linhas) {
          if ((parteAtual + linha + '\n').length > 3500) {
            if (parteAtual) {
              partes.push(parteAtual);
              parteAtual = linha + '\n';
            }
          } else {
            parteAtual += linha + '\n';
          }
        }
        
        if (parteAtual) {
          partes.push(parteAtual);
        }
        
        // Enviar partes
        for (let i = 0; i < partes.length; i++) {
          const cabecalho = i === 0 ? "" : `📝 **Lista de Apelidos (${i + 1}/${partes.length})**\n\n`;
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
        `📋 Admin ${senderId} listou ${total} apelidos no grupo ${groupId} ` +
        `(modo: ${detalhado ? 'detalhado' : 'simples'})`
      );

    } catch (error) {
      console.error("Erro no listarapelidos:", error);
      await msg.reply("❌ Erro ao listar apelidos do grupo.");
    }
  }
};
