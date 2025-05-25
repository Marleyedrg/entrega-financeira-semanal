// Importação dos módulos
import { setupDeliveryForm, setupGasForm, setupEditForms, setupTabs } from './setup.js';
import { loadDeliveries, loadGasEntries } from './data.js';
import { renderAnalytics } from './analytics.js';
import { setupMobileOptimizations } from './mobile.js';
import { updateTotals } from './data.js';
import { initializeApp } from './setup.js';
import { initializeImageZoom } from './imageZoom.js';
import { showExportModal } from './export.js';
import { cleanupUnusedResources } from './mobileOptimizations.js';

// Espera o DOM estar pronto
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Cleanup any resources first to ensure a clean startup
    cleanupUnusedResources();
    
    // Carrega os dados
    await Promise.all([
      loadDeliveries(),
      loadGasEntries()
    ]);
    
    // Atualiza os totais
    updateTotals();

    // Configurar otimizações para dispositivos móveis
    setupMobileOptimizations();
    
    // Configurar event listeners dos formulários
    setupDeliveryForm();
    setupGasForm();
    setupEditForms();
    
    // Configurar event listeners das tabs
    setupTabs();

    // Inicializa a aplicação
    initializeApp();

    // Inicializa o zoom de imagem
    initializeImageZoom();

    // Event listener para modal de exportação
    const exportBtn = document.getElementById('exportButton');
    if (exportBtn) exportBtn.addEventListener('click', showExportModal);
    
    // Listen for browser beforesunload event to clean up resources
    window.addEventListener('beforeunload', () => {
      cleanupUnusedResources();
    });
    
    // Force cleanup every time main tab is changed
    const tabButtons = document.querySelectorAll('.tab-button');
    if (tabButtons.length) {
      tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          setTimeout(() => cleanupUnusedResources(), 100);
        });
      });
    }
    
  } catch (error) {
    console.error('Erro ao inicializar aplicação:', error);
  }
}); 