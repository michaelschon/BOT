/**
 * Sistema de carregamento de comandos
 * Carrega automaticamente todos os comandos dos diretórios
 * 
 * @author Volleyball Team
 */

const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

/**
 * Estatísticas do carregamento
 */
let loadStats = {
  totalFiles: 0,
  loadedCommands: 0,
  skippedFiles: 0,
  errors: 0,
  aliases: 0,
  categories: new Set()
};

/**
 * Carrega comandos recursivamente de um diretório
 * @param {string} dir Diretório para escanear
 * @param {object} commands Objeto para armazenar comandos
 * @param {number} depth Profundidade atual (para logs)
 */
function loadCommands(dir, commands, depth = 0) {
  const indent = "  ".repeat(depth);
  
  try {
    if (!fs.existsSync(dir)) {
      logger.warn(`⚠️ Diretório não encontrado: ${dir}`);
      return;
    }
    
    logger.debug(`${indent}📁 Escaneando: ${dir}`);
    
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      loadStats.totalFiles++;
      
      try {
        if (file.isDirectory()) {
          // Carrega recursivamente subdiretórios
          logger.debug(`${indent}📂 Entrando em: ${file.name}`);
          loadCommands(fullPath, commands, depth + 1);
          
        } else if (file.name.endsWith(".js")) {
          // Tenta carregar arquivo de comando
          const result = loadCommandFile(fullPath, commands, depth);
          
          if (result.success) {
            loadStats.loadedCommands++;
            
            if (result.aliases > 0) {
              loadStats.aliases += result.aliases;
            }
            
            if (result.category) {
              loadStats.categories.add(result.category);
            }
            
          } else {
            loadStats.skippedFiles++;
          }
          
        } else {
          logger.debug(`${indent}⏭️ Ignorando arquivo não-JS: ${file.name}`);
          loadStats.skippedFiles++;
        }
        
      } catch (error) {
        logger.error(`${indent}❌ Erro ao processar ${file.name}:`, error.message);
        loadStats.errors++;
      }
    }
    
  } catch (error) {
    logger.error(`❌ Erro ao escanear diretório ${dir}:`, error.message);
    loadStats.errors++;
  }
}

/**
 * Carrega um arquivo de comando específico
 * @param {string} filePath Caminho do arquivo
 * @param {object} commands Objeto para armazenar comandos
 * @param {number} depth Profundidade para logs
 * @returns {object} Resultado do carregamento
 */
function loadCommandFile(filePath, commands, depth = 0) {
  const indent = "  ".repeat(depth);
  const fileName = path.basename(filePath);
  
  try {
    logger.debug(`${indent}📄 Carregando: ${fileName}`);
    
    // Limpa cache do require para recarregar em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      delete require.cache[require.resolve(filePath)];
    }
    
    const command = require(filePath);
    
    // Validação básica da estrutura do comando
    const validation = validateCommand(command, filePath);
    if (!validation.valid) {
      logger.warn(`${indent}⚠️ Comando inválido em ${fileName}: ${validation.errors.join(', ')}`);
      return { success: false, reason: 'invalid' };
    }
    
    // Registra comando principal
    const commandName = command.name.toLowerCase();
    if (commands[commandName]) {
      logger.warn(`${indent}⚠️ Comando duplicado: ${commandName} (sobrescrevendo)`);
    }
    
    commands[commandName] = command;
    logger.success(`${indent}✅ ${commandName} carregado`);
    
    let aliasCount = 0;
    
    // Registra aliases
    if (command.aliases && Array.isArray(command.aliases)) {
      for (const alias of command.aliases) {
        const aliasName = alias.toLowerCase();
        
        if (commands[aliasName]) {
          logger.warn(`${indent}⚠️ Alias duplicado: ${aliasName} para ${commandName}`);
        }
        
        commands[aliasName] = command;
        aliasCount++;
        logger.debug(`${indent}🔗 Alias registrado: ${aliasName} -> ${commandName}`);
      }
    }
    
    // Log detalhado em modo debug
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`${indent}📋 Detalhes:`);
      logger.debug(`${indent}   • Nome: ${command.name}`);
      logger.debug(`${indent}   • Admin: ${command.requireAdmin ? 'Sim' : 'Não'}`);
      logger.debug(`${indent}   • Aliases: ${aliasCount}`);
      logger.debug(`${indent}   • Categoria: ${command.category || 'N/A'}`);
      logger.debug(`${indent}   • Arquivo: ${fileName}`);
    }
    
    return {
      success: true,
      aliases: aliasCount,
      category: command.category
    };
    
  } catch (error) {
    logger.error(`${indent}❌ Erro ao carregar ${fileName}:`, error.message);
    
    if (error.code === 'MODULE_NOT_FOUND') {
      logger.error(`${indent}💡 Verifique se todas as dependências estão instaladas`);
    } else if (error instanceof SyntaxError) {
      logger.error(`${indent}💡 Erro de sintaxe no arquivo de comando`);
    }
    
    return { success: false, reason: 'error', error: error.message };
  }
}

/**
 * Valida a estrutura de um comando
 * @param {object} command Objeto do comando
 * @param {string} filePath Caminho do arquivo (para logs)
 * @returns {object} Resultado da validação
 */
