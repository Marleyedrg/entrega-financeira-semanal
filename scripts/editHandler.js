import { 
  deliveries, 
  saveDeliveries, 
  getDeliveryById,
  updateDelivery 
} from './data.js';
import { showToast, getCurrentDate } from './utils.js';
import { processImageForStorage } from './imageUtils.js';

// Estado do editor
const state = {
  currentEditId: null,
  isEditing: false,
  hasUnsavedChanges: false
};

let scrollPosition = 0;

export function isEditing() {
  return state.isEditing;
}

function setUnsavedChanges(hasChanges) {
  state.hasUnsavedChanges = hasChanges;
  const notice = document.getElementById('unsavedChangesNotice');
  if (notice) {
    notice.classList.toggle('active', hasChanges);
  }
}

export function startEditing(deliveryId) {
  const delivery = deliveries.find(d => d.id === deliveryId);
  if (!delivery) return;

  // Store current scroll position
  scrollPosition = window.pageYOffset;
  document.body.classList.add('modal-open');
  document.body.style.top = `-${scrollPosition}px`;

  state.currentEditId = deliveryId;
  state.isEditing = true;
  setUnsavedChanges(false);

  // Populate form fields
  document.getElementById('editOrderNumber').value = delivery.orderNumber;
  document.getElementById('editFee').value = delivery.fee || '';
  document.getElementById('editDate').value = delivery.date;
  
  // Clear previous errors
  document.getElementById('editOrderNumberError').textContent = '';
  document.getElementById('editDateError').textContent = '';
  document.getElementById('editImageError').textContent = '';
  
  // Show image preview if exists
  const imagePreview = document.getElementById('editImagePreview');
  imagePreview.innerHTML = '';
  if (delivery.image) {
    const img = document.createElement('img');
    img.src = `data:image/jpeg;base64,${delivery.image}`;
    img.alt = 'Preview';
    img.className = 'preview-image';
    imagePreview.appendChild(img);
  }
  
  const modal = document.getElementById('editModal');
  modal.classList.add('active');
  
  // Focus on first input after modal animation
  setTimeout(() => {
    document.getElementById('editOrderNumber').focus();
  }, 100);

  // Configura os event listeners
  setupEditListeners();
}

function setupEditListeners() {
  const editForm = document.getElementById('editForm');
  const cancelButton = document.getElementById('cancelEdit');
  const uploadButton = document.getElementById('editUploadButton');
  const imageInput = document.getElementById('editImage');
  const modal = document.getElementById('editModal');
  const formInputs = editForm.querySelectorAll('input');

  // Remove listeners existentes para evitar duplicação
  editForm.removeEventListener('submit', handleEditSubmit);
  cancelButton.removeEventListener('click', handleCancelEdit);
  modal.removeEventListener('click', handleModalClick);
  uploadButton.removeEventListener('click', handleUploadClick);
  imageInput.removeEventListener('change', handleImageChange);

  // Adiciona novos listeners
  editForm.addEventListener('submit', handleEditSubmit);
  cancelButton.addEventListener('click', handleCancelEdit);
  modal.addEventListener('click', handleModalClick);
  uploadButton.addEventListener('click', handleUploadClick);
  imageInput.addEventListener('change', handleImageChange);

  // Monitora mudanças no formulário
  formInputs.forEach(input => {
    input.addEventListener('change', () => setUnsavedChanges(true));
    input.addEventListener('input', () => setUnsavedChanges(true));
  });

  // Configura função global para limpar imagem
  window.clearEditImage = () => {
    document.getElementById('editImagePreview').innerHTML = '';
    document.getElementById('editImageError').textContent = 'O comprovante é obrigatório';
    setUnsavedChanges(true);
  };
}

function handleUploadClick() {
  document.getElementById('editImage').click();
}

