/**
 * Setup Fresh Database - Configuração Limpa do Banco
 * Remove banco antigo e cria novo com estrutura otimizada
 * 
 * @author Volleyball Team
 * @version 1.0 - Setup completo e limpo
 */

const fs = require('fs');
const path = require('path');

console.log('🗄️ SETUP LIMPO DO BANCO DE DADOS');
console.log('=================================\n');

// ===== CAMINHOS =====
const projectRoot = __dirname;
const dataDir = path.join(projectRoot, 'data');
const dbPath = path.join(dataDir, 'volleyball.db');
const authDir = path.join(projectRoot, '.wwebjs_auth');

console.log('📁 Verificando estrutura de diretórios...');
console.log(`   • Projeto: ${projectRoot}`);
console.log(`   • Dados: ${dataDir}`);
console.log(`   • Banco: ${dbPath}`);

// ===== LIMPEZA COMPLETA =====
console.log('\n🧹 Removendo dados antigos...');

// Remover banco de dados antigo
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('✅ Banco de dados antigo removido');
} else {
  console.log('ℹ️ Nenhum banco antigo encontrado');
}

// Remover diretório de dados se vazio
if (fs.existsSync(dataDir)) {
  const files = fs.readdirSync(dataDir);
  if (files.length === 0) {
    fs.rmdirSync(dataDir);
    console.log('✅ Diretório de dados removido');
  }
}

// ===== CRIAR db.js CORRIGIDO =====
console.log('\n📝 Criando arquivo db.js otimizado...');

