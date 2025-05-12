import { deliveries, gasEntries, loadDeliveries, loadGasEntries, updateTotals } from './data.js';
import { formatDate, getCurrentDate, showToast } from './utils.js';
import { generateDeliveryIdentifiers } from './idGenerator.js';
import { optimizeStoredImages } from './imageUtils.js';

// Função para validar dados antes da exportação
function validateExportData(data, type) {
  const errors = [];
  
  data.forEach((item, index) => {
    if (!item.date) {
      errors.push(`${type} #${index + 1}: Data inválida`);
    }
    if (!item.id) {
      errors.push(`${type} #${index + 1}: ID inválido`);
    }
    
    if (type === 'Entrega') {
      if (!item.orderNumber) {
        errors.push(`Entrega #${index + 1}: Número do pedido inválido`);
      }
      if (typeof item.fee !== 'number' && item.fee !== '') {
        errors.push(`Entrega #${index + 1}: Taxa inválida`);
      }
    } else if (type === 'Gasolina') {
      if (typeof item.amount !== 'number' && item.amount !== '') {
        errors.push(`Gasolina #${index + 1}: Valor inválido`);
      }
    }
  });
  
  return errors;
}

// Função para gerar CSV com os dados
export function generateCSV(includeGas = true) {
  // Validar dados antes de exportar
  const deliveryErrors = validateExportData(deliveries, 'Entrega');
  const gasErrors = includeGas ? validateExportData(gasEntries, 'Gasolina') : [];
  
  const allErrors = [...deliveryErrors, ...gasErrors];
  if (allErrors.length > 0) {
    throw new Error(`Erros nos dados:\n${allErrors.join('\n')}`);
  }
  
  const headers = ['Data', 'Tipo', 'ID', 'Número do Pedido', 'Valor Pedido', 'Valor Gasolina', 'Status', 'Imagem'];
  const rows = [];
  
  // Adicionar entregas
  deliveries.forEach(delivery => {
    rows.push([
      formatDate(delivery.date),
      'Entrega',
      delivery.id,
      delivery.orderNumber,
      delivery.fee,
      '',
      delivery.fee ? 'concluido' : 'pendente',
      delivery.image || ''
    ]);
  });
  
  // Adicionar registros de gasolina se includeGas for true
  if (includeGas) {
    gasEntries.forEach(entry => {
      rows.push([
        formatDate(entry.date),
        'Gasolina',
        entry.id,
        '',
        '',
        entry.amount,
        'Pago',
        entry.image || ''
      ]);
    });
  }
  
  // Converter para CSV, escapando campos que possam conter vírgulas ou quebras de linha
  return [
    headers.join(','),
    ...rows.map(row => row.map(field => {
      // Se o campo contiver vírgulas, quebras de linha ou aspas, envolva em aspas
      if (typeof field === 'string' && (field.includes(',') || field.includes('\n') || field.includes('"'))) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    }).join(','))
  ].join('\n');
}

// Função para fazer backup dos dados sem limpar
export function backupData(includeGas = true) {
  try {
    // Verificar se há dados para exportar
    if (deliveries.length === 0 && (!includeGas || gasEntries.length === 0)) {
      throw new Error('Não há dados para exportar');
    }
    
    const date = new Date();
    const { fileName } = generateDeliveryIdentifiers(date);
    
    // Gerar CSV
    const csvContent = generateCSV(includeGas);
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const csvUrl = URL.createObjectURL(csvBlob);
    
    // Download do CSV
    const link = document.createElement('a');
    link.href = csvUrl;
    link.download = `backup-${fileName}${includeGas ? '' : '-no-gas'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(csvUrl);
    
    // Otimizar imagens armazenadas
    optimizeStoredImages();
    
    const totalEntries = deliveries.length + (includeGas ? gasEntries.length : 0);
    showToast(`Backup realizado com sucesso! ${totalEntries} registros exportados.`, 'success');
  } catch (error) {
    console.error('Erro ao fazer backup:', error);
    showToast(error.message, 'error');
  }
}

// Função para limpar todos os dados
export function clearAllData() {
  if (!confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
    return;
  }
  
  try {
    // Fazer backup antes de limpar
    const csvContent = generateCSV(true);
    const date = new Date();
    const { fileName } = generateDeliveryIdentifiers(date);
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const csvUrl = URL.createObjectURL(csvBlob);
    
    const link = document.createElement('a');
    link.href = csvUrl;
    link.download = `backup-antes-de-limpar-${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(csvUrl);
    
    // Limpar dados
    localStorage.clear();
    deliveries.length = 0;
    gasEntries.length = 0;
    
    loadDeliveries();
    loadGasEntries();
    updateTotals();
    
    showToast('Todos os dados foram limpos com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao limpar dados:', error);
    showToast(error.message, 'error');
  }
}

// Função para finalizar a semana
export function finishWeek() {
  if (!confirm('Tem certeza que deseja finalizar a semana? Isso irá exportar e limpar todos os dados.')) {
    return;
  }

  try {
    // Verificar se há dados para exportar
    if (deliveries.length === 0 && gasEntries.length === 0) {
      throw new Error('Não há dados para exportar');
    }
    
    const date = new Date();
    const { fileName } = generateDeliveryIdentifiers(date);
    
    // Gerar CSV
    const csvContent = generateCSV(true);
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const csvUrl = URL.createObjectURL(csvBlob);
    
    // Download do CSV
    const link = document.createElement('a');
    link.href = csvUrl;
    link.download = `relatorio-${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(csvUrl);
    
    // Otimizar imagens armazenadas
    optimizeStoredImages();
    
    // Limpar os dados
    localStorage.clear();
    deliveries.length = 0;
    gasEntries.length = 0;
    
    // Recarregar dados
    loadDeliveries();
    loadGasEntries();
    updateTotals();
    
    const totalEntries = deliveries.length + gasEntries.length;
    showToast(`Semana finalizada com sucesso! ${totalEntries} registros exportados.`, 'success');
  } catch (error) {
    console.error('Erro ao finalizar semana:', error);
    showToast(error.message, 'error');
  }
} 