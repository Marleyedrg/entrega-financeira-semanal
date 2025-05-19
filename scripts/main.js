// Importação dos módulos
import { setupDeliveryForm, setupGasForm, setupEditForms, setupTabs } from './setup.js';
import { loadDeliveries, loadGasEntries } from './data.js';
import { renderAnalytics } from './analytics.js';
import { setupMobileOptimizations } from './mobile.js';
import { updateTotals } from './data.js';
import { initializeApp } from './setup.js';
import { initializeImageZoom } from './imageZoom.js';
import { showExportModal } from './export.js';

// Espera o DOM estar pronto
document.addEventListener('DOMContentLoaded', async () => {
  try {
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
  } catch (error) {
    console.error('Erro ao inicializar aplicação:', error);
  }
}); 