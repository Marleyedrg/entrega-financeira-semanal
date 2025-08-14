import { deliveries, gasEntries } from './data.js';
import { showToast } from './utils.js';
import { renderAnalytics, clearDataCache } from './analytics.js';
import { forceSyncAllTabs } from './sync.js';

// Add a global flag to track clearing state
let isDataClearing = false;

// Function to check if data clearing is in progress
export function isDataClearingInProgress() {
  return isDataClearing;
}

// GitHub Pages optimized compatibility check for localStorage
function isLocalStorageAvailable() {
  try {
    const test = '__github_pages_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    console.warn('localStorage not available on GitHub Pages environment');
    return false;
  }
}

// GitHub Pages optimized compatibility check for sessionStorage
function isSessionStorageAvailable() {
  try {
    const test = '__github_pages_session_test__';
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return true;
  } catch (e) {
    console.warn('sessionStorage not available on GitHub Pages environment');
    return false;
  }
}

// Universal data clearing optimized for GitHub Pages static hosting
function universalDataClear() {
  console.log('🌐 Executando limpeza universal de dados (GitHub Pages)...');
  
  // Clear localStorage with GitHub Pages specific handling
  if (isLocalStorageAvailable()) {
    try {
      // Preserve bills data with GitHub Pages namespace consideration
      const billsData = localStorage.getItem('bills');
      const monthlyIncomeData = localStorage.getItem('monthlyIncome');
      
      // Clear all data with GitHub Pages specific keys
      const keysToRemove = [];
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (
          key === 'deliveries' || 
          key === 'gasEntries' || 
          key.startsWith('backup_') ||
          key.startsWith('__github_pages_')
        )) {
          keysToRemove.push(key);
        }
      }
      
      // Remove identified keys
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn(`Failed to remove ${key} on GitHub Pages:`, e);
        }
      });
      
      // Restore preserved data
      if (billsData) localStorage.setItem('bills', billsData);
      if (monthlyIncomeData) localStorage.setItem('monthlyIncome', monthlyIncomeData);
      
      // Set empty arrays
      localStorage.setItem('deliveries', '[]');
      localStorage.setItem('gasEntries', '[]');
      
      console.log('✅ localStorage cleared successfully for GitHub Pages');
    } catch (e) {
      console.warn('localStorage clearing failed on GitHub Pages, trying individual removal:', e);
      // Fallback: remove individual keys
      ['deliveries', 'gasEntries'].forEach(key => {
        try {
          localStorage.removeItem(key);
          localStorage.setItem(key, '[]');
        } catch (err) {
          console.error(`Failed to clear ${key} on GitHub Pages:`, err);
        }
      });
    }
  }
  
  // Clear sessionStorage optimized for GitHub Pages
  if (isSessionStorageAvailable()) {
    try {
      const clearingFlag = sessionStorage.getItem('dataClearing');
      const integrityCheck = sessionStorage.getItem('integrity_checked');
      
      // Clear all except essential flags
      sessionStorage.clear();
      
      // Restore essential flags
      if (clearingFlag) sessionStorage.setItem('dataClearing', clearingFlag);
      if (integrityCheck) sessionStorage.setItem('integrity_checked', integrityCheck);
    } catch (e) {
      console.warn('sessionStorage clearing failed on GitHub Pages:', e);
    }
  }
  
  // Clear memory arrays with GitHub Pages compatibility
  try {
    // Method 1: Clear by length (most compatible)
    if (Array.isArray(deliveries)) {
      deliveries.length = 0;
    }
    if (Array.isArray(gasEntries)) {
      gasEntries.length = 0;
    }
    
    // Method 2: Splice everything (for older browsers accessing GitHub Pages)
    if (deliveries && deliveries.splice) {
      deliveries.splice(0, deliveries.length);
    }
    if (gasEntries && gasEntries.splice) {
      gasEntries.splice(0, gasEntries.length);
    }
    
    // Method 3: Global references (GitHub Pages sometimes uses global scope)
    if (window.deliveries) {
      window.deliveries.length = 0;
    }
    if (window.gasEntries) {
      window.gasEntries.length = 0;
    }
  } catch (e) {
    console.warn('Memory array clearing failed on GitHub Pages:', e);
  }
}

// Device detection optimized for GitHub Pages environment
function getGitHubPagesDeviceInfo() {
  const userAgent = navigator.userAgent || '';
  const platform = navigator.platform || '';
  
  // Simplified device detection for GitHub Pages
  const isMobile = window.innerWidth <= 768 || 
                   /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);
  const isChrome = /Chrome/i.test(userAgent);
  
  // Check for GitHub Pages specific environment
  const isGitHubPages = window.location.hostname.includes('github.io') || 
                        window.location.pathname.includes('/entrega-financeira-semanal/');
  
  return {
    isMobile,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isGitHubPages,
    hasLocalStorage: isLocalStorageAvailable(),
    hasSessionStorage: isSessionStorageAvailable(),
    userAgent: userAgent.substring(0, 100) // Truncate for logging
  };
}

