import { getCurrentDate, showToast, checkDuplicateDelivery } from './utils.js';
import { 
  deliveries, 
  gasEntries, 
  saveDeliveries, 
  saveGasEntries,
  deleteDelivery,
  deleteGasEntry,
  loadDeliveries
} from './data.js';
import { finishWeek, backupData, clearAllData } from './export.js';
import { importCSV } from './import.js';
import { processImageForStorage, showImageModal } from './imageUtils.js';
import { 
  startEditing as startDeliveryEditing,
  handleEditSubmit,
  handleCancelEdit,
  isEditing as isDeliveryEditing,
  cancelEdit as cancelDeliveryEdit
} from './editHandler.js';

// Função para manipular o envio do formulário de entregas
export function handleDeliveryFormSubmit(event) {
  // Se estiver em modo de edição, usa o handler de edição
  if (isDeliveryEditing()) {
    handleEditSubmit(event);
    return;
  }
  
  event.preventDefault();
  
  const orderNumber = document.getElementById('orderNumber').value.trim();
  const fee = document.getElementById('fee').value;
  const date = document.getElementById('date').value;
  const imagePreview = document.getElementById('imagePreview');
  const image = imagePreview.querySelector('img')?.src;
  
  // Validação dos campos
  let hasError = false;

  if (!orderNumber) {
    showToast('O número do pedido é obrigatório!', 'error');
    hasError = true;
  }

  if (!date) {
    showToast('A data é obrigatória!', 'error');
    hasError = true;
  }

  if (!image) {
    document.getElementById('imageError').textContent = 'O comprovante é obrigatório';
    showToast('O comprovante é obrigatório!', 'error');
    hasError = true;
  } else {
    document.getElementById('imageError').textContent = '';
  }

  if (hasError) return;

  // Verifica duplicatas
  if (checkDuplicateDelivery(orderNumber, date, deliveries)) {
    showToast('Já existe um pedido com este número registrado nesta data!', 'error');
    return;
  }

  // Processa a imagem para armazenamento
  const processedImage = image ? image.replace(/^data:image\/\w+;base64,/, '') : null;
  
  const newDelivery = {
    date,
    orderNumber,
    fee: parseFloat(fee) || 0,
    image: processedImage,
    id: String(Date.now()) // Garante ID único
  };
  
  deliveries.push(newDelivery);
  saveDeliveries();
  
  // Limpa o formulário
  event.target.reset();
  imagePreview.innerHTML = '';
  document.getElementById('date').value = getCurrentDate();
  document.getElementById('imageError').textContent = '';
  
  showToast('Entrega registrada com sucesso!', 'success');
}

// Função para configurar o formulário de gasolina
export function setupGasForm() {
  const gasForm = document.getElementById('gasForm');
  const gasDateInput = document.getElementById('gasDate');
  
  gasDateInput.value = getCurrentDate();
  
  gasForm.addEventListener('submit', (event) => {
    event.preventDefault();
    
    const date = document.getElementById('gasDate').value;
    const amount = document.getElementById('gasAmount').value;
    
    if (!date || !amount) {
      showToast('Por favor, preencha todos os campos obrigatórios', 'error');
      return;
    }
    
    const newGasEntry = {
      id: Date.now().toString(),
      date,
      amount: parseFloat(amount) || 0
    };
    
    gasEntries.push(newGasEntry);
    saveGasEntries();
    
    event.target.reset();
    gasDateInput.value = getCurrentDate();
    
    showToast('Abastecimento registrado com sucesso!', 'success');
  });
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
            <div class="image-preview-item">
              <img src="${compressedImage}" alt="Preview" class="preview-image">
              <button type="button" class="delete-image" onclick="clearDeliveryImage()">×</button>
            </div>
          `;
          document.getElementById('imageError').textContent = '';
          showToast('Imagem carregada com sucesso!', 'success');
        }
      } catch (error) {
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('imageError').textContent = 'Erro ao processar a imagem';
        showToast('Erro ao processar a imagem', 'error');
        console.error(error);
      }
    }
  });

  // Adiciona função global para limpar imagem
  window.clearDeliveryImage = () => {
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('imageError').textContent = 'O comprovante é obrigatório';
  };
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

  // Atualizar as funções globais
  window.editDelivery = startDeliveryEditing;
  window.deleteDelivery = deleteDelivery;
  window.deleteGasEntry = deleteGasEntry;
  window.showImageModal = showImageModal;
  window.cancelDeliveryEdit = cancelDeliveryEdit;
}

// Função para configurar as tabs
export function setupTabs() {
  const tabs = document.querySelectorAll('.tab-button');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));

      // Add active class to clicked tab and corresponding content
      tab.classList.add('active');
      const contentId = tab.getAttribute('data-tab');
      document.getElementById(contentId).classList.add('active');

      // If analytics tab is clicked, render analytics
      if (contentId === 'analytics') {
        if (deliveries.length === 0) {
          showToast('Nenhuma entrega registrada para análise', 'info');
        }
        renderAnalytics(); // Sempre renderiza ao abrir a aba
      }
    });
  });
}

// Função para fechar o modal de imagem
function closeImageModal() {
  const modal = document.getElementById('imageModal');
  modal.classList.remove('show');
  
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
}

// Improved page load handling
function handlePageLoad() {
    const MAX_WAIT_TIME = 1000; // 1 second maximum wait time
    const loadingIndicator = document.querySelector('.loading-indicator');
    
    // Create a promise that resolves when stylesheets are loaded
    const stylesLoaded = Promise.all(
        Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .map(stylesheet => {
                if (stylesheet.loaded) return Promise.resolve();
                return new Promise((resolve) => {
                    stylesheet.addEventListener('load', resolve);
                    stylesheet.addEventListener('error', resolve); // Resolve on error too
                });
            })
    );

    // Create a timeout promise
    const timeout = new Promise(resolve => setTimeout(resolve, MAX_WAIT_TIME));

    // Race between stylesheet loading and timeout
    Promise.race([stylesLoaded, timeout])
        .then(() => {
            // Small delay to ensure browser has painted
            setTimeout(() => {
                if (loadingIndicator) {
                    loadingIndicator.style.display = 'none';
                }
                document.body.classList.add('ready');
            }, 100);
        })
        .catch(() => {
            // Ensure content is shown even if there's an error
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            document.body.classList.add('ready');
        });
}

// Initialize page load handling
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handlePageLoad);
} else {
    handlePageLoad();
}

// Performance optimizations
document.addEventListener('scroll', () => {
    document.body.classList.add('is-scrolling');
    clearTimeout(window.scrollTimer);
    window.scrollTimer = setTimeout(() => {
        document.body.classList.remove('is-scrolling');
    }, 150);
}, { passive: true });

// Check for reduced motion preference
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.classList.add('reduce-motion');
}

// Fix for 100vh on mobile browsers
const setAppHeight = () => {
    document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
};
window.addEventListener('resize', setAppHeight);
setAppHeight(); 