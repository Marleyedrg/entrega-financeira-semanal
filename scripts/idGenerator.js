import { deliveries } from './data.js';

/**
 * Gera um hash simples a partir de uma string
 * @param {string} str - String para gerar hash
 * @returns {number} Hash numérico
 */
function generateHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Converte para 32 bits
  }
  return Math.abs(hash);
}

/**
 * Gera um ID único de 5 dígitos baseado nos dados do pedido
 * @param {Date} date - Data do pedido
 * @param {number} firstOrderValue - Valor do primeiro pedido
 * @param {number} lastOrderValue - Valor do último pedido
 * @returns {string} ID de 5 dígitos com zero padding
 */
export function generateOrderID(date, firstOrderValue, lastOrderValue) {
  // Formata a data como DDMMYYYY
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const dateStr = `${day}${month}${year}`;
  
  // Formata os valores com 2 casas decimais
  const firstValue = firstOrderValue.toFixed(2);
  const lastValue = lastOrderValue.toFixed(2);
  
  // Cria a string base no formato especificado
  const baseString = `${dateStr}-${firstValue}-${lastValue}`;
  
  // Gera o hash e extrai os últimos 5 dígitos
  const hash = generateHash(baseString);
  const fiveDigits = hash % 100000;
  
  // Retorna o ID com zero padding
  return String(fiveDigits).padStart(5, '0');
}

/**
 * Gera o nome do arquivo no formato especificado
 * @param {Date} date - Data do pedido
 * @param {string} id - ID do pedido
 * @returns {string} Nome do arquivo no formato "DD-MM-ID"
 */
export function generateFileName(date, id) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${id}`;
}

/**
 * Gera um ID e nome de arquivo para um novo pedido
 * @param {Date} date - Data do pedido
 * @returns {Object} Objeto contendo o ID e nome do arquivo
 */
export function generateDeliveryIdentifiers(date) {
  // Encontra o primeiro e último pedido do dia
  const dateStr = date.toISOString().split('T')[0];
  const todaysDeliveries = deliveries
    .filter(d => d.date === dateStr)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Define os valores padrão se não houver pedidos
  const firstOrderValue = todaysDeliveries.length > 0 ? 
    parseFloat(todaysDeliveries[0].fee) || 0 : 0;
  const lastOrderValue = todaysDeliveries.length > 0 ? 
    parseFloat(todaysDeliveries[todaysDeliveries.length - 1].fee) || 0 : 0;
  
  // Gera o ID e nome do arquivo
  const id = generateOrderID(date, firstOrderValue, lastOrderValue);
  const fileName = generateFileName(date, id);
  
  return {
    id,
    fileName,
    firstOrderValue,
    lastOrderValue
  };
}

/**
 * Valida se um ID está no formato correto (5 dígitos)
 * @param {string} id - ID a ser validado
 * @returns {boolean} true se o ID é válido
 */
export function isValidOrderID(id) {
  if (!id || typeof id !== 'string') return false;
  return /^\d{5}$/.test(id);
}

/**
 * Extrai a data de um nome de arquivo
 * @param {string} fileName - Nome do arquivo no formato "DD-MM-ID"
 * @returns {Object|null} Objeto com dia, mês e ID, ou null se inválido
 */
export function parseFileName(fileName) {
  const match = fileName.match(/^(\d{2})-(\d{2})-(\d{5})$/);
  if (!match) return null;
  
  return {
    day: match[1],
    month: match[2],
    id: match[3]
  };
}