// Função para validar dados antes da exportação
function validateExportData(data, type) {
  const errors = [];
  
  data.forEach((item, index) => {
    if (!item.date) {
      errors.push(`${type} #${index + 1}: Data inválida`);
    }
    if (!item.id) {
      errors.push(`${type} #${index + 1}: ID inválido`);
    }
    
    if (type === 'Entrega') {
      if (!item.orderNumber) {
        errors.push(`Entrega #${index + 1}: Número do pedido inválido`);
      }
      if (typeof item.fee !== 'number' && item.fee !== '') {
        errors.push(`Entrega #${index + 1}: Taxa inválida`);
      }
    } else if (type === 'Gastos') {
      if (typeof item.amount !== 'number' && item.amount !== '') {
        errors.push(`Gasto #${index + 1}: Valor inválido`);
      }
    }
  });
  
  return errors;
}

// Função para gerar CSV com os dados
export function generateCSV(includeGas = true) {
  // Validar dados antes de exportar
  const deliveryErrors = validateExportData(deliveries, 'Entrega');
  const gasErrors = includeGas ? validateExportData(gasEntries, 'Gastos') : [];
  
  const allErrors = [...deliveryErrors, ...gasErrors];
  if (allErrors.length > 0) {
    throw new Error(`Erros nos dados:\n${allErrors.join('\n')}`);
  }
  
  const headers = ['Data', 'Tipo', 'ID', 'Número do Pedido', 'Valor Pedido', 'Valor Gastos', 'Descrição Gasto', 'Status', 'Imagem'];
  const rows = [];
  
  // Adicionar entregas
  deliveries.forEach(delivery => {
    rows.push([
      delivery.date,
      'Entrega',
      delivery.id,
      delivery.orderNumber,
      delivery.fee,
      '',
      '',
      delivery.fee ? 'concluido' : 'pendente',
      delivery.image || ''
    ]);
  });
  
  // Adicionar registros de gastos se includeGas for true
  if (includeGas) {
    gasEntries.forEach(entry => {
      rows.push([
        entry.date,
        'Gastos',
        entry.id,
        '',
        '',
        entry.amount,
        entry.description || 'Gasto',
        'Pago',
        entry.image || ''
      ]);
    });
  }
  
  // Converter para CSV, escapando campos que possam conter vírgulas ou quebras de linha
  return [
    headers.join(','),
    ...rows.map(row => row.map(field => {
      // Se o campo contiver vírgulas, quebras de linha ou aspas, envolva em aspas
      if (typeof field === 'string' && (field.includes(',') || field.includes('\n') || field.includes('"'))) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    }).join(','))
  ].join('\n');
}

