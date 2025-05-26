import { getCurrentDate, showToast, checkDuplicateDelivery } from './utils.js';
import { 
  deliveries, 
  gasEntries, 
  saveDeliveries, 
  saveGasEntries,
  deleteDelivery,
  deleteGasEntry,
  loadDeliveries,
  loadGasEntries,
  updateTotals,
  initializeData,
  forceSyncData
} from './data.js';
import { finishWeek, clearAllData, backupData, exportCustomCSV, showExportModal } from './export.js';
import { importCSV } from './import.js';
import { processImageForStorage, showImageModal } from './imageUtils.js';
import { renderAnalytics } from './analytics.js';
import { 
  startEditing as startDeliveryEditing,
  handleEditSubmit,
  handleCancelEdit,
  isEditing as isDeliveryEditing,
  cancelEdit as cancelDeliveryEdit
} from './editHandler.js';
import { handleOrderFormSubmit, setupOrderForm, setupGasForm } from './formHandler.js';
import { initializeMobileOptimizations } from './mobile.js';
import { initializeSync, getSyncStatus } from './sync.js';
import { runDiagnostic, repairData } from './dataDiagnostic.js';
import { initializeDeleteConfirmation, confirmDeliveryDeletion, confirmGasDeletion } from './deleteConfirmation.js';

// Export all necessary setup functions
export {
  setupEditForms,
  setupTabs,
  initializeApp,
  setupOrderForm as setupDeliveryForm,
  setupGasForm,
  handleOrderFormSubmit as handleDeliveryFormSubmit
};

// Função para gerar dados aleatórios para teste
function generateRandomData(days = 7) {
  // Helper para gerar número aleatório entre min e max
  const randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  
  // Helper para gerar data aleatória nos últimos X dias
  const randomDate = (daysAgo) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  };

  // Limpar dados existentes
  deliveries.length = 0;
  gasEntries.length = 0;

  // Gerar entregas para cada dia
  for (let i = 0; i < days; i++) {
    const date = randomDate(i);
    const numDeliveries = randomNumber(3, 8); // 3 a 8 entregas por dia
    
    // Gerar entregas para este dia
    for (let j = 0; j < numDeliveries; j++) {
      const fee = parseFloat(randomNumber(5, 15).toFixed(2));
      const delivery = {
        id: `${Date.now()}-${i}-${j}`,
        date: date,
        orderNumber: `${randomNumber(1000, 9999)}`,
        fee: fee,
        image: null,
        status: fee > 0 ? 'completed' : 'pending'
      };
      deliveries.push(delivery);
    }

    // 50% de chance de ter abastecimento neste dia
    if (Math.random() > 0.5) {
      const gasEntry = {
        id: `gas-${Date.now()}-${i}`,
        date: date,
        amount: parseFloat(randomNumber(30, 70).toFixed(2)),
        image: null
      };
      gasEntries.push(gasEntry);
    }
  }

  // Salvar dados
  saveDeliveries();
  saveGasEntries();
  updateTotals();
  
  showToast(`Dados aleatórios gerados para ${days} dias!`, 'success');
  
  return {
    totalDeliveries: deliveries.length,
    totalGasEntries: gasEntries.length
  };
}

