# 🏐 Setup do Bot de Volleyball

## 🚨 Correção do Erro Atual

O erro `SqliteError: no such column: id` indica um problema na estrutura do banco. Siga os passos abaixo:

### 1. Limpe o banco de dados atual
```bash
# Pare o bot (Ctrl+C)
rm -rf data/
```

### 2. Teste com versão simplificada primeiro
```bash
# Execute a versão simplificada para testar
node quick-start.js
```

### 3. Se a versão simplificada funcionar, use a versão completa
```bash
# Crie as pastas necessárias
mkdir -p src/commands/basic
mkdir -p src/commands/admin
mkdir -p data

# Execute o bot principal
node index.js
```

## 📁 Estrutura de Diretórios Necessária

```
bot/
├── index.js                 # Arquivo principal
├── quick-start.js           # Versão simplificada
├── package.json
├── data/                    # Dados persistentes (criado automaticamente)
│   ├── volleyball_bot.db    # Banco SQLite
│   └── wwebjs_auth/         # Sessão WhatsApp
└── src/
    ├── core/
    │   ├── client.js        # Cliente WhatsApp
    │   ├── db.js            # Banco de dados
    │   └── loader.js        # Carregador de comandos
    ├── config/
    │   ├── auth.js          # Sistema de autenticação
    │   └── commands.js      # Configurações de comandos
    ├── utils/
    │   ├── logger.js        # Sistema de logs
    │   ├── phone.js         # Utilitários de telefone
    │   └── audit.js         # Sistema de auditoria
    └── commands/
        ├── basic/           # Comandos básicos
        │   ├── ping.js
        │   └── dados.js
        └── admin/           # Comandos de admin
            └── restart.js
```

## 🔧 Configuração

### 1. Instale as dependências
```bash
npm install whatsapp-web.js@latest qrcode-terminal better-sqlite3 chalk nodemon
```

### 2. Configure seu número Master
No arquivo `src/config/auth.js`, altere a linha:
```javascript
const MASTER_USER_ID = "5519999222004@c.us"; // SEU NÚMERO AQUI
```

### 3. Execute o bot
```bash
# Desenvolvimento (com auto-reload)
npm run dev

# Produção
npm start

# Versão simplificada (para testes)
node quick-start.js
```

## 📱 Primeiro Uso

1. Execute o bot
2. Escaneie o QR Code com seu WhatsApp
3. Aguarde a mensagem "Bot conectado!"
4. Teste com `!ping` em qualquer chat

## 🎯 Comandos Disponíveis

### Básicos (todos podem usar)
- `!ping` - Testa o bot
- `!dados` - Mostra informações do contexto

### Admin (apenas Master e admins cadastrados)
- `!restart` - Reinicia o bot (apenas Master)

## 🛠️ Desenvolvimento

### Adicionando novos comandos
1. Crie um arquivo em `src/commands/categoria/`
2. Use a estrutura:
```javascript
module.exports = {
  name: "!seucomando",
  aliases: ["!alias1", "!alias2"],
  description: "Descrição do comando",
  category: "categoria",
  requireAdmin: false, // true se for só para admin
  
  async execute(client, msg, args, senderId) {
    // Sua lógica aqui
    await msg.reply("Resposta");
  }
};
```

### Configurando permissões
Edite `src/config/commands.js` para adicionar:
```javascript
"!seucomando": {
  enabled: true,
  requireAdmin: false,
  allowedGroups: [], // IDs dos grupos permitidos (vazio = todos)
  description: "Descrição",
  category: "categoria"
}
```

## 🔍 Troubleshooting

### Bot não conecta
1. Verifique se o WhatsApp Web funciona no navegador
2. Delete `data/wwebjs_auth/` e tente novamente
3. Verifique se não há outro WhatsApp Web conectado
4. Use a versão simplificada: `node quick-start.js`

### Erro de banco de dados
```bash
# Remove banco corrompido
rm -rf data/volleyball_bot.db

# Reinicia o bot (ele recria automaticamente)
node index.js
```

