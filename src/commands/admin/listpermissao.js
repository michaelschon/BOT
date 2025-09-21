/**
 * Comando para listar permissões específicas de usuário
 * Mostra todas as permissões granulares concedidas
 * 
 * @author Volleyball Team
 */

const { normalizePhone, formatPhoneDisplay } = require("../../utils/phone");
const { isGroupAdmin, MASTER_USER_ID } = require("../../config/auth");

module.exports = {
  name: "!listpermissao",
  aliases: ["!listperm", "!permissoes", "!listpermission"],
  description: "Lista todas as permissões de um usuário",
  usage: "!listpermissao <telefone>",
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

      if (args.length < 1) {
        await msg.reply(
          "⚠️ Uso correto: `!listpermissao <telefone>`\n\n" +
          "📱 Formatos aceitos:\n" +
          "• `!listpermissao +55 19 99999-9999`\n" +
          "• `!listpermissao 19999999999`\n" +
          "• `!permissoes 19 99999999`\n\n" +
          "📋 Mostra todas as permissões granulares do usuário"
        );
        return;
      }

      // Normalizar telefone
      const rawPhone = args.join(" ");
      const targetId = normalizePhone(rawPhone);
      
      if (!targetId) {
        await msg.reply(
          `⚠️ Número de telefone inválido: "${rawPhone}"\n\n` +
          "📱 Use um formato válido:\n" +
          "• +55 19 9999-9999\n" +
          "• 19999999999"
        );
        return;
      }

      const groupId = chat.id._serialized;

      try {
        // Verificar tipo de usuário
        const isMaster = targetId === MASTER_USER_ID;
        const isAdmin = isGroupAdmin(groupId, targetId);

        // Buscar permissões especiais
        const { db } = require("../../core/db");
        const permissoesEspeciais = db.prepare(`
          SELECT 
            pe.comando,
            pe.permitido,
            pe.granted_by,
            pe.granted_at,
            pe.expires_at,
            u.name as concedido_por_nome
          FROM permissoes_especiais pe
          LEFT JOIN usuarios u ON pe.granted_by = u.id
          WHERE pe.grupo_id = ? AND pe.usuario_id = ?
          AND (pe.expires_at IS NULL OR pe.expires_at > CURRENT_TIMESTAMP)
          ORDER BY pe.granted_at DESC
        `).all(groupId, targetId);

        // Separar permissões concedidas e negadas
        const concedidas = permissoesEspeciais.filter(p => p.permitido === 1);
        const negadas = permissoesEspeciais.filter(p => p.permitido === 0);

        // Montar resposta
        let resposta = `🔑 **Permissões do Usuário**\n\n`;
        resposta += `📱 **Usuário:** \`${targetId}\`\n`;
        resposta += `📞 **Telefone:** ${formatPhoneDisplay(targetId)}\n`;
        resposta += `👥 **Grupo:** ${chat.name}\n\n`;

        // Status geral
        resposta += `👤 **Status Geral:**\n`;
        if (isMaster) {
          resposta += `• 👑 **MASTER** - Acesso total e irrestrito\n`;
          resposta += `• ✅ Todos os comandos disponíveis\n`;
          resposta += `• 🛡️ Não pode ser removido ou restringido\n`;
        } else if (isAdmin) {
          resposta += `• 👮 **Admin do Bot** - Acesso a comandos de admin\n`;
          resposta += `• ✅ Pode usar a maioria dos comandos administrativos\n`;
        } else {
          resposta += `• 👤 **Usuário Comum** - Acesso limitado\n`;
          resposta += `• ⚠️ Apenas comandos públicos por padrão\n`;
        }
        
        resposta += `\n`;

        // Permissões especiais concedidas
        if (concedidas.length > 0) {
          resposta += `✅ **Permissões Especiais Concedidas (${concedidas.length}):**\n`;
          concedidas.forEach((perm, index) => {
            resposta += `${index + 1}. \`${perm.comando}\`\n`;
            
            if (perm.concedido_por_nome) {
              resposta += `   👮 Concedido por: ${perm.concedido_por_nome}\n`;
            }
            
            const dataConcessao = new Date(perm.granted_at);
            resposta += `   📅 Data: ${dataConcessao.toLocaleDateString('pt-BR')}\n`;
            
            if (perm.expires_at) {
              const dataExpiracao = new Date(perm.expires_at);
              resposta += `   ⏰ Expira: ${dataExpiracao.toLocaleDateString('pt-BR')}\n`;
            } else {
              resposta += `   ♾️ Permanente\n`;
            }
            
            resposta += `\n`;
          });
        } else {
          resposta += `⚪ **Permissões Especiais:** Nenhuma concedida\n\n`;
        }

        // Permissões negadas
        if (negadas.length > 0) {
          resposta += `❌ **Permissões Explicitamente Negadas (${negadas.length}):**\n`;
          negadas.forEach((perm, index) => {
            resposta += `${index + 1}. \`${perm.comando}\` (bloqueado)\n`;
            
            if (perm.concedido_por_nome) {
              resposta += `   👮 Negado por: ${perm.concedido_por_nome}\n`;
            }
            
            const dataNegacao = new Date(perm.granted_at);
            resposta += `   📅 Data: ${dataNegacao.toLocaleDateString('pt-BR')}\n\n`;
          });
        }

        // Resumo de acesso
        resposta += `📊 **Resumo de Acesso:**\n`;
        
        if (isMaster) {
          resposta += `• 🔓 **Acesso Total:** Todos os comandos\n`;
        } else {
          // Contar comandos públicos
          const { listCommands } = require("../../config/commands");
          const todosComandos = listCommands();
          const comandosPublicos = todosComandos.filter(c => !c.requireAdmin);
          const comandosAdmin = todosComandos.filter(c => c.requireAdmin);
          
          let acessoPublico = comandosPublicos.length;
          let acessoAdmin = isAdmin ? comandosAdmin.length : 0;
          let acessoEspecial = concedidas.length;
          let bloqueados = negadas.length;
          
          resposta += `• 🔓 Comandos públicos: ${acessoPublico}\n`;
          if (isAdmin) {
            resposta += `• 👮 Comandos de admin: ${acessoAdmin}\n`;
          }
          if (acessoEspecial > 0) {
            resposta += `• ⭐ Permissões especiais: ${acessoEspecial}\n`;
          }
          if (bloqueados > 0) {
            resposta += `• ❌ Explicitamente bloqueados: ${bloqueados}\n`;
          }
          
          const totalAcesso = acessoPublico + acessoAdmin + acessoEspecial;
          resposta += `• 📈 **Total de comandos acessíveis:** ${totalAcesso}/${todosComandos.length}\n`;
        }

        // Comandos de gerenciamento
        resposta += `\n🔧 **Gerenciar Permissões:**\n`;
        resposta += `• \`!addpermissao ${rawPhone} !comando\` - Adicionar\n`;
        resposta += `• \`!delpermissao ${rawPhone} !comando\` - Remover\n`;
        
        if (!isAdmin && !isMaster) {
          resposta += `• \`!addadm ${rawPhone}\` - Promover a admin\n`;
        }
        
        if (isAdmin && !isMaster) {
          resposta += `• \`!deladm ${rawPhone}\` - Remover como admin\n`;
        }

        await msg.reply(resposta);

        // Log da consulta
        console.log(
          `🔍 Permissões consultadas: ${senderId} verificou permissões de ${targetId} ` +
          `no grupo ${groupId} (${concedidas.length} especiais, admin: ${isAdmin})`
        );

      } catch (dbError) {
        console.error("Erro ao consultar permissões:", dbError);
        await msg.reply(
          `❌ **Erro ao consultar permissões**\n\n` +
          `📱 **Usuário:** \`${targetId}\`\n\n` +
          `🔧 **Erro:** ${dbError.message}\n\n` +
          `💡 **Solução:** Tente novamente ou contate o administrador.`
        );
      }

    } catch (error) {
      console.error("Erro no comando listpermissao:", error);
      await msg.reply("❌ Erro interno no sistema de consulta de permissões.");
    }
  }
};