// Função para configurar os formulários de edição
function setupEditForms() {
  const modal = document.getElementById('imageModal');
  const closeButton = modal.querySelector('.close');
  
  closeButton.addEventListener('click', closeImageModal);
  
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeImageModal();
    }
  });
  
  // Setup for finish week button (with mobile handling via mobile.js)
  const finishWeekButton = document.getElementById('finishWeekButton');
  if (finishWeekButton) {
    // Setup click handler but allow override from mobile.js
    if (!finishWeekButton.onclick) {
      finishWeekButton.addEventListener('click', finishWeek);
    }
    finishWeekButton.title = "Exportar dados e limpar todas as entregas";
  }

  const clearDataButton = document.getElementById('clearDataButton');
  if (clearDataButton) {
    // Remover eventos existentes para evitar duplicação
    clearDataButton.replaceWith(clearDataButton.cloneNode(true));
    
    // Obter referência ao novo botão
    const newClearDataButton = document.getElementById('clearDataButton');
    
    // Adicionar listener com confirmação de segurança
    newClearDataButton.addEventListener('click', () => {
      // Confirmação adicional para evitar limpeza acidental
      if (confirm('ATENÇÃO: Todos os dados serão permanentemente excluídos. Esta ação não pode ser desfeita.\n\nDeseja continuar?')) {
        clearAllData(); // Chama a função que limpa todos os dados
        
        // Verificar se a limpeza foi bem-sucedida
        setTimeout(() => {
          // Validar se localStorage está vazio
          if (localStorage.length === 0) {
            console.log('Limpeza de dados validada com sucesso');
          } else {
            console.warn('Possível falha na limpeza - ainda existem dados no localStorage');
            // Tentar limpeza direta como fallback
            try {
              localStorage.clear();
              sessionStorage.clear();
              
              // Forçar atualização de dados
              loadDeliveries();
              loadGasEntries();
              updateTotals();
              
              showToast('Dados limpos (fallback)', 'info');
            } catch (e) {
              console.error('Erro na limpeza fallback:', e);
            }
          }
          
          // Forçar sincronização entre abas
          forceSyncAllTabs();
        }, 500);
      }
    });
    newClearDataButton.title = "Limpar todos os dados";
  }

  // Setup for import button (with mobile handling via mobile.js)
  const importButton = document.getElementById('importButton');
  const csvInput = document.getElementById('csvInput');
  
  if (importButton && csvInput) {
    // Setup click handler but allow override from mobile.js  
    if (!importButton.onclick) {
      importButton.addEventListener('click', () => {
        csvInput.click();
      });
    }
    
    // Ensure the change event is properly captured
    if (!csvInput.onchange) {
      csvInput.addEventListener('change', importCSV);
    }
  }

  // Setup the export modal event listeners
  setupExportModalHandlers();

  // Setup storage event listener to handle changes from other tabs
  window.addEventListener('storage', (event) => {
    if (event.key === 'deliveries' || event.key === 'gasEntries') {
      loadDeliveries();
      loadGasEntries();
    }
  });

  // Atualizar as funções globais
  window.editDelivery = startDeliveryEditing;
  window.deleteDelivery = deleteDelivery;
  window.deleteGasEntry = deleteGasEntry;
  window.showImageModal = showImageModal;
  window.cancelDeliveryEdit = cancelDeliveryEdit;
  
  // Adicionar funções de confirmação de exclusão
  window.confirmDeliveryDeletion = confirmDeliveryDeletion;
  window.confirmGasDeletion = confirmGasDeletion;

  // Adicionar função de teste à window
  window.generateTestData = (days) => {
    try {
      const result = generateRandomData(days);
      console.log('Dados gerados:', result);
      return result;
    } catch (error) {
      console.error('Erro ao gerar dados:', error);
      showToast('Erro ao gerar dados de teste', 'error');
    }
  };

  // Carrega os dados iniciais
  loadDeliveries();
  renderAnalytics();
}

// Setup export modal handlers
function setupExportModalHandlers() {
  const exportModal = document.getElementById('exportModal');
  const confirmExport = document.getElementById('confirmExport');
  const cancelExport = document.getElementById('cancelExport');
  
  if (exportModal && confirmExport && cancelExport) {
    // Setup confirmation button handler if it's not already set
    if (!confirmExport.onclick) {
      confirmExport.addEventListener('click', () => {
        try {
          const includeDeliveries = document.getElementById('exportDeliveries').checked;
          const includeGas = document.getElementById('exportGas').checked;
          const includeImages = document.getElementById('exportImages').checked;
          
          exportCustomCSV(includeDeliveries, includeGas, includeImages);
          exportModal.style.display = 'none';
        } catch (error) {
          console.error('Erro ao exportar dados:', error);
          showToast(error.message, 'error');
        }
      });
    }
    
    // Setup cancellation button handler if it's not already set
    if (!cancelExport.onclick) {
      cancelExport.addEventListener('click', () => {
        exportModal.style.display = 'none';
      });
    }
  }
}

