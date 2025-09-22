/**
 * OTIMIZAÇÕES CRÍTICAS PARA O BANCO SQLite
 * Estas correções devem resolver a lentidão dos comandos
 * 
 * @author Volleyball Team & Gemini AI
 * @version 1.0 - Otimizações de Performance
 */

// ===== SUBSTITUA estas linhas no arquivo src/core/db.js =====

// Após a linha: const db = new Database(dbPath);
// SUBSTITUA as configurações por estas otimizadas:

// ===== CONFIGURAÇÕES DE ALTA PERFORMANCE =====
db.pragma('journal_mode = WAL');           // Write-Ahead Logging - CRÍTICO para performance
db.pragma('synchronous = NORMAL');         // Reduz sincronizações de disco
db.pragma('cache_size = -50000');          // Cache de 50MB (em vez de 10MB)
db.pragma('temp_store = MEMORY');          // Temporários em memória
db.pragma('mmap_size = 268435456');        // Memory-mapped I/O de 256MB
db.pragma('page_size = 4096');             // Tamanho de página otimizado
db.pragma('optimize');                     // Otimizar estatísticas

// ===== ÍNDICES CRÍTICOS PARA PERFORMANCE =====
// Adicione APÓS as migrations, antes do logger.success:

// Índices para tabela de apelidos (mais usada)
try {
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_apelidos_grupo_usuario ON apelidos(grupo_id, usuario_id)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_apelidos_nickname_lookup ON apelidos(grupo_id, LOWER(nickname))`).run();
  
  // Índices para tabela de admins
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_admins_grupo_usuario ON admins_grupos(grupo_id, usuario_id)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_admins_granted_at ON admins_grupos(granted_at)`).run();
  
  // Índices para tabela de silenciados
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_silenciados_ativo ON silenciados(grupo_id, usuario_id, expires_at)`).run();
  
  // Índices para auditoria
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_comando ON auditoria(usuario_id, comando)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_auditoria_grupo_timestamp ON auditoria(grupo_id, timestamp)`).run();
  
  logger.info('🚀 Índices de performance criados');
} catch (indexError) {
  logger.warn('⚠️ Alguns índices já existem:', indexError.message);
}

// ===== PREPARED STATEMENTS OTIMIZADOS =====
// SUBSTITUA os statements existentes por estas versões otimizadas:

