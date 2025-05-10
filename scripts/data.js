import { formatCurrency, formatDate, showToast, getCurrentDate, checkDuplicateDelivery } from './utils.js';
import { renderAnalytics } from './analytics.js';
import { formatImageDisplay } from './imageUtils.js';

// Variáveis globais para armazenar os dados
export let deliveries = JSON.parse(localStorage.getItem('deliveries')) || [];
export let gasEntries = JSON.parse(localStorage.getItem('gasEntries')) || [];

// Função para salvar entregas no localStorage
export function saveDeliveries() {
  localStorage.setItem('deliveries', JSON.stringify(deliveries));
  updateDeliveriesTable();
  updateTotals();
}

// Função para obter uma entrega por ID
export function getDeliveryById(id) {
  return deliveries.find(delivery => delivery.id === id) || null;
}

// Função para atualizar uma entrega existente
export function updateDelivery(id, updatedDelivery) {
  const index = deliveries.findIndex(delivery => delivery.id === id);
  if (index === -1) {
    throw new Error('Pedido não encontrado');
  }

  // Garante que a data seja uma string no formato YYYY-MM-DD
  const date = new Date(updatedDelivery.date);
  const formattedDate = date.toISOString().split('T')[0];

  deliveries[index] = {
    ...deliveries[index],
    ...updatedDelivery,
    date: formattedDate,
    id: id // Mantém o ID original
  };

  saveDeliveries();
  return deliveries[index];
}

// Função para adicionar uma nova entrega
export function addDelivery(delivery) {
  const date = new Date(delivery.date);
  const formattedDate = date.toISOString().split('T')[0];

  const newDelivery = {
    ...delivery,
    id: String(Date.now()),
    date: formattedDate,
    fee: parseFloat(delivery.fee) || 0
  };

  deliveries.push(newDelivery);
  saveDeliveries();
  return newDelivery;
}

// Função para salvar registros de gasolina no localStorage
export function saveGasEntries() {
  localStorage.setItem('gasEntries', JSON.stringify(gasEntries));
  updateGasTable();
  updateTotals();
}

// Função para carregar entregas do localStorage
export function loadDeliveries() {
  try {
    const savedDeliveries = localStorage.getItem('deliveries');
    if (savedDeliveries) {
      deliveries = JSON.parse(savedDeliveries).map(delivery => ({
        ...delivery,
        fee: parseFloat(delivery.fee) || 0,
        id: delivery.id || String(Date.now()),
        date: new Date(delivery.date).toISOString().split('T')[0] // Normaliza a data
      }));
    } else {
      deliveries = [];
    }
    // Ordena as entregas por data (mais recentes primeiro)
    deliveries.sort((a, b) => new Date(b.date) - new Date(a.date));
    updateDeliveriesTable();
  } catch (error) {
    console.error('Erro ao carregar entregas:', error);
    showToast('Erro ao carregar entregas', 'error');
    deliveries = [];
    updateDeliveriesTable();
  }
}

// Função para carregar registros de gasolina do localStorage
export function loadGasEntries() {
  try {
    const savedGasEntries = localStorage.getItem('gasEntries');
    if (savedGasEntries) {
      gasEntries = JSON.parse(savedGasEntries).map(entry => ({
        ...entry,
        amount: parseFloat(entry.amount) || 0,
        id: entry.id || String(Date.now())
      }));
    } else {
      gasEntries = [];
    }
    updateGasTable();
  } catch (error) {
    console.error('Erro ao carregar registros de gasolina:', error);
    showToast('Erro ao carregar registros de gasolina', 'error');
    gasEntries = [];
    updateGasTable();
  }
}

// Função para atualizar os totais
export function updateTotals() {
  let totalFees = deliveries.reduce((sum, delivery) => {
    return sum + (parseFloat(delivery.fee) || 0);
  }, 0);
  
  let totalGas = gasEntries.reduce((sum, entry) => {
    return sum + (parseFloat(entry.amount) || 0);
  }, 0);
  
  document.getElementById('totalFees').textContent = formatCurrency(totalFees);
  document.getElementById('totalGas').textContent = formatCurrency(totalGas);
  
  const netProfit = totalFees - totalGas;
  const netProfitElement = document.getElementById('netProfit');
  netProfitElement.textContent = formatCurrency(netProfit);
  netProfitElement.className = netProfit >= 0 ? 'total-profit' : 'total-loss';
  
  renderAnalytics();
}