// Função para fazer backup dos dados sem limpar
export function backupData(includeGas = true) {
  try {
    // Verificar se há dados para exportar
    if (deliveries.length === 0 && (!includeGas || gasEntries.length === 0)) {
      throw new Error('Não há dados para exportar');
    }
    
    const date = new Date();
    const { fileName } = generateDeliveryIdentifiers(date);
    
    // Gerar CSV
    const csvContent = generateCSV(includeGas);
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const csvUrl = URL.createObjectURL(csvBlob);
    
    // Download do CSV
    const link = document.createElement('a');
    link.href = csvUrl;
    link.download = `backup-${fileName}${includeGas ? '' : '-no-gas'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(csvUrl);
    
    // Otimizar imagens armazenadas
    optimizeStoredImages();
    
    const totalEntries = deliveries.length + (includeGas ? gasEntries.length : 0);
    showToast(`Backup realizado com sucesso! ${totalEntries} registros exportados.`, 'success');
  } catch (error) {
    console.error('Erro ao fazer backup:', error);
    showToast(error.message, 'error');
  }
}

// Função para limpar dados (preservando Contas Fixas) - Otimizada para GitHub Pages
export async function clearAllData() {
  const deviceInfo = getGitHubPagesDeviceInfo();
  console.log('🔧 GitHub Pages environment detected:', deviceInfo);
  
  if (!confirm('Tem certeza que deseja limpar os dados? Esta ação não pode ser desfeita.\n\nOS DADOS DAS CONTAS FIXAS SERÃO PRESERVADOS.')) {
    return;
  }
  
  try {
    // Set clearing flag to prevent data loading during the process
    isDataClearing = true;
    
    // Perform data cleanup optimized for GitHub Pages
    await performGitHubPagesDataCleanup(deviceInfo);
    
    showToast('Dados limpos com sucesso! Contas Fixas preservadas.', 'success');
  } catch (error) {
    console.error('Erro ao limpar dados no GitHub Pages:', error);
    showToast(error.message, 'error');
  } finally {
    // Always clear the flag
    isDataClearing = false;
  }
}

/**
 * Performs data cleanup optimized for GitHub Pages static hosting environment
 */
async function performGitHubPagesDataCleanup(deviceInfo) {
  console.log('🧹 Iniciando limpeza otimizada para GitHub Pages...');
  
  try {
    // Set clearing flag for GitHub Pages environment
    if (deviceInfo.hasSessionStorage) {
      sessionStorage.setItem('dataClearing', 'true');
      sessionStorage.setItem('github_pages_clearing', Date.now().toString());
    }
    
    // Use universal clearing method optimized for static hosting
    universalDataClear();
    
    // Clear analytics cache with GitHub Pages handling
    try {
      clearDataCache();
    } catch (e) {
      console.warn('Analytics cache clearing failed on GitHub Pages:', e);
    }
    
    // Clear forms with GitHub Pages specific selectors
    console.log('🧹 Limpando formulários (GitHub Pages)...');
    clearFormInputs();
    
    // Handle BroadcastChannel for GitHub Pages (if available)
    try {
      if (window.BroadcastChannel && typeof BroadcastChannel === 'function') {
        console.log('🧹 Enviando mensagem de limpeza (GitHub Pages)...');
        const syncChannel = new BroadcastChannel('entrega_financeira_sync');
        syncChannel.postMessage({
          type: 'FULL_CLEAR',
          timestamp: Date.now(),
          source: 'github_pages_clear',
          deviceInfo: deviceInfo
        });
        syncChannel.close();
      }
    } catch (e) {
      console.log('BroadcastChannel não disponível no GitHub Pages:', e);
    }
    
    // Clear object URLs with GitHub Pages compatibility
    try {
      const images = document.querySelectorAll('img[src^="blob:"]');
      images.forEach(img => {
        if (img.src && img.src.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(img.src);
          } catch (e) {
            console.warn('Failed to revoke blob URL on GitHub Pages:', e);
          }
        }
      });
    } catch (e) {
      console.warn('Object URL cleanup failed on GitHub Pages:', e);
    }
    
    // Clear image previews with GitHub Pages handling
    try {
      const previewContainers = document.querySelectorAll('.image-preview-container');
      previewContainers.forEach(container => {
        container.innerHTML = '';
      });
    } catch (e) {
      console.warn('Image preview cleanup failed on GitHub Pages:', e);
    }
    
    // Apply mobile-specific clearing for GitHub Pages mobile users
    if (deviceInfo.isMobile) {
      try {
        const { mobileForceClearData } = await import('./mobile.js');
        mobileForceClearData();
      } catch (mobileError) {
        console.log('Mobile-specific clearing not available on GitHub Pages:', mobileError);
      }
    }
    
    // GitHub Pages specific memory management
    try {
      // Force garbage collection (if available)
      if (window.gc && typeof window.gc === 'function') {
        window.gc();
      }
      
      // Create memory pressure for mobile GitHub Pages users
      if (deviceInfo.isMobile) {
        const temp = new Array(500).fill(null); // Smaller array for GitHub Pages
        temp.length = 0;
      }
    } catch (e) {
      console.log('Garbage collection not available on GitHub Pages:', e);
    }
    
    // GitHub Pages specific delay (considering CDN caching)
    const delay = deviceInfo.isMobile ? 2000 : 1500; // Longer delays for GitHub Pages
    
    // Clear the clearing flags after GitHub Pages appropriate delay
    setTimeout(() => {
      if (deviceInfo.hasSessionStorage) {
        sessionStorage.removeItem('dataClearing');
        sessionStorage.removeItem('github_pages_clearing');
      }
      console.log('✅ Limpeza GitHub Pages completa');
    }, delay);
    
  } catch (error) {
    console.error('Erro durante limpeza GitHub Pages:', error);
    if (deviceInfo.hasSessionStorage) {
      sessionStorage.removeItem('dataClearing');
      sessionStorage.removeItem('github_pages_clearing');
    }
    throw error;
  }
}

// Função para finalizar a semana
export function finishWeek() {
  console.log('🏁 Função finishWeek chamada');
  
  if (!confirm('Tem certeza que deseja finalizar a semana? Isso irá exportar e limpar todos os dados.')) {
    console.log('🏁 Usuário cancelou a finalização da semana');
    return;
  }
  
  console.log('🏁 Usuário confirmou finalização da semana');

  try {
    console.log('🏁 Verificando dados para exportar...');
    console.log('🏁 Entregas:', deliveries.length, 'Gastos:', gasEntries.length);
    
    // Verificar se há dados para exportar
    if (deliveries.length === 0 && gasEntries.length === 0) {
      console.log('⚠️ Não há dados para exportar, apenas limpando...');
      performCompleteDataCleanup();
      showToast('Não havia dados para exportar. Dados limpos com sucesso!', 'info');
      setTimeout(() => window.location.reload(), 1000);
      return;
    }
    
    const date = new Date();
    const { fileName } = generateDeliveryIdentifiers(date);
    const downloadFilename = `relatorio-${fileName}.csv`;
    
    // Gerar CSV
    const csvContent = generateCSV(true);
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Verificar se estamos em um dispositivo móvel
    const isMobileDevice = window.innerWidth <= 768 || 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Função para limpar dados após o download
    const clearDataAfterExport = () => {
      console.log('🚀 Iniciando limpeza após exportação...');
      
      // Perform complete data cleanup
      performCompleteDataCleanup();
      
      showToast('Semana finalizada com sucesso!', 'success');
      
      // Reload the page to ensure all information is cleaned from the UI
      setTimeout(() => {
        // Verify that data was cleared before reloading
        const hasLocalStorageData = localStorage.getItem('deliveries') || localStorage.getItem('gasEntries');
        
        if (hasLocalStorageData) {
          console.warn('⚠️ Dados podem não ter sido totalmente limpos, tentando limpeza adicional...');
          performCompleteDataCleanup();
          setTimeout(() => {
            console.log('🔄 Recarregando página após limpeza adicional...');
            window.location.reload();
          }, 500);
        } else {
          console.log('✅ Dados limpos com sucesso, recarregando página...');
          window.location.reload();
        }
      }, 1500);
    };
    
    if (isMobileDevice) {
      try {
        // Para iOS Safari e alguns outros navegadores móveis
        if (navigator.share && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          // Criar um objeto de arquivo para compartilhar
          const file = new File([csvBlob], downloadFilename, { type: 'text/csv' });
          
          navigator.share({
            files: [file],
            title: 'Exportação de dados semanal',
            text: 'Relatório semanal do Sistema de Entregas'
          }).then(() => {
            clearDataAfterExport();
          }).catch(err => {
            console.error('Erro ao compartilhar arquivo:', err);
            // Fallback para método tradicional
            triggerDirectDownload(true);
          });
        } else {
          // Fallback para download direto
          triggerDirectDownload(true);
        }
      } catch (error) {
        console.error('Erro específico para mobile:', error);
        // Fallback para método tradicional
        triggerDirectDownload(true);
      }
    } else {
      // Método tradicional para desktop
      triggerDirectDownload(true);
    }
    
    // Função de fallback para download direto
    function triggerDirectDownload(shouldClearData) {
      console.log('📥 Iniciando download direto, shouldClearData:', shouldClearData);
      
      const csvUrl = URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      link.href = csvUrl;
      link.download = downloadFilename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        console.log('📥 Download concluído, limpando recursos...');
        document.body.removeChild(link);
        URL.revokeObjectURL(csvUrl);
        
        if (shouldClearData) {
          console.log('📥 Chamando clearDataAfterExport...');
          clearDataAfterExport();
        } else {
          console.log('📥 shouldClearData é false, não limpando dados');
        }
      }, 300);
    }
  } catch (error) {
    console.error('Erro ao finalizar semana:', error);
    showToast(error.message, 'error');
  }
}

// Função para gerar CSV sem imagens
export function generateCSVNoImages(includeGas = true) {
  // Validar dados antes de exportar
  const deliveryErrors = validateExportData(deliveries, 'Entrega');
  const gasErrors = includeGas ? validateExportData(gasEntries, 'Gastos') : [];
  
  const allErrors = [...deliveryErrors, ...gasErrors];
  if (allErrors.length > 0) {
    throw new Error(`Erros nos dados:\n${allErrors.join('\n')}`);
  }
  
  // Remover a coluna de Imagem
  const headers = ['Data', 'Tipo', 'ID', 'Número do Pedido', 'Valor Pedido', 'Valor Gastos', 'Descrição Gasto', 'Status'];
  const rows = [];
  
  // Adicionar entregas
  deliveries.forEach(delivery => {
    rows.push([
      delivery.date,
      'Entrega',
      delivery.id,
      delivery.orderNumber,
      delivery.fee,
      '',
      '',
      delivery.fee ? 'concluido' : 'pendente'
    ]);
  });
  
  // Adicionar registros de gastos se includeGas for true
  if (includeGas) {
    gasEntries.forEach(entry => {
      rows.push([
        entry.date,
        'Gastos',
        entry.id,
        '',
        '',
        entry.amount,
        entry.description || 'Gasto',
        'Pago'
      ]);
    });
  }
  
  // Converter para CSV
  return [
    headers.join(','),
    ...rows.map(row => row.map(field => {
      if (typeof field === 'string' && (field.includes(',') || field.includes('\n') || field.includes('"'))) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    }).join(','))
  ].join('\n');
}

// Função para backup sem imagens em CSV
export function backupNoImagesCSV(includeGas = true) {
  try {
    if (deliveries.length === 0 && (!includeGas || gasEntries.length === 0)) {
      throw new Error('Não há dados para exportar');
    }
    const date = new Date();
    const { fileName } = generateDeliveryIdentifiers(date);

    // Gerar CSV sem imagens
    const csvContent = generateCSVNoImages(includeGas);
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const csvUrl = URL.createObjectURL(csvBlob);

    // Download do CSV
    const link = document.createElement('a');
    link.href = csvUrl;
    link.download = `backup-sem-imagens-${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(csvUrl);

    const totalEntries = deliveries.length + (includeGas ? gasEntries.length : 0);
    showToast(`Backup sem imagens realizado com sucesso! ${totalEntries} registros exportados.`, 'success');
  } catch (error) {
    console.error('Erro ao fazer backup sem imagens:', error);
    showToast(error.message, 'error');
  }
}

/**
 * Exibe o modal para seleção de opções de exportação CSV
 */
export function showExportModal() {
  // Obter referência ao modal já existente no HTML
  const modal = document.getElementById('exportModal');
  if (!modal) {
    console.error('Modal de exportação não encontrado');
    return;
  }
  
  // Exibir o modal
  modal.style.display = 'flex';
  
  // Obter referências aos elementos do modal
  const deliveriesCheckbox = document.getElementById('exportDeliveries');
  const gasCheckbox = document.getElementById('exportGas');
  const imagesCheckbox = document.getElementById('exportImages');
  
  const deliveriesGroup = document.getElementById('exportDeliveriesGroup');
  const gasGroup = document.getElementById('exportGasGroup');
  const imagesGroup = document.getElementById('exportImagesGroup');
  
  // Limpar listeners antigos para evitar duplicação
  const newDeliveriesGroup = deliveriesGroup.cloneNode(true);
  const newGasGroup = gasGroup.cloneNode(true);
  const newImagesGroup = imagesGroup.cloneNode(true);
  
  deliveriesGroup.parentNode.replaceChild(newDeliveriesGroup, deliveriesGroup);
  gasGroup.parentNode.replaceChild(newGasGroup, gasGroup);
  imagesGroup.parentNode.replaceChild(newImagesGroup, imagesGroup);
  
  // Obter os novos checkboxes após a clonagem
  const newDeliveriesCheckbox = document.getElementById('exportDeliveries');
  const newGasCheckbox = document.getElementById('exportGas');
  const newImagesCheckbox = document.getElementById('exportImages');
  
  // Adicionar evento de clique nos grupos completos para melhor experiência móvel
  newDeliveriesGroup.addEventListener('click', (e) => {
    if (e.target !== newDeliveriesCheckbox) {
      newDeliveriesCheckbox.checked = !newDeliveriesCheckbox.checked;
    }
  });
  
  newGasGroup.addEventListener('click', (e) => {
    if (e.target !== newGasCheckbox) {
      newGasCheckbox.checked = !newGasCheckbox.checked;
    }
  });
  
  newImagesGroup.addEventListener('click', (e) => {
    if (e.target !== newImagesCheckbox) {
      newImagesCheckbox.checked = !newImagesCheckbox.checked;
    }
  });
  
  // Adicionar estilo para aumentar a área clicável
  const styleGroups = [newDeliveriesGroup, newGasGroup, newImagesGroup];
  styleGroups.forEach(group => {
    group.style.cursor = 'pointer';
    group.style.padding = '12px 8px';
    group.style.margin = '8px 0';
    group.style.borderRadius = '4px';
    group.style.border = '1px solid #e0e0e0';
    group.style.transition = 'background-color 0.2s';
    
    // Adicionar efeito hover com JavaScript para melhor desempenho
    group.addEventListener('mouseover', () => {
      group.style.backgroundColor = '#f5f5f5';
    });
    
    group.addEventListener('mouseout', () => {
      group.style.backgroundColor = '';
    });
  });
  
  // Limpar e adicionar event listeners para os botões
  const cancelBtn = document.getElementById('cancelExport');
  const confirmBtn = document.getElementById('confirmExport');
  const exportImagesBtn = document.getElementById('exportOnlyImages');
  
  const newCancelBtn = cancelBtn.cloneNode(true);
  const newConfirmBtn = confirmBtn.cloneNode(true);
  const newExportImagesBtn = exportImagesBtn.cloneNode(true);
  
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  exportImagesBtn.parentNode.replaceChild(newExportImagesBtn, exportImagesBtn);
  
  newCancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  newConfirmBtn.addEventListener('click', () => {
    // Obter opções selecionadas
    const includeDeliveries = document.getElementById('exportDeliveries').checked;
    const includeGas = document.getElementById('exportGas').checked;
    const includeImages = document.getElementById('exportImages').checked;
    
    // Validar que pelo menos um tipo de dado foi selecionado
    if (!includeDeliveries && !includeGas) {
      showToast('Selecione pelo menos um tipo de dado para exportar', 'error');
      return;
    }
    
    // Exportar com as opções selecionadas
    exportCustomCSV(includeDeliveries, includeGas, includeImages);
    
    // Fechar o modal
    modal.style.display = 'none';
  });

  // Adicionar evento para o botão de exportar somente imagens
  newExportImagesBtn.addEventListener('click', async () => {
    try {
      // Fechamos o modal antes de mostrar o novo modal de imagens
      modal.style.display = 'none';
      
      // Mostrar o modal de opções de exportação de imagens
      showImagesExportModal();
    } catch (error) {
      console.error('Erro ao abrir modal de exportação de imagens:', error);
      showToast(error.message, 'error');
    }
  });
  
  // Impedir que cliques na caixa modal propaguem para fechar o modal
  const modalContent = modal.querySelector('.edit-modal');
  modalContent.addEventListener('click', event => {
    event.stopPropagation();
  });
  
  // Fechar o modal ao clicar fora dele
  modal.addEventListener('click', () => {
    modal.style.display = 'none';
  });
}

/**
 * Exporta dados para CSV com opções personalizadas
 * @param {boolean} includeDeliveries - Se deve incluir entregas
 * @param {boolean} includeGas - Se deve incluir abastecimentos
 * @param {boolean} includeImages - Se deve incluir referências às imagens
 */
export function exportCustomCSV(includeDeliveries = true, includeGas = true, includeImages = true) {
  try {
    // Usar todos os dados disponíveis
    let filteredDeliveries = [...deliveries];
    let filteredGasEntries = [...gasEntries];
    
    // Verificar se há dados para exportar
    if (
      (!includeDeliveries || filteredDeliveries.length === 0) && 
      (!includeGas || filteredGasEntries.length === 0)
    ) {
      throw new Error('Não há dados para exportar');
    }
    
    // Definir cabeçalhos com base nas opções
    let headers = ['Data', 'Tipo', 'ID', 'Número do Pedido', 'Valor Pedido'];
    if (includeGas) {
      headers.push('Valor Gastos');
      headers.push('Descrição Gasto');
    }
    headers.push('Status');
    if (includeImages) headers.push('Imagem');
    
    const rows = [];
    
    // Adicionar entregas filtradas se solicitado
    if (includeDeliveries) {
      filteredDeliveries.forEach(delivery => {
        const row = [
          delivery.date,
          'Entrega',
          delivery.id,
          delivery.orderNumber,
          delivery.fee,
        ];
        
        if (includeGas) {
          row.push(''); // Coluna vazia para valor gastos
          row.push(''); // Coluna vazia para descrição gasto
        }
        
        row.push(delivery.fee ? 'concluido' : 'pendente');
        
        if (includeImages) row.push(delivery.image || '');
        
        rows.push(row);
      });
    }
    
    // Adicionar registros de gastos filtrados se solicitado
    if (includeGas) {
      filteredGasEntries.forEach(entry => {
        const row = [
          entry.date,
          'Gastos',
          entry.id,
          '',
          '',
        ];
        
        if (includeGas) {
          row.push(entry.amount);
          row.push(entry.description || 'Gasto');
        }
        
        row.push('Pago');
        
        if (includeImages) row.push(entry.image || '');
        
        rows.push(row);
      });
    }
    
    // Converter para CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => {
        if (typeof field === 'string' && (field.includes(',') || field.includes('\n') || field.includes('"'))) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      }).join(','))
    ].join('\n');
    
    // Gerar nome do arquivo
    const date = new Date();
    const { fileName } = generateDeliveryIdentifiers(date);
    
    // Criar sufixo para o nome do arquivo com base nas opções
    let suffix = '';
    if (!includeDeliveries) suffix += '-no-delivery';
    if (!includeGas) suffix += '-no-gas';
    if (!includeImages) suffix += '-no-images';
    
    // Nome do arquivo
    const downloadFilename = `exportacao${suffix}-${fileName}.csv`;
    
    // Verificar se estamos em um dispositivo móvel
    const isMobileDevice = window.innerWidth <= 768 || 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Download do CSV - usar método diferente para mobile
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    if (isMobileDevice) {
      try {
        // Para iOS Safari e alguns outros navegadores móveis
        if (navigator.share && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          // Criar um objeto de arquivo para compartilhar
          const file = new File([csvBlob], downloadFilename, { type: 'text/csv' });
          
          navigator.share({
            files: [file],
            title: 'Exportação de dados',
            text: 'Dados exportados do Sistema de Entregas'
          }).then(() => {
            showToast('Exportação concluída com sucesso!', 'success');
          }).catch(err => {
            console.error('Erro ao compartilhar arquivo:', err);
            // Fallback para método tradicional
            triggerDirectDownload();
          });
        } else {
          // Fallback para download direto
          triggerDirectDownload();
        }
      } catch (error) {
        console.error('Erro específico para mobile:', error);
        // Fallback para método tradicional
        triggerDirectDownload();
      }
    } else {
      // Método tradicional para desktop
      triggerDirectDownload();
    }
    
    // Função de fallback para download direto
    function triggerDirectDownload() {
      const csvUrl = URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      link.href = csvUrl;
      link.download = downloadFilename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(csvUrl);
      }, 100);
    }
    
    // Otimizar imagens armazenadas se incluir imagens
    if (includeImages) {
      optimizeStoredImages();
    }
    
    const totalEntries = 
      (includeDeliveries ? filteredDeliveries.length : 0) + 
      (includeGas ? filteredGasEntries.length : 0);
      
    showToast(`Exportação concluída com sucesso! ${totalEntries} registros exportados.`, 'success');
  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    showToast(error.message, 'error');
  }
}

