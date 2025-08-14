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
import { initializeBills } from './billsManager.js';

// Ensure base path is initialized early
initializeBasePath();

// Espera o DOM estar pronto
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Only reference the loading screen, don't try to manage it here
    // since it's already managed by the inline script
    const container = document.querySelector('.container');
    
    // Check if we just completed a data clearing operation (GitHub Pages aware)
    const justCleared = sessionStorage.getItem('dataJustCleared');
    const githubPagesCleared = sessionStorage.getItem('github_pages_cleared');
    
    if (justCleared || githubPagesCleared) {
      console.log('🧹 Verificando limpeza de dados pós-reload (GitHub Pages)...');
      
      // Double-check that data is actually cleared
      const remainingDeliveries = localStorage.getItem('deliveries');
      const remainingGas = localStorage.getItem('gasEntries');
      
      if (remainingDeliveries && remainingDeliveries !== '[]') {
        console.warn('⚠️ Dados de entregas ainda presentes após limpeza GitHub Pages, forçando remoção...');
        localStorage.setItem('deliveries', '[]');
      }
      
      if (remainingGas && remainingGas !== '[]') {
        console.warn('⚠️ Dados de gastos ainda presentes após limpeza GitHub Pages, forçando remoção...');
        localStorage.setItem('gasEntries', '[]');
      }
      
      // Clear the flags
      sessionStorage.removeItem('dataJustCleared');
      sessionStorage.removeItem('github_pages_cleared');
      sessionStorage.removeItem('github_pages_clearing'); // Also clear any remaining clearing flag
      
      console.log('✅ Verificação pós-limpeza GitHub Pages concluída');
    }
    
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

    // Inicializa o módulo de contas fixas
    initializeBills();

    // Configure footer buttons with retry mechanism
    setupFooterButtons();
    
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
    
    console.log('✅ Sistema inicializado com sucesso');
  } catch (error) {
    console.error('❌ Erro durante inicialização:', error);
    alert('Erro durante inicialização: ' + error.message);
  }
});

/**
 * Handles the clear all data button click - GitHub Pages Optimized
 */
