import { formatCurrency, formatDate, showToast, getCurrentDate, normalizeDate, getWeekdayName } from './utils.js';
import { renderAnalytics, clearDataCache } from './analytics.js';
import { formatImageDisplay } from './imageUtils.js';

// Novas importações para validação e sincronização
import { validateDelivery, validateGasEntry, validateDatabaseIntegrity, getErrorMessages } from './dataValidator.js';
import { notifyDataChange, forceSyncAllTabs } from './sync.js';

// Variáveis globais para armazenar os dados
export let deliveries = [];
export let gasEntries = [];

// Última verificação de integridade
let lastIntegrityCheck = null;

// Função para carregar dados do localStorage com verificação de integridade
function loadFromLocalStorage() {
  try {
    // Carrega entregas
    const savedDeliveries = localStorage.getItem('deliveries');
    if (savedDeliveries) {
      deliveries = JSON.parse(savedDeliveries).map(delivery => ({
        ...delivery,
        fee: parseFloat(delivery.fee) || 0,
        id: delivery.id || String(Date.now()),
        date: normalizeDate(delivery.date),
        status: delivery.status || (parseFloat(delivery.fee) > 0 ? 'completed' : 'pending')
      }));
    } else {
      deliveries = [];
    }

    // Carrega registros de gasolina
    const savedGasEntries = localStorage.getItem('gasEntries');
    if (savedGasEntries) {
      gasEntries = JSON.parse(savedGasEntries).map(entry => ({
        ...entry,
        amount: parseFloat(entry.amount) || 0,
        id: entry.id || String(Date.now()),
        date: normalizeDate(entry.date)
      }));
    } else {
      gasEntries = [];
    }

    // Ordena os dados
    sortDeliveries();
    
    // Verificar integridade dos dados a cada hora, ou na primeira carga
    const now = Date.now();
    if (!lastIntegrityCheck || (now - lastIntegrityCheck) > 3600000) {
      validateDataIntegrity();
      lastIntegrityCheck = now;
    }

    // Atualiza as tabelas e totais após carregar os dados
    updateDeliveriesTable();
    updateGasTable();
    updateTotals();
    renderAnalytics();
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    showToast('Erro ao carregar dados do armazenamento local', 'error');
    
    // Inicializa arrays vazios em caso de erro
    deliveries = [];
    gasEntries = [];
  }
}

// Função para verificar integridade dos dados
function validateDataIntegrity() {
  const result = validateDatabaseIntegrity();
  
  if (!result.isValid) {
    console.warn('Problemas de integridade nos dados:', result);
    
    // Verificar entradas inválidas em entregas e corrigi-las se possível
    if (result.deliveries.invalidItems.length > 0) {
      result.deliveries.invalidItems.forEach(item => {
        const index = deliveries.findIndex(d => d.id === item.item.id);
        if (index !== -1) {
          // Tentar corrigir problemas comuns
          if (!deliveries[index].status) {
            deliveries[index].status = parseFloat(deliveries[index].fee) > 0 ? 'completed' : 'pending';
          }
          if (!deliveries[index].id) {
            deliveries[index].id = String(Date.now()) + '_' + Math.random().toString(36).substring(2, 9);
          }
        }
      });
      
      // Salvar após correções
      localStorage.setItem('deliveries', JSON.stringify(deliveries));
    }
    
    // Verificar entradas inválidas em gasEntries
    if (result.gasEntries.invalidItems.length > 0) {
      result.gasEntries.invalidItems.forEach(item => {
        const index = gasEntries.findIndex(g => g.id === item.item.id);
        if (index !== -1) {
          // Tentar corrigir problemas comuns
          if (!gasEntries[index].id) {
            gasEntries[index].id = String(Date.now()) + '_' + Math.random().toString(36).substring(2, 9);
          }
        }
      });
      
      // Salvar após correções
      localStorage.setItem('gasEntries', JSON.stringify(gasEntries));
    }
  }
  
  return result;
}

