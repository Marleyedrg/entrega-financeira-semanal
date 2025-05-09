import { deliveries, gasEntries, loadDeliveries, loadGasEntries, updateTotals } from './data.js';
import { formatDate, getCurrentDate, showToast } from './utils.js';
import { generateUniqueID } from './idGenerator.js';
import { optimizeStoredImages } from './imageUtils.js';

// Função para gerar CSV com os dados
export function generateCSV() {
  const headers = ['Data', 'Tipo', 'Número do Pedido', 'Valor Pedido', 'Valor Gasolina', 'Status'];
  const rows = [];
  
  // Adicionar entregas
  deliveries.forEach(delivery => {
    rows.push([
      formatDate(delivery.date),
      'Entrega',
      delivery.orderNumber,
      delivery.fee,
      '',
      delivery.fee ? 'concluido' : 'pendente'
    ]);
  });
  
  // Adicionar registros de gasolina
  gasEntries.forEach(entry => {
    rows.push([
      formatDate(entry.date),
      'Gasolina',
      '',
      '',
      entry.amount,
      'Pago'
    ]);
  });
  
  // Converter para CSV
  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}

// Função para fazer backup dos dados (sem limpar)
export function backupData() {
  if (!deliveries.length && !gasEntries.length) {
    showToast('Não há dados para fazer backup', 'error');
    return;
  }
  
  const fileName = `backup_${formatDate(new Date().toISOString().split('T')[0]).replace(/\//g, '-')}.csv`;
  exportToCSV(fileName);
  
  // Armazenar dados com imagens otimizadas
  optimizeStoredImages();
  
  showToast('Backup realizado com sucesso!', 'success');
}

// Função para finalizar a semana e limpar os dados
export function finishWeek() {
  if (!deliveries.length && !gasEntries.length) {
    showToast('Não há dados para exportar', 'error');
    return;
  }
  
  const fileName = `financeiro_${formatDate(new Date().toISOString().split('T')[0]).replace(/\//g, '-')}.csv`;
  exportToCSV(fileName);
  
  // Limpar todos os dados após exportação
  localStorage.removeItem('deliveries');
  localStorage.removeItem('gasEntries');
  
  // Recarregar a página para atualizar os dados
  window.location.reload();
}

// Função para limpar todos os dados
export function clearAllData() {
  if (!confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
    return;
  }
  
  // Fazer backup antes de limpar
  if (deliveries.length || gasEntries.length) {
    const fileName = `backup_final_${formatDate(new Date().toISOString().split('T')[0]).replace(/\//g, '-')}.csv`;
    exportToCSV(fileName);
  }
  
  localStorage.removeItem('deliveries');
  localStorage.removeItem('gasEntries');
  
  // Recarregar a página para atualizar os dados
  window.location.reload();
}

// Função para exportar para CSV
function exportToCSV(fileName) {
  // Cabeçalho do CSV
  let csvContent = 'Data,Número do Pedido,Valor Pedido,Tipo\n';
  
  // Adicionar entregas
  deliveries.forEach(delivery => {
    csvContent += `${formatDate(delivery.date)},${delivery.orderNumber},${delivery.fee},Entrega\n`;
  });
  
  // Adicionar gastos com gasolina
  gasEntries.forEach(entry => {
    csvContent += `${formatDate(entry.date)},,${entry.amount},Gasolina\n`;
  });
  
  // Criar o arquivo
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Verificar se o navegador suporta download via link
  if (navigator.msSaveBlob) {
    // Para IE e Edge
    navigator.msSaveBlob(blob, fileName);
  } else {
    // Para outros navegadores
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
} 