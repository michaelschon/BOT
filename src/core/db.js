/**
 * Sistema de banco de dados SQLite para o bot
 * Gerencia todas as tabelas e operações do banco
 * 
 * @author Volleyball Team
 * @version 2.1 - Sistema de Silenciamento Integrado
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
    
    // ========== TABELA: silenciados (NOVA) ==========
    db.prepare(`
      CREATE TABLE IF NOT EXISTS silenciados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grupo_id TEXT NOT NULL,
        usuario_id TEXT NOT NULL,
        silenciado_por TEXT NOT NULL,
        minutos INTEGER,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(grupo_id, usuario_id)
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
    
    // Índices existentes
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_comando 
                ON auditoria(usuario_id, comando)`).run();
    
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_auditoria_timestamp 
                ON auditoria(timestamp)`).run();
    
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_permissoes_grupo_usuario 
                ON permissoes_especiais(grupo_id, usuario_id)`).run();
    
    // Novos índices para sistema de silenciamento
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_silenciados_grupo_usuario 
                ON silenciados(grupo_id, usuario_id)`).run();
    
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_silenciados_expires 
                ON silenciados(expires_at)`).run();
    
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_silenciados_grupo 
                ON silenciados(grupo_id)`).run();
    
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
    
    // Trigger para tabela apelidos
    db.prepare(`
      CREATE TRIGGER IF NOT EXISTS update_apelidos_updated_at
      AFTER UPDATE ON apelidos
      BEGIN
        UPDATE apelidos SET updated_at = CURRENT_TIMESTAMP 
        WHERE grupo_id = NEW.grupo_id AND usuario_id = NEW.usuario_id;
      END
    `).run();
    
    // Não criar trigger automático - a limpeza será feita via código
    // para evitar problemas com funções não-determinísticas
    
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

/**
 * Função para verificar integridade do banco
 * @returns {object} Resultado da verificação
 */
function checkDatabaseIntegrity() {
  try {
    const result = db.prepare('PRAGMA integrity_check').get();
    
    const stats = {
      grupos: db.prepare('SELECT COUNT(*) as count FROM grupos').get().count,
      usuarios: db.prepare('SELECT COUNT(*) as count FROM usuarios').get().count,
      admins: db.prepare('SELECT COUNT(*) as count FROM admins_grupos').get().count,
      apelidos: db.prepare('SELECT COUNT(*) as count FROM apelidos').get().count,
      silenciados: db.prepare('SELECT COUNT(*) as count FROM silenciados').get().count,
      auditoria: db.prepare('SELECT COUNT(*) as count FROM auditoria').get().count
    };
    
    logger.info("📊 Estatísticas do banco:", stats);
    
    return {
      integrity: result.integrity_check === 'ok',
      stats,
      message: result.integrity_check
    };
    
  } catch (error) {
    logger.error("❌ Erro ao verificar integridade:", error.message);
    return {
      integrity: false,
      error: error.message
    };
  }
}

/**
 * Limpa silenciamentos expirados
 * @returns {number} Número de registros removidos
 */
function cleanExpiredSilences() {
  try {
    const result = db.prepare(`
      DELETE FROM silenciados 
      WHERE expires_at IS NOT NULL 
      AND expires_at <= datetime('now')
    `).run();
    
    if (result.changes > 0) {
      logger.info(`🧹 Limpeza: ${result.changes} silenciamentos expirados removidos`);
    }
    
    return result.changes;
    
  } catch (error) {
    logger.error("❌ Erro na limpeza de silenciamentos:", error.message);
    return 0;
  }
}

// Executa migrations na inicialização
runMigrations();
createTriggers();

// Verifica integridade inicial
const integrity = checkDatabaseIntegrity();
if (!integrity.integrity) {
  logger.warn("⚠️ Problemas de integridade detectados no banco de dados");
}