async function handleClearAllData() {
  // Import the clearAllData function (bills data will be preserved)
  const { clearAllData } = await import('./export.js');
  const { getDeviceCapabilities } = await import('./mobile.js');
  
  // Get device information for better user experience
  const deviceInfo = getDeviceCapabilities();
  console.log('🔧 Device capabilities detected (GitHub Pages):', deviceInfo);
  
  // GitHub Pages specific confirmation message
  const githubPagesWarning = deviceInfo.isGitHubPages ? 
    '\n🌐 Executando no GitHub Pages - processo otimizado para hospedagem estática.' :
    '';
  
  // Adjust confirmation message based on device
  const deviceSpecificWarning = deviceInfo.isMobile ? 
    '\n⏱️ Em dispositivos móveis, este processo pode levar alguns segundos.' :
    '';
  
  // Show confirmation dialog with detailed warning
  const confirmed = confirm(
    '⚠️ ATENÇÃO: ESTA AÇÃO NÃO PODE SER DESFEITA!\n\n' +
          'Isso irá APAGAR PERMANENTEMENTE:\n' +
      '• Todos os pedidos registrados\n' +
      '• Todos os gastos de gasolina\n' +
      '• Todas as imagens anexadas\n' +
      '• Todos os dados de análise\n' +
      '• Todos os backups automáticos\n\n' +
      '✅ OS DADOS DA ABA "CONTAS FIXAS" SERÃO PRESERVADOS\n' +
      '(Renda mensal e contas cadastradas não serão apagadas)\n\n' +
      'Recomendamos fazer uma exportação antes de limpar os dados.' +
      githubPagesWarning +
      deviceSpecificWarning
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
      let loadingToast = null;
      
      try {
        console.log('🗑️ Iniciando limpeza de dados no GitHub Pages (preservando Contas Fixas)...');
        console.log('📱 Device info:', deviceInfo);
        
        // Show enhanced loading indicator with GitHub Pages specific messaging
        if (deviceInfo.isMobile || deviceInfo.isOldBrowser || deviceInfo.isGitHubPages) {
          let loadingMessage;
          
          if (deviceInfo.isGitHubPages && deviceInfo.isMobile) {
            loadingMessage = '🧹 Limpando dados (GitHub Pages + Mobile)...';
          } else if (deviceInfo.isGitHubPages) {
            loadingMessage = '🧹 Limpando dados (GitHub Pages)...';
          } else if (deviceInfo.isOldBrowser) {
            loadingMessage = '🧹 Limpando dados (compatibilidade estendida)...';
          } else {
            loadingMessage = `🧹 Limpando dados (${deviceInfo.isIOS ? 'iOS' : deviceInfo.isAndroid ? 'Android' : 'Mobile'})...`;
          }
          
          loadingToast = document.createElement('div');
          loadingToast.id = 'clearingLoadingToast';
          loadingToast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="
                width: 20px; 
                height: 20px; 
                border: 2px solid #fff; 
                border-top: 2px solid transparent; 
                border-radius: 50%; 
                animation: spin 1s linear infinite;
              "></div>
              <span>${loadingMessage}</span>
            </div>
            <style>
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
          `;
          loadingToast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(51, 51, 51, 0.95);
            color: white;
            padding: 20px 28px;
            border-radius: 12px;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            backdrop-filter: blur(10px);
            max-width: 80vw;
            text-align: center;
          `;
          document.body.appendChild(loadingToast);
        }
        
        // Call the clearAllData function optimized for GitHub Pages
        await clearAllData();
        
        console.log('✅ Limpeza de dados GitHub Pages concluída (Contas Fixas preservadas)');
        
        // Remove loading indicator
        if (loadingToast) {
          loadingToast.remove();
        }
        
        // GitHub Pages specific success message
        let successDetails = '';
        if (deviceInfo.isGitHubPages && deviceInfo.isMobile) {
          successDetails = '\n💡 Cache do navegador mobile e GitHub Pages foi limpo completamente.';
        } else if (deviceInfo.isGitHubPages) {
          successDetails = '\n💡 Cache GitHub Pages foi limpo completamente.';
        } else if (deviceInfo.isMobile) {
          successDetails = '\n💡 Cache do navegador mobile foi limpo completamente.';
        } else if (deviceInfo.isOldBrowser) {
          successDetails = '\n💡 Compatibilidade estendida aplicada com sucesso.';
        }
        
        // Show success message
        alert('✅ Dados limpos com sucesso!\n\n' +
              '• Pedidos e gastos foram apagados\n' +
              '• Contas Fixas foram preservadas\n' +
              successDetails + '\n\n' +
              'A página será recarregada para refletir as mudanças.');
        
        // Set flag for post-reload verification
        sessionStorage.setItem('dataJustCleared', 'true');
        sessionStorage.setItem('github_pages_cleared', Date.now().toString());
        
        // GitHub Pages specific reload delays
        let reloadDelay;
        if (deviceInfo.isGitHubPages && deviceInfo.isMobile) {
          reloadDelay = 1200; // Extra time for GitHub Pages + mobile
        } else if (deviceInfo.isGitHubPages) {
          reloadDelay = 1000; // GitHub Pages standard delay
        } else if (deviceInfo.isMobile) {
          reloadDelay = 800;
        } else if (deviceInfo.isOldBrowser) {
          reloadDelay = 1000;
        } else {
          reloadDelay = 500;
        }
        
        setTimeout(() => {
          // Force a hard reload optimized for GitHub Pages
          if (deviceInfo.isGitHubPages || deviceInfo.isMobile || deviceInfo.isOldBrowser) {
            // For GitHub Pages, mobile and old browsers, use location.href for complete reload
            window.location.href = window.location.href + '?cleared=' + Date.now();
          } else {
            // For modern desktop browsers, regular reload should work
            window.location.reload(true);
          }
        }, reloadDelay);
        
      } catch (error) {
        console.error('❌ Erro ao limpar dados no GitHub Pages:', error);
        
        // Remove loading indicator in case of error
        if (loadingToast) {
          loadingToast.remove();
        }
        
        // Enhanced error message with GitHub Pages specific troubleshooting
        let errorHelp = '';
        if (deviceInfo.isGitHubPages && deviceInfo.isMobile) {
          errorHelp = '\n\n💡 Dica GitHub Pages + Mobile: Tente fechar outras abas e aguarde alguns segundos antes de tentar novamente.';
        } else if (deviceInfo.isGitHubPages) {
          errorHelp = '\n\n💡 Dica GitHub Pages: Aguarde alguns segundos e tente novamente (pode haver delay do CDN).';
        } else if (deviceInfo.isMobile) {
          errorHelp = '\n\n💡 Dica móvel: Tente fechar outras abas do navegador e tente novamente.';
        } else if (deviceInfo.isOldBrowser) {
          errorHelp = '\n\n💡 Dica: Seu navegador pode precisar de uma atualização para melhor compatibilidade.';
        } else if (!deviceInfo.hasLocalStorage) {
          errorHelp = '\n\n💡 Problema: Armazenamento local não disponível neste navegador.';
        }
        
        alert('❌ Erro ao limpar os dados: ' + error.message + 
              errorHelp + 
              '\n\nTente novamente ou use o Diagnóstico de Dados.');
      }
    } else {
      console.log('Limpeza de dados cancelada pelo usuário (segunda confirmação)');
    }
  } else {
    console.log('Limpeza de dados cancelada pelo usuário (primeira confirmação)');
  }
}

/**
 * Sets up footer buttons with retry mechanism
 */
function setupFooterButtons() {
  // Simple setup with fallback to onclick handlers
  setTimeout(() => {
    const exportBtn = document.getElementById('exportButton');
    const clearAllDataBtn = document.getElementById('clearAllDataButton');
    
    if (exportBtn) {
      console.log('✅ Export button found');
      // The onclick handler is already set in HTML as fallback
    } else {
      console.warn('❌ Export button not found');
    }
    
    if (clearAllDataBtn) {
      console.log('✅ Clear data button found');
      // The onclick handler is already set in HTML as fallback
    } else {
      console.warn('❌ Clear data button not found');
    }
  }, 500);
}

/**
 * Global function for export button onclick
 */
window.handleExportClick = function() {
  console.log('🖱️ Export button clicked via onclick');
  try {
    showExportModal();
  } catch (error) {
    console.error('❌ Error in showExportModal:', error);
    alert('Erro ao abrir modal de exportação: ' + error.message);
  }
};

/**
 * Global function for clear data button onclick
 */
window.handleClearAllDataClick = function() {
  console.log('🖱️ Clear data button clicked via onclick');
  try {
    handleClearAllData();
  } catch (error) {
    console.error('❌ Error in handleClearAllData:', error);
    alert('Erro ao limpar dados: ' + error.message);
  }
}; 