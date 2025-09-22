// ===== ARQUIVO: src/commands/admin/listaadm.js (CORRIGIDO) =====

/**
 * Comando para listar todos os admins do grupo - VERSÃO CORRIGIDA
 * CORREÇÃO: Import do MASTER_USER_ID + otimização de queries
 * 
 * @author Volleyball Team
 */

const { getGroupAdmins, MASTER_USER_ID } = require("../../config/auth"); // CORREÇÃO: Import adicionado
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
      
      // ===== OTIMIZAÇÃO: Query mais rápida =====
      console.log(`🔍 Consultando admins do grupo ${groupId}`);
      const startTime = Date.now();
      
      // Obter lista de admins (otimizado)
      const admins = getGroupAdmins(groupId);
      const queryTime = Date.now() - startTime;
      
      console.log(`⚡ Query executada em ${queryTime}ms - Encontrados ${admins.length} admins`);

      if (admins.length === 0) {
        await msg.reply(
          `👑 **Lista de Admins**\n\n` +
          `👥 **Grupo:** ${chat.name}\n` +
          `📊 **Total:** 0 admin(s) cadastrado(s)\n\n` +
          `💡 **Nota:** Use \`!addadm <telefone>\` para adicionar admins.`
        );
        return;
      }

      let resposta = `👑 **Lista de Admins**\n\n`;
      resposta += `👥 **Grupo:** ${chat.name}\n`;
      resposta += `📊 **Total:** ${admins.length} admin(s) cadastrado(s)\n\n`;
      resposta += `📋 **Lista:**\n\n`;

      // ===== OTIMIZAÇÃO: Processamento mais eficiente =====
      const adminsOrdenados = admins.sort((a, b) => {
        // Master sempre primeiro
        if (a.usuario_id === MASTER_USER_ID) return -1;
        if (b.usuario_id === MASTER_USER_ID) return 1;
        
        // Depois por data
        return new Date(a.granted_at) - new Date(b.granted_at);
      });

      adminsOrdenados.forEach((admin, index) => {
        const numero = index + 1;
        const telefone = admin.usuario_id.replace("@c.us", "");
        const isMaster = admin.usuario_id === MASTER_USER_ID;
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
      resposta += `💡 **Comandos relacionados:**\n`;
      resposta += `• \`!addadm <telefone>\` - Adicionar admin\n`;
      resposta += `• \`!deladm <telefone>\` - Remover admin`;

      await msg.reply(resposta);

      // Log otimizado
      const totalTime = Date.now() - startTime;
      console.log(`✅ Lista de ${admins.length} admins gerada em ${totalTime}ms para ${senderId}`);

    } catch (error) {
      console.error("❌ Erro no listadm:", error);
      await msg.reply("❌ Erro ao listar admins do grupo.");
    }
  }
};
