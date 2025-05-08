import { deliveries, gasEntries, loadDeliveries, loadGasEntries, updateTotals } from './data.js';
import { formatDate, getCurrentDate, showToast } from './utils.js';
import { generateUniqueID } from './idGenerator.js';

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
  // Criar CSV com os dados
  const csvContent = generateCSV();
  
  // Gerar ID único para o arquivo
  const uniqueID = generateUniqueID();
  
  // Criar link para download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `backup_entregas_${getCurrentDate()}_${uniqueID}.csv`;
  
  // Simular clique para download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast('Backup realizado com sucesso!', 'success');
}

// Função para finalizar a semana e limpar os dados
export function finishWeek() {
  if (confirm('Tem certeza que deseja finalizar a semana? Todos os dados serão exportados e limpos.')) {
    // Criar CSV com os dados
    const csvContent = generateCSV();
    
    // Gerar ID único para o arquivo
    const uniqueID = generateUniqueID();
    
    // Criar link para download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `entregas_${getCurrentDate()}_${uniqueID}.csv`;
    
    // Simular clique para download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpar dados
    localStorage.removeItem('deliveries');
    localStorage.removeItem('gasEntries');
    
    // Recarregar dados
    loadDeliveries();
    loadGasEntries();
    updateTotals();
    
    showToast('Semana finalizada com sucesso!', 'success');
  }
}

// Função para limpar todos os dados
export function clearAllData() {
  // Verificar se há dados para backup
  if (deliveries.length === 0 && gasEntries.length === 0) {
    showToast('Não há dados para limpar.', 'info');
    return;
  }

  // Gerar dois números aleatórios entre 1 e 9
  const num1 = Math.floor(Math.random() * 9) + 1;
  const num2 = Math.floor(Math.random() * 9) + 1;
  const resultado = num1 + num2;
  
  // Solicitar resposta do usuário
  const resposta = prompt(`Para confirmar a exclusão, digite o resultado de ${num1} + ${num2}:`);
  
  // Verificar se a resposta está correta
  if (resposta !== null && parseInt(resposta) === resultado) {
    // Criar CSV com os dados antes de limpar
    const csvContent = generateCSV();
    
    // Gerar ID único para o arquivo
    const uniqueID = generateUniqueID();
    
    // Criar link para download do backup automático
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `backup_automatico_${getCurrentDate()}_${uniqueID}.csv`;
    
    // Simular clique para download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpar dados
    localStorage.removeItem('deliveries');
    localStorage.removeItem('gasEntries');
    
    // Recarregar dados
    loadDeliveries();
    loadGasEntries();
    updateTotals();
    
    showToast('Backup automático criado e dados excluídos!', 'success');
  } else if (resposta !== null) {
    showToast('Resposta incorreta. Operação cancelada.', 'error');
  }
} 