const statements = {
  // ========== Usuários (otimizado) ==========
  insertUser: db.prepare(`INSERT OR REPLACE INTO usuarios (id, name, phone) VALUES (?, ?, ?)`),
  getUser: db.prepare(`SELECT * FROM usuarios WHERE id = ? LIMIT 1`),
  
  // ========== Grupos (otimizado) ==========
  insertGroup: db.prepare(`INSERT OR REPLACE INTO grupos (id, name, description) VALUES (?, ?, ?)`),
  getGroup: db.prepare(`SELECT * FROM grupos WHERE id = ? LIMIT 1`),
  
  // ========== Admins (CRÍTICO - otimizado) ==========
  isGroupAdmin: db.prepare(`SELECT 1 FROM admins_grupos WHERE grupo_id = ? AND usuario_id = ? LIMIT 1`),
  addGroupAdmin: db.prepare(`INSERT OR REPLACE INTO admins_grupos (grupo_id, usuario_id, granted_by) VALUES (?, ?, ?)`),
  removeGroupAdmin: db.prepare(`DELETE FROM admins_grupos WHERE grupo_id = ? AND usuario_id = ?`),
  
  // ========== Permissões especiais (otimizado) ==========
  hasSpecialPermission: db.prepare(`
    SELECT permitido FROM permissoes_especiais 
    WHERE grupo_id = ? AND usuario_id = ? AND comando = ? 
    AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    LIMIT 1
  `),
  grantSpecialPermission: db.prepare(`
    INSERT OR REPLACE INTO permissoes_especiais 
    (grupo_id, usuario_id, comando, permitido, granted_by, expires_at) 
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  
  // ========== Apelidos (CRÍTICO - mais otimizado) ==========
  getNickname: db.prepare(`
    SELECT nickname, locked, created_at, updated_at 
    FROM apelidos 
    WHERE grupo_id = ? AND usuario_id = ? 
    LIMIT 1
  `),
  
  setNickname: db.prepare(`
    INSERT OR REPLACE INTO apelidos 
    (grupo_id, usuario_id, nickname, set_by, locked, updated_at) 
    VALUES (?, ?, ?, ?, 
      COALESCE((SELECT locked FROM apelidos WHERE grupo_id = ? AND usuario_id = ?), 0),
      CURRENT_TIMESTAMP
    )
  `),
  
  isNicknameInUse: db.prepare(`
    SELECT 1 FROM apelidos 
    WHERE grupo_id = ? AND LOWER(nickname) = LOWER(?) AND usuario_id != ? 
    LIMIT 1
  `),
  
  lockNickname: db.prepare(`
    UPDATE apelidos SET locked = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE grupo_id = ? AND usuario_id = ?
  `),
  
  // ========== Sistema de Silenciamento (otimizado) ==========
  isSilenced: db.prepare(`
    SELECT 1 FROM silenciados 
    WHERE grupo_id = ? AND usuario_id = ? 
    AND (expires_at IS NULL OR expires_at > datetime('now'))
    LIMIT 1
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
    LIMIT 1
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
  
  // ========== Auditoria (otimizado) ==========
  logCommand: db.prepare(`
    INSERT INTO auditoria 
    (usuario_id, grupo_id, comando, argumentos, sucesso, erro) 
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  
  // ========== QUERIES BATCH PARA LISTAGENS (NOVO) ==========
  getAllGroupAdmins: db.prepare(`
    SELECT ag.usuario_id, ag.granted_by, ag.granted_at, u.name 
    FROM admins_grupos ag
    LEFT JOIN usuarios u ON ag.usuario_id = u.id
    WHERE ag.grupo_id = ?
    ORDER BY 
      CASE WHEN ag.usuario_id = ? THEN 0 ELSE 1 END,
      ag.granted_at ASC
  `),
  
  getAllNicknamesInGroup: db.prepare(`
    SELECT a.usuario_id, a.nickname, a.locked, a.created_at, a.updated_at,
           u.name as usuario_nome, set_by.name as definido_por_nome
    FROM apelidos a
    LEFT JOIN usuarios u ON a.usuario_id = u.id
    LEFT JOIN usuarios set_by ON a.set_by = set_by.id
    WHERE a.grupo_id = ?
    ORDER BY LOWER(a.nickname) COLLATE NOCASE
  `)
};

// ===== FUNÇÃO DE DIAGNÓSTICO =====
function runPerformanceTest() {
  console.log('🔍 Executando teste de performance do banco...');
  
  const start = process.hrtime.bigint();
  
  // Teste básico de INSERT
  try {
    const testId = `test_${Date.now()}@c.us`;
    statements.insertUser.run(testId, 'Test User', '5519999999999');
    
    // Teste de SELECT
    const user = statements.getUser.get(testId);
    
    // Cleanup
    db.prepare('DELETE FROM usuarios WHERE id = ?').run(testId);
    
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // ms
    
    console.log(`✅ Teste de performance: ${duration.toFixed(2)}ms`);
    
    if (duration > 100) {
      console.warn('⚠️ Banco ainda lento - considere otimizações adicionais');
    } else {
      console.log('🚀 Banco operando com boa performance');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste de performance:', error.message);
  }
}

// ===== LIMPEZA AUTOMÁTICA OTIMIZADA =====
function setupCleanupJobs() {
  // Limpeza de auditoria antiga (manter apenas 30 dias)
  setInterval(() => {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      
      const result = db.prepare(`
        DELETE FROM auditoria 
        WHERE timestamp < ?
      `).run(cutoff.toISOString());
      
      if (result.changes > 0) {
        console.log(`🧹 Limpeza automática: ${result.changes} registros de auditoria removidos`);
      }
    } catch (error) {
      console.error('❌ Erro na limpeza automática:', error.message);
    }
  }, 24 * 60 * 60 * 1000); // A cada 24 horas
  
  // Otimização automática do banco
  setInterval(() => {
    try {
      db.pragma('optimize');
      console.log('🚀 Banco otimizado automaticamente');
    } catch (error) {
      console.error('❌ Erro na otimização automática:', error.message);
    }
  }, 6 * 60 * 60 * 1000); // A cada 6 horas
}

// ===== EXECUTAR OTIMIZAÇÕES NA INICIALIZAÇÃO =====
logger.success('✅ Migrations executadas com sucesso!');
logger.info('🚀 Aplicando otimizações de performance...');

// Executar teste de performance
setTimeout(runPerformanceTest, 1000);

// Configurar limpezas automáticas
setupCleanupJobs();

logger.success('🎯 Banco SQLite otimizado para alta performance!');

// ===== EXPORTAR COM FUNÇÕES OTIMIZADAS =====
module.exports = {
  db,
  statements,
  runPerformanceTest,
  setupCleanupJobs
};
