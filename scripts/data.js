import { formatCurrency, formatDate, showToast, getCurrentDate, checkDuplicateDelivery } from './utils.js';
import { renderAnalytics } from './analytics.js';

// Variáveis globais para armazenar os dados
export let deliveries = JSON.parse(localStorage.getItem('deliveries')) || [];
export let gasEntries = JSON.parse(localStorage.getItem('gasEntries')) || [];
export let isEditing = false; // Flag para controlar quando estamos em modo de edição

// Função para salvar entregas no localStorage
export function saveDeliveries() {
  localStorage.setItem('deliveries', JSON.stringify(deliveries));
  updateDeliveriesTable();
  updateTotals();
}

// Função para salvar registros de gasolina no localStorage
export function saveGasEntries() {
  localStorage.setItem('gasEntries', JSON.stringify(gasEntries));
  updateGasTable();
  updateTotals();
}

// Função para carregar entregas do localStorage
export function loadDeliveries() {
  const savedDeliveries = localStorage.getItem('deliveries');
  if (savedDeliveries) {
    deliveries = JSON.parse(savedDeliveries);
    updateDeliveriesTable();
  }
}

// Função para carregar entradas de gasolina do localStorage
export function loadGasEntries() {
  const savedGasEntries = localStorage.getItem('gasEntries');
  if (savedGasEntries) {
    gasEntries = JSON.parse(savedGasEntries);
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
    const row = table.insertRow();
    row.innerHTML = `
      <td data-label="Data">${formatDate(delivery.date)}</td>
      <td data-label="Pedido">${delivery.orderNumber}</td>
      <td data-label="Taxa">R$ ${formatCurrency(parseFloat(delivery.fee) || 0)}</td>
      <td data-label="Status">${delivery.fee ? '' : '<span style="text-decoration: underline;">Pendente</span>'}</td>
      <td data-label="Comprovante">
        ${delivery.image ? `<img src="${delivery.image}" alt="Preview" class="table-image" onclick="showImageModal(this.src)">` : 'Sem comprovante'}
      </td>
      <td data-label="Ações">
        <div class="table-actions">
          <button class="button outline edit-button" onclick="editDelivery(${index})">Editar</button>
          <button class="button outline delete-button" onclick="deleteDelivery(${index})">Excluir</button>
        </div>
      </td>
    `;
  });
  renderAnalytics();
}

// Função para atualizar a tabela de gasolina
export function updateGasTable() {
  const table = document.getElementById('gasTable').getElementsByTagName('tbody')[0];
  table.innerHTML = '';
  
  gasEntries.forEach((entry, index) => {
    const row = table.insertRow();
    row.innerHTML = `
      <td data-label="Data">${formatDate(entry.date)}</td>
      <td data-label="Valor">R$ ${formatCurrency(parseFloat(entry.amount) || 0)}</td>
      <td data-label="Comprovante">
        ${entry.image ? `<img src="${entry.image}" alt="Preview" class="table-image" onclick="showImageModal(this.src)">` : 'Sem comprovante'}
      </td>
      <td data-label="Ações">
        <div class="table-actions">
          <button class="button outline edit-button" onclick="editGasEntry(${index})">Editar</button>
          <button class="button outline delete-button" onclick="deleteGasEntry(${index})">Excluir</button>
        </div>
      </td>
    `;
  });
  renderAnalytics();
}

// Funções de edição e exclusão
export function editDelivery(index) {
  const delivery = deliveries[index];
  
  document.getElementById('orderNumber').value = delivery.orderNumber;
  document.getElementById('fee').value = delivery.fee;
  document.getElementById('date').value = delivery.date;
  
  const imagePreview = document.getElementById('imagePreview');
  if (delivery.image) {
    imagePreview.innerHTML = `<img src="${delivery.image}" alt="Preview" class="table-image" onclick="showImageModal(this.src)">`;
  } else {
    imagePreview.innerHTML = '';
  }
  
  const form = document.getElementById('deliveryForm');
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.textContent = 'Salvar Edição';
  
  // Antes de definir o novo handler, vamos ativar o modo de edição
  isEditing = true;
  
  const originalSubmitHandler = form.onsubmit;
  
  form.onsubmit = (event) => {
    event.preventDefault();
    
    const newOrderNumber = document.getElementById('orderNumber').value.trim();
    const newDate = document.getElementById('date').value;
    
    // Atualize os dados sem verificar duplicatas durante edição
    delivery.orderNumber = newOrderNumber;
    delivery.fee = parseFloat(document.getElementById('fee').value) || 0;
    delivery.date = newDate;
    delivery.image = imagePreview.querySelector('img')?.src || null;
    
    saveDeliveries();
    
    // Desativar o modo de edição após salvar
    isEditing = false;
    
    form.reset();
    imagePreview.innerHTML = '';
    submitButton.textContent = 'Registrar Entrega';
    
    // Restaura o formulário ao estado original
    form.onsubmit = originalSubmitHandler;
    document.getElementById('date').value = getCurrentDate();
    
    showToast('Entrega atualizada com sucesso!', 'success');
  };
}

export function deleteDelivery(index) {
  deliveries.splice(index, 1);
  saveDeliveries();
  showToast('Entrega excluída com sucesso!', 'success');
}

export function editGasEntry(index) {
  const entry = gasEntries[index];
  
  document.getElementById('gasDate').value = entry.date;
  document.getElementById('gasAmount').value = entry.amount;
  
  const imagePreview = document.getElementById('gasImagePreview');
  if (entry.image) {
    imagePreview.innerHTML = `<img src="${entry.image}" alt="Preview" class="table-image" onclick="showImageModal(this.src)">`;
  } else {
    imagePreview.innerHTML = '';
  }
  
  const form = document.getElementById('gasForm');
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.textContent = 'Salvar Edição';
  
  form.onsubmit = (event) => {
    event.preventDefault();
    
    entry.date = document.getElementById('gasDate').value;
    entry.amount = parseFloat(document.getElementById('gasAmount').value) || 0;
    entry.image = imagePreview.querySelector('img')?.src || null;
    
    saveGasEntries();
    
    form.reset();
    imagePreview.innerHTML = '';
    submitButton.textContent = 'Registrar Abastecimento';
    form.onsubmit = handleGasFormSubmit;
    document.getElementById('gasDate').value = getCurrentDate();
    
    showToast('Registro de gasolina atualizado com sucesso!', 'success');
  };
}

export function deleteGasEntry(index) {
  gasEntries.splice(index, 1);
  saveGasEntries();
  showToast('Registro de gasolina excluído com sucesso!', 'success');
} 