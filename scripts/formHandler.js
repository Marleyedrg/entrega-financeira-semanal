import { showToast, getCurrentDate } from './utils.js';
import { processImageForStorage } from './imageUtils.js';
import { createOrder, isOrderNumberTaken, getOrdersByDate } from './orderManager.js';
import { 
  updateDeliveriesTable,
  updateTotals,
  saveDeliveries,
  loadDeliveries,
  updateGasTable,
  saveGasEntries,
  gasEntries
} from './data.js';
import { renderAnalytics } from './analytics.js';
import { smartDatePreservation, addQuickDateSelector } from './datePreservation.js';

/**
 * Manipula o envio do formulário de pedidos
 * @param {Event} event - Evento de submit do formulário
 */
export async function handleOrderFormSubmit(event) {
  event.preventDefault();
  
  const orderNumber = document.getElementById('orderNumber').value.trim();
  const fee = document.getElementById('fee').value.trim();
  const date = document.getElementById('date').value;
  const imagePreview = document.getElementById('imagePreview');
  const image = imagePreview.querySelector('img')?.src;
  
  try {
    // Verifica duplicata antes de prosseguir
    if (isOrderNumberTaken(orderNumber, date)) {
      const existingOrders = getOrdersByDate(date);
      const duplicateOrder = existingOrders.find(order => order.orderNumber === orderNumber);
      
      const shouldEdit = confirm(
        `Já existe um pedido #${orderNumber} registrado em ${date}.\n` +
        `Taxa: R$ ${duplicateOrder.fee}\n\n` +
        `Deseja editar o pedido existente?`
      );
      
      if (shouldEdit) {
        // Chama a função de edição
        window.editDelivery(duplicateOrder.id);
        return;
      } else {
        throw new Error('Operação cancelada. Escolha um número de pedido diferente.');
      }
    }

    // Process image if exists
    const processedImage = image ? image.replace(/^data:image\/\w+;base64,/, '') : null;
    
    // Create new order
    await createOrder({
      orderNumber,
      fee: fee === '' ? null : fee,
      date,
      image: processedImage
    });
    
    // Clear form but preserve the date intelligently
    const currentDateValue = document.getElementById('date').value;
    
    event.target.reset();
    imagePreview.innerHTML = '';
    document.getElementById('imageError').textContent = '';
    
    // Use smart date preservation
    smartDatePreservation('date', 'order');
    
    // Atualiza a interface
    loadDeliveries();
    renderAnalytics();
    
    showToast('Pedido registrado com sucesso!', 'success');
    
    // Remove the automatic page reload - it was causing data loss
    // The interface is already updated above with loadDeliveries() and renderAnalytics()
    console.log('New order saved successfully - interface updated without page reload');
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    showToast(error.message, 'error');
  }
}

/**
 * Manipula o envio do formulário de gastos
 * @param {Event} event - Evento de submit do formulário
 */
export function handleGasFormSubmit(event) {
  event.preventDefault();
  
  const amount = document.getElementById('gasAmount').value.trim();
  const date = document.getElementById('gasDate').value;
  const description = document.getElementById('gasDescription').value.trim();
  
  try {
    // Validação básica
    if (!amount || !date) {
      throw new Error('Data e valor são obrigatórios');
    }
    
    // Cria novo registro
    const newEntry = {
      id: String(Date.now()),
      amount: parseFloat(amount),
      date: date,
      description: description || 'Gasto'
    };
    
    // Adiciona ao array e salva
    gasEntries.push(newEntry);
    saveGasEntries();
    
    // Clear form but preserve the date intelligently
    event.target.reset();
    
    // Use smart date preservation for gas entries
    smartDatePreservation('gasDate', 'gas');
    
    // Atualiza a interface
    updateGasTable();
    updateTotals();
    renderAnalytics();
    
    showToast('Gasto registrado com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao adicionar gasto:', error);
    showToast(error.message, 'error');
  }
}

