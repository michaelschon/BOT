/**
 * Comando para listar todos os admins do grupo
 * Mostra informações detalhadas dos administradores
 * 
 * @author Volleyball Team
 */

const { getGroupAdmins } = require("../../config/auth");
const { statements } = require("../../core/db");

module.exports = {
  name: "!listadm",
  aliases: ["!listaradm", "!admins", "!listadmins"],
  description: "Lista todos os admins do grupo",
  usage: "!listadm",
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
      
      // Debug: verificar conteúdo da tabela
      console.log(`🔍 Debug listadm: Consultando admins do grupo ${groupId}`);
      
      // Obter lista de admins
      const admins = getGroupAdmins(groupId);
      console.log(`🔍 Debug listadm: Encontrados ${admins.length} admins`);

      if (admins.length === 0 || (admins.length === 1 && admins[0].usuario_id === MASTER_USER_ID)) {
        // Debug adicional - verificar diretamente no banco
        const { db } = require("../../core/db");
        const directQuery = db.prepare(`
          SELECT * FROM admins_grupos WHERE grupo_id = ?
        `).all(groupId);
        
        console.log(`🔍 Debug listadm: Query direta retornou ${directQuery.length} registros:`, directQuery);
        
        await msg.reply(
          `👑 **Lista de Admins**\n\n` +
          `👥 **Grupo:** ${chat.name}\n` +
          `📊 **Total:** ${admins.filter(a => a.usuario_id !== MASTER_USER_ID).length} admin(s) cadastrado(s)\n` +
          `🔍 **Debug:** Query direta = ${directQuery.length} registros\n\n` +
          `💡 **Nota:** Apenas o Master tem acesso total.\n` +
          `🎯 Use \`!addadm <telefone>\` para adicionar admins.`
        );
        return;
      }

      let resposta = `👑 **Lista de Admins**\n\n`;
      resposta += `👥 **Grupo:** ${chat.name}\n`;
      resposta += `📊 **Total:** ${admins.length} admin(s) cadastrado(s)\n\n`;
      resposta += `📋 **Lista:**\n\n`;

      // Ordenar: Master primeiro, depois por data
      const adminsOrdenados = admins.sort((a, b) => {
        // Master sempre primeiro
        if (a.usuario_id.includes("5519999222004")) return -1;
        if (b.usuario_id.includes("5519999222004")) return 1;
        
        // Depois por data
        return new Date(a.granted_at) - new Date(b.granted_at);
      });

      adminsOrdenados.forEach((admin, index) => {
        const numero = index + 1;
        const telefone = admin.usuario_id.replace("@c.us", "");
        const isMaster = admin.usuario_id.includes("5519999222004");
        const dataFormatada = new Date(admin.granted_at).toLocaleDateString('pt-BR');
        
        // Ícone e status especial para Master
        const icone = isMaster ? "👑" : "👮";
        const status = isMaster ? "**MASTER**" : "Admin";
        
        resposta += `${numero}. ${icone} ${status}\n`;
        resposta += `   📱 \`${telefone}\`\n`;
        
        if (admin.name && admin.name !== 'Master Admin') {
          resposta += `   👤 ${admin.name}\n`;
        }
        
        if (isMaster) {
          resposta += `   🛡️ **Acesso total e irrestrito**\n`;
          resposta += `   🔒 **Não pode ser removido**\n`;
        } else {
          if (admin.granted_by && admin.granted_by !== 'SYSTEM') {
            const grantedByPhone = admin.granted_by.replace("@c.us", "");
            resposta += `   ✅ Adicionado por: \`${grantedByPhone}\`\n`;
          }
          resposta += `   📅 Desde: ${dataFormatada}\n`;
        }
        
        resposta += `\n`;
      });

      // Informações adicionais
      resposta += `💡 **Informações:**\n`;
      resposta += `• Admins podem usar todos os comandos administrativos\n`;
      resposta += `• Master tem acesso irrestrito e não pode ser removido\n`;
      resposta += `• Use \`!addadm\` e \`!deladm\` para gerenciar admins\n\n`;
      resposta += `🎯 **Comandos relacionados:**\n`;
      resposta += `• \`!addadm <telefone>\` - Adicionar admin\n`;
      resposta += `• \`!deladm <telefone>\` - Remover admin\n`;
      resposta += `• \`!op\` - Promover-se a admin do WhatsApp\n`;
      resposta += `• \`!deop\` - Remover-se como admin do WhatsApp`;

      await msg.reply(resposta);

      // Log da consulta
      console.log(
        `👑 Admin ${senderId} consultou lista de ${admins.length} admins ` +
        `no grupo ${groupId}`
      );

    } catch (error) {
      console.error("Erro no listadm:", error);
      await msg.reply("❌ Erro ao listar admins do grupo.");
    }
  }
};
