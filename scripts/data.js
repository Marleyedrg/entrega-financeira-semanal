import { renderAnalytics, clearDataCache } from './analytics.js';
import { showToast, formatCurrency, formatDate, getWeekdayName, normalizeDate } from './utils.js';
import { validateDelivery, validateGasEntry, validateDatabaseIntegrity, getErrorMessages } from './dataValidator.js';
import { notifyDataChange, forceSyncAllTabs } from './sync.js';
import { updateGasTable } from './gasEditHandler.js';
import { isDataClearingInProgress } from './export.js';

// Variáveis globais para armazenar os dados
export let deliveries = [];
export let gasEntries = [];

// Última verificação de integridade (GitHub Pages optimized)
let lastIntegrityCheck = null;

// GitHub Pages environment detection
const isGitHubPages = window.location.hostname.includes('github.io') || 
                     window.location.pathname.includes('/entrega-financeira-semanal/');

// GitHub Pages optimized data loading with retry mechanism
function loadFromLocalStorage() {
  // Check if data clearing is in progress (GitHub Pages aware)
  if (isDataClearingInProgress() || 
      sessionStorage.getItem('dataClearing') === 'true' ||
      sessionStorage.getItem('github_pages_clearing')) {
    console.log('⏸️ Aguardando conclusão da limpeza de dados (GitHub Pages)...');
    return;
  }
  
  console.log('📂 Carregando dados do localStorage (GitHub Pages)...');
  
  try {
    // Load deliveries with GitHub Pages retry logic
    const savedDeliveries = localStorage.getItem('deliveries');
    if (savedDeliveries) {
      try {
        const parsedDeliveries = JSON.parse(savedDeliveries);
        if (Array.isArray(parsedDeliveries)) {
          deliveries = parsedDeliveries.map(delivery => ({
            ...delivery,
            fee: parseFloat(delivery.fee) || 0,
            id: delivery.id || String(Date.now()),
            date: normalizeDate(delivery.date),
            status: delivery.status || (parseFloat(delivery.fee) > 0 ? 'completed' : 'pending')
          }));
          console.log(`✅ ${deliveries.length} entregas carregadas (GitHub Pages)`);
        } else {
          console.warn('⚠️ Dados de entregas não são um array (GitHub Pages), inicializando vazio');
          deliveries = [];
        }
      } catch (parseError) {
        console.error('❌ Erro ao fazer parse das entregas (GitHub Pages):', parseError);
        deliveries = [];
        // Try to repair corrupted data
        localStorage.setItem('deliveries', '[]');
      }
    } else {
      deliveries = [];
      console.log('📝 Nenhuma entrega encontrada, inicializando array vazio (GitHub Pages)');
    }

    // Load gas entries with GitHub Pages retry logic
    const savedGasEntries = localStorage.getItem('gasEntries');
    if (savedGasEntries) {
      try {
        const parsedGasEntries = JSON.parse(savedGasEntries);
        if (Array.isArray(parsedGasEntries)) {
          gasEntries = parsedGasEntries.map(entry => ({
            ...entry,
            amount: parseFloat(entry.amount) || 0,
            id: entry.id || String(Date.now()),
            date: normalizeDate(entry.date)
          }));
          console.log(`✅ ${gasEntries.length} gastos carregados (GitHub Pages)`);
        } else {
          console.warn('⚠️ Dados de gastos não são um array (GitHub Pages), inicializando vazio');
          gasEntries = [];
        }
      } catch (parseError) {
        console.error('❌ Erro ao fazer parse dos gastos (GitHub Pages):', parseError);
        gasEntries = [];
        // Try to repair corrupted data
        localStorage.setItem('gasEntries', '[]');
      }
    } else {
      gasEntries = [];
      console.log('📝 Nenhum gasto encontrado, inicializando array vazio (GitHub Pages)');
    }

    // Sort data
    sortDeliveries();
    
    // Integrity check with GitHub Pages considerations
    const now = Date.now();
    if (!lastIntegrityCheck || (now - lastIntegrityCheck) > 3600000) { // 1 hour
      console.log('🔍 Executando verificação de integridade (GitHub Pages)...');
      validateDataIntegrity();
      lastIntegrityCheck = now;
    }

    // Update interface only if not clearing
    if (!isDataClearingInProgress() && 
        sessionStorage.getItem('dataClearing') !== 'true' &&
        !sessionStorage.getItem('github_pages_clearing')) {
      updateDeliveriesTable();
      updateGasTable();
      updateTotals();
      renderAnalytics();
    }
    
    console.log('✅ Dados carregados com sucesso (GitHub Pages)');
  } catch (error) {
    console.error('❌ Erro ao carregar dados (GitHub Pages):', error);
    showToast('Erro ao carregar dados do armazenamento local', 'error');
    
    // Initialize empty arrays as fallback
    deliveries = [];
    gasEntries = [];
  }
}

