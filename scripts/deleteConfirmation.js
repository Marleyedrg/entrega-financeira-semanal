import { showToast } from './utils.js';
import { deleteDelivery, deleteGasEntry } from './data.js';

// Estado para controlar o modal
const state = {
  isOpen: false,
  itemId: null,
  itemType: null, // 'delivery' ou 'gas'
  expectedValue: '',
  onConfirm: null,
  valueType: 'numero' // 'numero' ou 'valor'
};

// Elementos do DOM
let modal, messageElement, inputElement, errorElement, cancelButton, confirmButton;

// Inicializar os elementos quando o DOM estiver pronto
export function initializeDeleteConfirmation() {
  modal = document.getElementById('deleteConfirmModal');
  messageElement = document.getElementById('deleteConfirmMessage');
  inputElement = document.getElementById('deleteConfirmInput');
  errorElement = document.getElementById('deleteConfirmError');
  cancelButton = document.getElementById('cancelDelete');
  confirmButton = document.getElementById('confirmDelete');
  
  if (!modal || !messageElement || !inputElement || !errorElement || !cancelButton || !confirmButton) {
    console.error('Elementos do modal de confirmação não encontrados');
    return;
  }
  
  // Adicionar event listeners
  cancelButton.addEventListener('click', closeModal);
  confirmButton.addEventListener('click', handleConfirmDelete);
  inputElement.addEventListener('input', clearError);
  
  // Fechar o modal ao clicar fora
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // Fechar modal com a tecla ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.isOpen) {
      closeModal();
    }
  });
  
  // Submeter o formulário ao pressionar Enter
  inputElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && state.isOpen) {
      handleConfirmDelete();
    }
  });
}

// Abrir modal para confirmação de exclusão de entrega
export function confirmDeliveryDeletion(deliveryId, orderNumber) {
  state.itemId = deliveryId;
  state.itemType = 'delivery';
  state.expectedValue = orderNumber;
  state.valueType = 'numero';
  state.onConfirm = () => {
    deleteDelivery(deliveryId);
  };
  
  messageElement.textContent = `Para confirmar a exclusão, digite o número do pedido: ${orderNumber}`;
  inputElement.placeholder = 'Digite o número do pedido';
  openModal();
}

// Abrir modal para confirmação de exclusão de abastecimento
export function confirmGasDeletion(gasId, amount) {
  state.itemId = gasId;
  state.itemType = 'gas';
  state.expectedValue = amount.toString();
  state.valueType = 'valor';
  state.onConfirm = () => {
    deleteGasEntry(gasId);
  };
  
  messageElement.textContent = `Para confirmar a exclusão, digite o valor do abastecimento: ${amount}`;
  inputElement.placeholder = 'Digite o valor';
  openModal();
}

// Abrir o modal
function openModal() {
  modal.style.display = 'flex';
  inputElement.value = '';
  errorElement.textContent = '';
  inputElement.classList.remove('error');
  
  // Dar foco ao input após a animação do modal
  setTimeout(() => {
    inputElement.focus();
    state.isOpen = true;
  }, 50);
}

// Fechar o modal
function closeModal() {
  modal.style.display = 'none';
  state.isOpen = false;
  state.itemId = null;
  state.expectedValue = '';
  state.onConfirm = null;
}

// Limpar mensagem de erro ao digitar
function clearError() {
  errorElement.textContent = '';
  inputElement.classList.remove('error');
}

// Processar confirmação de exclusão
function handleConfirmDelete() {
  const inputValue = inputElement.value.trim();
  
  // Validar se o input está vazio
  if (!inputValue) {
    showError('Este campo é obrigatório.');
    return;
  }
  
  // Verificar se corresponde ao valor esperado
  if (state.valueType === 'numero') {
    // Para número do pedido, verificar correspondência exata
    if (inputValue !== state.expectedValue) {
      showError('O número do pedido não corresponde.');
      return;
    }
  } else {
    // Para valor de abastecimento, permitir diferentes formatos
    // Converter para número e comparar os valores numéricos
    const inputNumber = parseFloat(inputValue.replace(',', '.'));
    const expectedNumber = parseFloat(state.expectedValue.replace(',', '.'));
    
    if (isNaN(inputNumber) || Math.abs(inputNumber - expectedNumber) > 0.01) {
      showError('O valor não corresponde.');
      return;
    }
  }
  
  // Se passou na validação, executar a função de confirmação
  if (state.onConfirm) {
    state.onConfirm();
    closeModal();
  }
}

// Exibir mensagem de erro
function showError(message) {
  errorElement.textContent = message;
  inputElement.classList.add('error');
  inputElement.focus();
} 