/**
 * Exporta apenas as imagens dos pedidos como um arquivo ZIP
 * @param {boolean} includeDeliveryImages - Se deve incluir imagens das entregas
 * @param {boolean} includeGasImages - Se deve incluir imagens dos abastecimentos
 */
export async function exportOnlyImages(includeDeliveryImages = true, includeGasImages = true) {
  try {
    // Verificar se o JSZip está disponível (adicionamos como dependência dinâmica)
    if (typeof JSZip !== 'function') {
      // Carregar JSZip dinamicamente se não estiver disponível
      await loadJSZip();
    }
    
    // Criar nova instância do JSZip
    const zip = new JSZip();
    let imageCount = 0;

    // Adicionar imagens das entregas ao ZIP
    if (includeDeliveryImages) {
      deliveries.forEach(delivery => {
        if (delivery.image) {
          // Verificar o formato da imagem (otimizado ou completo)
          const imageData = delivery.image.startsWith('data:') 
            ? delivery.image.split(',')[1]  // Extrair apenas os dados base64
            : delivery.image;               // Já está em formato otimizado
          
          // Nome do arquivo: orderNumber_date.jpg
          const fileName = `pedido_${delivery.orderNumber}_${delivery.date}.jpg`;
          zip.file(fileName, imageData, { base64: true });
          imageCount++;
        }
      });
    }

    // Adicionar imagens dos abastecimentos ao ZIP
    if (includeGasImages) {
      gasEntries.forEach((entry, index) => {
        if (entry.image) {
          // Verificar o formato da imagem
          const imageData = entry.image.startsWith('data:') 
            ? entry.image.split(',')[1] 
            : entry.image;
          
          // Nome do arquivo: gas_date_index.jpg
          const fileName = `gasolina_${entry.date}_${index + 1}.jpg`;
          zip.file(fileName, imageData, { base64: true });
          imageCount++;
        }
      });
    }

    // Verificar se há imagens para exportar
    if (imageCount === 0) {
      throw new Error('Não há imagens para exportar');
    }

    // Gerar nome do arquivo ZIP
    const date = new Date();
    const { fileName } = generateDeliveryIdentifiers(date);
    let suffix = '';
    if (!includeDeliveryImages) suffix += '-no-delivery';
    if (!includeGasImages) suffix += '-no-gas';
    const zipFileName = `imagens${suffix}-${fileName}.zip`;

    // Gerar o arquivo ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Verificar se estamos em um dispositivo móvel
    const isMobileDevice = window.innerWidth <= 768 || 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobileDevice) {
      try {
        // Para iOS Safari e outros navegadores móveis com suporte ao Web Share API
        if (navigator.share && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          const file = new File([zipBlob], zipFileName, { type: 'application/zip' });
          
          navigator.share({
            files: [file],
            title: 'Imagens Exportadas',
            text: 'Imagens exportadas do Sistema de Entregas'
          }).then(() => {
            showToast(`Exportação de imagens concluída! ${imageCount} imagens exportadas.`, 'success');
          }).catch(err => {
            console.error('Erro ao compartilhar arquivo:', err);
            // Fallback para download direto
            downloadZipFile(zipBlob, zipFileName);
          });
        } else {
          // Fallback para download direto
          downloadZipFile(zipBlob, zipFileName);
        }
      } catch (error) {
        console.error('Erro específico para mobile:', error);
        downloadZipFile(zipBlob, zipFileName);
      }
    } else {
      // Método tradicional para desktop
      downloadZipFile(zipBlob, zipFileName);
    }
    
    showToast(`Exportação de imagens concluída! ${imageCount} imagens exportadas.`, 'success');
  } catch (error) {
    console.error('Erro ao exportar imagens:', error);
    showToast(error.message, 'error');
  }
}