// Função para configurar as tabs
function setupTabs() {
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
        renderAnalytics();
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

// Função para inicializar a aplicação
function initializeApp() {
  console.time('Inicialização da Aplicação');
  
  // Fix para altura em dispositivos móveis
  setAppHeight();
  window.addEventListener('resize', () => {
    setAppHeight();
  });
  
  // Verificar integridade dos dados ao iniciar
  checkDataIntegrity();
  
  // Verificar e reparar problemas de integridade automaticamente
  checkDataIntegrityOnStartup();
  
  // Carregar dados
  loadDeliveries();
  loadGasEntries();
  updateTotals();
  
  // Inicializar sistema de sincronização
  initializeSync();
  
  // Inicializar sistema de sincronização entre abas
  const syncStatus = initializeSync();
  console.log('Sistema de sincronização inicializado:', syncStatus.sessionId);
  
  // Carrega dados do localStorage
  initializeData();
  
  // Garante que todas as entregas têm status definidos
  deliveries.forEach(delivery => {
    if (!delivery.status) {
      delivery.status = parseFloat(delivery.fee) > 0 ? 'completed' : 'pending';
    }
  });
  saveDeliveries();
  
  // Configura formulários
  setupOrderForm();
  setupGasForm();
  setupEditForms();
  setupTabs();
  
  // Inicializa o sistema de confirmação de exclusão
  initializeDeleteConfirmation();
  
  // Inicializa otimizações para dispositivos móveis
  initializeMobileOptimizations();
  
  // Configura eventos globais
  window.showImageModal = showImageModal;
  window.deleteDelivery = deleteDelivery;
  window.deleteGasEntry = deleteGasEntry;
  window.editDelivery = startDeliveryEditing;
  window.handleEditSubmit = handleEditSubmit;
  window.handleCancelEdit = handleCancelEdit;
  window.importCSV = importCSV;
  window.forceSyncData = forceSyncData;
  window.getSyncStatus = getSyncStatus;
  window.runDiagnostic = runDiagnostic;
  
  // Configura o botão de fechar modal
  const closeButton = document.querySelector('.close');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      const modal = document.getElementById('imageModal');
      if (modal) modal.style.display = 'none';
    });
  }
  
  // Adicionar indicador de sincronização no rodapé
  setupSyncIndicator();
  
  console.timeEnd('Inicialização da Aplicação');
}

/**
 * Verifica e repara problemas de integridade durante a inicialização
 */
function checkDataIntegrityOnStartup() {
  // Verificar se é a primeira vez que o usuário abre a aplicação nesta sessão
  if (!sessionStorage.getItem('integrity_checked')) {
    // Executar diagnóstico sem mostrar toast para o usuário
    const diagnostic = runDiagnostic(false);
    
    // Se houver problemas, tentar reparar automaticamente
    if (!diagnostic.result.isValid) {
      const totalIssues = diagnostic.result.deliveries.invalidItems.length + 
                          diagnostic.result.gasEntries.invalidItems.length;
      
      if (totalIssues > 0) {
        // Realizar o reparo automaticamente
        const repairResult = repairData(diagnostic.result);
        
        if (repairResult.success) {
          console.log(`Reparados automaticamente ${repairResult.fixed}/${totalIssues} problemas de integridade.`);
          
          // Notificar o usuário apenas se houver problemas não reparados
          if (repairResult.fixed < totalIssues) {
            setTimeout(() => {
              showToast(`Alguns problemas de integridade (${totalIssues - repairResult.fixed}/${totalIssues}) não puderam ser reparados automaticamente. Use o Diagnóstico de Dados para mais informações.`, 'warning');
            }, 1500);
          }
        } else {
          // Se não foi possível reparar, apenas registrar no console
          console.warn('Não foi possível reparar automaticamente os problemas de integridade.');
        }
      }
    }
    
    // Marcar que a verificação de integridade já foi feita nesta sessão
    sessionStorage.setItem('integrity_checked', 'true');
  }
}

