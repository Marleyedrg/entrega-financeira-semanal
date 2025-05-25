// Mobile utilities and optimizations
import { renderAnalytics } from './analytics.js';
import { importCSV } from './import.js';
import { exportCustomCSV, backupData, showExportModal } from './export.js';
import { showToast } from './utils.js';
import { applyMemoryOptimizations, cleanupUnusedResources, fixFileInputIssues } from './mobileOptimizations.js';

/**
 * Check if device is mobile
 * @returns {boolean} True if mobile device
 */
export function isMobileDevice() {
  return window.innerWidth <= 768 || 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Setup all mobile-specific optimizations
 */
export function setupMobileOptimizations() {
  // Debounce resize operations for better performance
  setupResizeHandlers();
  
  // Apply mobile-specific optimizations
  if (isMobileDevice()) {
    // Apply performance optimizations for low-end devices
    optimizeForLowEndDevices();
    
    // Optimize scroll performance
    optimizeScrollPerformance();
    
    // Fix viewport height issues on mobile browsers
    fixMobileViewportHeight();
    
    // Setup mobile-specific file handling
    setupMobileFileHandling();
  }

  // Apply memory optimizations for all devices (but with more aggressive settings for mobile)
  applyMemoryOptimizations();
  
  // Fix file input issues that can cause memory problems
  fixFileInputIssues();
  
  // Apply chart optimizations
  setupChartOptimizations();
}

/**
 * Setup mobile-specific file handling for import/export
 */
function setupMobileFileHandling() {
  // Enhance import button for mobile
  const importButton = document.getElementById('importButton');
  const csvInput = document.getElementById('csvInput');
  
  if (importButton && csvInput) {
    // Melhorar o input de arquivo para dispositivos móveis
    // Expandir os tipos aceitos para garantir compatibilidade em diferentes dispositivos
    csvInput.accept = ".csv,text/csv,text/comma-separated-values,application/csv,application/excel,application/vnd.ms-excel,application/vnd.msexcel,text/anytext,text/plain";
    
    // Remover o atributo capture que pode estar limitando a seleção de arquivos
    csvInput.removeAttribute('capture');
    csvInput.setAttribute('multiple', 'false');

    // Remover quaisquer listeners antigos para evitar duplicação
    const newImportButton = importButton.cloneNode(true);
    importButton.parentNode.replaceChild(newImportButton, importButton);
    
    const newCsvInput = csvInput.cloneNode(true);
    csvInput.parentNode.replaceChild(newCsvInput, csvInput);

    // Add memory cleanup before file selection
    newImportButton.addEventListener('click', () => {
      // Clean up any unused resources before opening file picker
      cleanupUnusedResources();
    });

    // Criar um modal mais amigável para selecionar arquivos
    const createFileSelectionModal = () => {
      // Primeiro, remover qualquer modal antigo para evitar duplicação
      const oldModal = document.getElementById('fileSelectionModal');
      if (oldModal) {
        document.body.removeChild(oldModal);
      }
      
      // Criar o modal de seleção de arquivos
      const fileModal = document.createElement('div');
      fileModal.id = 'fileSelectionModal';
      fileModal.className = 'modal-overlay';
      fileModal.style.display = 'flex';
      fileModal.innerHTML = `
        <div class="edit-modal">
          <h2>Selecionar Arquivo</h2>
          <div class="file-selection-container">
            <p>Selecione um arquivo CSV para importar:</p>
            <div class="file-input-wrapper">
              <input type="file" id="mobileFileInput" accept=".csv,text/csv,text/comma-separated-values,application/csv,application/excel,application/vnd.ms-excel,application/vnd.msexcel,text/anytext,text/plain" class="mobile-file-input">
              <label for="mobileFileInput" class="file-select-button">
                <i class="fas fa-file-upload"></i>
                Selecionar arquivo
              </label>
            </div>
            <div id="selectedFileName" class="selected-file-name"></div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" id="cancelFileSelection">Cancelar</button>
            <button type="button" class="btn-update" id="confirmFileSelection" disabled>Importar</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(fileModal);
      
      // Configurar o input de arquivo móvel
      const mobileFileInput = document.getElementById('mobileFileInput');
      const selectedFileName = document.getElementById('selectedFileName');
      const confirmFileSelection = document.getElementById('confirmFileSelection');
      const cancelFileSelection = document.getElementById('cancelFileSelection');
      
      // Mostrar o nome do arquivo quando selecionado
      mobileFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          // Ocultar o card de seleção de arquivos
          const fileInputWrapper = document.querySelector('.file-input-wrapper');
          if (fileInputWrapper) {
            fileInputWrapper.style.display = 'none';
          }
          
          // Mostrar o nome do arquivo selecionado
          selectedFileName.textContent = e.target.files[0].name;
          
          // Mostrar um alerta que o arquivo foi importado
          alert(`Arquivo "${e.target.files[0].name}" selecionado para importação`);
          
          // Auto-importar após um breve delay
          setTimeout(() => {
            try {
              // Importar o arquivo automaticamente
              importCSV({
                target: mobileFileInput,
                file: mobileFileInput.files[0]
              });
              
              // Fechar o modal após a importação
              fileModal.style.display = 'none';
              setTimeout(() => {
                if (document.body.contains(fileModal)) {
                  document.body.removeChild(fileModal);
                }
              }, 300);
            } catch (err) {
              console.error('Erro ao importar arquivo:', err);
              showToast('Erro ao importar arquivo. Tente novamente.', 'error');
            }
          }, 500);
        } else {
          selectedFileName.textContent = '';
          confirmFileSelection.disabled = true;
        }
      });
      
      // Add memory cleanup for the modal file input
      mobileFileInput.addEventListener('focus', () => {
        cleanupUnusedResources();
      });
      
      // Remover o botão de confirmar já que agora importamos automaticamente
      confirmFileSelection.style.display = 'none';
      
      // Melhorar o comportamento de clique no input
      const fileInputWrapper = document.querySelector('.file-input-wrapper');
      if (fileInputWrapper) {
        fileInputWrapper.addEventListener('click', (e) => {
          // Evitar que o evento de clique no wrapper cause conflito
          e.stopPropagation();
          
          // Clean up resources before opening file picker
          cleanupUnusedResources();
          
          // Focar e clicar no input de arquivo
          if (mobileFileInput) {
            mobileFileInput.focus();
            mobileFileInput.click();
          }
        });
      }
      
      // Botão para cancelar
      cancelFileSelection.addEventListener('click', () => {
        fileModal.style.display = 'none';
        setTimeout(() => {
          if (document.body.contains(fileModal)) {
            document.body.removeChild(fileModal);
          }
        }, 300);
      });
      
      // Fechar o modal quando clica fora
      fileModal.addEventListener('click', (e) => {
        if (e.target === fileModal) {
          fileModal.style.display = 'none';
          setTimeout(() => {
            if (document.body.contains(fileModal)) {
              document.body.removeChild(fileModal);
            }
          }, 300);
        }
      });
    };
    
    // Override click handler to use mobile-friendly approach
    newImportButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (isMobileDevice()) {
        createFileSelectionModal();
      } else {
        // Comportamento padrão para desktop
        newCsvInput.click();
      }
    });
    
    // Add special handling for the file input on mobile
    newCsvInput.addEventListener('change', (event) => {
      if (event.target.files && event.target.files.length > 0) {
        importCSV(event);
      }
    });
  }
  
  // Enhance export button for mobile
  const finishWeekButton = document.getElementById('finishWeekButton');
  
  if (finishWeekButton) {
    const originalClickHandler = finishWeekButton.onclick;
    finishWeekButton.onclick = (e) => {
      if (isMobileDevice()) {
        e.preventDefault();
        
        if (confirm('Tem certeza que deseja finalizar a semana? Isso irá exportar e limpar todos os dados.')) {
          showExportModal();
        }
      } else if (originalClickHandler) {
        originalClickHandler.call(finishWeekButton, e);
      }
    };
  }
  
  // Make sure the export modal works on mobile
  const exportModal = document.getElementById('exportModal');
  const confirmExport = document.getElementById('confirmExport');
  const cancelExport = document.getElementById('cancelExport');
  
  if (confirmExport) {
    confirmExport.onclick = function() {
      try {
        const includeDeliveries = document.getElementById('exportDeliveries').checked;
        const includeGas = document.getElementById('exportGas').checked;
        const includeImages = document.getElementById('exportImages').checked;
        
        exportCustomCSV(includeDeliveries, includeGas, includeImages);
        exportModal.style.display = 'none';
      } catch (error) {
        console.error('Error exporting on mobile:', error);
      }
    };
  }
  
  if (cancelExport) {
    cancelExport.onclick = function() {
      exportModal.style.display = 'none';
    };
  }
}

/**
 * Setup resize handlers with debouncing
 */
function setupResizeHandlers() {
  let resizeTimer;
  
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    document.body.classList.add('resize-transition-stopper');
    
    resizeTimer = setTimeout(() => {
      document.body.classList.remove('resize-transition-stopper');
      
      // Re-render charts when in analytics tab
      if (document.querySelector('.tab-content.active#analytics')) {
        // Limpar cache antes de renderizar para atualizar adaptações de tela
        if (typeof clearDataCache === 'function') {
          clearDataCache();
        }
        renderAnalytics();
      }
    }, 250);
  });
}

/**
 * Optimize for low-end devices by reducing animations
 */
function optimizeForLowEndDevices() {
  if (window.navigator.deviceMemory && window.navigator.deviceMemory < 4) {
    document.documentElement.classList.add('reduce-motion');
  }
}

/**
 * Optimize scroll performance with passive listeners and GPU acceleration
 */
function optimizeScrollPerformance() {
  let scrollTimer;
  
  document.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    document.body.classList.add('is-scrolling');
    
    scrollTimer = setTimeout(() => {
      document.body.classList.remove('is-scrolling');
    }, 150);
  }, { passive: true });
}

/**
 * Fix the 100vh issue on mobile browsers
 */
function fixMobileViewportHeight() {
  const appHeight = () => {
    const doc = document.documentElement;
    doc.style.setProperty('--app-height', `${window.innerHeight}px`);
  };
  
  window.addEventListener('resize', appHeight);
  appHeight(); // Initial call
}

/**
 * Setup scroll optimizations
 */
function setupScrollOptimizations() {
  let scrollTimer;
  
  window.addEventListener('scroll', () => {
    const analyticsContainer = document.querySelector('.analytics-dashboard');
    if (analyticsContainer) {
      analyticsContainer.classList.add('is-scrolling');
      
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        analyticsContainer.classList.remove('is-scrolling');
      }, 150);
    }
  }, { passive: true });
}

/**
 * Setup touch interactions
 */
function setupTouchInteractions() {
  // Tornar cards clicáveis em dispositivos móveis
  document.addEventListener('click', (e) => {
    if (isMobileDevice()) {
      const analyticsCard = e.target.closest('.analytics-card');
      if (analyticsCard) {
        const wasActive = analyticsCard.classList.contains('active-card');
        
        // Remover classe ativa de todos os cards
        document.querySelectorAll('.analytics-card').forEach(card => {
          card.classList.remove('active-card');
        });
        
        // Adicionar classe ativa apenas ao card clicado (se não estava ativo antes)
        if (!wasActive) {
          analyticsCard.classList.add('active-card');
        }
      }
    }
  });
}

/**
 * Setup optimizations specific to the chart components
 */
function setupChartOptimizations() {
  // Add GPU acceleration to charts for smoother animations
  const addGpuAcceleration = () => {
    const charts = document.querySelectorAll('.pie-chart, .bar-chart, .line-chart, .summary-container');
    charts.forEach(chart => {
      chart.style.willChange = 'transform';
      chart.style.transform = 'translateZ(0)';
      
      // Adicionar viewport hint para melhorar o carregamento em dispositivos móveis
      if (isMobileDevice()) {
        chart.setAttribute('loading', 'lazy');
      }
    });
  };

  // Call once at setup
  if (document.readyState === 'complete') {
    addGpuAcceleration();
  } else {
    window.addEventListener('load', addGpuAcceleration);
  }

  // Add listeners for tab changes to ensure charts are optimized
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (button.dataset.tab === 'analytics') {
        setTimeout(addGpuAcceleration, 100);
      }
    });
  });
}

/**
 * Initialize all mobile optimizations
 */
export function initializeMobileOptimizations() {
  setupResizeHandlers();
  setupScrollOptimizations();
  setupTouchInteractions();
  setupChartOptimizations();
  setupFastClick();
  
  if (isMobileDevice()) {
    setupMobileFileHandling();
  }
}

/**
 * Setup fast click for better touch response
 */
function setupFastClick() {
  if (isMobileDevice()) {
    document.addEventListener('touchstart', function() {}, { passive: true });
  }
} 