function validateCommand(command, filePath) {
  const errors = [];
  const fileName = path.basename(filePath);
  
  // Verifica se é um objeto
  if (typeof command !== 'object' || command === null) {
    errors.push('deve exportar um objeto');
  } else {
    // Verifica propriedades obrigatórias
    if (!command.name || typeof command.name !== 'string') {
      errors.push('propriedade "name" é obrigatória e deve ser string');
    } else if (!command.name.startsWith('!')) {
      errors.push('nome do comando deve começar com "!"');
    }
    
    if (typeof command.execute !== 'function') {
      errors.push('propriedade "execute" é obrigatória e deve ser função');
    }
    
    // Verifica propriedades opcionais
    if (command.aliases && !Array.isArray(command.aliases)) {
      errors.push('propriedade "aliases" deve ser um array');
    }
    
    if (command.requireAdmin !== undefined && typeof command.requireAdmin !== 'boolean') {
      errors.push('propriedade "requireAdmin" deve ser boolean');
    }
    
    if (command.description !== undefined && typeof command.description !== 'string') {
      errors.push('propriedade "description" deve ser string');
    }
    
    if (command.usage !== undefined && typeof command.usage !== 'string') {
      errors.push('propriedade "usage" deve ser string');
    }
    
    if (command.category !== undefined && typeof command.category !== 'string') {
      errors.push('propriedade "category" deve ser string');
    }
    
    // Validação de consistência de nomes
    if (command.name) {
      const expectedName = '!' + fileName.replace('.js', '').toLowerCase();
      if (command.name.toLowerCase() !== expectedName && !command.aliases?.includes(expectedName)) {
        logger.debug(`💡 Sugestão: comando em ${fileName} poderia se chamar ${expectedName}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Recarrega todos os comandos (útil para desenvolvimento)
 * @param {string} dir Diretório de comandos
 * @param {object} commands Objeto de comandos para limpar e recarregar
 */
function reloadCommands(dir, commands) {
  logger.info("🔄 Recarregando comandos...");
  
  // Limpa comandos existentes
  Object.keys(commands).forEach(key => delete commands[key]);
  
  // Reseta estatísticas
  loadStats = {
    totalFiles: 0,
    loadedCommands: 0,
    skippedFiles: 0,
    errors: 0,
    aliases: 0,
    categories: new Set()
  };
  
  // Recarrega
  loadCommands(dir, commands);
  logLoadStats();
}

/**
 * Exibe estatísticas do carregamento
 */
function logLoadStats() {
  const stats = getLoadStats();
  
  logger.info("📊 Estatísticas do carregamento:");
  logger.info(`   • Arquivos processados: ${stats.totalFiles}`);
  logger.info(`   • Comandos carregados: ${stats.loadedCommands}`);
  logger.info(`   • Aliases registrados: ${stats.aliases}`);
  logger.info(`   • Arquivos ignorados: ${stats.skippedFiles}`);
  logger.info(`   • Erros encontrados: ${stats.errors}`);
  logger.info(`   • Categorias: ${stats.categories.size > 0 ? Array.from(stats.categories).join(', ') : 'N/A'}`);
  
  if (stats.errors > 0) {
    logger.warn("⚠️ Alguns comandos não foram carregados devido a erros");
  }
  
  if (stats.loadedCommands === 0) {
    logger.warn("⚠️ Nenhum comando foi carregado! Verifique a estrutura dos arquivos");
  }
}

/**
 * Obtém estatísticas do carregamento
 * @returns {object} Estatísticas
 */
function getLoadStats() {
  return {
    ...loadStats,
    categories: Array.from(loadStats.categories)
  };
}

/**
 * Lista todos os comandos carregados
 * @param {object} commands Objeto de comandos
 * @returns {Array} Lista de comandos únicos
 */
function listLoadedCommands(commands) {
  const uniqueCommands = new Set();
  const result = [];
  
  for (const [name, command] of Object.entries(commands)) {
    if (!uniqueCommands.has(command.name)) {
      uniqueCommands.add(command.name);
      
      const aliases = [];
      for (const [alias, cmd] of Object.entries(commands)) {
        if (cmd === command && alias !== command.name) {
          aliases.push(alias);
        }
      }
      
      result.push({
        name: command.name,
        aliases,
        requireAdmin: command.requireAdmin || false,
        description: command.description || 'Sem descrição',
        category: command.category || 'outros'
      });
    }
  }
  
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Verifica integridade dos comandos carregados
 * @param {object} commands Objeto de comandos
 * @returns {object} Relatório de integridade
 */
function checkCommandIntegrity(commands) {
  const report = {
    total: 0,
    valid: 0,
    issues: []
  };
  
  const processed = new Set();
  
  for (const [name, command] of Object.entries(commands)) {
    if (processed.has(command)) continue;
    
    processed.add(command);
    report.total++;
    
    // Verifica se o comando ainda é válido
    const validation = validateCommand(command, `runtime:${name}`);
    
    if (validation.valid) {
      report.valid++;
    } else {
      report.issues.push({
        command: command.name || name,
        errors: validation.errors
      });
    }
  }
  
  return report;
}

// Inicialização - exibe estatísticas quando o módulo é carregado
process.nextTick(() => {
  if (loadStats.totalFiles > 0) {
    logLoadStats();
  }
});

module.exports = {
  loadCommands,
  reloadCommands,
  validateCommand,
  logLoadStats,
  getLoadStats,
  listLoadedCommands,
  checkCommandIntegrity
};
