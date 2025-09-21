/**
 * Utilitários para normalização de números de telefone
 * Focado no padrão brasileiro (+55) para WhatsApp
 * 
 * @author Volleyball Team
 */

const logger = require("./logger");

/**
 * Normaliza um número de telefone para o formato WhatsApp brasileiro
 * @param {string} input Número de telefone em qualquer formato
 * @returns {string|null} Número normalizado ou null se inválido
 */
function normalizePhone(input) {
  if (!input || typeof input !== 'string') {
    logger.debug("❌ Input inválido para normalizePhone:", input);
    return null;
  }
  
  try {
    // Remove todos os caracteres que não são dígitos
    let digits = input.replace(/\D/g, "");
    
    logger.debug(`🔄 Normalizando telefone: "${input}" -> "${digits}"`);
    
    // Casos possíveis:
    
    // 1. Número com 11 dígitos (DDD + 9 + número)
    // Exemplo: 19999222004
    if (digits.length === 11 && digits.startsWith('1')) {
      digits = "55" + digits; // Adiciona DDI Brasil
      logger.debug(`✅ Formato 11 dígitos: ${digits}`);
    }
    
    // 2. Número já com DDI 55 completo (13 dígitos)
    // Exemplo: 5519999222004
    else if (digits.length === 13 && digits.startsWith("55")) {
      logger.debug(`✅ Formato já completo: ${digits}`);
      // Já está correto
    }
    
    // 3. Número com DDI mas sem o 9º dígito (12 dígitos)
    // Exemplo: 551999222004 -> 5519999222004
    else if (digits.length === 12 && digits.startsWith("55")) {
      // Insere o 9º dígito após o DDD
      const ddd = digits.substring(2, 4);
      const numero = digits.substring(4);
      digits = "55" + ddd + "9" + numero;
      logger.debug(`✅ Adicionado 9º dígito: ${digits}`);
    }
    
    // 4. Número internacional completo com + (remove o +)
    // Exemplo: +5519999222004
    else if (digits.length === 13 && input.startsWith('+55')) {
      logger.debug(`✅ Removido + do formato internacional: ${digits}`);
      // Já está correto
    }
    
    // 5. Formatos inválidos
    else {
      logger.warn(`⚠️ Formato de telefone não reconhecido: "${input}" (${digits.length} dígitos)`);
      return null;
    }
    
    // Validações finais
    if (digits.length !== 13) {
      logger.warn(`⚠️ Número com comprimento inválido: ${digits} (${digits.length} dígitos)`);
      return null;
    }
    
    if (!digits.startsWith("55")) {
      logger.warn(`⚠️ Número não é brasileiro (não começa com 55): ${digits}`);
      return null;
    }
    
    // Valida DDD brasileiro (11-99)
    const ddd = digits.substring(2, 4);
    const dddNum = parseInt(ddd);
    if (dddNum < 11 || dddNum > 99) {
      logger.warn(`⚠️ DDD inválido: ${ddd}`);
      return null;
    }
    
    // Valida se tem o 9º dígito para celular
    const ninthDigit = digits.charAt(4);
    if (ninthDigit !== '9') {
      logger.warn(`⚠️ Número sem 9º dígito (não é celular): ${digits}`);
      return null;
    }
    
    const normalizedNumber = digits + "@c.us";
    logger.debug(`✅ Número normalizado: ${normalizedNumber}`);
    
    return normalizedNumber;
    
  } catch (error) {
    logger.error("❌ Erro ao normalizar telefone:", error.message);
    return null;
  }
}

/**
 * Normaliza especificamente para formato brasileiro E164
 * Mais restritivo que normalizePhone
 * @param {string} input Número de telefone
 * @returns {string|null} Número no formato WhatsApp ou null
 */
