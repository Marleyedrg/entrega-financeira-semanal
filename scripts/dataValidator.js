/**
 * dataValidator.js
 * Sistema avançado de validação de dados com esquemas, tipos e regras de negócio
 */

import { deliveries, gasEntries } from './data.js';
import { normalizeDate } from './utils.js';

// Esquemas de validação para diferentes tipos de dados
const SCHEMAS = {
  // Esquema para entregas
  delivery: {
    id: { type: 'string', required: false },
    orderNumber: { 
      type: 'string', 
      required: true, 
      validate: (val) => val && val.trim().length > 0,
      message: 'Número do pedido é obrigatório'
    },
    fee: { 
      type: 'number', 
      required: false,
      validate: (val) => val === null || val === '' || val === undefined || parseFloat(val) >= 0,
      message: 'Taxa não pode ser negativa'
    },
    date: { 
      type: 'string', 
      required: true,
      validate: (val) => val && /^\d{4}-\d{2}-\d{2}$/.test(val),
      message: 'Data deve estar no formato YYYY-MM-DD'
    },
    image: { 
      type: 'any', 
      required: false
    },
    status: { 
      type: 'string', 
      required: false,
      validate: (val) => !val || ['pending', 'completed'].includes(val),
      message: 'Status deve ser "pending" ou "completed"'
    }
  },
  
  // Esquema para gastos
  gasEntry: {
    id: { type: 'string', required: false },
    date: { 
      type: 'string', 
      required: true,
      validate: (val) => val && /^\d{4}-\d{2}-\d{2}$/.test(val),
      message: 'Data deve estar no formato YYYY-MM-DD'
    },
    amount: { 
      type: 'number', 
      required: true,
      validate: (val) => val && parseFloat(val) > 0,
      message: 'Valor deve ser maior que zero'
    },
    description: { 
      type: 'string', 
      required: false
    },
    image: { 
      type: 'any', 
      required: false
    }
  }
};

/**
 * Valida um objeto com base em um esquema específico
 * @param {Object} data - Dados a serem validados
 * @param {string} schemaType - Tipo de esquema (delivery, gasEntry)
 * @param {Object} options - Opções de validação
 * @returns {Object} Resultado da validação { isValid, errors }
 */
export function validateData(data, schemaType, options = {}) {
  const schema = SCHEMAS[schemaType];
  
  if (!schema) {
    throw new Error(`Esquema de validação não encontrado: ${schemaType}`);
  }
  
  const errors = [];
  const result = { isValid: true, errors: [] };
  
  // Validação de cada campo conforme o esquema
  Object.entries(schema).forEach(([field, rules]) => {
    const value = data[field];
    
    // Verificar campo obrigatório
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field,
        message: rules.message || `O campo ${field} é obrigatório`
      });
      return;
    }
    
    // Pular validação se o campo não é obrigatório e está vazio
    if (!rules.required && (value === undefined || value === null || value === '')) {
      return;
    }
    
    // Verificar tipo
    if (rules.type !== 'any') {
      const valueType = typeof value;
      
      if (rules.type === 'number') {
        if (valueType !== 'number' && isNaN(parseFloat(value))) {
          errors.push({
            field,
            message: rules.message || `O campo ${field} deve ser um número`
          });
          return;
        }
      } else if (valueType !== rules.type) {
        errors.push({
          field,
          message: rules.message || `O campo ${field} deve ser do tipo ${rules.type}`
        });
        return;
      }
    }
    
    // Executar validação personalizada
    if (rules.validate && typeof rules.validate === 'function') {
      if (!rules.validate(value, data)) {
        errors.push({
          field,
          message: rules.message || `O valor para ${field} é inválido`
        });
      }
    }
  });
  
  // Validações de regras de negócio
  if (errors.length === 0 && options.checkBusinessRules !== false) {
    const businessErrors = validateBusinessRules(data, schemaType, options);
    errors.push(...businessErrors);
  }
  
  // Verificar resultados
  if (errors.length > 0) {
    result.isValid = false;
    result.errors = errors;
  }
  
  return result;
}

/**
 * Validar regras de negócio específicas do domínio
 * @param {Object} data - Dados a validar
 * @param {string} schemaType - Tipo de esquema
 * @param {Object} options - Opções adicionais
 * @returns {Array} Lista de erros encontrados
 */
