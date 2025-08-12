/**
 * Valida os dados do pedido
 * @param {Object} orderData - Dados do pedido a serem validados
 * @returns {string|null} Mensagem de erro ou null se válido
 */
export function validateOrder(orderData) {
  // Validação do número do pedido
  if (!orderData.orderNumber?.trim()) {
    return 'O número do pedido é obrigatório';
  }

  // Validação da data
  if (!orderData.date) {
    return 'A data é obrigatória';
  }

  // Validação do formato da data (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(orderData.date)) {
    return 'Formato de data inválido. Use YYYY-MM-DD';
  }

  // Validação da taxa (se fornecida)
  if (orderData.fee !== undefined && orderData.fee !== null && orderData.fee !== '') {
    const fee = parseFloat(orderData.fee);
    if (isNaN(fee)) {
      return 'Taxa inválida';
    }
    if (fee < 0) {
      return 'A taxa não pode ser negativa';
    }
  }

  // Validação da imagem (agora opcional)
  // Imagem não é mais obrigatória

  // Se chegou até aqui, não há erros
  return null;
}

/**
 * Valida os dados de gasolina
 * @param {Object} gasData - Dados de gasolina a serem validados
 * @returns {string|null} Mensagem de erro ou null se válido
 */
export function validateGasEntry(gasData) {
  // Validação da data
  if (!gasData.date) {
    return 'A data é obrigatória';
  }

  // Validação do formato da data (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(gasData.date)) {
    return 'Formato de data inválido. Use YYYY-MM-DD';
  }

  // Validação do valor
  if (!gasData.amount) {
    return 'O valor é obrigatório';
  }

  const amount = parseFloat(gasData.amount);
  if (isNaN(amount)) {
    return 'Valor inválido';
  }

  if (amount <= 0) {
    return 'O valor deve ser maior que zero';
  }

  // Se chegou até aqui, não há erros
  return null;
}

/**
 * Valida o formato de uma data
 * @param {string} date - Data a ser validada
 * @returns {boolean} true se a data é válida
 */
export function isValidDate(date) {
  // Verifica o formato YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  // Verifica se é uma data válida
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return false;
  }

  // Verifica se não é uma data futura
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (d > today) {
    return false;
  }

  return true;
}

/**
 * Valida um número de pedido
 * @param {string} orderNumber - Número do pedido a ser validado
 * @returns {boolean} true se o número é válido
 */
export function isValidOrderNumber(orderNumber) {
  // Remove espaços em branco
  const trimmed = orderNumber.trim();
  
  // Verifica se não está vazio
  if (!trimmed) {
    return false;
  }

  // Verifica o comprimento mínimo e máximo
  if (trimmed.length < 1 || trimmed.length > 20) {
    return false;
  }

  // Verifica se contém apenas caracteres válidos
  // Permite números, letras, traços e underscores
  return /^[a-zA-Z0-9-_]+$/.test(trimmed);
}

/**
 * Valida um valor monetário
 * @param {string|number} value - Valor a ser validado
 * @returns {boolean} true se o valor é válido
 */
export function isValidMoneyValue(value) {
  // Se for string, converte para número
  const number = typeof value === 'string' ? parseFloat(value) : value;
  
  // Verifica se é um número válido
  if (isNaN(number)) {
    return false;
  }

  // Verifica se é não-negativo
  if (number < 0) {
    return false;
  }

  // Verifica se tem no máximo 2 casas decimais
  const decimalPlaces = (number.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return false;
  }

  return true;
} 