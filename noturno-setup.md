# 🌙 Configuração do Modo Noturno

## 📋 Resumo do Comando !noturno

O comando `!noturno` permite configurar horários em que apenas admins podem enviar mensagens no grupo, restringindo automaticamente as permissões durante a noite.

## 🎯 Comandos Disponíveis

### Ativar Modo Noturno
```bash
!noturno on 23:30 05:00    # Das 23h30 às 05h00
!noturno on 22:00 06:30    # Das 22h00 às 06h30  
!noturno on 00:00 07:00    # Da meia-noite às 07h00
```

### Ver Status
```bash
!noturno status            # Mostra configuração atual
!noturno                   # Mesmo comando (status padrão)
```

### Desativar
```bash
!noturno off               # Desativa completamente
```

## ⚙️ Como Funciona

1. **Ativação Automática:** No horário definido (ex: 23h30)
   - Grupo é restrito para apenas admins
   - Mensagem automática de "modo noturno ativado"
   - Figurinha de boa noite (se configurada)

2. **Desativação Automática:** No horário final (ex: 05h00)
   - Grupo é liberado para todos
   - Mensagem de "bom dia"
   - Figurinha de bom dia (se configurada)

3. **Funcionamento Diário:** Repete automaticamente todos os dias

## 🎨 Configuração das Figurinhas (Opcional)

Para adicionar figurinhas automáticas:

1. **Criar diretório:**
```bash
mkdir -p assets/stickers
```

2. **Adicionar figurinhas:**
- `assets/stickers/boa-noite.webp` - Enviada quando ativa modo noturno
- `assets/stickers/bom-dia.webp` - Enviada quando desativa modo noturno

3. **Formato das figurinhas:**
- Formato: `.webp` (recomendado) ou `.png`
- Tamanho: Máximo 500KB
- Dimensões: 512x512 pixels (ideal para stickers)

## 📁 Estrutura de Arquivos

```
projeto/
├── assets/
│   └── stickers/
│       ├── boa-noite.webp    # Figurinha noturna
│       └── bom-dia.webp      # Figurinha matinal
├── data/
│   └── night-mode-configs.json  # Configurações salvas
└── src/commands/admin/
    └── noturno.js            # Comando principal
```

## 🔧 Requisitos Técnicos

1. **Bot deve ser admin do grupo WhatsApp**
   - Necessário para alterar configurações de mensagens
   - Use `!op` para promover o bot se necessário

2. **Permissões necessárias:**
   - Admin do bot (para executar comando)
   - Admin do WhatsApp (para alterar configurações do grupo)

## 💡 Exemplos de Uso

### Cenário 1: Grupo de Volleyball
```bash
# Configurar para restringir das 23h às 6h
!noturno on 23:00 06:00

# Resultado:
# - 23h00: "🌙 MODO NOTURNO ATIVADO" + figurinha
# - 06h00: "☀️ BOM DIA!" + figurinha
```

### Cenário 2: Horário Estendido
```bash
# Noite mais longa (22h30 às 07h00)
!noturno on 22:30 07:00
```

### Cenário 3: Desativar Temporariamente
```bash
# Para eventos especiais ou finais de semana
!noturno off

# Reativar depois
!noturno on 23:30 05:00
```

## 📊 Mensagens Automáticas

### Ativação (23h30):
```
🌙 MODO NOTURNO ATIVADO

⏰ Horário: 23:30 às 05:00
🔇 Grupo restrito: Apenas admins podem enviar mensagens
☀️ Volta ao normal: 05:00

😴 Boa noite e descansem bem!
```

### Desativação (05h00):
```
☀️ BOM DIA!

🔊 Grupo liberado: Todos podem enviar mensagens novamente
🌅 Modo noturno finalizado

🏐 Bom dia, pessoal! Vamos começar mais um dia de volleyball!
```

## 🚨 Troubleshooting

### Problema: "Bot precisa ser admin do grupo"
**Solução:**
```bash
# 1. Promover o bot a admin do WhatsApp
!op

# 2. Tentar configurar novamente
!noturno on 23:30 05:00
```

### Problema: Modo noturno não ativa automaticamente
**Verificações:**
1. Bot está online e funcionando?
2. Configuração foi salva corretamente? (`!noturno status`)
3. Horário está no formato correto? (HH:mm)

### Problema: Figurinhas não aparecem
**Soluções:**
- Verificar se arquivos existem em `assets/stickers/`
- Confirmar formato `.webp` ou `.png`
- Verificar tamanho (máximo 500KB)
- Bot continua funcionando mesmo sem figurinhas

### Problema: Grupo não está sendo restrito
**Verificações:**
1. Bot é admin do grupo no WhatsApp?
2. Grupo permite alteração de configurações?
3. Verificar logs do bot para erros

## 📝 Logs e Monitoramento

O sistema registra automaticamente:
- Configurações ativadas/desativadas
- Execuções automáticas dos horários
- Erros durante a execução
- Envio de figurinhas (sucesso/falha)

Exemplo de logs:
```
🌙 Modo noturno ativado: user@c.us configurou 23:30-05:00 no grupo 123@g.us
🌙 Agendado para 123@g.us: Início 20/09/2025 23:30:00, Fim 21/09/2025 05:00:00
🌙 Modo noturno ativado no grupo 123@g.us
🎨 Figurinha de night enviada para 123@g.us
☀️ Modo noturno desativado no grupo 123@g.us
```

## 🔄 Persistência

As configurações são salvas automaticamente em:
- `data/night-mode-configs.json`
- Agendamentos são restaurados quando o bot reinicia
- Configurações permanecem mesmo após restart

## 🎯 Casos de Uso Recomendados

### Para Grupos de Esporte:
- **22:30 às 06:00** - Permite conversa pós-jogo até tarde
- **00:00 às 07:00** - Restrição da meia-noite às 7h

### Para Grupos Familiares:
- **23:00 às 06:00** - Horário padrão de descanso
- **21:30 às 07:30** - Mais rigoroso para famílias com crianças

### Para Grupos de Trabalho:
- **19:00 às 08:00** - Respeitar horário não comercial
- **18:00 às 09:00** - Período estendido de descanso

## 🔒 Segurança e Limitações

### Proteções Implementadas:
- Apenas admins do bot podem configurar
- Bot deve ser admin do WhatsApp para funcionar
- Configurações são validadas antes de salvar
- Agendamentos são restaurados após reinicialização

### Limitações Conhecidas:
- Depende do bot estar online e funcionando
- Requer permissões de admin no WhatsApp
- Figurinhas são opcionais (bot funciona sem elas)
- Configuração por grupo (não global)

## 🚀 Comandos Relacionados

Outros comandos úteis para gerenciar o grupo:
```bash
!op                    # Promover bot a admin do WhatsApp
!listadm              # Ver admins do grupo
!addadm <telefone>    # Adicionar admin do bot
!welcome on           # Ativar boas-vindas automáticas
```

---

**Desenvolvido para o grupo de volleyball - Bot funcional e completo!**