/**
 * Função auxiliar para fazer download do arquivo ZIP
 * @param {Blob} blob - Blob do arquivo ZIP
 * @param {string} fileName - Nome do arquivo para download
 */
function downloadZipFile(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Carrega a biblioteca JSZip dinamicamente
 * @returns {Promise} Promessa resolvida quando a biblioteca é carregada
 */
function loadJSZip() {
  return new Promise((resolve, reject) => {
    // Verificar se o JSZip já está disponível
    if (typeof JSZip === 'function') {
      resolve();
      return;
    }
    
    // Criar elemento de script para carregar JSZip
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.integrity = 'sha512-XMVd28F1oH/O71fzwBnV7HucLxVwtxf26XV8P4wPk26EDxuGZ91N8bsOttmnomcCD3CS5ZMRL50H0GgOHvegtg==';
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      resolve();
    };
    
    script.onerror = () => {
      reject(new Error('Falha ao carregar biblioteca JSZip'));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * Exibe o modal para seleção de opções de exportação de imagens
 */
export function showImagesExportModal() {
  // Obter referência ao modal
  const modal = document.getElementById('imagesExportModal');
  if (!modal) {
    console.error('Modal de exportação de imagens não encontrado');
    return;
  }
  
  // Exibir o modal
  modal.style.display = 'flex';
  
  // Obter referências aos elementos do modal
  const deliveryImagesCheckbox = document.getElementById('exportDeliveryImages');
  const gasImagesCheckbox = document.getElementById('exportGasImages');
  
  const deliveryImagesGroup = document.getElementById('exportDeliveryImagesGroup');
  const gasImagesGroup = document.getElementById('exportGasImagesGroup');
  
  // Limpar listeners antigos para evitar duplicação
  const newDeliveryImagesGroup = deliveryImagesGroup.cloneNode(true);
  const newGasImagesGroup = gasImagesGroup.cloneNode(true);
  
  deliveryImagesGroup.parentNode.replaceChild(newDeliveryImagesGroup, deliveryImagesGroup);
  gasImagesGroup.parentNode.replaceChild(newGasImagesGroup, gasImagesGroup);
  
  // Obter os novos checkboxes após a clonagem
  const newDeliveryImagesCheckbox = document.getElementById('exportDeliveryImages');
  const newGasImagesCheckbox = document.getElementById('exportGasImages');
  
  // Adicionar evento de clique nos grupos completos para melhor experiência móvel
  newDeliveryImagesGroup.addEventListener('click', (e) => {
    if (e.target !== newDeliveryImagesCheckbox) {
      newDeliveryImagesCheckbox.checked = !newDeliveryImagesCheckbox.checked;
    }
  });
  
  newGasImagesGroup.addEventListener('click', (e) => {
    if (e.target !== newGasImagesCheckbox) {
      newGasImagesCheckbox.checked = !newGasImagesCheckbox.checked;
    }
  });
  
  // Adicionar estilo para aumentar a área clicável
  const styleGroups = [newDeliveryImagesGroup, newGasImagesGroup];
  styleGroups.forEach(group => {
    group.style.cursor = 'pointer';
    group.style.padding = '12px 8px';
    group.style.margin = '8px 0';
    group.style.borderRadius = '4px';
    group.style.border = '1px solid #e0e0e0';
    group.style.transition = 'background-color 0.2s';
    
    // Adicionar efeito hover
    group.addEventListener('mouseover', () => {
      group.style.backgroundColor = '#f5f5f5';
    });
    
    group.addEventListener('mouseout', () => {
      group.style.backgroundColor = '';
    });
  });
  
  // Limpar e adicionar event listeners para os botões
  const cancelBtn = document.getElementById('cancelImagesExport');
  const confirmBtn = document.getElementById('confirmImagesExport');
  
  const newCancelBtn = cancelBtn.cloneNode(true);
  const newConfirmBtn = confirmBtn.cloneNode(true);
  
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  
  newCancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  newConfirmBtn.addEventListener('click', async () => {
    try {
      // Obter opções selecionadas
      const includeDeliveryImages = document.getElementById('exportDeliveryImages').checked;
      const includeGasImages = document.getElementById('exportGasImages').checked;
      
      // Validar que pelo menos um tipo de imagem foi selecionado
      if (!includeDeliveryImages && !includeGasImages) {
        showToast('Selecione pelo menos um tipo de imagem para exportar', 'error');
        return;
      }
      
      // Fechar o modal antes de começar o processo
      modal.style.display = 'none';
      
      // Mostrar toast informativo enquanto processa
      showToast('Preparando imagens para exportação...', 'info');
      
      // Exportar imagens com as opções selecionadas
      await exportOnlyImages(includeDeliveryImages, includeGasImages);
    } catch (error) {
      console.error('Erro ao exportar imagens:', error);
      showToast(error.message, 'error');
    }
  });
  
  // Impedir que cliques na caixa modal propaguem para fechar o modal
  const modalContent = modal.querySelector('.edit-modal');
  modalContent.addEventListener('click', event => {
    event.stopPropagation();
  });
  
  // Fechar o modal ao clicar fora dele
  modal.addEventListener('click', () => {
    modal.style.display = 'none';
  });
}

/**
 * Clears all form inputs and image previews in the application
 */
function clearFormInputs() {
  try {
    // Clear delivery form
    const orderForm = document.getElementById('deliveryForm');
    if (orderForm) orderForm.reset();
    
    // Set date fields to current date
    const dateFields = ['date', 'gasDate'];
    const currentDate = getCurrentDate();
    dateFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) field.value = currentDate;
    });
    
    // Clear image previews
    const imagePreviews = ['imagePreview', 'editImagePreview'];
    imagePreviews.forEach(previewId => {
      const preview = document.getElementById(previewId);
      if (preview) preview.innerHTML = '';
    });
    
    // Clear any error messages
    const errorMessages = document.querySelectorAll('.error-message');
    errorMessages.forEach(error => {
      error.textContent = '';
    });
    
    // Clear table bodies
    const tableBodies = ['deliveriesTableBody', 'gasTableBody'];
    tableBodies.forEach(tableId => {
      const table = document.getElementById(tableId);
      if (table) table.innerHTML = '';
    });
    
    // Reset totals
    const totalElements = ['totalFees', 'totalGas', 'netProfit'];
    totalElements.forEach(elementId => {
      const element = document.getElementById(elementId);
      if (element) element.textContent = '0.00';
    });
    
    // Clear search inputs
    const searchInputs = ['searchInput', 'gasSearchInput'];
    searchInputs.forEach(inputId => {
      const input = document.getElementById(inputId);
      if (input) input.value = '';
    });
    
    // Clear analytics section
    const analyticsSections = [
      'financialSummary',
      'revenueExpenseChart',
      'expenseDeliveryRatio',
      'expenseIncomeRatio',
      'performanceMetrics',
      'bestDay',
      'worstDay'
    ];
    
    analyticsSections.forEach(sectionId => {
      const section = document.getElementById(sectionId);
      if (section) section.innerHTML = '<p class="empty-state">Nenhum dado cadastrado</p>';
    });
    
    console.log('All form inputs and UI elements cleared successfully');
  } catch (error) {
    console.error('Error clearing form inputs:', error);
  }
} 