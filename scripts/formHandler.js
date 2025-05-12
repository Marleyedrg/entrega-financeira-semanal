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

/**
 * Manipula o upload de imagem
 * @param {Event} event - Evento de change do input de arquivo
 */
export async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const imagePreview = document.getElementById('imagePreview');
    const imageError = document.getElementById('imageError');
    
    imageError.textContent = '';
    imagePreview.innerHTML = `<div class="processing-indicator">Processando imagem...</div>`;
    
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
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('imageError').textContent = 'Erro ao processar a imagem. Verifique o tamanho e formato.';
    console.error(error);
  }
}

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
  
  // Remove existing listeners
  orderForm.onsubmit = null;
  uploadButton.onclick = null;
  imageInput.onchange = null;
  
  // Add new listeners
  orderForm.addEventListener('submit', handleOrderFormSubmit);
  uploadButton.addEventListener('click', () => imageInput.click());
  imageInput.addEventListener('change', handleImageUpload);
  
  // Adiciona validação em tempo real para número do pedido
  orderNumber.addEventListener('input', () => {
    const number = orderNumber.value.trim();
    const currentDate = date.value;
    
    if (number && currentDate && isOrderNumberTaken(number, currentDate)) {
      orderNumber.classList.add('invalid');
      orderNumber.title = `Pedido #${number} já existe em ${currentDate}`;
    } else {
      orderNumber.classList.remove('invalid');
      orderNumber.title = '';
    }
  });
  
  // Atualiza validação quando a data muda
  date.addEventListener('change', () => {
    const number = orderNumber.value.trim();
    const currentDate = date.value;
    
    if (number && currentDate && isOrderNumberTaken(number, currentDate)) {
      orderNumber.classList.add('invalid');
      orderNumber.title = `Pedido #${number} já existe em ${currentDate}`;
    } else {
      orderNumber.classList.remove('invalid');
      orderNumber.title = '';
    }
  });
  
  // Setup global image clear function
  window.clearOrderImage = () => {
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('imageError').textContent = 'O comprovante é obrigatório';
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