function validateBusinessRules(data, schemaType, options = {}) {
  const errors = [];
  
  if (schemaType === 'delivery') {
    // Verificar duplicidade de número de pedido na mesma data
    const normalizedDate = normalizeDate(data.date);
    const isDuplicate = deliveries.some(delivery => 
      delivery.orderNumber === data.orderNumber && 
      normalizeDate(delivery.date) === normalizedDate &&
      (!options.excludeId || delivery.id !== options.excludeId)
    );
    
    if (isDuplicate) {
      errors.push({
        field: 'orderNumber',
        message: `Já existe um pedido com o número ${data.orderNumber} na data ${data.date}`
      });
    }
    
    // Verificar data passada
    if (options.preventPastDates) {
      const deliveryDate = new Date(data.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (deliveryDate < today) {
        const daysDiff = Math.floor((today - deliveryDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff > options.maxPastDays || 7) {
          errors.push({
            field: 'date',
            message: `A data selecionada é muito antiga (${daysDiff} dias atrás)`
          });
        }
      }
    }
  } else if (schemaType === 'gasEntry') {
    // Verificar valor suspeito de abastecimento (muito alto)
    const amount = parseFloat(data.amount);
    if (amount > 500) {
      errors.push({
        field: 'amount',
        message: 'Valor de abastecimento suspeito (muito alto)',
        isSuspicious: true
      });
    }
    
    // Verificar abastecimentos múltiplos no mesmo dia
    const normalizedDate = normalizeDate(data.date);
    const sameDay = gasEntries.filter(entry => 
      normalizeDate(entry.date) === normalizedDate &&
      (!options.excludeId || entry.id !== options.excludeId)
    );
    
    if (sameDay.length > 0 && !options.allowMultipleGasEntries) {
      errors.push({
        field: 'date',
        message: 'Já existe um abastecimento registrado nesta data',
        isSuspicious: true
      });
    }
  }
  
  return errors;
}

/**
 * Validar entrega
 * @param {Object} delivery - Dados da entrega
 * @param {Object} options - Opções de validação
 * @returns {Object} Resultado da validação { isValid, errors }
 */
export function validateDelivery(delivery, options = {}) {
  return validateData(delivery, 'delivery', options);
}

/**
 * Validar abastecimento
 * @param {Object} gasEntry - Dados do abastecimento
 * @param {Object} options - Opções de validação
 * @returns {Object} Resultado da validação { isValid, errors }
 */
export function validateGasEntry(gasEntry, options = {}) {
  return validateData(gasEntry, 'gasEntry', options);
}

/**
 * Validar conjunto de dados completo
 * @param {Array} items - Itens a validar
 * @param {string} schemaType - Tipo de esquema
 * @returns {Object} Resultado da validação { isValid, errors, validItems, invalidItems }
 */
export function validateDataset(items, schemaType) {
  const result = {
    isValid: true,
    errors: [],
    validItems: [],
    invalidItems: []
  };
  
  items.forEach((item, index) => {
    const validation = validateData(item, schemaType, { checkBusinessRules: false });
    
    if (!validation.isValid) {
      result.isValid = false;
      
      validation.errors.forEach(error => {
        result.errors.push({
          ...error,
          index,
          item
        });
      });
      
      result.invalidItems.push({ index, item, errors: validation.errors });
    } else {
      result.validItems.push(item);
    }
  });
  
  return result;
}

/**
 * Verificar integridade do banco de dados inteiro
 */
export function validateDatabaseIntegrity() {
  const deliveryResult = validateDataset(deliveries, 'delivery');
  const gasResult = validateDataset(gasEntries, 'gasEntry');
  
  return {
    isValid: deliveryResult.isValid && gasResult.isValid,
    deliveries: deliveryResult,
    gasEntries: gasResult,
    timestamp: Date.now()
  };
}

/**
 * Obter mensagens de erro formatadas a partir de resultado de validação
 * @param {Object} validationResult - Resultado de validação
 * @returns {string[]} Lista de mensagens de erro formatadas
 */
export function getErrorMessages(validationResult) {
  if (validationResult.isValid) {
    return [];
  }
  
  return validationResult.errors.map(error => {
    if (error.index !== undefined) {
      return `Item #${error.index + 1}: ${error.message}`;
    }
    return error.message;
  });
} 