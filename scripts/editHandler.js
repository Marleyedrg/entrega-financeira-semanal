import { showToast } from './utils.js';
import { processImageForStorage } from './imageUtils.js';
import { getOrderById, updateOrder } from './orderManager.js';
import { updateDeliveriesTable } from './data.js';

// Estado do editor
const state = {
  currentEditId: null,
  isEditing: false,
  hasUnsavedChanges: false,
  isProcessingImage: false // Flag to track if image is currently being processed
};

let scrollPosition = 0;

// Debounce function to prevent multiple rapid calls
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

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

export function startEditing(orderId) {
  const order = getOrderById(orderId);
  if (!order) {
    showToast('Pedido não encontrado', 'error');
    return;
  }

  // Store current scroll position
  scrollPosition = window.pageYOffset;
  document.body.classList.add('modal-open');
  document.body.style.top = `-${scrollPosition}px`;

  state.currentEditId = orderId;
  state.isEditing = true;
  state.isProcessingImage = false;
  setUnsavedChanges(false);

  // Populate form fields
  document.getElementById('editOrderNumber').value = order.orderNumber;
  document.getElementById('editFee').value = order.fee || '';
  document.getElementById('editDate').value = order.date;
  
  // Marcar checkbox de status com base no status atual
  const statusCheckbox = document.getElementById('editStatus');
  if (statusCheckbox) {
    // Se tem valor na taxa mas status é pendente, marcar o checkbox
    const hasFee = parseFloat(order.fee) > 0;
    const isPending = order.status === 'pending';
    statusCheckbox.checked = hasFee && isPending;
  }
  
  // Clear previous errors
  document.getElementById('editOrderNumberError').textContent = '';
  document.getElementById('editDateError').textContent = '';
  document.getElementById('editImageError').textContent = '';
  
  // Show image preview if exists
  const imagePreview = document.getElementById('editImagePreview');
  imagePreview.innerHTML = '';
  if (order.image) {
    const img = document.createElement('img');
    img.src = `data:image/jpeg;base64,${order.image}`;
    img.alt = 'Preview';
    img.className = 'preview-image';
    imagePreview.innerHTML = `
      <div class="image-preview-item">
        <img src="${img.src}" 
            alt="Preview" 
            class="preview-image">
        <button type="button" class="delete-image" onclick="clearEditImage()">×</button>
      </div>
    `;
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
  
  // Clone form inputs to remove existing listeners
  const newEditForm = editForm.cloneNode(true);
  editForm.parentNode.replaceChild(newEditForm, editForm);
  
  const newCancelButton = document.getElementById('cancelEdit');
  const newUploadButton = document.getElementById('editUploadButton');
  const newImageInput = document.getElementById('editImage');
  
  // Get all form inputs after cloning
  const formInputs = newEditForm.querySelectorAll('input');

  // Add new listeners
  newEditForm.addEventListener('submit', handleEditSubmit);
  newCancelButton.addEventListener('click', handleCancelEdit);
  
  // Add modal click listener
  modal.addEventListener('click', handleModalClick);
  
  // Setup image upload with debouncing
  newUploadButton.addEventListener('click', () => {
    // Only trigger click if not currently processing
    if (!state.isProcessingImage) {
      // Clear the input value to ensure change event triggers even with the same file
      newImageInput.value = '';
      newImageInput.click();
    } else {
      showToast('Aguarde o processamento da imagem atual...', 'info');
    }
  });
  
  // Use debounced handler to prevent multiple rapid calls
  newImageInput.addEventListener('change', debouncedImageChange);

  // Monitora mudanças no formulário
  formInputs.forEach(input => {
    input.addEventListener('change', () => setUnsavedChanges(true));
    input.addEventListener('input', () => setUnsavedChanges(true));
  });

  // Configura função global para limpar imagem
  window.clearEditImage = () => {
    const imagePreview = document.getElementById('editImagePreview');
    const imageError = document.getElementById('editImageError');
    
    if (imagePreview) imagePreview.innerHTML = '';
    // Imagem não é mais obrigatória
    setUnsavedChanges(true);
  };
}

function handleUploadClick() {
  const imageInput = document.getElementById('editImage');
  
  // Only proceed if not currently processing
  if (!state.isProcessingImage && imageInput) {
    imageInput.click();
  } else {
    showToast('Aguarde o processamento da imagem atual...', 'info');
  }
}

function handleModalClick(event) {
  const modal = document.getElementById('editModal');
  if (event.target === modal) {
    if (state.hasUnsavedChanges) {
      const unsavedChangesNotice = document.getElementById('unsavedChangesNotice');
      unsavedChangesNotice.classList.add('active');
      
      setTimeout(() => {
        unsavedChangesNotice.classList.remove('active');
      }, 3000);
      return;
    }
    cancelEdit();
  }
}

async function handleImageChange(event) {
  // Check if already processing
  if (state.isProcessingImage) {
    console.log('Já existe um processamento de imagem em andamento, aguardando...');
    return;
  }

  const file = event.target.files?.[0];
  if (!file) return;

  try {
    state.isProcessingImage = true;
    
    const imagePreview = document.getElementById('editImagePreview');
    const imageError = document.getElementById('editImageError');
    const imageInput = document.getElementById('editImage');
    
    // Reset file input to prevent issues with selecting the same file again
    if (imageInput) {
      // Clone and replace to ensure clean state
      const newInput = imageInput.cloneNode(true);
      imageInput.parentNode.replaceChild(newInput, imageInput);
      // Add event listener to the new input
      newInput.addEventListener('change', debouncedImageChange);
    }
    
    if (imageError) imageError.textContent = '';
    if (imagePreview) imagePreview.innerHTML = `<div class="processing-indicator">Processando imagem...</div>`;
    
    const compressedImage = await processImageForStorage(file);
    
    if (compressedImage && imagePreview) {
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
      if (imagePreview) imagePreview.innerHTML = '';
      if (imageError) imageError.textContent = 'Erro ao processar a imagem. Tente novamente.';
    }
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    
    const imagePreview = document.getElementById('editImagePreview');
    const imageError = document.getElementById('editImageError');
    
    if (imagePreview) imagePreview.innerHTML = '';
    if (imageError) imageError.textContent = 'Erro ao processar a imagem. Verifique o tamanho e formato.';
  } finally {
    state.isProcessingImage = false;
  }
}

// Create debounced version of image change handler
const debouncedImageChange = debounce(handleImageChange, 300);

export async function handleEditSubmit(event) {
  event.preventDefault();
  
  const orderNumber = document.getElementById('editOrderNumber').value.trim();
  const fee = document.getElementById('editFee').value;
  const date = document.getElementById('editDate').value;
  const imagePreview = document.getElementById('editImagePreview');
  const image = imagePreview.querySelector('img')?.src;
  
  // Obter o valor do checkbox de status
  const forcePending = document.getElementById('editStatus')?.checked || false;
  
  try {
    // Process image
    const processedImage = image ? image.replace(/^data:image\/\w+;base64,/, '') : null;
    
    // Determine status based on fee and checkbox
    const feeValue = parseFloat(fee) || 0;
    const status = forcePending ? 'pending' : (feeValue > 0 ? 'completed' : 'pending');
    
    // Update order
    const updatedOrder = await updateOrder(state.currentEditId, {
      orderNumber,
      fee,
      date,
      image: processedImage,
      status // Include the status in the update data
    });
    
    showToast('Pedido atualizado com sucesso!', 'success');
    
    // Close modal and restore scroll
    cancelEdit();
    
    // Refresh the table
    updateDeliveriesTable();
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error);
    showToast(error.message, 'error');
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
  state.isProcessingImage = false;
  setUnsavedChanges(false);
  
  // Clear form
  document.getElementById('editForm').reset();
  document.getElementById('editImagePreview').innerHTML = '';
} 