// GitHub Pages optimized data validation
function validateDataIntegrity() {
  try {
    const result = validateDatabaseIntegrity();
    
    if (!result.isValid) {
      console.warn('⚠️ Problemas de integridade detectados (GitHub Pages):', result);
      
      // Auto-repair simple issues for GitHub Pages
      if (result.deliveries.invalidItems.length > 0) {
        console.log('🔧 Tentando reparar entregas inválidas (GitHub Pages)...');
        deliveries = deliveries.filter(delivery => {
          const validation = validateDelivery(delivery);
          return validation.isValid;
        });
        saveDeliveries();
      }
      
      if (result.gasEntries.invalidItems.length > 0) {
        console.log('🔧 Tentando reparar gastos inválidos (GitHub Pages)...');
        gasEntries = gasEntries.filter(entry => {
          const validation = validateGasEntry(entry);
          return validation.isValid;
        });
        saveGasEntries();
      }
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erro na validação de integridade (GitHub Pages):', error);
    return { isValid: false, error: error.message };
  }
}

// GitHub Pages optimized save function with retry mechanism
export function saveDeliveries() {
  try {
    console.log('💾 Salvando entregas (GitHub Pages)...');
    
    // Sort deliveries before saving
    sortDeliveries();
    
    // Prepare data for GitHub Pages storage
    const dataToSave = JSON.stringify(deliveries);
    
    // GitHub Pages optimized save with verification
    const maxAttempts = 3;
    let saveSuccessful = false;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        localStorage.setItem('deliveries', dataToSave);
        
        // Verify save was successful
        const savedData = localStorage.getItem('deliveries');
        if (savedData === dataToSave) {
          saveSuccessful = true;
          console.log(`✅ ${deliveries.length} entregas salvas (GitHub Pages) - Tentativa ${attempt}`);
          break;
        } else {
          console.warn(`⚠️ Verificação de salvamento falhou (GitHub Pages) - Tentativa ${attempt}`);
        }
      } catch (saveError) {
        console.error(`❌ Erro ao salvar entregas (GitHub Pages) - Tentativa ${attempt}:`, saveError);
        if (attempt === maxAttempts) {
          throw saveError;
        }
      }
    }
    
    if (!saveSuccessful) {
      throw new Error('Falha crítica ao salvar entregas após múltiplas tentativas (GitHub Pages)');
    }
    
    // Clear analytics cache
    clearDataCache();
    
    // Update interface only if not clearing
    if (!isDataClearingInProgress() && 
        sessionStorage.getItem('dataClearing') !== 'true' &&
        !sessionStorage.getItem('github_pages_clearing')) {
      updateDeliveriesTable();
      updateTotals();
    }
    
    // Notify other tabs (GitHub Pages aware)
    notifyDataChange('deliveries');
  } catch (error) {
    console.error('❌ Erro ao salvar entregas (GitHub Pages):', error);
    showToast(`Erro ao salvar entregas: ${error.message}`, 'error');
    throw error;
  }
}