// Função para salvar dados no localStorage com notificação de sincronização
function saveToLocalStorage() {
  try {
    localStorage.setItem('deliveries', JSON.stringify(deliveries));
    localStorage.setItem('gasEntries', JSON.stringify(gasEntries));
    
    // Notificar outras abas sobre a mudança
    notifyDataChange('fullSync');
  } catch (error) {
    console.error('Erro ao salvar no localStorage:', error);
    showToast('Erro ao salvar dados', 'error');
  }
}

// Função para salvar entregas
export function saveDeliveries() {
  try {
    // Ordena as entregas antes de salvar
    sortDeliveries();
    
    // Salva no localStorage
    localStorage.setItem('deliveries', JSON.stringify(deliveries));
    
    // Limpa o cache de dados analíticos
    clearDataCache();
    
    // Atualiza a interface
    updateDeliveriesTable();
    updateTotals();
    
    // Notificar outras abas sobre a mudança
    notifyDataChange('deliveries');
  } catch (error) {
    console.error('Erro ao salvar entregas:', error);
    showToast('Erro ao salvar entregas', 'error');
  }
}

// Função para salvar registros de gasolina
export function saveGasEntries() {
  try {
    localStorage.setItem('gasEntries', JSON.stringify(gasEntries));
    
    // Limpa o cache de dados analíticos
    clearDataCache();
    
    updateGasTable();
    updateTotals();
    
    // Notificar outras abas sobre a mudança
    notifyDataChange('gasEntries');
  } catch (error) {
    console.error('Erro ao salvar registros de gasolina:', error);
    showToast('Erro ao salvar registros de gasolina', 'error');
  }
}

// Função para carregar entregas
export function loadDeliveries() {
  loadFromLocalStorage();
}

// Função para carregar registros de gasolina
export function loadGasEntries() {
  loadFromLocalStorage();
}

// Função para ordenar entregas
function sortDeliveries() {
  deliveries.sort((a, b) => {
    // Primeiro por data (mais recentes primeiro)
    const dateComparison = new Date(b.date) - new Date(a.date);
    if (dateComparison !== 0) return dateComparison;
    
    // Mesmo dia: ordenar por número do pedido
    return a.orderNumber.localeCompare(b.orderNumber, undefined, {
      numeric: true,
      sensitivity: 'base'
    });
  });
}

// Função para atualizar os totais
export function updateTotals() {
  const totalFees = deliveries.reduce((sum, delivery) => {
    return sum + (parseFloat(delivery.fee) || 0);
  }, 0);
  
  const totalGas = gasEntries.reduce((sum, entry) => {
    return sum + (parseFloat(entry.amount) || 0);
  }, 0);
  
  document.getElementById('totalFees').textContent = formatCurrency(totalFees);
  document.getElementById('totalGas').textContent = formatCurrency(totalGas);
  
  const netProfit = totalFees - totalGas;
  const netProfitElement = document.getElementById('netProfit');
  netProfitElement.textContent = formatCurrency(netProfit);
  netProfitElement.className = netProfit >= 0 ? 'total-profit' : 'total-loss';
  
  // Limpa o cache antes de renderizar análises
  clearDataCache();
  renderAnalytics();
}

