// src/utils/date.js

/**
 * Obtém data/hora atual formatada para a timezone de São Paulo.
 * @returns {string} Data formatada como DD/MM/YYYY, HH:mm:ss
 */
function getCurrentDateTimeBR() {
  const now = new Date();
  return now.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

module.exports = {
  getCurrentDateTimeBR,
};