// Função para adicionar indicador de sincronização
function setupSyncIndicator() {
  const footer = document.querySelector('.footer');
  
  if (footer) {
    const syncIndicator = document.createElement('div');
    syncIndicator.className = 'sync-indicator';
    syncIndicator.innerHTML = `
      <span class="sync-status"></span>
      <span class="sync-text">Sincronização automática ativada</span>
    `;
    
    footer.appendChild(syncIndicator);
    
    // Atualizar status periodicamente
    updateSyncStatus();
    setInterval(updateSyncStatus, 10000);
    
    // Sincronização manual ao clicar no indicador
    syncIndicator.addEventListener('click', () => {
      syncIndicator.classList.add('syncing');
      forceSyncData();
      showToast('Sincronizando dados...', 'info');
      
      setTimeout(() => {
        syncIndicator.classList.remove('syncing');
        updateSyncStatus();
      }, 1000);
    });
  }
}

// Função para atualizar o indicador de sincronização
function updateSyncStatus() {
  const status = getSyncStatus();
  const indicator = document.querySelector('.sync-status');
  const text = document.querySelector('.sync-text');
  
  if (indicator && text) {
    const isActive = status.isPrimary;
    const lastSync = status.lastSyncTime ? new Date(status.lastSyncTime) : null;
    const now = new Date();
    
    indicator.className = 'sync-status ' + (isActive ? 'active' : 'passive');
    
    if (lastSync) {
      const timeDiff = Math.floor((now - lastSync) / 1000);
      let timeText = '';
      
      if (timeDiff < 60) {
        timeText = `${timeDiff}s atrás`;
      } else if (timeDiff < 3600) {
        timeText = `${Math.floor(timeDiff / 60)}m atrás`;
      } else {
        timeText = `${Math.floor(timeDiff / 3600)}h atrás`;
      }
      
      text.textContent = `Última sincronização: ${timeText}`;
    } else {
      text.textContent = isActive ? 'Aba principal' : 'Sincronização automática ativada';
    }
  }
}

// Função para verificar integridade dos dados
function checkDataIntegrity() {
  try {
    // Já verificado nesta sessão? (evita múltiplas verificações)
    if (sessionStorage.getItem('integrity_checked')) {
      return;
    }
    
    // Verificar localStorage
    let dataIntegrityIssue = false;
    
    // Validar entradas JSON
    try {
      const rawDeliveries = localStorage.getItem('deliveries');
      if (rawDeliveries) {
        JSON.parse(rawDeliveries);
      }
      
      const rawGasEntries = localStorage.getItem('gasEntries');
      if (rawGasEntries) {
        JSON.parse(rawGasEntries);
      }
    } catch (e) {
      console.error('Dados corrompidos no localStorage:', e);
      dataIntegrityIssue = true;
    }
    
    // Se houver problemas, limpar dados
    if (dataIntegrityIssue) {
      console.warn('Problemas de integridade encontrados. Reiniciando armazenamento.');
      
      // Limpar todos os dados
      localStorage.clear();
      sessionStorage.clear();
      
      // Recarregar dados (agora vazios)
      loadDeliveries();
      loadGasEntries();
      updateTotals();
      
      showToast('Dados reiniciados devido a um problema de integridade', 'warning');
    }
    
    // Marcar como verificado
    sessionStorage.setItem('integrity_checked', 'true');
    
  } catch (error) {
    console.error('Erro ao verificar integridade dos dados:', error);
    
    // Em caso de erro na verificação, limpar dados como precaução
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error('Falha ao limpar dados corrompidos:', e);
    }
  }
} 