// Função para atualizar a tabela de entregas
export function updateDeliveriesTable() {
  const tableBody = document.getElementById('deliveriesTableBody');
  if (!tableBody) return;

  // Garante que os dados estão ordenados
  sortDeliveries();

  // Garante que todas as entregas têm um status definido
  deliveries.forEach(delivery => {
    if (!delivery.status) {
      delivery.status = parseFloat(delivery.fee) > 0 ? 'completed' : 'pending';
    }
  });

  // Agrupa entregas por data
  const groupedDeliveries = {};
  deliveries.forEach(delivery => {
    if (!groupedDeliveries[delivery.date]) {
      groupedDeliveries[delivery.date] = [];
    }
    groupedDeliveries[delivery.date].push(delivery);
  });

  // Ordena as datas em ordem decrescente
  const sortedDates = Object.keys(groupedDeliveries).sort((a, b) => new Date(b) - new Date(a));

  let html = '';
  let currentDate = '';

  sortedDates.forEach(date => {
    const dayDeliveries = groupedDeliveries[date];
    
    dayDeliveries.forEach((delivery, index) => {
      const isNewDate = date !== currentDate;
      currentDate = date;
      
      if (isNewDate) {
        html += `
          <tr class="date-header">
            <td colspan="5" class="date-cell">
              ${formatDate(date)} (${getWeekdayName(date)})
            </td>
          </tr>
        `;
      }

      const statusClass = delivery.status === 'pending' ? 'status-pending' : 'status-completed';
      const statusText = delivery.status === 'pending' ? 'Pendente' : 'Finalizado';
      
      html += `
        <tr data-id="${delivery.id}">
          <td>${delivery.orderNumber}</td>
          <td class="fee-cell">R$ ${formatCurrency(delivery.fee)}</td>
          <td>
            <span class="status-badge ${statusClass}" title="${statusText}">
              ${statusText}
            </span>
          </td>
          <td class="actions-cell">
            ${delivery.image ? `
              <button 
                type="button" 
                class="action-button view-image" 
                onclick="showImageModal('${delivery.image}')"
                title="Ver comprovante"
              >
                <i class="fas fa-image"></i>
              </button>
            ` : ''}
            <button 
              type="button" 
              class="action-button edit" 
              onclick="editDelivery('${delivery.id}')"
              title="Editar entrega"
            >
              <i class="fas fa-edit"></i>
            </button>
            <button 
              type="button" 
              class="action-button delete" 
              onclick="deleteDelivery('${delivery.id}')"
              title="Excluir entrega"
            >
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });
  });

  tableBody.innerHTML = html;
}

// Função para atualizar a tabela de gasolina
export function updateGasTable() {
  const tableBody = document.getElementById('gasTableBody');
  if (!tableBody) return;

  // Ordena por data (mais recentes primeiro)
  gasEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

  let html = '';
  gasEntries.forEach(entry => {
    html += `
      <tr data-id="${entry.id}">
        <td>${formatDate(entry.date)}</td>
        <td class="fee-cell">R$ ${formatCurrency(entry.amount)}</td>
        <td class="actions-cell">
          <button 
            type="button" 
            class="action-button delete" 
            onclick="deleteGasEntry('${entry.id}')"
            title="Excluir registro"
          >
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
}

// Função para adicionar uma nova entrega
export function addDelivery(delivery) {
  try {
    // Validar entrega antes de adicionar
    const validation = validateDelivery(delivery);
    
    if (!validation.isValid) {
      const errorMessages = getErrorMessages(validation);
      throw new Error(`Erro de validação: ${errorMessages.join(', ')}`);
    }
    
    // Gerar ID e definir status se necessário
    if (!delivery.id) {
      delivery.id = String(Date.now());
    }
    
    if (!delivery.status) {
      delivery.status = parseFloat(delivery.fee) > 0 ? 'completed' : 'pending';
    }
    
    // Adicionar à lista e salvar
    deliveries.push(delivery);
    saveDeliveries();
    
    return { success: true, delivery };
  } catch (error) {
    console.error('Erro ao adicionar entrega:', error);
    showToast(error.message, 'error');
    return { success: false, error: error.message };
  }
}

// Função para atualizar uma entrega existente
export function updateDelivery(id, updatedDelivery) {
  try {
    // Validar entrega antes de atualizar
    const validation = validateDelivery(updatedDelivery, { excludeId: id });
    
    if (!validation.isValid) {
      const errorMessages = getErrorMessages(validation);
      throw new Error(`Erro de validação: ${errorMessages.join(', ')}`);
    }
    
    const index = deliveries.findIndex(d => d.id === id);
    if (index === -1) {
      throw new Error('Entrega não encontrada');
    }
    
    // Atualizar dados preservando o ID
    deliveries[index] = {
      ...updatedDelivery,
      id: id
    };
    
    saveDeliveries();
    return { success: true, delivery: deliveries[index] };
  } catch (error) {
    console.error('Erro ao atualizar entrega:', error);
    showToast(error.message, 'error');
    return { success: false, error: error.message };
  }
}

export function deleteDelivery(id) {
  try {
    deliveries = deliveries.filter(delivery => delivery.id !== id);
    saveDeliveries();
    updateDeliveriesTable();
    updateTotals();
    showToast('Entrega excluída com sucesso', 'success');
  } catch (error) {
    console.error('Erro ao excluir entrega:', error);
    showToast('Erro ao excluir entrega', 'error');
  }
}

export function deleteGasEntry(id) {
  try {
    gasEntries = gasEntries.filter(entry => entry.id !== id);
    saveGasEntries();
    updateGasTable();
    updateTotals();
    showToast('Registro de gasolina excluído com sucesso', 'success');
  } catch (error) {
    console.error('Erro ao excluir registro de gasolina:', error);
    showToast('Erro ao excluir registro de gasolina', 'error');
  }
}

export function importData(jsonData) {
  try {
    const data = JSON.parse(jsonData);
    
    if (data.deliveries) {
      deliveries = data.deliveries.map(delivery => ({
        ...delivery,
        fee: parseFloat(delivery.fee) || 0,
        id: delivery.id || String(Date.now()),
        date: normalizeDate(delivery.date),
        status: delivery.status || (parseFloat(delivery.fee) > 0 ? 'completed' : 'pending')
      }));
    }
    
    if (data.gasEntries) {
      gasEntries = data.gasEntries.map(entry => ({
        ...entry,
        amount: parseFloat(entry.amount) || 0,
        id: entry.id || String(Date.now()),
        date: normalizeDate(entry.date)
      }));
    }
    
    saveToLocalStorage();
    updateDeliveriesTable();
    updateGasTable();
    updateTotals();
    showToast('Dados importados com sucesso', 'success');
  } catch (error) {
    console.error('Erro ao importar dados:', error);
    showToast('Erro ao importar dados. Verifique o formato do arquivo.', 'error');
  }
}

// Exportar funções de inicialização
export function initializeData() {
  loadFromLocalStorage();
}

// Adicionar função para forçar sincronização
export function forceSyncData() {
  return forceSyncAllTabs();
}

// Modificar a função addGasEntry para usar validação avançada
export function addGasEntry(gasEntry) {
  try {
    // Validar abastecimento antes de adicionar
    const validation = validateGasEntry(gasEntry);
    
    if (!validation.isValid) {
      const errorMessages = getErrorMessages(validation);
      throw new Error(`Erro de validação: ${errorMessages.join(', ')}`);
    }
    
    // Gerar ID se necessário
    if (!gasEntry.id) {
      gasEntry.id = String(Date.now());
    }
    
    // Adicionar à lista e salvar
    gasEntries.push(gasEntry);
    saveGasEntries();
    
    return { success: true, gasEntry };
  } catch (error) {
    console.error('Erro ao adicionar abastecimento:', error);
    showToast(error.message, 'error');
    return { success: false, error: error.message };
  }
}

// Modificar a função updateGasEntry para usar validação avançada
export function updateGasEntry(id, updatedGasEntry) {
  try {
    // Validar abastecimento antes de atualizar
    const validation = validateGasEntry(updatedGasEntry, { excludeId: id });
    
    if (!validation.isValid) {
      const errorMessages = getErrorMessages(validation);
      throw new Error(`Erro de validação: ${errorMessages.join(', ')}`);
    }
    
    const index = gasEntries.findIndex(g => g.id === id);
    if (index === -1) {
      throw new Error('Abastecimento não encontrado');
    }
    
    // Atualizar dados preservando o ID
    gasEntries[index] = {
      ...updatedGasEntry,
      id: id
    };
    
    saveGasEntries();
    return { success: true, gasEntry: gasEntries[index] };
  } catch (error) {
    console.error('Erro ao atualizar abastecimento:', error);
    showToast(error.message, 'error');
    return { success: false, error: error.message };
  }
} 