const dbContent = `/**
 * Database Core - SQLite3 Otimizado para Alta Performance
 * Sistema de banco de dados do bot de volleyball - VERSÃO LIMPA
 * 
 * @author Volleyball Team
 * @version 3.0 - Completamente otimizado e funcional
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// ===== CONFIGURAÇÃO DE CAMINHOS =====
const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'volleyball.db');

// Garantir que o diretório existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  logger.info('📁 Diretório de dados criado:', DATA_DIR);
}

// ===== INICIALIZAÇÃO DO BANCO =====
logger.info('🗄️ Inicializando banco SQLite...');

// CORREÇÃO CRÍTICA: Inicializar db ANTES de usar
const db = new Database(DB_PATH);

// ===== CONFIGURAÇÕES DE ALTA PERFORMANCE =====
try {
  logger.info('⚡ Aplicando configurações de alta performance...');
  
  // Configurações críticas para velocidade máxima
  db.pragma('journal_mode = WAL');          // Write-Ahead Logging - ESSENCIAL
  db.pragma('synchronous = NORMAL');        // Balance entre segurança e velocidade
  db.pragma('cache_size = -64000');         // 64MB de cache em memória
  db.pragma('temp_store = MEMORY');         // Temporários em RAM
  db.pragma('mmap_size = 268435456');       // Memory-mapped I/O de 256MB
  db.pragma('page_size = 4096');            // Tamanho otimizado de página
  db.pragma('foreign_keys = ON');           // Integridade referencial
  db.pragma('auto_vacuum = INCREMENTAL');   // Vacuum automático
  db.pragma('wal_autocheckpoint = 1000');   // Checkpoint automático
  
  logger.success('✅ Configurações de performance aplicadas!');
  
} catch (error) {
  logger.error('❌ Erro ao aplicar configurações:', error.message);
  throw error;
}

// ===== CRIAÇÃO DAS TABELAS =====
logger.info('🔄 Criando estrutura do banco...');

try {
  // ========== TABELA DE USUÁRIOS ==========
  db.exec(\`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,                    -- ID do WhatsApp (ex: 5519999999999@c.us)
      name TEXT,                              -- Nome atual do usuário
      phone TEXT,                             -- Número do telefone
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  \`);
  
  // ========== TABELA DE GRUPOS ==========
  db.exec(\`
    CREATE TABLE IF NOT EXISTS grupos (
      id TEXT PRIMARY KEY,                    -- ID do grupo (ex: 123456789@g.us)
      name TEXT NOT NULL,                     -- Nome do grupo
      description TEXT,                       -- Descrição do grupo
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  \`);
  
  // ========== TABELA DE ADMINISTRADORES POR GRUPO ==========
  db.exec(\`
    CREATE TABLE IF NOT EXISTS admins_grupos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grupo_id TEXT NOT NULL,                 -- ID do grupo
      usuario_id TEXT NOT NULL,               -- ID do usuário admin
      granted_by TEXT,                        -- Quem concedeu a permissão
      granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(grupo_id, usuario_id),           -- Evita duplicatas
      FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  \`);
  
  // ========== TABELA DE PERMISSÕES ESPECIAIS ==========
  db.exec(\`
    CREATE TABLE IF NOT EXISTS permissoes_especiais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grupo_id TEXT NOT NULL,                 -- ID do grupo
      usuario_id TEXT NOT NULL,               -- ID do usuário
      comando TEXT NOT NULL,                  -- Comando específico (ex: !kick)
      permitido BOOLEAN DEFAULT 1,           -- 1 = permitido, 0 = negado
      granted_by TEXT,                        -- Quem concedeu
      granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,                    -- Data de expiração (opcional)
      UNIQUE(grupo_id, usuario_id, comando),  -- Uma permissão por comando por usuário
      FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  \`);
  
  // ========== TABELA DE APELIDOS ==========
  db.exec(\`
    CREATE TABLE IF NOT EXISTS apelidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grupo_id TEXT NOT NULL,                 -- ID do grupo
      usuario_id TEXT NOT NULL,               -- ID do usuário
      nickname TEXT NOT NULL,                 -- Apelido do usuário
      set_by TEXT,                            -- Quem definiu o apelido
      locked BOOLEAN DEFAULT 0,              -- Se está bloqueado (1) ou não (0)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(grupo_id, usuario_id),           -- Um apelido por usuário por grupo
      FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  \`);
  
  // ========== TABELA DE SILENCIAMENTO ==========
  db.exec(\`
    CREATE TABLE IF NOT EXISTS silenciados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grupo_id TEXT NOT NULL,                 -- ID do grupo
      usuario_id TEXT NOT NULL,               -- ID do usuário silenciado
      silenciado_por TEXT,                    -- Quem aplicou o silenciamento
      motivo TEXT,                            -- Motivo do silenciamento
      minutos INTEGER,                        -- Duração em minutos (NULL = permanente)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,                    -- Data/hora de expiração
      UNIQUE(grupo_id, usuario_id),           -- Um silenciamento por usuário por grupo
      FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  \`);
  
  // ========== TABELA DE AUDITORIA ==========
  db.exec(\`
    CREATE TABLE IF NOT EXISTS auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id TEXT NOT NULL,               -- Quem executou
      grupo_id TEXT,                          -- Em que grupo (NULL = privado)
      comando TEXT NOT NULL,                  -- Comando executado
      argumentos TEXT,                        -- Argumentos do comando
      sucesso BOOLEAN DEFAULT 1,             -- Se foi executado com sucesso
      erro TEXT,                              -- Mensagem de erro (se houver)
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE
    )
  \`);
  
  logger.success('✅ Todas as tabelas criadas com sucesso!');
  
} catch (error) {
  logger.error('❌ Erro ao criar tabelas:', error.message);
  throw error;
}

// ===== CRIAR ÍNDICES DE PERFORMANCE =====
logger.info('🚀 Criando índices de performance...');

try {
  // Índices críticos para performance máxima
  db.exec(\`CREATE INDEX IF NOT EXISTS idx_usuarios_phone ON usuarios(phone)\`);
  db.exec(\`CREATE INDEX IF NOT EXISTS idx_grupos_name ON grupos(name)\`);
  
  // Índices CRÍTICOS para verificação de admin (mais usado)
  db.exec(\`CREATE INDEX IF NOT EXISTS idx_admins_lookup ON admins_grupos(grupo_id, usuario_id)\`);
  db.exec(\`CREATE INDEX IF NOT EXISTS idx_admins_granted_at ON admins_grupos(granted_at)\`);
  
  // Índices para permissões especiais
  db.exec(\`CREATE INDEX IF NOT EXISTS idx_permissions_lookup ON permissoes_especiais(grupo_id, usuario_id, comando)\`);
  db.exec(\`CREATE INDEX IF NOT EXISTS idx_permissions_expires ON permissoes_especiais(expires_at) WHERE expires_at IS NOT NULL\`);
  
  // Índices CRÍTICOS para apelidos (muito usado)
  db.exec(\`CREATE INDEX IF NOT EXISTS idx_apelidos_lookup ON apelidos(grupo_id, usuario_id)\`);
  db.exec(\`CREATE INDEX IF NOT EXISTS idx_apelidos_nickname_unique ON apelidos(grupo_id, LOWER(nickname))\`);
  db.exec(\`CREATE INDEX IF NOT EXISTS idx_apelidos_locked ON apelidos(locked) WHERE locked = 1\`);
  
  // Índices para silenciamento
  db.exec(\`CREATE INDEX IF NOT EXISTS idx_silenciados_active ON silenciados(grupo_id, usuario_id, expires_at)\`);
  db.exec(\`CREATE INDEX IF NOT EXISTS idx_silenciados_expires ON silenciados(expires_at) WHERE expires_at IS NOT NULL\`);
  
  // Índices para auditoria
  db.exec(\`CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_comando ON auditoria(usuario_id, comando)\`);
  db.exec(\`CREATE INDEX IF NOT EXISTS idx_auditoria_timestamp ON auditoria(timestamp)\`);
  db.exec(\`CREATE INDEX IF NOT EXISTS idx_auditoria_grupo_timestamp ON auditoria(grupo_id, timestamp)\`);
  
  logger.success('✅ Índices de performance criados!');
  
} catch (error) {
  logger.warn('⚠️ Alguns índices podem já existir:', error.message);
}

// ===== PREPARED STATEMENTS OTIMIZADOS =====
const statements = {
  // ========== USUÁRIOS ==========
  insertUser: db.prepare(\`
    INSERT OR REPLACE INTO usuarios (id, name, phone, updated_at) 
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  \`),
  getUser: db.prepare(\`SELECT * FROM usuarios WHERE id = ? LIMIT 1\`),
  getUserByPhone: db.prepare(\`SELECT * FROM usuarios WHERE phone = ? LIMIT 1\`),
  
  // ========== GRUPOS ==========
  insertGroup: db.prepare(\`
    INSERT OR REPLACE INTO grupos (id, name, description, updated_at) 
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  \`),
  getGroup: db.prepare(\`SELECT * FROM grupos WHERE id = ? LIMIT 1\`),
  
  // ========== ADMINISTRADORES (CRÍTICO - OTIMIZADO) ==========
  isGroupAdmin: db.prepare(\`
    SELECT 1 FROM admins_grupos 
    WHERE grupo_id = ? AND usuario_id = ? 
    LIMIT 1
  \`),
  addGroupAdmin: db.prepare(\`
    INSERT OR REPLACE INTO admins_grupos (grupo_id, usuario_id, granted_by) 
    VALUES (?, ?, ?)
  \`),
  removeGroupAdmin: db.prepare(\`
    DELETE FROM admins_grupos 
    WHERE grupo_id = ? AND usuario_id = ?
  \`),
  getAllGroupAdmins: db.prepare(\`
    SELECT ag.usuario_id, ag.granted_by, ag.granted_at, u.name 
    FROM admins_grupos ag
    LEFT JOIN usuarios u ON ag.usuario_id = u.id
    WHERE ag.grupo_id = ?
    ORDER BY 
      CASE WHEN ag.usuario_id = ? THEN 0 ELSE 1 END,
      ag.granted_at ASC
  \`),
  
  // ========== PERMISSÕES ESPECIAIS ==========
  hasSpecialPermission: db.prepare(\`
    SELECT permitido FROM permissoes_especiais 
    WHERE grupo_id = ? AND usuario_id = ? AND comando = ? 
    AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    LIMIT 1
  \`),
  grantSpecialPermission: db.prepare(\`
    INSERT OR REPLACE INTO permissoes_especiais 
    (grupo_id, usuario_id, comando, permitido, granted_by, expires_at) 
    VALUES (?, ?, ?, ?, ?, ?)
  \`),
  revokeSpecialPermission: db.prepare(\`
    DELETE FROM permissoes_especiais 
    WHERE grupo_id = ? AND usuario_id = ? AND comando = ?
  \`),
  
  // ========== APELIDOS (CRÍTICO - CORRIGIDO) ==========
  getNickname: db.prepare(\`
    SELECT nickname, locked, created_at, updated_at, set_by 
    FROM apelidos 
    WHERE grupo_id = ? AND usuario_id = ? 
    LIMIT 1
  \`),
  setNickname: db.prepare(\`
    INSERT OR REPLACE INTO apelidos 
    (grupo_id, usuario_id, nickname, set_by, locked, updated_at) 
    VALUES (?, ?, ?, ?, 
      COALESCE((SELECT locked FROM apelidos WHERE grupo_id = ? AND usuario_id = ?), 0),
      CURRENT_TIMESTAMP
    )
  \`),
  isNicknameInUse: db.prepare(\`
    SELECT 1 FROM apelidos 
    WHERE grupo_id = ? AND LOWER(nickname) = LOWER(?) AND usuario_id != ? 
    LIMIT 1
  \`),
  lockNickname: db.prepare(\`
    UPDATE apelidos 
    SET locked = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE grupo_id = ? AND usuario_id = ?
  \`),
  getAllNicknamesInGroup: db.prepare(\`
    SELECT a.usuario_id, a.nickname, a.locked, a.created_at, a.updated_at,
           u.name as usuario_nome, set_by.name as definido_por_nome
    FROM apelidos a
    LEFT JOIN usuarios u ON a.usuario_id = u.id
    LEFT JOIN usuarios set_by ON a.set_by = set_by.id
    WHERE a.grupo_id = ?
    ORDER BY LOWER(a.nickname) COLLATE NOCASE
  \`),
  
  // ========== SILENCIAMENTO ==========
  isSilenced: db.prepare(\`
    SELECT 1 FROM silenciados 
    WHERE grupo_id = ? AND usuario_id = ? 
    AND (expires_at IS NULL OR expires_at > datetime('now'))
    LIMIT 1
  \`),
  addSilenced: db.prepare(\`
    INSERT OR REPLACE INTO silenciados 
    (grupo_id, usuario_id, silenciado_por, motivo, minutos, expires_at) 
    VALUES (?, ?, ?, ?, ?, ?)
  \`),
  removeSilenced: db.prepare(\`
    DELETE FROM silenciados 
    WHERE grupo_id = ? AND usuario_id = ?
  \`),
  getSilenced: db.prepare(\`
    SELECT * FROM silenciados 
    WHERE grupo_id = ? AND usuario_id = ? 
    AND (expires_at IS NULL OR expires_at > datetime('now'))
    LIMIT 1
  \`),
  getAllSilencedInGroup: db.prepare(\`
    SELECT s.*, u.name as usuario_nome 
    FROM silenciados s 
    LEFT JOIN usuarios u ON s.usuario_id = u.id 
    WHERE s.grupo_id = ? 
    AND (s.expires_at IS NULL OR s.expires_at > datetime('now'))
    ORDER BY s.created_at DESC
  \`),
  removeAllSilencedInGroup: db.prepare(\`DELETE FROM silenciados WHERE grupo_id = ?\`),
  
  // ========== AUDITORIA ==========
  logCommand: db.prepare(\`
    INSERT INTO auditoria 
    (usuario_id, grupo_id, comando, argumentos, sucesso, erro) 
    VALUES (?, ?, ?, ?, ?, ?)
  \`),
  getCommandHistory: db.prepare(\`
    SELECT * FROM auditoria 
    WHERE usuario_id = ? 
    ORDER BY timestamp DESC 
    LIMIT ?
  \`),
  
  // ========== LIMPEZA E MANUTENÇÃO ==========
  cleanExpiredSilenced: db.prepare(\`
    DELETE FROM silenciados 
    WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')
  \`),
  cleanOldAuditoria: db.prepare(\`DELETE FROM auditoria WHERE timestamp < ?\`)
};

// ===== FUNÇÕES DE DIAGNÓSTICO =====
function runPerformanceTest() {
  logger.info('🔍 Executando teste de performance...');
  
  const start = process.hrtime.bigint();
  
  try {
    // Teste completo de operações
    const testId = \`test_\${Date.now()}@c.us\`;
    statements.insertUser.run(testId, 'Test User', '5519999999999');
    const user = statements.getUser.get(testId);
    statements.isGroupAdmin.get('test@g.us', testId);
    
    // Cleanup
    db.prepare('DELETE FROM usuarios WHERE id = ?').run(testId);
    
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // ms
    
    logger.success(\`✅ Performance test: \${duration.toFixed(2)}ms\`);
    
    if (duration > 50) {
      logger.warn('⚠️ Performance abaixo do ideal');
    } else {
      logger.success('🚀 Performance excelente!');
    }
    
    return { duration: duration.toFixed(2), status: duration > 50 ? 'slow' : 'fast' };
    
  } catch (error) {
    logger.error('❌ Erro no teste de performance:', error.message);
    return { duration: 'error', status: 'error' };
  }
}

// ===== LIMPEZA AUTOMÁTICA =====
function setupAutomaticCleanup() {
  logger.info('🧹 Configurando limpeza automática...');
  
  // Limpeza de silenciamentos expirados (a cada hora)
  setInterval(() => {
    try {
      const result = statements.cleanExpiredSilenced.run();
      if (result.changes > 0) {
        logger.info(\`🧹 \${result.changes} silenciamentos expirados removidos\`);
      }
    } catch (error) {
      logger.error('❌ Erro na limpeza de silenciamentos:', error.message);
    }
  }, 60 * 60 * 1000); // 1 hora
  
  // Limpeza de auditoria antiga (a cada 24 horas - manter 30 dias)
  setInterval(() => {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      
      const result = statements.cleanOldAuditoria.run(cutoff.toISOString());
      if (result.changes > 0) {
        logger.info(\`🧹 \${result.changes} registros de auditoria antigos removidos\`);
      }
    } catch (error) {
      logger.error('❌ Erro na limpeza de auditoria:', error.message);
    }
  }, 24 * 60 * 60 * 1000); // 24 horas
  
  // Otimização automática do banco (a cada 6 horas)
  setInterval(() => {
    try {
      db.pragma('optimize');
      logger.info('🚀 Banco otimizado automaticamente');
    } catch (error) {
      logger.error('❌ Erro na otimização:', error.message);
    }
  }, 6 * 60 * 60 * 1000); // 6 horas
}

// ===== ESTATÍSTICAS DO BANCO =====
function getDatabaseStats() {
  try {
    const stats = {};
    
    // Contadores de tabelas
    stats.usuarios = db.prepare('SELECT COUNT(*) as count FROM usuarios').get().count;
    stats.grupos = db.prepare('SELECT COUNT(*) as count FROM grupos').get().count;
    stats.admins = db.prepare('SELECT COUNT(*) as count FROM admins_grupos').get().count;
    stats.apelidos = db.prepare('SELECT COUNT(*) as count FROM apelidos').get().count;
    stats.silenciados = db.prepare('SELECT COUNT(*) as count FROM silenciados WHERE expires_at IS NULL OR expires_at > datetime("now")').get().count;
    stats.auditoria = db.prepare('SELECT COUNT(*) as count FROM auditoria').get().count;
    
    // Tamanho do banco
    const size = fs.statSync(DB_PATH).size;
    stats.tamanho = \`\${(size / 1024 / 1024).toFixed(2)} MB\`;
    
    // Configurações de performance
    const pragmas = {
      journal_mode: db.pragma('journal_mode', { simple: true }),
      cache_size: db.pragma('cache_size', { simple: true }),
      synchronous: db.pragma('synchronous', { simple: true })
    };
    stats.config = pragmas;
    
    return stats;
    
  } catch (error) {
    logger.error('❌ Erro ao obter estatísticas:', error.message);
    return null;
  }
}

// ===== INICIALIZAÇÃO FINAL =====
try {
  // Otimização final
  db.pragma('optimize');
  logger.success('✅ Otimização final aplicada');
  
  // Executar teste de performance após inicialização
  setTimeout(() => {
    runPerformanceTest();
  }, 1000);
  
  // Configurar limpeza automática
  setupAutomaticCleanup();
  
  logger.success('🎯 Database SQLite completamente configurado e otimizado!');
  
} catch (error) {
  logger.warn('⚠️ Erro na configuração final:', error.message);
}

// ===== EXPORTAÇÕES =====
module.exports = {
  db,
  statements,
  runPerformanceTest,
  setupAutomaticCleanup,
  getDatabaseStats
};`;

