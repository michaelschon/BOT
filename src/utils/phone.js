/**
 * Utilitários para normalização de números de telefone - VERSÃO CORRIGIDA
 * Focado no padrão brasileiro (+55) para WhatsApp
 * CORREÇÃO: Lógica aprimorada para diferentes formatos de entrada
 * 
 * @author Volleyball Team & Gemini AI
 * @version 2.1 - Correção de parsing robusto
 */

const logger = require("./logger");

/**
 * Normaliza um número de telefone para o formato WhatsApp brasileiro
 * VERSÃO CORRIGIDA: Agora lida corretamente com formatos como "+55 19 99999-9999"
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
    
    logger.debug(`🔄 Normalizando telefone: "${input}" -> "${digits}" (${digits.length} dígitos)`);
    
    // ===== CASOS POSSÍVEIS (CORRIGIDOS) =====
    
    // 1. Input muito curto (menos de 8 dígitos) = inválido
    if (digits.length < 8) {
      logger.warn(`⚠️ Número muito curto: "${input}" -> ${digits.length} dígitos`);
      return null;
    }
    
    // 2. Input muito longo (mais de 13 dígitos) = inválido  
    if (digits.length > 13) {
      logger.warn(`⚠️ Número muito longo: "${input}" -> ${digits.length} dígitos`);
      return null;
    }
    
    // 3. Número com 8 dígitos: provavelmente número local sem DDD
    // Exemplo: 99999999 -> assumir DDD 19
    if (digits.length === 8) {
      logger.debug(`🔧 Assumindo DDD 19 para número local: ${digits}`);
      digits = "55199" + digits; // +55 19 9XXXXXXX
    }
    
    // 4. Número com 9 dígitos: provavelmente número local com 9º dígito mas sem DDD
    // Exemplo: 999999999 -> assumir DDD 19
    else if (digits.length === 9 && digits.startsWith('9')) {
      logger.debug(`🔧 Assumindo DDD 19 para celular: ${digits}`);
      digits = "5519" + digits; // +55 19 9XXXXXXXX
    }
    
    // 5. Número com 10 dígitos: DDD + número sem 9º dígito
    // Exemplo: 1999999999 -> 5519999999999
    else if (digits.length === 10) {
      const ddd = digits.substring(0, 2);
      const numero = digits.substring(2);
      
      // Validar DDD
      if (!isValidBrazilianAreaCode(ddd)) {
        logger.warn(`⚠️ DDD inválido: ${ddd}`);
        return null;
      }
      
      // Adicionar 9º dígito se não existir
      if (!numero.startsWith('9')) {
        digits = "55" + ddd + "9" + numero;
        logger.debug(`🔧 Adicionado 9º dígito: ${digits}`);
      } else {
        digits = "55" + digits;
        logger.debug(`🔧 Adicionado DDI: ${digits}`);
      }
    }
    
    // 6. Número com 11 dígitos: DDD + 9 + número
    // Exemplo: 19999999999 -> 5519999999999
    else if (digits.length === 11) {
      const ddd = digits.substring(0, 2);
      const ninthDigit = digits.charAt(2);
      
      // Validar DDD
      if (!isValidBrazilianAreaCode(ddd)) {
        logger.warn(`⚠️ DDD inválido: ${ddd}`);
        return null;
      }
      
      // Validar 9º dígito
      if (ninthDigit !== '9') {
        logger.warn(`⚠️ Número sem 9º dígito: ${digits}`);
        return null;
      }
      
      digits = "55" + digits; // Adiciona DDI Brasil
      logger.debug(`🔧 Adicionado DDI para número completo: ${digits}`);
    }
    
    // 7. Número com 12 dígitos: DDI + DDD + número sem 9º dígito
    // Exemplo: 551999999999 -> 5519999999999
    else if (digits.length === 12 && digits.startsWith("55")) {
      const ddd = digits.substring(2, 4);
      const numero = digits.substring(4);
      
      // Validar DDD
      if (!isValidBrazilianAreaCode(ddd)) {
        logger.warn(`⚠️ DDD inválido: ${ddd}`);
        return null;
      }
      
      // Inserir 9º dígito
      digits = "55" + ddd + "9" + numero;
      logger.debug(`🔧 Adicionado 9º dígito para número com DDI: ${digits}`);
    }
    
    // 8. Número com 13 dígitos: formato completo
    // Exemplo: 5519999999999 -> 5519999999999
    else if (digits.length === 13 && digits.startsWith("55")) {
      logger.debug(`✅ Formato já completo: ${digits}`);
      // Já está correto, apenas validar
    }
    
    // 9. Outros casos = inválidos
    else {
      logger.warn(`⚠️ Formato não reconhecido: "${input}" -> ${digits} (${digits.length} dígitos)`);
      return null;
    }
    
    // ===== VALIDAÇÕES FINAIS =====
    
    // Deve ter exatamente 13 dígitos
    if (digits.length !== 13) {
      logger.warn(`⚠️ Comprimento final inválido: ${digits} (${digits.length} dígitos)`);
      return null;
    }
    
    // Deve começar com 55 (Brasil)
    if (!digits.startsWith("55")) {
      logger.warn(`⚠️ Não é número brasileiro: ${digits}`);
      return null;
    }
    
    // Validar DDD
    const ddd = digits.substring(2, 4);
    if (!isValidBrazilianAreaCode(ddd)) {
      logger.warn(`⚠️ DDD inválido no resultado final: ${ddd}`);
      return null;
    }
    
    // Validar 9º dígito
    const ninthDigit = digits.charAt(4);
    if (ninthDigit !== '9') {
      logger.warn(`⚠️ Número final sem 9º dígito: ${digits}`);
      return null;
    }
    
    // Validar que o número não tem dígitos repetidos demais (anti-spam)
    const uniqueDigits = new Set(digits.substring(5)).size;
    if (uniqueDigits < 3) {
      logger.warn(`⚠️ Número suspeito (poucos dígitos únicos): ${digits}`);
      return null;
    }
    
    const normalizedNumber = digits + "@c.us";
    logger.success(`✅ Número normalizado com sucesso: "${input}" -> "${normalizedNumber}"`);
    
    return normalizedNumber;
    
  } catch (error) {
    logger.error("❌ Erro ao normalizar telefone:", error.message);
    return null;
  }
}

/**
 * Valida se um DDD é válido no Brasil
 * @param {string} ddd DDD com 2 dígitos
 * @returns {boolean} True se válido
 */