function normalizeBrazilE164(input) {
  if (!input) return null;
  
  try {
    // Corrige escape duplo na regex original
    let digits = input.replace(/\D/g, "");
    
    logger.debug(`🇧🇷 Normalizando Brasil E164: "${input}" -> "${digits}"`);
    
    // Se já tem DDI 55, valida e retorna
    if (digits.startsWith("55") && digits.length === 13) {
      const result = digits + "@c.us";
      logger.debug(`✅ E164 já correto: ${result}`);
      return result;
    }
    
    // Se tem 11 dígitos, adiciona DDI
    if (digits.length === 11) {
      const result = "55" + digits + "@c.us";
      logger.debug(`✅ E164 adicionado DDI: ${result}`);
      return result;
    }
    
    logger.warn(`⚠️ E164 formato inválido: ${digits}`);
    return null;
    
  } catch (error) {
    logger.error("❌ Erro ao normalizar Brasil E164:", error.message);
    return null;
  }
}

/**
 * Extrai informações de um número de telefone normalizado
 * @param {string} phoneId ID do telefone no formato WhatsApp
 * @returns {object|null} Informações extraídas ou null se inválido
 */
function extractPhoneInfo(phoneId) {
  if (!phoneId || !phoneId.endsWith('@c.us')) {
    return null;
  }
  
  try {
    const digits = phoneId.replace('@c.us', '');
    
    if (digits.length !== 13 || !digits.startsWith('55')) {
      return null;
    }
    
    const countryCode = digits.substring(0, 2);  // 55
    const areaCode = digits.substring(2, 4);     // DDD
    const ninthDigit = digits.substring(4, 5);   // 9
    const number = digits.substring(5);          // Resto do número
    
    return {
      full: phoneId,
      digits,
      countryCode,
      areaCode,
      ninthDigit,
      number,
      formatted: `+${countryCode} (${areaCode}) 9${number.substring(0, 4)}-${number.substring(4)}`,
      isValid: countryCode === '55' && ninthDigit === '9'
    };
    
  } catch (error) {
    logger.error("❌ Erro ao extrair info do telefone:", error.message);
    return null;
  }
}

/**
 * Formata um número para exibição amigável
 * @param {string} phoneId ID do telefone no formato WhatsApp
 * @returns {string} Número formatado para exibição
 */
function formatPhoneDisplay(phoneId) {
  const info = extractPhoneInfo(phoneId);
  
  if (!info) {
    return phoneId || 'Número inválido';
  }
  
  return info.formatted;
}

/**
 * Valida se um número é um celular brasileiro válido
 * @param {string} phoneId ID do telefone no formato WhatsApp
 * @returns {boolean} True se válido
 */
function isValidBrazilianCellphone(phoneId) {
  const info = extractPhoneInfo(phoneId);
  return info ? info.isValid : false;
}

/**
 * Converte número do WhatsApp para formato internacional
 * @param {string} phoneId ID do telefone no formato WhatsApp
 * @returns {string} Número no formato internacional (+5519...)
 */
function toInternational(phoneId) {
  const info = extractPhoneInfo(phoneId);
  
  if (!info) {
    return phoneId;
  }
  
  return `+${info.digits}`;
}

/**
 * Mascara um número para privacidade
 * Mostra apenas os últimos 4 dígitos
 * @param {string} phoneId ID do telefone no formato WhatsApp
 * @returns {string} Número mascarado
 */
function maskPhone(phoneId) {
  const info = extractPhoneInfo(phoneId);
  
  if (!info) {
    return '***';
  }
  
  const lastFour = info.number.slice(-4);
  return `+${info.countryCode} (${info.areaCode}) ****-${lastFour}`;
}

/**
 * Lista de DDDs válidos do Brasil por região
 */
