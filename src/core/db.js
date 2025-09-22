/**
 * Sistema de banco de dados SQLite para o bot
 * Gerencia todas as tabelas e operações do banco
 *
 * @author Volleyball Team & Gemini AI
 * @version 3.1 - Índice de silenciamento corrigido
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Garante que o diretório data existe
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  logger.info('📁 Diretório data criado');
}

// Inicializa conexão com o banco
const dbPath = path.join(dataDir, 'volleyball_bot.db');
const db = new Database(dbPath);

// Habilita WAL mode e PRAGMAs de performance
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('temp_store = MEMORY');
db.pragma('cache_size = -10000'); // ~10MB de cache

logger.info(`🗄️ Banco de dados conectado: ${dbPath}`);

/**
 * Executa as migrations do banco de dados
 */
function runMigrations() {
  logger.info('🔄 Executando migrations...');

  try {
    db.pragma('foreign_keys = ON');

    // TABELAS... (o código das tabelas permanece o mesmo)
    db.prepare(`
      CREATE TABLE IF NOT EXISTS grupos (
        id TEXT PRIMARY KEY, name TEXT, description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    db.prepare(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY, name TEXT, phone TEXT, is_master BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    db.prepare(`
      CREATE TABLE IF NOT EXISTS admins_grupos (
        grupo_id TEXT, usuario_id TEXT, granted_by TEXT,
        granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (grupo_id, usuario_id)
      )
    `).run();
    db.prepare(`
      CREATE TABLE IF NOT EXISTS permissoes_especiais (
        id INTEGER PRIMARY KEY AUTOINCREMENT, grupo_id TEXT, usuario_id TEXT,
        comando TEXT, permitido BOOLEAN DEFAULT 1, granted_by TEXT,
        granted_at DATETIME DEFAULT CURRENT_TIMESTAMP, expires_at DATETIME,
        UNIQUE(grupo_id, usuario_id, comando)
      )
    `).run();
    db.prepare(`
      CREATE TABLE IF NOT EXISTS apelidos (
        grupo_id TEXT, usuario_id TEXT, nickname TEXT NOT NULL,
        locked BOOLEAN DEFAULT 0, set_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (grupo_id, usuario_id)
      )
    `).run();
    db.prepare(`
      CREATE TABLE IF NOT EXISTS silenciados (
        id INTEGER PRIMARY KEY AUTOINCREMENT, grupo_id TEXT NOT NULL,
        usuario_id TEXT NOT NULL, silenciado_por TEXT NOT NULL,
        minutos INTEGER, expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(grupo_id, usuario_id)
      )
    `).run();
    db.prepare(`
      CREATE TABLE IF NOT EXISTS auditoria (
        id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id TEXT, grupo_id TEXT,
        comando TEXT, argumentos TEXT, sucesso BOOLEAN, erro TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // ========== ÍNDICES PARA PERFORMANCE ==========

    db.prepare(`CREATE INDEX IF NOT EXISTS idx_auditoria_timestamp ON auditoria(timestamp)`).run();
    
    // =================================================================
    // ===== INÍCIO DA SEÇÃO CORRIGIDA - ÍNDICE DE SILENCIAMENTO =====
    // =================================================================
    // O índice antigo foi removido e substituído por este, que é determinístico.
    // Ele ainda acelera as buscas por grupo e usuário, e o filtro de data
    // será aplicado eficientemente pelo SQLite após a seleção pelo índice.
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_silenciados_lookup
      ON silenciados(grupo_id, usuario_id, expires_at)
    `).run();
    // ===============================================================
    // ===== FIM DA SEÇÃO CORRIGIDA =====
    // ===============================================================

    db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_apelidos_search 
        ON apelidos(grupo_id, lower(nickname))
    `).run();

    // Inserir usuário master
    const masterPhone = "5519999222004@c.us";
    db.prepare(`
      INSERT OR IGNORE INTO usuarios (id, name, phone, is_master) 
      VALUES (?, 'Master Admin', '5519999222004', 1)
    `).run(masterPhone);

    logger.success('✅ Migrations executadas com sucesso!');

  } catch (error) {
    logger.error('❌ Erro ao executar migrations:', error.message);
    throw error;
  }
}

// O restante do arquivo (prepared statements, etc.) permanece o mesmo.
// Apenas a função runMigrations foi modificada.

// Executa migrations na inicialização
runMigrations();


// Exporta o banco e funções/statements
module.exports = {
  db,
  statements: {
    insertUser: db.prepare(`INSERT OR REPLACE INTO usuarios (id, name, phone) VALUES (?, ?, ?)`),
    getUser: db.prepare(`SELECT * FROM usuarios WHERE id = ?`),
    insertGroup: db.prepare(`INSERT OR REPLACE INTO grupos (id, name, description) VALUES (?, ?, ?)`),
    getGroup: db.prepare(`SELECT * FROM grupos WHERE id = ?`),
    isGroupAdmin: db.prepare(`SELECT 1 FROM admins_grupos WHERE grupo_id = ? AND usuario_id = ?`),
    addGroupAdmin: db.prepare(`INSERT OR REPLACE INTO admins_grupos (grupo_id, usuario_id, granted_by) VALUES (?, ?, ?)`),
    removeGroupAdmin: db.prepare(`DELETE FROM admins_grupos WHERE grupo_id = ? AND usuario_id = ?`),
    hasSpecialPermission: db.prepare(`SELECT permitido FROM permissoes_especiais WHERE grupo_id = ? AND usuario_id = ? AND comando = ? AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`),
    grantSpecialPermission: db.prepare(`INSERT OR REPLACE INTO permissoes_especiais (grupo_id, usuario_id, comando, permitido, granted_by, expires_at) VALUES (?, ?, ?, ?, ?, ?)`),
    getNickname: db.prepare(`SELECT nickname, locked FROM apelidos WHERE grupo_id = ? AND usuario_id = ?`),
    setNickname: db.prepare(`INSERT OR REPLACE INTO apelidos (grupo_id, usuario_id, nickname, set_by) VALUES (?, ?, ?, ?)`),
    lockNickname: db.prepare(`UPDATE apelidos SET locked = ? WHERE grupo_id = ? AND usuario_id = ?`),
    isSilenced: db.prepare(`SELECT 1 FROM silenciados WHERE grupo_id = ? AND usuario_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))`),
    addSilenced: db.prepare(`INSERT OR REPLACE INTO silenciados (grupo_id, usuario_id, silenciado_por, minutos, expires_at) VALUES (?, ?, ?, ?, ?)`),
    removeSilenced: db.prepare(`DELETE FROM silenciados WHERE grupo_id = ? AND usuario_id = ?`),
    getSilenced: db.prepare(`SELECT * FROM silenciados WHERE grupo_id = ? AND usuario_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))`),
    getAllSilencedInGroup: db.prepare(`SELECT s.*, u.name as usuario_nome FROM silenciados s LEFT JOIN usuarios u ON s.usuario_id = u.id WHERE s.grupo_id = ? AND (s.expires_at IS NULL OR s.expires_at > datetime('now')) ORDER BY s.created_at DESC`),
    removeAllSilencedInGroup: db.prepare(`DELETE FROM silenciados WHERE grupo_id = ?`),
    logCommand: db.prepare(`INSERT INTO auditoria (usuario_id, grupo_id, comando, argumentos, sucesso, erro) VALUES (?, ?, ?, ?, ?, ?)`),
    getAuditLog: db.prepare(`SELECT a.*, u.name as usuario_nome, g.name as grupo_nome FROM auditoria a LEFT JOIN usuarios u ON a.usuario_id = u.id LEFT JOIN grupos g ON a.grupo_id = g.id WHERE a.grupo_id = ? ORDER BY a.timestamp DESC LIMIT ?`),
  }
};
