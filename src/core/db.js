/**
 * Sistema de banco de dados SQLite para o bot
 * Gerencia todas as tabelas e operações do banco
 * 
 * @author Volleyball Team
 */

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

// Garante que o diretório data existe
const dataDir = path.join(__dirname, "..", "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  logger.info("📁 Diretório data criado");
}

// Inicializa conexão com o banco
const dbPath = path.join(dataDir, "volleyball_bot.db");
const db = new Database(dbPath);

// Habilita WAL mode para melhor performance
db.pragma('journal_mode = WAL');

logger.info(`🗄️ Banco de dados conectado: ${dbPath}`);

/**
 * Executa as migrations do banco de dados
 */
function runMigrations() {
  logger.info("🔄 Executando migrations...");
  
  try {
    // Habilita foreign keys
    db.pragma('foreign_keys = ON');
    
    // ========== TABELA: grupos ==========
    db.prepare(`
      CREATE TABLE IF NOT EXISTS grupos (
        id TEXT PRIMARY KEY,
        name TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    // ========== TABELA: usuarios ==========
    db.prepare(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        name TEXT,
        phone TEXT,
        is_master BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    // ========== TABELA: admins_grupos ==========
    db.prepare(`
      CREATE TABLE IF NOT EXISTS admins_grupos (
        grupo_id TEXT,
        usuario_id TEXT,
        granted_by TEXT,
        granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (grupo_id, usuario_id)
      )
    `).run();
    
    // ========== TABELA: permissoes_especiais ==========
    db.prepare(`
      CREATE TABLE IF NOT EXISTS permissoes_especiais (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grupo_id TEXT,
        usuario_id TEXT,
        comando TEXT,
        permitido BOOLEAN DEFAULT 1,
        granted_by TEXT,
        granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        UNIQUE(grupo_id, usuario_id, comando)
      )
    `).run();
    
    // ========== TABELA: apelidos ==========
    db.prepare(`
      CREATE TABLE IF NOT EXISTS apelidos (
        grupo_id TEXT,
        usuario_id TEXT,
        nickname TEXT NOT NULL,
        locked BOOLEAN DEFAULT 0,
        set_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (grupo_id, usuario_id)
      )
    `).run();
    
    // ========== TABELA: auditoria ==========
    db.prepare(`
      CREATE TABLE IF NOT EXISTS auditoria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id TEXT,
        grupo_id TEXT,
        comando TEXT,
        argumentos TEXT,
        sucesso BOOLEAN,
        erro TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    // ========== ÍNDICES PARA PERFORMANCE ==========
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_comando 
                ON auditoria(usuario_id, comando)`).run();
    
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_auditoria_timestamp 
                ON auditoria(timestamp)`).run();
    
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_permissoes_grupo_usuario 
                ON permissoes_especiais(grupo_id, usuario_id)`).run();
    
    // ========== INSERIR USUÁRIO MASTER ==========
    const masterPhone = "5519999222004@c.us";
    db.prepare(`
      INSERT OR IGNORE INTO usuarios (id, name, phone, is_master) 
      VALUES (?, 'Master Admin', '5519999222004', 1)
    `).run(masterPhone);
    
    logger.success("✅ Migrations executadas com sucesso!");
    
  } catch (error) {
    logger.error("❌ Erro ao executar migrations:", error.message);
    throw error;
  }
}

/**
 * Função para criar triggers de updated_at
 */
function createTriggers() {
  try {
    // Trigger para tabela grupos
    db.prepare(`
      CREATE TRIGGER IF NOT EXISTS update_grupos_updated_at
      AFTER UPDATE ON grupos
      BEGIN
        UPDATE grupos SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `).run();
    
    // Trigger para tabela usuarios
    db.prepare(`
      CREATE TRIGGER IF NOT EXISTS update_usuarios_updated_at
      AFTER UPDATE ON usuarios
      BEGIN
        UPDATE usuarios SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `).run();
    
    // Trigger para tabela apelidos (não tem coluna id individual, usa chave composta)
    db.prepare(`
      CREATE TRIGGER IF NOT EXISTS update_apelidos_updated_at
      AFTER UPDATE ON apelidos
      BEGIN
        UPDATE apelidos SET updated_at = CURRENT_TIMESTAMP 
        WHERE grupo_id = NEW.grupo_id AND usuario_id = NEW.usuario_id;
      END
    `).run();
    
    logger.debug("✅ Triggers criados com sucesso");
    
  } catch (err) {
    logger.warn(`⚠️ Erro ao criar triggers:`, err.message);
  }
}

/**
 * Função para backup do banco de dados
 */
function createBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(dataDir, `backup_${timestamp}.db`);
    
    db.backup(backupPath);
    logger.success(`💾 Backup criado: ${backupPath}`);
    
    return backupPath;
  } catch (error) {
    logger.error("❌ Erro ao criar backup:", error.message);
    throw error;
  }
}

/**
 * Função para executar consultas com tratamento de erro
 * @param {string} query SQL query
 * @param {array} params Parâmetros da query
 * @returns {object} Resultado da query
 */
function safeQuery(query, params = []) {
  try {
    return db.prepare(query).all(...params);
  } catch (error) {
    logger.error("❌ Erro na consulta SQL:", error.message);
    logger.error("Query:", query);
    logger.error("Params:", params);
    throw error;
  }
}

// Executa migrations na inicialização
runMigrations();
createTriggers();

// Exporta o banco e funções utilitárias
module.exports = {
  db,
  safeQuery,
  createBackup,
  
  // Prepared statements para operações comuns
  statements: {
    // Usuários
    insertUser: db.prepare(`
      INSERT OR REPLACE INTO usuarios (id, name, phone) 
      VALUES (?, ?, ?)
    `),
    
    getUser: db.prepare(`
      SELECT * FROM usuarios WHERE id = ?
    `),
    
    // Grupos
    insertGroup: db.prepare(`
      INSERT OR REPLACE INTO grupos (id, name, description) 
      VALUES (?, ?, ?)
    `),
    
    getGroup: db.prepare(`
      SELECT * FROM grupos WHERE id = ?
    `),
    
    // Admins
    isGroupAdmin: db.prepare(`
      SELECT 1 FROM admins_grupos 
      WHERE grupo_id = ? AND usuario_id = ?
    `),
    
    addGroupAdmin: db.prepare(`
      INSERT OR REPLACE INTO admins_grupos (grupo_id, usuario_id, granted_by) 
      VALUES (?, ?, ?)
    `),
    
    removeGroupAdmin: db.prepare(`
      DELETE FROM admins_grupos 
      WHERE grupo_id = ? AND usuario_id = ?
    `),
    
    // Permissões especiais
    hasSpecialPermission: db.prepare(`
      SELECT permitido FROM permissoes_especiais 
      WHERE grupo_id = ? AND usuario_id = ? AND comando = ?
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `),
    
    grantSpecialPermission: db.prepare(`
      INSERT OR REPLACE INTO permissoes_especiais 
      (grupo_id, usuario_id, comando, permitido, granted_by, expires_at) 
      VALUES (?, ?, ?, ?, ?, ?)
    `),
    
    // Apelidos
    getNickname: db.prepare(`
      SELECT nickname, locked FROM apelidos 
      WHERE grupo_id = ? AND usuario_id = ?
    `),
    
    setNickname: db.prepare(`
      INSERT OR REPLACE INTO apelidos (grupo_id, usuario_id, nickname, set_by) 
      VALUES (?, ?, ?, ?)
    `),
    
    lockNickname: db.prepare(`
      UPDATE apelidos SET locked = ? 
      WHERE grupo_id = ? AND usuario_id = ?
    `),
    
    // Auditoria
    logCommand: db.prepare(`
      INSERT INTO auditoria (usuario_id, grupo_id, comando, argumentos, sucesso, erro) 
      VALUES (?, ?, ?, ?, ?, ?)
    `)
  }
};