function isValidBrazilianAreaCode(ddd) {
  const dddNum = parseInt(ddd);
  
  // DDDs válidos do Brasil (11-99, exceto alguns que não existem)
  const validAreaCodes = [
    11, 12, 13, 14, 15, 16, 17, 18, 19, // São Paulo
    21, 22, 24,                          // Rio de Janeiro
    27, 28,                              // Espírito Santo
    31, 32, 33, 34, 35, 37, 38,         // Minas Gerais
    41, 42, 43, 44, 45, 46,             // Paraná
    47, 48, 49,                          // Santa Catarina
    51, 53, 54, 55,                      // Rio Grande do Sul
    61,                                  // Distrito Federal
    62, 64,                              // Goiás
    63,                                  // Tocantins
    65, 66,                              // Mato Grosso
    67,                                  // Mato Grosso do Sul
    68,                                  // Acre
    69,                                  // Rondônia
    71, 73, 74, 75, 77,                 // Bahia
    79,                                  // Sergipe
    81, 87,                              // Pernambuco
    82,                                  // Alagoas
    83,                                  // Paraíba
    84,                                  // Rio Grande do Norte
    85, 88,                              // Ceará
    86, 89,                              // Piauí
    91, 93, 94,                          // Pará
    92, 97,                              // Amazonas
    95,                                  // Roraima
    96,                                  // Amapá
    98, 99                               // Maranhão
  ];
  
  return validAreaCodes.includes(dddNum);
}

/**
 * Normaliza especificamente para formato brasileiro E164
 * Mais restritivo que normalizePhone
 * @param {string} input Número de telefone
 * @returns {string|null} Número no formato WhatsApp ou null
 */
function normalizeBrazilE164(input) {
  // Reutiliza a função principal que já foi corrigida
  return normalizePhone(input);
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

/**
 * Função para debug: testa vários formatos de entrada
 * @param {string} input Número de entrada
 * @returns {object} Resultado do teste
 */
function debugPhoneNormalization(input) {
  console.log(`\n🔧 DEBUG: Testando normalização para "${input}"`);
  
  const result = normalizePhone(input);
  const info = result ? extractPhoneInfo(result) : null;
  
  const debugInfo = {
    input,
    output: result,
    success: !!result,
    info,
    formatted: info ? formatPhoneDisplay(result) : null,
    masked: info ? maskPhone(result) : null,
    region: info ? getRegionInfo(result) : null
  };
  
  console.log(`   Input: "${input}"`);
  console.log(`   Output: ${result || 'null'}`);
  console.log(`   Success: ${debugInfo.success}`);
  if (debugInfo.formatted) {
    console.log(`   Formatted: ${debugInfo.formatted}`);
  }
  
  return debugInfo;
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
  isValidBrazilianAreaCode,
  debugPhoneNormalization,
  BRAZILIAN_AREA_CODES
};
