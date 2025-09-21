/**
 * Sistema de logging centralizado para o bot
 * Fornece métodos padronizados para logging com cores e timestamps
 * 
 * @author Volleyball Team
 */

const chalk = require("chalk");

/**
 * Obtém timestamp formatado para logs
 * @returns {string} Timestamp no formato [DD/MM/YYYY HH:mm:ss]
 */
function getTimestamp() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `[${day}/${month}/${year} ${hours}:${minutes}:${seconds}]`;
}

/**
 * Log de informações gerais
 * @param {...any} args Argumentos para log
 */
function info(...args) {
  console.log(
    chalk.gray(getTimestamp()),
    chalk.green("[INFO]"),
    ...args
  );
}

/**
 * Log de avisos
 * @param {...any} args Argumentos para log
 */
function warn(...args) {
  console.warn(
    chalk.gray(getTimestamp()),
    chalk.yellow("[WARN]"),
    ...args
  );
}

/**
 * Log de erros
 * @param {...any} args Argumentos para log
 */
function error(...args) {
  console.error(
    chalk.gray(getTimestamp()),
    chalk.red("[ERROR]"),
    ...args
  );
}

/**
 * Log de debug (apenas em desenvolvimento)
 * @param {...any} args Argumentos para log
 */
function debug(...args) {
  if (process.env.NODE_ENV === 'development') {
    console.log(
      chalk.gray(getTimestamp()),
      chalk.blue("[DEBUG]"),
      ...args
    );
  }
}

/**
 * Log de sucesso
 * @param {...any} args Argumentos para log
 */
function success(...args) {
  console.log(
    chalk.gray(getTimestamp()),
    chalk.greenBright("[SUCCESS]"),
    ...args
  );
}

module.exports = {
  info,
  warn,
  error,
  debug,
  success,
  getTimestamp
};
