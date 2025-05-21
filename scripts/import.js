import { deliveries, gasEntries, loadDeliveries, loadGasEntries, updateTotals } from './data.js';
import { parseCSVDate, showToast, normalizeDate } from './utils.js';
import { isMobileDevice } from './mobile.js';

// Função para validar os dados importados
function validateImportedData(entry, type) {
  const errors = [];
  
  // Validar data
  if (!entry.date) {
    errors.push(`Data inválida para ${type}`);
  }
  
  // Validar ID
  if (!entry.id) {
    errors.push(`ID inválido para ${type}`);
  }
  
  if (type === 'Entrega') {
    // Validar número do pedido
    if (!entry.orderNumber) {
      errors.push('Número do pedido inválido');
    }
    
    // Validar taxa
    if (typeof entry.fee !== 'number' && entry.fee !== '') {
      errors.push('Taxa de entrega inválida');
    }
  } else if (type === 'Gasolina') {
    // Validar valor da gasolina
    if (typeof entry.amount !== 'number' && entry.amount !== '') {
      errors.push('Valor da gasolina inválido');
    }
  }
  
  return errors;
}

// Função para importar dados do CSV
export function importCSV(event) {
  // Reset the input to ensure change event fires even with same file
  const resetInput = () => {
    if (event && event.target) {
      event.target.value = '';
    }
  };

  // Handle the case where we got a direct file object (from mobile)
  const file = event.target ? event.target.files[0] : (event.file || null);
  if (!file) {
    resetInput();
    return;
  }

  // Show loading indicator
  const loadingToast = showToast('Processando arquivo...', 'info', 0);

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      // Remove loading toast
      if (loadingToast) {
        document.body.removeChild(loadingToast);
      }

      const text = e.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      
      // Validar cabeçalhos
      const expectedHeaders = ['Data', 'Tipo', 'ID', 'Número do Pedido', 'Valor Pedido', 'Valor Gasolina', 'Status', 'Imagem'];
      const headers = lines[0].split(',').map(h => h.trim());
      
      const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`Cabeçalhos ausentes no CSV: ${missingHeaders.join(', ')}`);
      }
      
      // Processar dados de entregas e gasolina
      const importedDeliveries = [];
      const importedGasData = [];
      const errors = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        // Parse CSV line respecting quoted fields
        const values = [];
        let currentValue = '';
        let insideQuotes = false;
        
        for (let char of lines[i]) {
          if (char === '"') {
            insideQuotes = !insideQuotes;
          } else if (char === ',' && !insideQuotes) {
            values.push(currentValue);
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        values.push(currentValue); // Add the last value

        // Create object from headers and values
        const entry = {};
        headers.forEach((header, index) => {
          entry[header] = values[index]?.trim() || '';
        });

        // Processar e validar cada tipo de entrada
        if (entry['Tipo'] === 'Gasolina') {
          const gasEntry = {
            id: entry['ID'] || String(Date.now()),
            date: normalizeDate(parseCSVDate(entry['Data'])),
            amount: parseFloat(entry['Valor Gasolina']) || 0,
            image: entry['Imagem'] || null
          };
          
          const validationErrors = validateImportedData(gasEntry, 'Gasolina');
          if (validationErrors.length > 0) {
            errors.push(`Linha ${i + 1} (Gasolina): ${validationErrors.join(', ')}`);
          } else {
            importedGasData.push(gasEntry);
          }
          
        } else if (entry['Tipo'] === 'Entrega') {
          const delivery = {
            id: entry['ID'] || String(Date.now()),
            date: normalizeDate(parseCSVDate(entry['Data'])),
            orderNumber: entry['Número do Pedido'],
            fee: parseFloat(entry['Valor Pedido']) || 0,
            image: entry['Imagem'] || null
          };
          
          const validationErrors = validateImportedData(delivery, 'Entrega');
          if (validationErrors.length > 0) {
            errors.push(`Linha ${i + 1} (Entrega): ${validationErrors.join(', ')}`);
          } else {
            importedDeliveries.push(delivery);
          }
        }
      }
      
      // Se houver erros, mostrar e abortar importação
      if (errors.length > 0) {
        throw new Error(`Erros na importação:\n${errors.join('\n')}`);
      }
      
      // Verificar se há dados para importar
      if (importedDeliveries.length === 0 && importedGasData.length === 0) {
        throw new Error('Nenhum dado válido encontrado para importação');
      }
      
      // Atualizar dados
      localStorage.setItem('deliveries', JSON.stringify(importedDeliveries));
      localStorage.setItem('gasEntries', JSON.stringify(importedGasData));
      
      // Recarregar dados
      loadDeliveries();
      loadGasEntries();
      updateTotals();
      
      showToast(`Importação concluída: ${importedDeliveries.length} entregas e ${importedGasData.length} abastecimentos`, 'success');
    } catch (error) {
      console.error('Erro na importação:', error);
      showToast(error.message, 'error');
    }
    // Always reset the input
    resetInput();
  };
  
  reader.onerror = function() {
    showToast('Erro ao ler o arquivo', 'error');
    resetInput();
  };
  
  // Start reading the file
  reader.readAsText(file);
} 