// Função para atualizar a tabela de entregas
export function updateDeliveriesTable() {
  const table = document.getElementById('deliveriesTable').getElementsByTagName('tbody')[0];
  table.innerHTML = '';
  
  deliveries.forEach((delivery, index) => {
    const row = createTableRow(delivery);
    table.appendChild(row);
  });
  renderAnalytics();
}

// Função para atualizar a tabela de gasolina
export function updateGasTable() {
  const table = document.getElementById('gasTable').getElementsByTagName('tbody')[0];
  table.innerHTML = '';
  
  gasEntries.forEach((entry, index) => {
    const row = createGasTableRow(entry);
    table.appendChild(row);
  });
  renderAnalytics();
}

function createTableRow(delivery) {
    const row = document.createElement('tr');
    
    // Formatar a data
    const date = new Date(delivery.date);
    const formattedDate = date.toLocaleDateString('pt-BR');
    
    // Formatar a taxa, garantindo que seja um número
    const fee = parseFloat(delivery.fee) || 0;
    
    // Criar células
    row.innerHTML = `
        <td>${formattedDate}</td>
        <td>${delivery.orderNumber}</td>
        <td>R$ ${fee.toFixed(2)}</td>
        <td>
            ${delivery.image ? `
                <img src="data:image/jpeg;base64,${delivery.image}" 
                     alt="Comprovante" 
                     class="table-image"
                     onclick="showImageModal(this.src)">
            ` : 'Sem imagem'}
        </td>
        <td class="actions">
            <button onclick="editDelivery('${delivery.id}')" class="button outline">
                Editar
            </button>
            <button onclick="deleteDelivery('${delivery.id}')" class="button outline delete">
                Excluir
            </button>
        </td>
    `;
    
    return row;
}

function createGasTableRow(entry) {
  const row = document.createElement('tr');
  
  // Formatar a data
  const date = new Date(entry.date);
  const formattedDate = date.toLocaleDateString('pt-BR');
  
  // Formatar o valor
  const amount = parseFloat(entry.amount) || 0;
  
  row.innerHTML = `
    <td data-label="Data">${formattedDate}</td>
    <td data-label="Valor">R$ ${amount.toFixed(2)}</td>
    <td data-label="Ações">
      <div class="table-actions">
        <button onclick="deleteGasEntry(${entry.id})" class="button outline delete">
          Excluir
        </button>
      </div>
    </td>
  `;
  
  return row;
}

export function deleteDelivery(id) {
  // Confirma com o usuário antes de excluir
  if (!confirm('Tem certeza que deseja excluir este pedido?')) {
    return;
  }

  const index = deliveries.findIndex(delivery => delivery.id === id);
  if (index === -1) {
    showToast('Pedido não encontrado', 'error');
    return;
  }

  deliveries.splice(index, 1);
  saveDeliveries();
  showToast('Entrega excluída com sucesso!', 'success');
  
  // Atualiza a interface
  updateDeliveriesTable();
  updateTotals();
}

export function deleteGasEntry(id) {
  const index = gasEntries.findIndex(entry => entry.id === id);
  if (index !== -1) {
    gasEntries.splice(index, 1);
    saveGasEntries();
    showToast('Registro de gasolina excluído com sucesso!', 'success');
  } else {
    showToast('Registro não encontrado', 'error');
  }
}

export function importData(jsonData) {
  try {
    const data = JSON.parse(jsonData);
    if (data.deliveries) {
      deliveries = data.deliveries;
      saveDeliveries();
    }
    if (data.gasEntries) {
      gasEntries = data.gasEntries;
      saveGasEntries();
    }
    updateDeliveriesTable();
    updateGasTable();
    updateTotals();
    renderAnalytics();
    showToast('Dados importados com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao importar dados:', error);
    showToast('Erro ao importar dados. Verifique o formato do arquivo.', 'error');
  }
} 