// Importação dos módulos
import { setupDeliveryForm, setupGasForm, setupEditForms, setupTabs } from './setup.js';
import { loadDeliveries, loadGasEntries, updateTotals } from './data.js';
import { renderAnalytics } from './analytics.js';
import { setupMobileOptimizations } from './mobile.js';

// Inicialização do aplicativo
document.addEventListener('DOMContentLoaded', () => {
  // Carregar dados salvos
  loadDeliveries();
  loadGasEntries();
  updateTotals();
  
  // Configurar otimizações para dispositivos móveis
  setupMobileOptimizations();
  
  // Configurar event listeners dos formulários
  setupDeliveryForm();
  setupGasForm();
  setupEditForms();
  
  // Configurar event listeners das tabs
  setupTabs();
}); 