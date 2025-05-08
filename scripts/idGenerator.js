import { deliveries } from './data.js';

/**
 * Gera um identificador único de 5 dígitos para arquivos CSV
 * baseado na quantidade de pedidos, taxas e data atual
 * @returns {string} ID de 5 dígitos
 */
export function generateUniqueID() {
  // Obter a quantidade total de pedidos
  const totalPedidos = deliveries.length;
  
  // Obter a soma da taxa do primeiro e do último pedido (se existirem)
  let somaTaxas = 0;
  if (totalPedidos > 0) {
    const primeiraTaxa = parseFloat(deliveries[0].fee) || 0;
    const ultimaTaxa = parseFloat(deliveries[totalPedidos - 1].fee) || 0;
    somaTaxas = primeiraTaxa + ultimaTaxa;
  }
  
  // Obter a data atual (DD-MM-AAAA)
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const ano = hoje.getFullYear();
  const dataAtual = `${dia}-${mes}-${ano}`;
  
  // Concatenar os valores em uma única string
  const stringBase = `${totalPedidos}-${somaTaxas}-${dataAtual}`;
  
  // Converter para representação ASCII (soma dos códigos dos caracteres)
  let somaASCII = 0;
  for (let i = 0; i < stringBase.length; i++) {
    somaASCII += stringBase.charCodeAt(i);
  }
  
  // Aplicar transformação para garantir 5 dígitos
  // Multiplica por um número primo e pega o módulo de 100000 para ter 5 dígitos
  const hash = (somaASCII * 17) % 100000;
  
  // Formatar como string de 5 dígitos com zeros à esquerda se necessário
  return String(Math.floor(hash)).padStart(5, '0');
} 