// Exporta o banco e funções utilitárias
module.exports = {
  db,
  safeQuery,
  createBackup,
  checkDatabaseIntegrity,
  cleanExpiredSilences,
  
  // Prepared statements para operações comuns
  statements: {
    // ========== Usuários ==========
    insertUser: db.prepare(`
      INSERT OR REPLACE INTO usuarios (id, name, phone) 
      VALUES (?, ?, ?)
    `),
    
    getUser: db.prepare(`
      SELECT * FROM usuarios WHERE id = ?
    `),
    
    // ========== Grupos ==========
    insertGroup: db.prepare(`
      INSERT OR REPLACE INTO grupos (id, name, description) 
      VALUES (?, ?, ?)
    `),
    
    getGroup: db.prepare(`
      SELECT * FROM grupos WHERE id = ?
    `),
    
    // ========== Admins ==========
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
    
    // ========== Permissões especiais ==========
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
    
    // ========== Apelidos ==========
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
    
    // ========== Sistema de Silenciamento ==========
    isSilenced: db.prepare(`
      SELECT 1 FROM silenciados 
      WHERE grupo_id = ? AND usuario_id = ?
      AND (expires_at IS NULL OR expires_at > datetime('now'))
    `),
    
    addSilenced: db.prepare(`
      INSERT OR REPLACE INTO silenciados 
      (grupo_id, usuario_id, silenciado_por, minutos, expires_at) 
      VALUES (?, ?, ?, ?, ?)
    `),
    
    removeSilenced: db.prepare(`
      DELETE FROM silenciados 
      WHERE grupo_id = ? AND usuario_id = ?
    `),
    
    getSilenced: db.prepare(`
      SELECT * FROM silenciados 
      WHERE grupo_id = ? AND usuario_id = ?
      AND (expires_at IS NULL OR expires_at > datetime('now'))
    `),
    
    getAllSilencedInGroup: db.prepare(`
      SELECT s.*, u.name as usuario_nome 
      FROM silenciados s
      LEFT JOIN usuarios u ON s.usuario_id = u.id
      WHERE s.grupo_id = ?
      AND (s.expires_at IS NULL OR s.expires_at > datetime('now'))
      ORDER BY s.created_at DESC
    `),
    
    removeAllSilencedInGroup: db.prepare(`
      DELETE FROM silenciados WHERE grupo_id = ?
    `),
    
    // ========== Auditoria ==========
    logCommand: db.prepare(`
      INSERT INTO auditoria (usuario_id, grupo_id, comando, argumentos, sucesso, erro) 
      VALUES (?, ?, ?, ?, ?, ?)
    `),
    
    getAuditLog: db.prepare(`
      SELECT a.*, u.name as usuario_nome, g.name as grupo_nome
      FROM auditoria a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      LEFT JOIN grupos g ON a.grupo_id = g.id
      WHERE a.grupo_id = ?
      ORDER BY a.timestamp DESC
      LIMIT ?
    `),
    
    // ========== Estatísticas ==========
    getGroupStats: db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM usuarios u WHERE EXISTS(
          SELECT 1 FROM admins_grupos ag WHERE ag.usuario_id = u.id AND ag.grupo_id = ?
        )) as total_admins,
        (SELECT COUNT(*) FROM apelidos WHERE grupo_id = ?) as total_apelidos,
        (SELECT COUNT(*) FROM silenciados WHERE grupo_id = ? 
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)) as total_silenciados,
        (SELECT COUNT(*) FROM auditoria WHERE grupo_id = ? 
         AND timestamp > datetime('now', '-30 days')) as comandos_30_dias
    `),
    
    getUserStats: db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM auditoria WHERE usuario_id = ? AND sucesso = 1) as comandos_sucesso,
        (SELECT COUNT(*) FROM auditoria WHERE usuario_id = ? AND sucesso = 0) as comandos_erro,
        (SELECT nickname FROM apelidos WHERE usuario_id = ? AND grupo_id = ?) as apelido_atual,
        (SELECT 1 FROM silenciados WHERE usuario_id = ? AND grupo_id = ? 
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)) as esta_silenciado
    `)
  }
};
