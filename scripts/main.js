// Importação dos módulos
import { setupDeliveryForm, setupGasForm, setupEditForms, setupTabs } from './setup.js';
import { loadDeliveries, loadGasEntries } from './data.js';
import { renderAnalytics } from './analytics.js';
import { setupMobileOptimizations } from './mobile.js';
import { updateTotals } from './data.js';
import { initializeApp } from './setup.js';
import { initializeImageZoom } from './imageZoom.js';
import { showExportModal } from './export.js';
import { 
  cleanupUnusedResources,
  applyMemoryOptimizations,
  detectAndRecoverFromMemoryIssues
} from './mobileOptimizations.js';
// Import the base path utilities
import { initializeBasePath, resolvePath } from './basePath.js';

// Ensure base path is initialized early
initializeBasePath();

// Espera o DOM estar pronto
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Only reference the loading screen, don't try to manage it here
    // since it's already managed by the inline script
    const container = document.querySelector('.container');
    
    // Cleanup any resources first to ensure a clean startup
    cleanupUnusedResources();
    
    // Aplicar otimizações de memória antes de iniciar o carregamento
    applyMemoryOptimizations();
    
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
    
    // Event listener para limpar todos os dados
    const clearAllDataBtn = document.getElementById('clearAllDataButton');
    if (clearAllDataBtn) clearAllDataBtn.addEventListener('click', handleClearAllData);
    
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
    
    // Detectar e recuperar de problemas de memória
    setTimeout(() => {
      detectAndRecoverFromMemoryIssues();
    }, 2000);
    
    // Mark the application as ready but let the inline script handle the loading screen
    if (container) {
      container.classList.add('loaded');
      
      // Final cleanup após carregamento completo
      cleanupUnusedResources();
    }
    
    console.log('Aplicação inicializada com sucesso');
    
  } catch (error) {
    console.error('Erro ao inicializar aplicação:', error);
    
    // In case of error, make sure the application is still shown
    const container = document.querySelector('.container');
    
    if (container) {
      container.classList.add('loaded');
    }
  }
});

/**
 * Handles the clear all data button click
 */
async function handleClearAllData() {
  // Import the clearAllData function
  const { clearAllData } = await import('./export.js');
  
  // Show confirmation dialog with detailed warning
  const confirmed = confirm(
    '⚠️ ATENÇÃO: ESTA AÇÃO NÃO PODE SER DESFEITA!\n\n' +
    'Isso irá APAGAR PERMANENTEMENTE:\n' +
    '• Todos os pedidos registrados\n' +
    '• Todos os gastos de gasolina\n' +
    '• Todas as imagens anexadas\n' +
    '• Todos os dados de análise\n' +
    '• Todos os backups automáticos\n\n' +
    'Tem certeza absoluta que deseja continuar?\n\n' +
    'Recomendamos fazer uma exportação antes de limpar os dados.'
  );
  
  if (confirmed) {
    // Double confirmation for safety
    const doubleConfirmed = confirm(
      '🚨 ÚLTIMA CONFIRMAÇÃO\n\n' +
      'Você está prestes a APAGAR TODOS OS DADOS.\n' +
      'Esta ação é IRREVERSÍVEL.\n\n' +
      'Clique OK apenas se tiver certeza absoluta.'
    );
    
    if (doubleConfirmed) {
      try {
        console.log('🗑️ Iniciando limpeza completa de dados...');
        
        // Call the clearAllData function
        await clearAllData();
        
        console.log('✅ Limpeza completa de dados concluída');
        
        // Show success message
        alert('✅ Todos os dados foram limpos com sucesso!\n\nA página será recarregada para refletir as mudanças.');
        
        // Reload the page to show clean state
        window.location.reload();
        
      } catch (error) {
        console.error('❌ Erro ao limpar dados:', error);
        alert('❌ Erro ao limpar os dados: ' + error.message + '\n\nTente novamente ou use o Diagnóstico de Dados.');
      }
    } else {
      console.log('Limpeza de dados cancelada pelo usuário (segunda confirmação)');
    }
  } else {
    console.log('Limpeza de dados cancelada pelo usuário (primeira confirmação)');
  }
} 