// GitHub Pages optimized gas entries save function
export function saveGasEntries() {
  try {
    console.log('💾 Salvando gastos (GitHub Pages)...');
    
    // Prepare data for GitHub Pages storage
    const dataToSave = JSON.stringify(gasEntries);
    
    // GitHub Pages optimized save with verification
    const maxAttempts = 3;
    let saveSuccessful = false;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        localStorage.setItem('gasEntries', dataToSave);
        
        // Verify save was successful
        const savedData = localStorage.getItem('gasEntries');
        if (savedData === dataToSave) {
          saveSuccessful = true;
          console.log(`✅ ${gasEntries.length} gastos salvos (GitHub Pages) - Tentativa ${attempt}`);
          break;
        } else {
          console.warn(`⚠️ Verificação de salvamento falhou (GitHub Pages) - Tentativa ${attempt}`);
        }
      } catch (saveError) {
        console.error(`❌ Erro ao salvar gastos (GitHub Pages) - Tentativa ${attempt}:`, saveError);
        if (attempt === maxAttempts) {
          throw saveError;
        }
      }
    }
    
    if (!saveSuccessful) {
      throw new Error('Falha crítica ao salvar gastos após múltiplas tentativas (GitHub Pages)');
    }
    
    // Clear analytics cache
    clearDataCache();
    
    // Update interface only if not clearing
    if (!isDataClearingInProgress() && 
        sessionStorage.getItem('dataClearing') !== 'true' &&
        !sessionStorage.getItem('github_pages_clearing')) {
      updateGasTable();
      updateTotals();
    }
    
    // Notify other tabs (GitHub Pages aware)
    notifyDataChange('gasEntries');
  } catch (error) {
    console.error('❌ Erro ao salvar gastos (GitHub Pages):', error);
    showToast(`Erro ao salvar gastos: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Updates the bills budget calculator when gas entries change
 */
async function updateBillsBudgetCalculator() {
  console.log('🔄 updateBillsBudgetCalculator called from data.js');
  try {
    const { updateBudgetFromGasChanges } = await import('./billsManager.js');
    updateBudgetFromGasChanges();
  } catch (error) {
    // Bills module may not be loaded yet, that's okay
    console.log('⚠️ Bills module not available for budget update:', error);
  }
}

// Função para carregar entregas (GitHub Pages optimized)
export function loadDeliveries() {
  // Check if data clearing is in progress (GitHub Pages aware)
  if (isDataClearingInProgress() || 
      sessionStorage.getItem('dataClearing') === 'true' ||
      sessionStorage.getItem('github_pages_clearing')) {
    console.log('⏸️ Carregamento de entregas pausado - limpeza em andamento (GitHub Pages)');
    return;
  }
  
  loadFromLocalStorage();
}

// Função para carregar registros de gasolina (GitHub Pages optimized)
export function loadGasEntries() {
  // Check if data clearing is in progress (GitHub Pages aware)
  if (isDataClearingInProgress() || 
      sessionStorage.getItem('dataClearing') === 'true' ||
      sessionStorage.getItem('github_pages_clearing')) {
    console.log('⏸️ Carregamento de gastos pausado - limpeza em andamento (GitHub Pages)');
    return;
  }
  
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
  const tbody = document.getElementById('deliveriesTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  
  // Agrupar entregas por data
  const entriesByDate = {};
  
  deliveries.forEach(delivery => {
    const date = delivery.date || getCurrentDate(); // Fallback para datas inválidas
    if (!entriesByDate[date]) {
      entriesByDate[date] = {
        entries: [],
        totalFees: 0
      };
    }
    entriesByDate[date].entries.push(delivery);
    
    // Calcular o total de taxas para esta data
    const fee = parseFloat(delivery.fee) || 0;
    entriesByDate[date].totalFees += fee;
  });
  
  // Ordenar datas (mais recentes primeiro)
  const sortedDates = Object.keys(entriesByDate).sort((a, b) => {
    return new Date(b) - new Date(a);
  });
  
  // Renderizar entregas agrupadas por data
  sortedDates.forEach(date => {
    const entriesForDate = entriesByDate[date].entries;
    const totalFeesForDate = entriesByDate[date].totalFees;
    
    // Criar cabeçalho da data com o dia da semana e total de taxas
    const dateHeader = document.createElement('tr');
    dateHeader.className = 'date-header';
    dateHeader.innerHTML = `
      <td colspan="4">
        <div class="date-header-content">
          <span class="date-label">${formatDate(date)}</span>
          <span class="weekday-label">(${getWeekdayName(date)})</span>
          <div class="date-summary">
            <span class="delivery-count">${entriesForDate.length} entregas</span>
            <span class="total-fees">R$ ${formatCurrency(totalFeesForDate)}</span>
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(dateHeader);
    
    // Renderizar entregas desta data
    entriesForDate.forEach(delivery => {
      const tr = document.createElement('tr');
      tr.className = 'delivery-row';
      
      // Determinar status para exibição
      let statusText = 'Desconhecido';
      let statusClass = '';
      
      if (delivery.status === 'pending') {
        statusText = 'Pendente';
        statusClass = 'status-pending';
      } else if (delivery.status === 'completed') {
        statusText = 'Concluído';
        statusClass = 'status-completed';
      } else if (parseFloat(delivery.fee) > 0) {
        statusText = 'Concluído';
        statusClass = 'status-completed';
      } else {
        statusText = 'Pendente';
        statusClass = 'status-pending';
      }

      // Criando os elementos de forma segura
      // Sanitize data before inserting
      const safeOrderNumber = document.createTextNode(delivery.orderNumber || '').textContent;
      const fee = parseFloat(delivery.fee) || 0;
      
      tr.innerHTML = `
        <td>${safeOrderNumber}</td>
        <td>R$ ${formatCurrency(fee)}</td>
        <td><span class="${statusClass}">${statusText}</span></td>
        <td class="actions-cell">
          <button class="action-button" title="Ver imagem">
            <i class="fas fa-image"></i>
          </button>
          <button class="action-button" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button class="action-button delete" title="Excluir">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;
      
      // Adicionar event listeners de forma segura
      const imageButton = tr.querySelector('.action-button:nth-child(1)');
      const editButton = tr.querySelector('.action-button:nth-child(2)');
      const deleteButton = tr.querySelector('.action-button:nth-child(3)');
      
      imageButton.addEventListener('click', () => {
        // Verificar se a entrega possui imagem antes de abrir o modal
        if (delivery.image) {
          window.showImageModal(delivery.image);
        } else {
          showToast('Sem comprovante para este pedido', 'info');
        }
      });
      
      editButton.addEventListener('click', () => {
        window.editDelivery(delivery.id);
      });
      
      deleteButton.addEventListener('click', () => {
        const orderNumber = delivery.orderNumber || "desconhecido";
        // Usar o sistema de confirmação personalizado
        if (window.confirmDeliveryDeletion) {
          window.confirmDeliveryDeletion(delivery.id, orderNumber);
        } else {
          // Fallback para confirmação nativa
          if (confirm(`Tem certeza que deseja excluir o pedido número ${orderNumber}?`)) {
            window.deleteDelivery(delivery.id);
          }
        }
      });
      
      tbody.appendChild(tr);
    });
  });
  
  // Mostrar mensagem se não houver entregas
  if (sortedDates.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="4" class="empty-state">
        Nenhuma entrega registrada
      </td>
    `;
    tbody.appendChild(emptyRow);
  }
}

// Função para atualizar a tabela de gastos
export function updateGasTable() {
  const tbody = document.getElementById('gasTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  
  gasEntries.forEach(entry => {
    const tr = document.createElement('tr');
    
    // Sanitize data and handle invalid values
    const formattedDate = formatDate(entry.date) || 'Data inválida';
    const amount = parseFloat(entry.amount) || 0;
    const description = entry.description || 'Gasto';
    const safeId = document.createTextNode(entry.id || '').textContent;
    
    tr.innerHTML = `
      <td>${formattedDate}</td>
      <td>${description}</td>
      <td>R$ ${formatCurrency(amount)}</td>
      <td>
        <button class="action-button delete" title="Excluir">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    
    // Add event listener safely
    const deleteButton = tr.querySelector('.action-button.delete');
    if (deleteButton) {
      deleteButton.addEventListener('click', () => {
        const amountFormatted = formatCurrency(amount);
        // Usar o sistema de confirmação personalizado
        if (window.confirmGasDeletion) {
          window.confirmGasDeletion(safeId, amountFormatted, description);
        } else {
          // Fallback para confirmação nativa
          if (confirm(`Tem certeza que deseja excluir o gasto "${description}" no valor de R$ ${amountFormatted}?`)) {
            window.deleteGasEntry(safeId);
          }
        }
      });
    }
    tbody.appendChild(tr);
  });
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
    
    // Explicitly update budget calculator after deletion
    console.log('🔄 Calling budget update after gas entry deleted');
    updateBillsBudgetCalculator();
    
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