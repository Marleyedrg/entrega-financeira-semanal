import { getCurrentDate, showToast, checkDuplicateDelivery } from './utils.js';
import { 
  deliveries, 
  gasEntries, 
  saveDeliveries, 
  saveGasEntries,
  editDelivery,
  deleteDelivery,
  editGasEntry,
  deleteGasEntry,
  isEditing
} from './data.js';
import { finishWeek, backupData, clearAllData } from './export.js';
import { importCSV } from './import.js';
import { processImageForStorage, showImageModal } from './imageUtils.js';

// Função para manipular o envio do formulário de entregas
export function handleDeliveryFormSubmit(event) {
  event.preventDefault();
  
  const orderNumber = document.getElementById('orderNumber').value.trim();
  const fee = document.getElementById('fee').value;
  const date = document.getElementById('date').value;
  const imagePreview = document.getElementById('imagePreview');
  
  if (!orderNumber || !date) {
    showToast('Por favor, preencha todos os campos obrigatórios', 'error');
    return;
  }

  if (orderNumber.length === 0) {
    showToast('O número do pedido é obrigatório!', 'error');
    return;
  }

  // Só verifica duplicatas se não estiver em modo de edição
  if (!isEditing && checkDuplicateDelivery(orderNumber, date, deliveries)) {
    showToast('Já existe um pedido com este número registrado nesta data!', 'error');
    return;
  }
  
  // Obter a imagem e otimizar se necessário
  let image = imagePreview.querySelector('img')?.src || null;
  if (image && image.startsWith('data:image')) {
    image = image.replace(/^data:image\/\w+;base64,/, '');
  }
  
  const newDelivery = {
    date,
    orderNumber,
    fee: parseFloat(fee) || 0,
    image
  };
  
  deliveries.push(newDelivery);
  saveDeliveries();
  
  event.target.reset();
  imagePreview.innerHTML = '';
  document.getElementById('date').value = getCurrentDate();
  
  showToast('Entrega registrada com sucesso!', 'success');
}

// Função para configurar o formulário de entregas
export function setupDeliveryForm() {
  const deliveryForm = document.getElementById('deliveryForm');
  const uploadButton = document.getElementById('uploadButton');
  const imageInput = document.getElementById('image');
  const dateInput = document.getElementById('date');
  
  dateInput.value = getCurrentDate();
  
  // Remove qualquer handler existente
  deliveryForm.onsubmit = null;
  
  // Adiciona o novo handler
  deliveryForm.addEventListener('submit', handleDeliveryFormSubmit);
  
  uploadButton.addEventListener('click', () => {
    imageInput.click();
  });
  
  imageInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const imagePreview = document.getElementById('imagePreview');
        imagePreview.innerHTML = `<div class="processing-indicator"></div> Processando imagem...`;
        showToast('Processando imagem...', 'info');
        
        const compressedImage = await processImageForStorage(file);
        
        if (compressedImage) {
          imagePreview.innerHTML = `
            <img src="${compressedImage}" alt="Preview" class="table-image" onclick="showImageModal(this.src)">
          `;
          showToast('Imagem carregada com sucesso!', 'success');
        }
      } catch (error) {
        document.getElementById('imagePreview').innerHTML = '';
        showToast('Erro ao processar a imagem', 'error');
        console.error(error);
      }
    }
  });
}

