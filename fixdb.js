/**
 * Script de Correção do Banco de Dados
 * Corrige erros de configuração e otimiza o banco SQLite
 * 
 * @author Volleyball Team
 * @version 1.0 - Correção crítica do db.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 SCRIPT DE CORREÇÃO DO BANCO DE DADOS');
console.log('=====================================\n');

// ===== CAMINHOS DOS ARQUIVOS =====
const dbFilePath = path.join(__dirname, 'src/core/db.js');
const backupPath = path.join(__dirname, 'src/core/db.js.backup');

console.log('📁 Verificando arquivos...');
console.log(`   • Arquivo principal: ${dbFilePath}`);
console.log(`   • Backup será salvo em: ${backupPath}`);

// ===== VERIFICAR SE ARQUIVO EXISTE =====
if (!fs.existsSync(dbFilePath)) {
  console.error('❌ Arquivo db.js não encontrado!');
  console.log('💡 Certifique-se de estar no diretório raiz do projeto.');
  process.exit(1);
}

try {
  // ===== FAZER BACKUP =====
  console.log('\n💾 Criando backup do arquivo atual...');
  const originalContent = fs.readFileSync(dbFilePath, 'utf8');
  fs.writeFileSync(backupPath, originalContent);
  console.log('✅ Backup criado com sucesso!');
  
  // ===== CONTEÚDO CORRIGIDO =====
  console.log('\n🔄 Aplicando correções...');
  
  const correctedContent = `/**
 * Database Core - SQLite3 Otimizado e Corrigido
 * Sistema de banco de dados do bot de volleyball com configurações de performance críticas
 * 
 * @author Volleyball Team
 * @version 3.0 - CORREÇÃO CRÍTICA APLICADA
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

// CORREÇÃO CRÍTICA: Inicializar a variável db ANTES de usar
const db = new Database(DB_PATH);

// ===== CONFIGURAÇÕES CRÍTICAS DE PERFORMANCE =====
// Estas configurações são ESSENCIAIS para velocidade
try {
  logger.info('⚡ Aplicando configurações de alta performance...');
  
  // CORREÇÃO: Agora db está definida e pode ser usada
  db.pragma('journal_mode = WAL');          // Write-Ahead Logging - CRÍTICO
  db.pragma('synchronous = NORMAL');        // Reduz sincronizações de disco
  db.pragma('cache_size = -64000');         // Cache de 64MB em memória
  db.pragma('temp_store = MEMORY');         // Tabelas temporárias em RAM
  db.pragma('mmap_size = 268435456');       // Memory-mapped I/O de 256MB
  db.pragma('page_size = 4096');            // Tamanho de página otimizado
  db.pragma('foreign_keys = ON');           // Integridade referencial
  db.pragma('auto_vacuum = INCREMENTAL');   // Vacuum automático incremental
  db.pragma('wal_autocheckpoint = 1000');   // Checkpoint automático
  
  logger.success('✅ Configurações de performance aplicadas!');
  
} catch (error) {
  logger.error('❌ Erro ao aplicar configurações:', error.message);
  throw error;
}

// ===== MIGRATIONS E ESTRUTURA DO BANCO =====
function runMigrations() {
  logger.info('🔄 Executando migrations...');
  
  try {
    // ========== TABELA DE USUÁRIOS ==========
    db.exec(\`
      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        name TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    \`);
    
    // ========== TABELA DE GRUPOS ==========
    db.exec(\`
      CREATE TABLE IF NOT EXISTS grupos (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    \`);
    
    // ========== TABELA DE ADMINISTRADORES POR GRUPO ==========
    db.exec(\`
      CREATE TABLE IF NOT EXISTS admins_grupos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grupo_id TEXT NOT NULL,
        usuario_id TEXT NOT NULL,
        granted_by TEXT,
        granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(grupo_id, usuario_id),
        FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    \`);
    
    // ========== TABELA DE PERMISSÕES ESPECIAIS ==========
    db.exec(\`
      CREATE TABLE IF NOT EXISTS permissoes_especiais (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grupo_id TEXT NOT NULL,
        usuario_id TEXT NOT NULL,
        comando TEXT NOT NULL,
        permitido BOOLEAN DEFAULT 1,
        granted_by TEXT,
        granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        UNIQUE(grupo_id, usuario_id, comando),
        FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    \`);
    
    // ========== TABELA DE APELIDOS ==========
    db.exec(\`
      CREATE TABLE IF NOT EXISTS apelidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grupo_id TEXT NOT NULL,
        usuario_id TEXT NOT NULL,
        nickname TEXT NOT NULL,
        set_by TEXT,
        locked BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(grupo_id, usuario_id),
        FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    \`);
    
    // ========== TABELA DE SILENCIAMENTO ==========
    db.exec(\`
      CREATE TABLE IF NOT EXISTS silenciados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grupo_id TEXT NOT NULL,
        usuario_id TEXT NOT NULL,
        silenciado_por TEXT,
        motivo TEXT,
        minutos INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        UNIQUE(grupo_id, usuario_id),
        FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    \`);
    
    // ========== TABELA DE AUDITORIA ==========
    db.exec(\`
      CREATE TABLE IF NOT EXISTS auditoria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id TEXT NOT NULL,
        grupo_id TEXT,
        comando TEXT NOT NULL,
        argumentos TEXT,
        sucesso BOOLEAN DEFAULT 1,
        erro TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE
      )
    \`);
    
    logger.success('✅ Todas as tabelas criadas/verificadas com sucesso!');
    
  } catch (error) {
    logger.error('❌ Erro durante migrations:', error.message);
    throw error;
  }
}

// ===== CRIAR ÍNDICES OTIMIZADOS =====
function createOptimizedIndexes() {
  logger.info('🚀 Criando índices de performance...');
  
  try {
    // Índices críticos para performance
    db.exec(\`CREATE INDEX IF NOT EXISTS idx_usuarios_phone ON usuarios(phone)\`);
    db.exec(\`CREATE INDEX IF NOT EXISTS idx_grupos_name ON grupos(name)\`);
    db.exec(\`CREATE INDEX IF NOT EXISTS idx_admins_lookup ON admins_grupos(grupo_id, usuario_id)\`);
    db.exec(\`CREATE INDEX IF NOT EXISTS idx_admins_granted_at ON admins_grupos(granted_at)\`);
    db.exec(\`CREATE INDEX IF NOT EXISTS idx_permissions_lookup ON permissoes_especiais(grupo_id, usuario_id, comando)\`);
    db.exec(\`CREATE INDEX IF NOT EXISTS idx_permissions_expires ON permissoes_especiais(expires_at) WHERE expires_at IS NOT NULL\`);
    db.exec(\`CREATE INDEX IF NOT EXISTS idx_apelidos_lookup ON apelidos(grupo_id, usuario_id)\`);
    db.exec(\`CREATE INDEX IF NOT EXISTS idx_apelidos_nickname_unique ON apelidos(grupo_id, LOWER(nickname))\`);
    db.exec(\`CREATE INDEX IF NOT EXISTS idx_apelidos_locked ON apelidos(locked) WHERE locked = 1\`);
    db.exec(\`CREATE INDEX IF NOT EXISTS idx_silenciados_active ON silenciados(grupo_id, usuario_id, expires_at)\`);
    db.exec(\`CREATE INDEX IF NOT EXISTS idx_silenciados_expires ON silenciados(expires_at) WHERE expires_at IS NOT NULL\`);
    db.exec(\`CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_comando ON auditoria(usuario_id, comando)\`);
    db.exec(\`CREATE INDEX IF NOT EXISTS idx_auditoria_timestamp ON auditoria(timestamp)\`);
    db.exec(\`CREATE INDEX IF NOT EXISTS idx_auditoria_grupo_timestamp ON auditoria(grupo_id, timestamp)\`);
    
    logger.success('✅ Índices de performance criados!');
    
  } catch (error) {
    logger.warn('⚠️ Alguns índices já existem:', error.message);
  }
}

// ===== PREPARED STATEMENTS OTIMIZADOS =====
const statements = {
  // Usuários
  insertUser: db.prepare(\`INSERT OR REPLACE INTO usuarios (id, name, phone, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)\`),
  getUser: db.prepare(\`SELECT * FROM usuarios WHERE id = ? LIMIT 1\`),
  getUserByPhone: db.prepare(\`SELECT * FROM usuarios WHERE phone = ? LIMIT 1\`),
  
  // Grupos
  insertGroup: db.prepare(\`INSERT OR REPLACE INTO grupos (id, name, description, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)\`),
  getGroup: db.prepare(\`SELECT * FROM grupos WHERE id = ? LIMIT 1\`),
  
  // Administradores (CRÍTICO - CORRIGIDO)
  isGroupAdmin: db.prepare(\`SELECT 1 FROM admins_grupos WHERE grupo_id = ? AND usuario_id = ? LIMIT 1\`),
  addGroupAdmin: db.prepare(\`INSERT OR REPLACE INTO admins_grupos (grupo_id, usuario_id, granted_by) VALUES (?, ?, ?)\`),
  removeGroupAdmin: db.prepare(\`DELETE FROM admins_grupos WHERE grupo_id = ? AND usuario_id = ?\`),
  getAllGroupAdmins: db.prepare(\`
    SELECT ag.usuario_id, ag.granted_by, ag.granted_at, u.name 
    FROM admins_grupos ag
    LEFT JOIN usuarios u ON ag.usuario_id = u.id
    WHERE ag.grupo_id = ?
    ORDER BY CASE WHEN ag.usuario_id = ? THEN 0 ELSE 1 END, ag.granted_at ASC
  \`),
  
  // Permissões especiais
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
  revokeSpecialPermission: db.prepare(\`DELETE FROM permissoes_especiais WHERE grupo_id = ? AND usuario_id = ? AND comando = ?\`),
  
  // Apelidos (CORRIGIDO)
  getNickname: db.prepare(\`SELECT nickname, locked, created_at, updated_at, set_by FROM apelidos WHERE grupo_id = ? AND usuario_id = ? LIMIT 1\`),
  setNickname: db.prepare(\`
    INSERT OR REPLACE INTO apelidos 
    (grupo_id, usuario_id, nickname, set_by, locked, updated_at) 
    VALUES (?, ?, ?, ?, 
      COALESCE((SELECT locked FROM apelidos WHERE grupo_id = ? AND usuario_id = ?), 0),
      CURRENT_TIMESTAMP
    )
  \`),
  isNicknameInUse: db.prepare(\`SELECT 1 FROM apelidos WHERE grupo_id = ? AND LOWER(nickname) = LOWER(?) AND usuario_id != ? LIMIT 1\`),
  lockNickname: db.prepare(\`UPDATE apelidos SET locked = ?, updated_at = CURRENT_TIMESTAMP WHERE grupo_id = ? AND usuario_id = ?\`),
  getAllNicknamesInGroup: db.prepare(\`
    SELECT a.usuario_id, a.nickname, a.locked, a.created_at, a.updated_at,
           u.name as usuario_nome, set_by.name as definido_por_nome
    FROM apelidos a
    LEFT JOIN usuarios u ON a.usuario_id = u.id
    LEFT JOIN usuarios set_by ON a.set_by = set_by.id
    WHERE a.grupo_id = ?
    ORDER BY LOWER(a.nickname) COLLATE NOCASE
  \`),
  
  // Silenciamento
  isSilenced: db.prepare(\`SELECT 1 FROM silenciados WHERE grupo_id = ? AND usuario_id = ? AND (expires_at IS NULL OR expires_at > datetime('now')) LIMIT 1\`),
  addSilenced: db.prepare(\`INSERT OR REPLACE INTO silenciados (grupo_id, usuario_id, silenciado_por, motivo, minutos, expires_at) VALUES (?, ?, ?, ?, ?, ?)\`),
  removeSilenced: db.prepare(\`DELETE FROM silenciados WHERE grupo_id = ? AND usuario_id = ?\`),
  getSilenced: db.prepare(\`SELECT * FROM silenciados WHERE grupo_id = ? AND usuario_id = ? AND (expires_at IS NULL OR expires_at > datetime('now')) LIMIT 1\`),
  getAllSilencedInGroup: db.prepare(\`
    SELECT s.*, u.name as usuario_nome 
    FROM silenciados s 
    LEFT JOIN usuarios u ON s.usuario_id = u.id 
    WHERE s.grupo_id = ? AND (s.expires_at IS NULL OR s.expires_at > datetime('now'))
    ORDER BY s.created_at DESC
  \`),
  removeAllSilencedInGroup: db.prepare(\`DELETE FROM silenciados WHERE grupo_id = ?\`),
  
  // Auditoria
  logCommand: db.prepare(\`INSERT INTO auditoria (usuario_id, grupo_id, comando, argumentos, sucesso, erro) VALUES (?, ?, ?, ?, ?, ?)\`),
  getCommandHistory: db.prepare(\`SELECT * FROM auditoria WHERE usuario_id = ? ORDER BY timestamp DESC LIMIT ?\`),
  
  // Limpeza e manutenção
  cleanExpiredSilenced: db.prepare(\`DELETE FROM silenciados WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')\`),
  cleanOldAuditoria: db.prepare(\`DELETE FROM auditoria WHERE timestamp < ?\`)
};

// ===== FUNÇÕES DE PERFORMANCE =====
function runPerformanceTest() {
  logger.info('🔍 Executando teste de performance...');
  
  const start = process.hrtime.bigint();
  
  try {
    const testId = \`test_\${Date.now()}@c.us\`;
    statements.insertUser.run(testId, 'Test User', '5519999999999');
    const user = statements.getUser.get(testId);
    statements.isGroupAdmin.get('test@g.us', testId);
    db.prepare('DELETE FROM usuarios WHERE id = ?').run(testId);
    
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000;
    
    logger.success(\`✅ Performance: \${duration.toFixed(2)}ms\`);
    
    if (duration > 50) {
      logger.warn('⚠️ Performance degradada - verifique sistema');
    } else {
      logger.success('🚀 Performance excelente!');
    }
    
    return { duration: duration.toFixed(2), status: duration > 50 ? 'slow' : 'fast' };
    
  } catch (error) {
    logger.error('❌ Erro no teste:', error.message);
    return { duration: 'error', status: 'error' };
  }
}

// ===== LIMPEZA AUTOMÁTICA =====
function setupAutomaticCleanup() {
  logger.info('🧹 Configurando limpeza automática...');
  
  setInterval(() => {
    try {
      const result = statements.cleanExpiredSilenced.run();
      if (result.changes > 0) {
        logger.info(\`🧹 \${result.changes} silenciamentos expirados removidos\`);
      }
    } catch (error) {
      logger.error('❌ Erro na limpeza de silenciamentos:', error.message);
    }
  }, 60 * 60 * 1000);
  
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
  }, 24 * 60 * 60 * 1000);
  
  setInterval(() => {
    try {
      db.pragma('optimize');
      logger.info('🚀 Banco otimizado automaticamente');
    } catch (error) {
      logger.error('❌ Erro na otimização:', error.message);
    }
  }, 6 * 60 * 60 * 1000);
}

// ===== ESTATÍSTICAS DO BANCO =====
function getDatabaseStats() {
  try {
    const stats = {};
    stats.usuarios = db.prepare('SELECT COUNT(*) as count FROM usuarios').get().count;
    stats.grupos = db.prepare('SELECT COUNT(*) as count FROM grupos').get().count;
    stats.admins = db.prepare('SELECT COUNT(*) as count FROM admins_grupos').get().count;
    stats.apelidos = db.prepare('SELECT COUNT(*) as count FROM apelidos').get().count;
    stats.silenciados = db.prepare('SELECT COUNT(*) as count FROM silenciados WHERE expires_at IS NULL OR expires_at > datetime("now")').get().count;
    stats.auditoria = db.prepare('SELECT COUNT(*) as count FROM auditoria').get().count;
    
    const size = require('fs').statSync(DB_PATH).size;
    stats.tamanho = \`\${(size / 1024 / 1024).toFixed(2)} MB\`;
    
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

// ===== INICIALIZAÇÃO =====
runMigrations();
createOptimizedIndexes();

try {
  db.pragma('optimize');
  logger.success('✅ Otimização final aplicada');
} catch (error) {
  logger.warn('⚠️ Otimização final falhou:', error.message);
}

setTimeout(() => {
  runPerformanceTest();
}, 1000);

setupAutomaticCleanup();

logger.success('🎯 Database SQLite completamente otimizado e pronto!');

module.exports = {
  db,
  statements,
  runPerformanceTest,
  setupAutomaticCleanup,
  getDatabaseStats
};`;

  // ===== ESCREVER ARQUIVO CORRIGIDO =====
  fs.writeFileSync(dbFilePath, correctedContent);
  console.log('✅ Correções aplicadas com sucesso!');
  
  // ===== VERIFICAR SE O NOVO ARQUIVO É VÁLIDO =====
  console.log('\n🔍 Verificando sintaxe do arquivo corrigido...');
  
  try {
    require(dbFilePath);
    console.log('✅ Sintaxe válida - arquivo corrigido funcionando!');
  } catch (syntaxError) {
    console.error('❌ Erro de sintaxe detectado:', syntaxError.message);
    
    // Restaurar backup
    console.log('🔄 Restaurando backup...');
    fs.writeFileSync(dbFilePath, originalContent);
    console.log('✅ Backup restaurado.');
    
    process.exit(1);
  }
  
  // ===== RESUMO DAS CORREÇÕES =====
  console.log('\n📋 RESUMO DAS CORREÇÕES APLICADAS:');
  console.log('=====================================');
  console.log('✅ 1. Variável `db` inicializada ANTES de usar pragma');
  console.log('✅ 2. Configurações de performance otimizadas');
  console.log('✅ 3. Prepared statements corrigidos');
  console.log('✅ 4. Índices de performance adicionados');
  console.log('✅ 5. Sistema de limpeza automática implementado');
  console.log('✅ 6. Funções de diagnóstico e estatísticas');
  
  console.log('\n🚀 CORREÇÃO CONCLUÍDA COM SUCESSO!');
  console.log('=====================================');
  console.log('🔧 O erro "ReferenceError: db is not defined" foi corrigido.');
  console.log('⚡ O banco agora está otimizado para alta performance.');
  console.log('🏐 Você pode executar o bot normalmente com: npm start');
  console.log('\n💾 Backup salvo em: ' + backupPath);
  
} catch (error) {
  console.error('\n❌ ERRO DURANTE A CORREÇÃO:', error.message);
  console.log('\n🔄 Tentando restaurar backup...');
  
  try {
    if (fs.existsSync(backupPath)) {
      const backupContent = fs.readFileSync(backupPath, 'utf8');
      fs.writeFileSync(dbFilePath, backupContent);
      console.log('✅ Backup restaurado com sucesso.');
    }
  } catch (restoreError) {
    console.error('❌ Erro ao restaurar backup:', restoreError.message);
  }
  
  process.exit(1);
}