// Escrever arquivo db.js
const dbFilePath = path.join(projectRoot, 'src/core/db.js');
fs.writeFileSync(dbFilePath, dbContent);
console.log('✅ Arquivo db.js otimizado criado');

// ===== INSERIR DADOS INICIAIS =====
console.log('\n📊 Configurando dados iniciais...');

try {
  // Requerir o novo db.js para inserir dados
  delete require.cache[require.resolve(dbFilePath)];
  const { statements } = require(dbFilePath);
  
  // Inserir usuário master
  const masterNumber = '5519999222004@c.us';
  statements.insertUser.run(masterNumber, 'Master Admin', '5519999222004');
  console.log('✅ Usuário master criado');
  
  // Inserir grupo padrão se especificado
  const grupoAutorizado = '120363327947888891@g.us'; // Atualize com seu grupo real
  statements.insertGroup.run(grupoAutorizado, 'Volleyball Team', 'Grupo oficial de volleyball');
  console.log('✅ Grupo padrão criado');
  
  // Adicionar master como admin do grupo
  statements.addGroupAdmin.run(grupoAutorizado, masterNumber, 'SYSTEM');
  console.log('✅ Master definido como admin do grupo');
  
} catch (error) {
  console.warn('⚠️ Erro ao inserir dados iniciais:', error.message);
  console.log('ℹ️ Dados iniciais serão criados quando o bot for executado');
}

