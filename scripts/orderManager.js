import { deliveries, saveDeliveries } from './data.js';
import { normalizeDate, getCurrentDate } from './utils.js';
import { validateOrder } from './validation.js';

/**
 * Cria um novo pedido
 * @param {Object} orderData - Dados do pedido
 * @returns {Promise<Object>} Pedido criado
 */
export async function createOrder(orderData) {
  try {
    // Validação usando o módulo de validação
    const validationError = validateOrder(orderData);
    if (validationError) {
      throw new Error(validationError);
    }

    // Verifica duplicidade
    const isDuplicate = isOrderNumberTaken(orderData.orderNumber, orderData.date);
    if (isDuplicate) {
      throw new Error('Já existe um pedido com este número nesta data');
    }

    // Determina o status baseado na taxa
    const fee = parseFloat(orderData.fee) || 0;
    const status = fee > 0 ? 'completed' : 'pending';

    // Cria o pedido com status
    const newOrder = {
      id: String(Date.now()),
      orderNumber: orderData.orderNumber.trim(),
      fee: fee,
      date: orderData.date,
      image: orderData.image,
      status: status,
      createdAt: new Date().toISOString()
    };

    // Adiciona à lista e salva
    deliveries.push(newOrder);
    sortDeliveries();
    saveDeliveries();

    return newOrder;
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    throw error;
  }
}

/**
 * Atualiza um pedido existente
 * @param {string} id - ID do pedido
 * @param {Object} updateData - Dados para atualização
 * @returns {Object} Pedido atualizado
 */
export function updateOrder(id, updateData) {
  try {
    const orderIndex = deliveries.findIndex(d => d.id === id);
    if (orderIndex === -1) {
      throw new Error('Pedido não encontrado');
    }

    // Prepara dados para atualização
    const currentOrder = deliveries[orderIndex];
    const fee = parseFloat(updateData.fee) || 0;
    const updatedOrder = {
      ...currentOrder,
      ...updateData,
      fee: fee,
      date: normalizeDate(updateData.date || currentOrder.date),
      id: currentOrder.id, // Mantém o ID original
      status: fee > 0 ? 'completed' : 'pending'
    };

    // Valida os dados atualizados
    const validationError = validateOrder(updatedOrder);
    if (validationError) {
      throw new Error(validationError);
    }

    // Verifica duplicidade excluindo o pedido atual
    if (isOrderNumberTaken(updatedOrder.orderNumber, updatedOrder.date, id)) {
      throw new Error('Já existe um pedido com este número nesta data');
    }

    // Atualiza o pedido
    deliveries[orderIndex] = updatedOrder;
    sortDeliveries();
    saveDeliveries();

    return updatedOrder;
  } catch (error) {
    throw new Error(`Erro ao atualizar pedido: ${error.message}`);
  }
}

/**
 * Ordena a lista de pedidos
 * - Data mais recente primeiro
 * - Mesmo dia: ordem crescente por número do pedido
 */
function sortDeliveries() {
  deliveries.sort((a, b) => {
    // Primeiro por data (mais recente primeiro)
    const dateComparison = new Date(b.date) - new Date(a.date);
    if (dateComparison !== 0) return dateComparison;
    
    // Mesmo dia: ordenar por número do pedido
    return a.orderNumber.localeCompare(b.orderNumber, undefined, {
      numeric: true,
      sensitivity: 'base'
    });
  });
}

/**
 * Busca um pedido por ID
 * @param {string} id - ID do pedido
 * @returns {Object|null} Pedido encontrado ou null
 */
export function getOrderById(id) {
  return deliveries.find(d => d.id === id) || null;
}

/**
 * Busca pedidos por data
 * @param {string} date - Data no formato YYYY-MM-DD
 * @returns {Array} Lista de pedidos da data
 */
export function getOrdersByDate(date) {
  const normalizedDate = normalizeDate(date);
  return deliveries.filter(d => d.date === normalizedDate);
}

/**
 * Verifica se um número de pedido já existe na mesma data
 * @param {string} orderNumber - Número do pedido
 * @param {string} date - Data do pedido
 * @param {string} [excludeId] - ID do pedido a ser excluído da verificação
 * @returns {boolean} true se já existe na mesma data
 */
export function isOrderNumberTaken(orderNumber, date, excludeId = null) {
  const normalizedDate = normalizeDate(date);
  return deliveries.some(d => 
    d.orderNumber === orderNumber && 
    d.date === normalizedDate &&
    (!excludeId || d.id !== excludeId)
  );
} 