### Comandos não carregam
1. Verifique se as pastas `src/commands/` existem
2. Confira se os arquivos terminam com `.js`
3. Verifique a estrutura do comando (deve ter `name` e `execute`)

### Permissões não funcionam
1. Seu número deve estar no formato: `5519999999999@c.us`
2. Verifique se é exatamente o mesmo número cadastrado
3. Use `!dados` para ver seu ID real

## 📊 Banco de Dados

### Estrutura das Tabelas
- `usuarios` - Informações dos usuários
- `grupos` - Dados dos grupos
- `admins_grupos` - Admins por grupo (controle granular)
- `permissoes_especiais` - Permissões específicas por usuário/comando
- `apelidos` - Sistema de apelidos por grupo
- `auditoria` - Log de todos os comandos executados

### Comandos SQL úteis
```sql
-- Ver todos os usuários
SELECT * FROM usuarios;

-- Ver admins de um grupo
SELECT * FROM admins_grupos WHERE grupo_id = 'ID_DO_GRUPO';

-- Ver auditoria recente
SELECT * FROM auditoria ORDER BY timestamp DESC LIMIT 10;
```

## 🚀 Recursos Avançados

### Sistema de Permissões Granular
O bot suporta 3 níveis de permissão:
1. **Master** - Acesso total e irrestrito
2. **Admin de Grupo** - Cadastrados na tabela `admins_grupos`
3. **Permissões Especiais** - Por usuário/comando específico

### Sistema de Auditoria
- Registra todos os comandos executados
- Rastreia tentativas não autorizadas
- Gera estatísticas de uso
- Identifica atividade suspeita

### Sistema de Apelidos
- Apelidos por grupo (não globais)
- Admins podem definir apelidos de outros
- Sistema de bloqueio/desbloqueio
- Frases divertidas para bloqueios

## 📝 Logs

### Níveis de Log
- `INFO` - Informações gerais
- `WARN` - Avisos
- `ERROR` - Erros
- `DEBUG` - Debug (apenas em desenvolvimento)
- `SUCCESS` - Operações bem-sucedidas

### Ativando Debug
```bash
NODE_ENV=development node index.js
```

## 🔐 Segurança

### Boas Práticas
1. **Nunca** altere o número Master no código após production
2. Revise regularmente os logs de auditoria
3. Use permissões granulares ao invés de admin global
4. Monitore tentativas de uso não autorizado
5. Faça backup do banco regularmente

### Proteções Implementadas
- Validação rigorosa de permissões
- Sistema de cooldown para evitar spam
- Auditoria completa de ações
- Proteção contra modificação do Master
- Sanitização de dados sensíveis nos logs

## 🎯 Próximos Passos

### Comandos a Implementar
1. Sistema completo de apelidos
2. Comandos de administração de grupos
3. Sistema de avisos/advertências
4. Comandos de volleyball (estatísticas, jogos)
5. Sistema de notificações
6. Backup automático

### Melhorias Técnicas
1. Rate limiting por usuário
2. Sistema de plugins
3. API REST para administração
4. Dashboard web
5. Monitoramento de performance
6. Cluster support para múltiplos grupos

## 📞 Contato e Suporte

Para dúvidas sobre o código:
1. Verifique os logs detalhados
2. Use `!dados --completo` para debug
3. Consulte a auditoria do banco
4. Execute a versão simplificada primeiro

---

**⚠️ IMPORTANTE**: Este bot foi desenvolvido especificamente para o grupo de volleyball. Ajuste as configurações conforme sua necessidade antes de usar em outros contextos.

## 🏐 Comandos Específicos de Volleyball (Futuros)

Planejados para implementação:
- `!jogo` - Organizar partidas
- `!time` - Formar times
- `!stats` - Estatísticas dos jogadores  
- `!agenda` - Próximos jogos
- `!ranking` - Ranking dos jogadores
- `!mvp` - Jogador destaque
- `!lesao` - Registrar lesões/ausências