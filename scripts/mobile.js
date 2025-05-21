// Mobile utilities and optimizations
import { renderAnalytics } from './analytics.js';
import { importCSV } from './import.js';
import { exportCustomCSV, backupData, showExportModal } from './export.js';

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
    // Override click handler to use mobile-friendly approach
    const originalClickHandler = importButton.onclick;
    importButton.onclick = (e) => {
      // For iOS and other systems that don't support file input well
      if (isMobileDevice() && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        e.preventDefault();
        
        alert('Para importar no iOS, use o botão "Escolher arquivo" e selecione um arquivo CSV.');
        
        // Improve file input for mobile
        csvInput.accept = ".csv,text/csv";
        csvInput.click();
      } else if (originalClickHandler) {
        originalClickHandler.call(importButton, e);
      } else {
        csvInput.click();
      }
    };
    
    // Add special handling for the file input on mobile
    csvInput.onchange = function(event) {
      if (isMobileDevice()) {
        importCSV(event);
      }
    };
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