const BRAZILIAN_AREA_CODES = {
  // Região Sudeste
  11: 'São Paulo - SP',
  12: 'Vale do Paraíba - SP',
  13: 'Baixada Santista - SP',
  14: 'Bauru/Marília - SP',
  15: 'Sorocaba - SP',
  16: 'Ribeirão Preto - SP',
  17: 'São José do Rio Preto - SP',
  18: 'Presidente Prudente - SP',
  19: 'Campinas - SP',
  21: 'Rio de Janeiro - RJ',
  22: 'Campos dos Goytacazes - RJ',
  24: 'Petrópolis - RJ',
  27: 'Vitória - ES',
  28: 'Cachoeiro de Itapemirim - ES',
  31: 'Belo Horizonte - MG',
  32: 'Juiz de Fora - MG',
  33: 'Governador Valadares - MG',
  34: 'Uberlândia - MG',
  35: 'Poços de Caldas - MG',
  37: 'Divinópolis - MG',
  38: 'Montes Claros - MG',
  
  // Região Sul
  41: 'Curitiba - PR',
  42: 'Ponta Grossa - PR',
  43: 'Londrina - PR',
  44: 'Maringá - PR',
  45: 'Cascavel - PR',
  46: 'Francisco Beltrão - PR',
  47: 'Joinville - SC',
  48: 'Florianópolis - SC',
  49: 'Chapecó - SC',
  51: 'Porto Alegre - RS',
  53: 'Pelotas - RS',
  54: 'Caxias do Sul - RS',
  55: 'Santa Maria - RS',
  
  // Região Centro-Oeste
  61: 'Brasília - DF',
  62: 'Goiânia - GO',
  63: 'Palmas - TO',
  64: 'Rio Verde - GO',
  65: 'Cuiabá - MT',
  66: 'Rondonópolis - MT',
  67: 'Campo Grande - MS',
  
  // Região Nordeste
  71: 'Salvador - BA',
  73: 'Ilhéus - BA',
  74: 'Juazeiro - BA',
  75: 'Feira de Santana - BA',
  77: 'Vitória da Conquista - BA',
  79: 'Aracaju - SE',
  81: 'Recife - PE',
  87: 'Petrolina - PE',
  82: 'Maceió - AL',
  83: 'João Pessoa - PB',
  84: 'Natal - RN',
  85: 'Fortaleza - CE',
  88: 'Juazeiro do Norte - CE',
  86: 'Teresina - PI',
  89: 'Picos - PI',
  98: 'São Luís - MA',
  99: 'Imperatriz - MA',
  
  // Região Norte
  68: 'Rio Branco - AC',
  96: 'Macapá - AP',
  92: 'Manaus - AM',
  97: 'Coari - AM',
  91: 'Belém - PA',
  93: 'Santarém - PA',
  94: 'Marabá - PA',
  69: 'Porto Velho - RO',
  95: 'Boa Vista - RR'
};

/**
 * Obtém informações da região de um número
 * @param {string} phoneId ID do telefone no formato WhatsApp
 * @returns {object|null} Informações da região
 */
function getRegionInfo(phoneId) {
  const info = extractPhoneInfo(phoneId);
  
  if (!info) {
    return null;
  }
  
  const areaCodeNum = parseInt(info.areaCode);
  const regionName = BRAZILIAN_AREA_CODES[areaCodeNum];
  
  if (!regionName) {
    return null;
  }
  
  const [city, state] = regionName.split(' - ');
  
  return {
    areaCode: info.areaCode,
    city: city.trim(),
    state: state.trim(),
    region: regionName,
    isValid: true
  };
}

/**
 * Gera números de teste para desenvolvimento
 * @param {number} count Quantidade de números
 * @returns {Array} Array de números de teste
 */
function generateTestNumbers(count = 5) {
  const testNumbers = [];
  const ddds = ['11', '19', '21', '31', '51'];
  
  for (let i = 0; i < count; i++) {
    const ddd = ddds[i % ddds.length];
    const number = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    testNumbers.push(`55${ddd}9${number}@c.us`);
  }
  
  return testNumbers;
}

module.exports = {
  normalizePhone,
  normalizeBrazilE164,
  extractPhoneInfo,
  formatPhoneDisplay,
  isValidBrazilianCellphone,
  toInternational,
  maskPhone,
  getRegionInfo,
  generateTestNumbers,
  BRAZILIAN_AREA_CODES
};