// Flag to track if image is currently being processed
let isProcessingImage = false;

// Debounce function to prevent multiple rapid calls
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Manipula o upload de imagem
 * @param {Event} event - Evento de change do input de arquivo
 */
export async function handleImageUpload(event) {
  // Check if already processing
  if (isProcessingImage) {
    console.log('Já existe um processamento de imagem em andamento, aguardando...');
    return;
  }

  const file = event.target.files?.[0];
  if (!file) return;
  
  try {
    isProcessingImage = true;
    
    const imagePreview = document.getElementById('imagePreview');
    const imageError = document.getElementById('imageError');
    const imageInput = document.getElementById('image');
    
    // Clear previous errors and show processing indicator
    if (imageError) imageError.textContent = '';
    if (imagePreview) imagePreview.innerHTML = `<div class="processing-indicator">Processando imagem...</div>`;
    
    // Clean up any previous preview images to free memory
    cleanupPreviousPreview();
    
    // Reset file input to prevent issues with selecting the same file again
    if (imageInput) {
      // Clone and replace to ensure clean state
      const newInput = imageInput.cloneNode(true);
      imageInput.parentNode.replaceChild(newInput, imageInput);
      // Add event listener to the new input
      newInput.addEventListener('change', debouncedImageUpload);
    }
    
    // Implement pre-validation checks for better memory management
    // Validate file size before processing - helps prevent OOM errors
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      imagePreview.innerHTML = '';
      throw new Error('Imagem muito grande. O tamanho máximo permitido é 10MB.');
    }
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      imagePreview.innerHTML = '';
      throw new Error('Tipo de arquivo não suportado. Use JPG, PNG ou WebP.');
    }
    
    // Process the image with a timeout to prevent UI freezing
    let processTimeout;
    const timeoutPromise = new Promise((_, reject) => {
      processTimeout = setTimeout(() => {
        reject(new Error('Tempo limite excedido ao processar a imagem. Tente uma imagem menor.'));
      }, 30000); // 30 second timeout
    });
    
    // Race between processing and timeout
    const compressedImage = await Promise.race([
      processImageForStorage(file),
      timeoutPromise
    ]).finally(() => {
      clearTimeout(processTimeout);
    });
    
    if (compressedImage) {
      // Clear any previous content
      imagePreview.innerHTML = '';
      
      // Create new preview
      const previewContainer = document.createElement('div');
      previewContainer.className = 'image-preview-item';
      
      const img = document.createElement('img');
      img.src = compressedImage;
      img.alt = 'Preview';
      img.className = 'preview-image';
      
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'delete-image';
      deleteButton.textContent = '×';
      deleteButton.onclick = function() {
        clearOrderImage();
        // Clean up memory after removing image
        if (img.src.startsWith('blob:')) {
          URL.revokeObjectURL(img.src);
        }
        img.src = '';
      };
      
      previewContainer.appendChild(img);
      previewContainer.appendChild(deleteButton);
      imagePreview.appendChild(previewContainer);
    } else {
      imagePreview.innerHTML = '';
      imageError.textContent = 'Erro ao processar a imagem. Tente novamente.';
    }
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    
    const imagePreview = document.getElementById('imagePreview');
    const imageError = document.getElementById('imageError');
    
    if (imagePreview) imagePreview.innerHTML = '';
    if (imageError) imageError.textContent = error.message || 'Erro ao processar a imagem. Verifique o tamanho e formato.';
  } finally {
    isProcessingImage = false;
    
    // Force garbage collection if possible
    setTimeout(() => {
      if (window.gc) {
        try { window.gc(); } catch (e) { /* Ignore errors */ }
      }
    }, 500);
  }
}

/**
 * Cleanup previous preview elements to prevent memory leaks
 */
