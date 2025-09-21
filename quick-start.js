/**
 * Versão simplificada do bot para teste rápido
 * Use este arquivo se houver problemas com a versão completa
 * 
 * Para usar: node quick-start.js
 */

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

console.log("🚀 Inicializando bot simplificado...");

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  }
});

// Master user
const MASTER = "5519999222004@c.us";

// Comandos básicos
const commands = {
  "!ping": {
    name: "!ping",
    requireAdmin: false,
    async execute(client, msg) {
      await msg.reply("🏓 Pong!");
    }
  },
  
  "!dados": {
    name: "!dados",
    requireAdmin: false,
    async execute(client, msg) {
      const chat = await msg.getChat();
      const senderId = msg.author || msg.from;
      
      let response = "📋 *Informações*\n\n";
      
      if (chat.isGroup) {
        response += `👥 Grupo: ${chat.name}\n`;
        response += `🆔 ID: \`${chat.id._serialized}\`\n`;
      } else {
        response += "💬 Conversa Privada\n";
      }
      
      response += `🙋 Seu ID: \`${senderId}\`\n`;
      response += `⏰ Hora: ${new Date().toLocaleString('pt-BR')}`;
      
      await msg.reply(response);
    }
  },
  
  "!restart": {
    name: "!restart",
    requireAdmin: true,
    async execute(client, msg) {
      const senderId = msg.author || msg.from;
      
      if (senderId !== MASTER) {
        await msg.reply("❌ Apenas o Master pode reiniciar.");
        return;
      }
      
      await msg.reply("♻️ Reiniciando...");
      setTimeout(() => process.exit(0), 1500);
    }
  }
};

// QR Code
client.on("qr", (qr) => {
  console.log("📱 Escaneie o QR Code:");
  qrcode.generate(qr, { small: true });
});

// Pronto
client.on("ready", () => {
  console.log("✅ Bot conectado!");
  console.log(`👤 Logado como: ${client.info.pushname}`);
});

// Processar mensagens
client.on("message_create", async (msg) => {
  try {
    const body = msg.body.trim();
    if (!body.startsWith("!")) return;
    
    const commandName = body.split(" ")[0].toLowerCase();
    const command = commands[commandName];
    
    if (!command) return;
    
    const senderId = msg.author || msg.from;
    
    // Verifica se é admin (apenas Master por enquanto)
    if (command.requireAdmin && senderId !== MASTER) {
      await msg.reply("❌ Comando apenas para admins.");
      return;
    }
    
    console.log(`⚡ Executando: ${commandName} por ${senderId}`);
    await command.execute(client, msg);
    
  } catch (error) {
    console.error("❌ Erro:", error.message);
    try {
      await msg.reply("❌ Erro interno.");
    } catch (e) {
      console.error("❌ Erro ao enviar resposta:", e.message);
    }
  }
});

// Inicializar
client.initialize().catch(error => {
  console.error("💥 Erro fatal:", error);
  process.exit(1);
});

console.log("⏳ Aguardando conexão...");
