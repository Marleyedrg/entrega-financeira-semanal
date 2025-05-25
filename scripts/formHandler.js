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
    
    // Clear form
    event.target.reset();
    imagePreview.innerHTML = '';
    document.getElementById('imageError').textContent = '';
    
    // Set current date
    document.getElementById('date').value = getCurrentDate();
    
    // Atualiza a interface
    loadDeliveries();
    renderAnalytics();
    
    showToast('Pedido registrado com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    showToast(error.message, 'error');
  }
}

/**
 * Manipula o envio do formulário de gasolina
 * @param {Event} event - Evento de submit do formulário
 */
export function handleGasFormSubmit(event) {
  event.preventDefault();
  
  const amount = document.getElementById('gasAmount').value.trim();
  const date = document.getElementById('gasDate').value;
  
  try {
    // Validação básica
    if (!amount || !date) {
      throw new Error('Todos os campos são obrigatórios');
    }
    
    // Cria novo registro
    const newEntry = {
      id: String(Date.now()),
      amount: parseFloat(amount),
      date: date
    };
    
    // Adiciona ao array e salva
    gasEntries.push(newEntry);
    saveGasEntries();
    
    // Limpa o formulário
    event.target.reset();
    document.getElementById('gasDate').value = getCurrentDate();
    
    // Atualiza a interface
    updateGasTable();
    updateTotals();
    renderAnalytics();
    
    showToast('Registro de gasolina adicionado com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao adicionar registro de gasolina:', error);
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
    
    // Reset file input to prevent issues with selecting the same file again
    if (imageInput) {
      // Clone and replace to ensure clean state
      const newInput = imageInput.cloneNode(true);
      imageInput.parentNode.replaceChild(newInput, imageInput);
      // Add event listener to the new input
      newInput.addEventListener('change', debouncedImageUpload);
    }
    
    // Clear previous errors and show processing indicator
    if (imageError) imageError.textContent = '';
    if (imagePreview) imagePreview.innerHTML = `<div class="processing-indicator">Processando imagem...</div>`;
    
    // Process the image
    const compressedImage = await processImageForStorage(file);
    
    if (compressedImage) {
      imagePreview.innerHTML = `
        <div class="image-preview-item">
          <img src="${compressedImage}" 
               alt="Preview" 
               class="preview-image">
          <button type="button" class="delete-image" onclick="clearOrderImage()">×</button>
        </div>
      `;
    } else {
      imagePreview.innerHTML = '';
      imageError.textContent = 'Erro ao processar a imagem. Tente novamente.';
    }
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    
    const imagePreview = document.getElementById('imagePreview');
    const imageError = document.getElementById('imageError');
    
    if (imagePreview) imagePreview.innerHTML = '';
    if (imageError) imageError.textContent = 'Erro ao processar a imagem. Verifique o tamanho e formato.';
  } finally {
    isProcessingImage = false;
  }
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
    if (imageError) imageError.textContent = 'O comprovante é obrigatório';
  };
}

/**
 * Configura os event listeners do formulário de gasolina
 */
export function setupGasForm() {
  const gasForm = document.getElementById('gasForm');
  
  // Set current date as default
  document.getElementById('gasDate').value = getCurrentDate();
  
  // Remove existing listener
  gasForm.onsubmit = null;
  
  // Add new listener
  gasForm.addEventListener('submit', handleGasFormSubmit);
} 