function cleanupPreviousPreview() {
  const imagePreview = document.getElementById('imagePreview');
  if (!imagePreview) return;
  
  // Clean up any blob URLs from previous previews
  const previews = imagePreview.querySelectorAll('img');
  if (previews && previews.length) {
    previews.forEach(img => {
      if (img.src && img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
      }
      img.src = ''; // Clear the source
    });
  }
  
  // Clear the HTML
  imagePreview.innerHTML = '';
}

// Create debounced version of image upload handler
const debouncedImageUpload = debounce(handleImageUpload, 300);

/**
 * Configura os event listeners do formulário
 */
export function setupOrderForm() {
  const orderForm = document.getElementById('deliveryForm');
  const uploadButton = document.getElementById('uploadButton');
  const imageInput = document.getElementById('image');
  const orderNumber = document.getElementById('orderNumber');
  const date = document.getElementById('date');
  
  // Set current date as default
  date.value = getCurrentDate();
  
  // Add quick date selector for convenience
  setTimeout(() => addQuickDateSelector('date'), 100);
  
  // Remove existing listeners by replacing elements with clones
  if (orderForm) {
    const newOrderForm = orderForm.cloneNode(true);
    orderForm.parentNode.replaceChild(newOrderForm, orderForm);
    newOrderForm.addEventListener('submit', handleOrderFormSubmit);
  }
  
  // Get the new references after cloning
  const newUploadButton = document.getElementById('uploadButton');
  const newImageInput = document.getElementById('image');
  const newOrderNumber = document.getElementById('orderNumber');
  const newDate = document.getElementById('date');
  
  // Setup event listeners for new elements
  if (newUploadButton && newImageInput) {
    newUploadButton.addEventListener('click', () => {
      // Only trigger click if not currently processing
      if (!isProcessingImage) {
        // Clear the input value to ensure change event triggers even with the same file
        newImageInput.value = '';
        newImageInput.click();
      } else {
        showToast('Aguarde o processamento da imagem atual...', 'info');
      }
    });
    
    // Use debounced handler to prevent multiple rapid calls
    newImageInput.addEventListener('change', debouncedImageUpload);
  }
  
  // Adiciona validação em tempo real para número do pedido
  if (newOrderNumber && newDate) {
    newOrderNumber.addEventListener('input', () => {
      const number = newOrderNumber.value.trim();
      const currentDate = newDate.value;
      
      if (number && currentDate && isOrderNumberTaken(number, currentDate)) {
        newOrderNumber.classList.add('invalid');
        newOrderNumber.title = `Pedido #${number} já existe em ${currentDate}`;
      } else {
        newOrderNumber.classList.remove('invalid');
        newOrderNumber.title = '';
      }
    });
    
    // Atualiza validação quando a data muda
    newDate.addEventListener('change', () => {
      const number = newOrderNumber.value.trim();
      const currentDate = newDate.value;
      
      if (number && currentDate && isOrderNumberTaken(number, currentDate)) {
        newOrderNumber.classList.add('invalid');
        newOrderNumber.title = `Pedido #${number} já existe em ${currentDate}`;
      } else {
        newOrderNumber.classList.remove('invalid');
        newOrderNumber.title = '';
      }
    });
  }
  
  // Setup global image clear function
  window.clearOrderImage = () => {
    const imagePreview = document.getElementById('imagePreview');
    const imageError = document.getElementById('imageError');
    
    if (imagePreview) imagePreview.innerHTML = '';
    // Imagem não é mais obrigatória
  };
}

/**
 * Configura os event listeners do formulário de gastos
 */
export function setupGasForm() {
  const gasForm = document.getElementById('gasForm');
  
  // Set current date as default
  document.getElementById('gasDate').value = getCurrentDate();
  
  // Add quick date selector for gas form
  setTimeout(() => addQuickDateSelector('gasDate'), 100);
  
  // Remove existing listener
  gasForm.onsubmit = null;
  
  // Add new listener
  gasForm.addEventListener('submit', handleGasFormSubmit);
} 