// Função para configurar o formulário de gasolina
export function setupGasForm() {
  const gasForm = document.getElementById('gasForm');
  const gasDateInput = document.getElementById('gasDate');
  const gasImageInput = document.getElementById('gasImage');
  const gasUploadButton = document.getElementById('gasUploadButton');
  
  gasDateInput.value = getCurrentDate();
  
  gasForm.addEventListener('submit', handleGasFormSubmit);

  gasUploadButton.addEventListener('click', () => {
    gasImageInput.click();
  });
  
  gasImageInput.addEventListener('change', async (event) => {
    try {
      const imagePreview = document.getElementById('gasImagePreview');
      imagePreview.innerHTML = `<div class="processing-indicator"></div> Processando imagem...`;
      showToast('Processando imagem...', 'info');
      
      const file = event.target.files[0];
      const compressedImage = await processImageForStorage(file);
      
      if (compressedImage) {
        imagePreview.innerHTML = `
          <img src="${compressedImage}" alt="Preview" class="table-image" onclick="showImageModal(this.src)">
        `;
        showToast('Imagem carregada com sucesso!', 'success');
      }
    } catch (error) {
      document.getElementById('gasImagePreview').innerHTML = '';
      showToast('Erro ao processar a imagem', 'error');
      console.error(error);
    }
  });
}

// Função para configurar os formulários de edição
export function setupEditForms() {
  const modal = document.getElementById('imageModal');
  const closeButton = modal.querySelector('.close');
  
  closeButton.addEventListener('click', closeImageModal);
  
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeImageModal();
    }
  });
  
  const finishWeekButton = document.getElementById('finishWeekButton');
  if (finishWeekButton) {
    finishWeekButton.addEventListener('click', finishWeek);
    finishWeekButton.title = "Exportar dados e limpar todas as entregas";
  }

  const backupButton = document.getElementById('backupButton');
  if (backupButton) {
    backupButton.addEventListener('click', backupData);
    backupButton.title = "Fazer backup sem limpar os dados";
  }

  const clearDataButton = document.getElementById('clearDataButton');
  if (clearDataButton) {
    clearDataButton.addEventListener('click', clearAllData);
    clearDataButton.title = "Limpar todos os dados sem exportá-los";
  }

  const importButton = document.getElementById('importButton');
  const csvInput = document.getElementById('csvInput');
  
  if (importButton && csvInput) {
    importButton.addEventListener('click', () => {
      csvInput.click();
    });
    
    csvInput.addEventListener('change', importCSV);
  }

  const analyticsCSVInput = document.getElementById("analyticsCSVInput");
  if (analyticsCSVInput) {
    analyticsCSVInput.addEventListener("change", importCSV);
  }

  window.editDelivery = editDelivery;
  window.deleteDelivery = deleteDelivery;
  window.editGasEntry = editGasEntry;
  window.deleteGasEntry = deleteGasEntry;
  window.showImageModal = showImageModal;
}

// Função para configurar as tabs
export function setupTabs() {
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      switchTab(tabId);

      if (tabId === 'analytics' && !localStorage.getItem('deliveries')) {
        setTimeout(() => {
          showToast("Importe um arquivo CSV para visualizar a análise de dados", "info");
        }, 500);
      }
    });
  });
  
  switchTab('register');
}

// Função para alternar entre as abas
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.remove('active');
  });
  
  document.getElementById(tabId).classList.add('active');
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
}

// Função para manipular o envio do formulário de gasolina
function handleGasFormSubmit(event) {
  event.preventDefault();
  
  const date = document.getElementById('gasDate').value;
  const amount = document.getElementById('gasAmount').value;
  const imagePreview = document.getElementById('gasImagePreview');
  
  if (!date || !amount) {
    showToast('Por favor, preencha todos os campos obrigatórios', 'error');
    return;
  }
  
  // Obter a imagem e otimizar se necessário
  let image = imagePreview.querySelector('img')?.src || null;
  if (image && image.startsWith('data:image')) {
    image = image.replace(/^data:image\/\w+;base64,/, '');
  }
  
  const newGasEntry = {
    date,
    amount: parseFloat(amount) || 0,
    image
  };
  
  gasEntries.push(newGasEntry);
  saveGasEntries();
  
  event.target.reset();
  imagePreview.innerHTML = '';
  document.getElementById('gasDate').value = getCurrentDate();
  
  showToast('Abastecimento registrado com sucesso!', 'success');
}

// Função para fechar o modal de imagem
function closeImageModal() {
  const modal = document.getElementById('imageModal');
  modal.classList.remove('show');
  
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
} 