function handleModalClick(event) {
  const modal = document.getElementById('editModal');
  if (event.target === modal) {
    if (state.hasUnsavedChanges) {
      const unsavedChangesNotice = document.getElementById('unsavedChangesNotice');
      unsavedChangesNotice.classList.add('active');
      
      // Adiciona um timeout para remover a notificação
      setTimeout(() => {
        unsavedChangesNotice.classList.remove('active');
      }, 3000);
      return;
    }
    cancelEdit();
  }
}

async function handleImageChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const imagePreview = document.getElementById('editImagePreview');
    const imageError = document.getElementById('editImageError');
    
    // Limpa mensagens de erro anteriores
    imageError.textContent = '';
    imagePreview.innerHTML = `<div class="processing-indicator">Processando imagem...</div>`;
    
    const compressedImage = await processImageForStorage(file);
    
    if (compressedImage) {
      imagePreview.innerHTML = `
        <div class="image-preview-item">
          <img src="${compressedImage}" 
               alt="Preview" 
               class="preview-image">
          <button type="button" class="delete-image" onclick="clearEditImage()">×</button>
        </div>
      `;
      setUnsavedChanges(true);
    } else {
      imagePreview.innerHTML = '';
      imageError.textContent = 'Erro ao processar a imagem. Tente novamente.';
    }
  } catch (error) {
    document.getElementById('editImagePreview').innerHTML = '';
    document.getElementById('editImageError').textContent = 'Erro ao processar a imagem. Verifique o tamanho e formato.';
    console.error(error);
  }
}

export async function handleEditSubmit(event) {
  event.preventDefault();
  
  const orderNumber = document.getElementById('editOrderNumber').value.trim();
  const fee = document.getElementById('editFee').value;
  const date = document.getElementById('editDate').value;
  const imagePreview = document.getElementById('editImagePreview');
  const image = imagePreview.querySelector('img')?.src;
  
  // Validation
  let hasError = false;
  
  if (!orderNumber) {
    document.getElementById('editOrderNumberError').textContent = 'O número do pedido é obrigatório';
    hasError = true;
  }
  
  if (!date) {
    document.getElementById('editDateError').textContent = 'A data é obrigatória';
    hasError = true;
  }
  
  if (!image) {
    document.getElementById('editImageError').textContent = 'O comprovante é obrigatório';
    hasError = true;
  }
  
  if (hasError) return;
  
  // Check for duplicates (excluding current delivery)
  if (checkDuplicateDelivery(orderNumber, date, deliveries.filter(d => d.id !== state.currentEditId))) {
    showToast('Já existe um pedido com este número registrado nesta data!', 'error');
    return;
  }
  
  // Process image
  const processedImage = image ? image.replace(/^data:image\/\w+;base64,/, '') : null;
  
  // Update delivery
  const index = deliveries.findIndex(d => d.id === state.currentEditId);
  if (index !== -1) {
    deliveries[index] = {
      ...deliveries[index],
      orderNumber,
      fee: parseFloat(fee) || 0,
      date,
      image: processedImage
    };
    
    saveDeliveries();
    updateDeliveriesTable();
    updateTotals();
    renderAnalytics();
    
    showToast('Entrega atualizada com sucesso!', 'success');
    
    // Close modal and restore scroll
    cancelEdit();
    
    // Refresh the table
    renderDeliveryTable();
  }
}

export function handleCancelEdit() {
  if (state.hasUnsavedChanges) {
    if (confirm('Existem alterações não salvas. Deseja realmente sair?')) {
      cancelEdit();
    }
  } else {
    cancelEdit();
  }
}

export function cancelEdit() {
  const modal = document.getElementById('editModal');
  modal.classList.remove('active');
  document.body.classList.remove('modal-open');
  document.body.style.top = '';
  window.scrollTo(0, scrollPosition);
  
  state.currentEditId = null;
  state.isEditing = false;
  setUnsavedChanges(false);
  
  // Clear form
  document.getElementById('editForm').reset();
  document.getElementById('editImagePreview').innerHTML = '';
} 