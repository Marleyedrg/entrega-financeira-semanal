import { deliveries, gasEntries, loadDeliveries, loadGasEntries, updateTotals } from './data.js';
import { parseCSVDate, showToast } from './utils.js';

// Função para importar dados do CSV
export function importCSV(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const lines = text.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Processar dados de entregas e gasolina
    const importedDeliveries = [];
    const importedGasData = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(',').map(v => v.trim());
      const entry = {};
      headers.forEach((header, index) => {
        entry[header] = values[index];
      });
      if (entry['Tipo'] === 'Gasolina') {
        importedGasData.push({
          date: parseCSVDate(entry['Data']),
          amount: parseFloat(entry['Valor Gasolina']) || 0,
          image: null
        });
      } else if (entry['Tipo'] === 'Entrega') {
        importedDeliveries.push({
          date: parseCSVDate(entry['Data']),
          orderNumber: entry['Número do Pedido'],
          fee: parseFloat(entry['Valor Pedido']) || 0,
          image: null
        });
      }
    }
    
    // Atualizar dados
    localStorage.setItem('deliveries', JSON.stringify(importedDeliveries));
    localStorage.setItem('gasEntries', JSON.stringify(importedGasData));
    
    // Recarregar dados
    loadDeliveries();
    loadGasEntries();
    updateTotals();
    
    showToast('Dados importados com sucesso!', 'success');
  };
  reader.readAsText(file);
} 