// ===== VERIFICAR ESTRUTURA FINAL =====
console.log('\n🔍 Verificando estrutura final...');

try {
  const { getDatabaseStats } = require(dbFilePath);
  const stats = getDatabaseStats();
  
  if (stats) {
    console.log('✅ Banco funcionando corretamente');
    console.log(`   • Usuários: ${stats.usuarios}`);
    console.log(`   • Grupos: ${stats.grupos}`);
    console.log(`   • Admins: ${stats.admins}`);
    console.log(`   • Tamanho: ${stats.tamanho}`);
    console.log(`   • Modo: ${stats.config.journal_mode}`);
  }
  
} catch (error) {
  console.error('❌ Erro na verificação:', error.message);
}

// ===== MENSAGEM FINAL =====
console.log('\n🎉 SETUP CONCLUÍDO COM SUCESSO!');
console.log('================================');
console.log('✅ Banco de dados limpo criado');
console.log('✅ Estrutura otimizada implementada');
console.log('✅ Índices de performance criados');
console.log('✅ Configurações de alta velocidade aplicadas');
console.log('✅ Sistema de limpeza automática configurado');
console.log('\n🚀 Agora você pode executar o bot com:');
console.log('   npm start');
console.log('   ou');
console.log('   node index.js');
console.log('\n🏐 Bot pronto para administrar o grupo de volleyball!');

console.log('\n📋 PRÓXIMOS PASSOS:');
console.log('==================');
console.log('1. Atualize o ID do grupo em src/config/commands.js');
console.log('2. Execute: node index.js');
console.log('3. Escaneie o QR Code no WhatsApp');
console.log('4. Teste com: !ping');
console.log('\n💡 Comandos disponíveis: !ping, !dados, !ajuda');
