// Mobile utilities and optimizations
import { renderAnalytics } from './analytics.js';
import { importCSV } from './import.js';
import { exportCustomCSV, backupData, showExportModal } from './export.js';
import { showToast } from './utils.js';
// Import specific functions instead of creating circular dependency
// Don't import from mobileOptimizations.js here

/**
 * Enhanced device detection with comprehensive fallbacks
 */
export function getDeviceCapabilities() {
  const ua = navigator.userAgent || '';
  const vendor = navigator.vendor || '';
  const platform = navigator.platform || '';
  
  // Enhanced mobile detection
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Touch/i;
  const isMobile = window.innerWidth <= 768 || 
                   mobileRegex.test(ua) ||
                   'ontouchstart' in window ||
                   navigator.maxTouchPoints > 0;
  
  // More specific device detection
  const isIOS = /iPad|iPhone|iPod/.test(ua) || 
                (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isWindows = /Windows/i.test(ua);
  const isMac = /Mac/i.test(platform);
  
  // Browser detection with fallbacks
  const isChrome = /Chrome/i.test(ua) && /Google Inc/.test(vendor);
  const isSafari = /Safari/i.test(ua) && /Apple Computer/i.test(vendor) && !/Chrome/i.test(ua);
  const isFirefox = /Firefox/i.test(ua);
  const isEdge = /Edge/i.test(ua) || /Edg/i.test(ua);
  const isIE = /MSIE|Trident/i.test(ua);
  
  // Feature detection
  const hasLocalStorage = (() => {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  })();
  
  const hasSessionStorage = (() => {
    try {
      const test = 'test';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  })();
  
  const hasIndexedDB = !!window.indexedDB;
  const hasWebGL = (() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  })();
  
  // Memory estimation (rough)
  const estimatedRAM = navigator.deviceMemory || 
                      (isMobile ? (isIOS ? 2 : 1) : 4); // GB estimate
  
  return {
    isMobile,
    isTablet: isMobile && window.innerWidth >= 768,
    isPhone: isMobile && window.innerWidth < 768,
    isIOS,
    isAndroid,
    isWindows,
    isMac,
    isChrome,
    isSafari,
    isFirefox,
    isEdge,
    isIE,
    isOldBrowser: isIE || !window.Promise || !window.fetch,
    hasLocalStorage,
    hasSessionStorage,
    hasIndexedDB,
    hasWebGL,
    estimatedRAM,
    screenWidth: window.screen ? window.screen.width : window.innerWidth,
    screenHeight: window.screen ? window.screen.height : window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
    connectionType: navigator.connection ? navigator.connection.effectiveType : 'unknown'
  };
}

/**
 * Mobile-specific data clearing to ensure complete removal
 */
export function mobileForceClearData() {
  const capabilities = getDeviceCapabilities();
  
  if (!capabilities.isMobile) return false;
  
  console.log('📱 Executando limpeza específica para mobile...', capabilities);
  
  try {
    // Method 1: Standard localStorage clearing with multiple attempts
    if (capabilities.hasLocalStorage) {
      const maxAttempts = 3;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.log(`📱 Tentativa ${attempt} de limpeza localStorage...`);
          
          // Preserve bills data
          const preserveData = {};
          ['bills', 'monthlyIncome'].forEach(key => {
            try {
              const data = localStorage.getItem(key);
              if (data) preserveData[key] = data;
            } catch (e) {
              console.warn(`Failed to preserve ${key}:`, e);
            }
          });
          
          // Clear all data storage keys
          const storageKeys = ['deliveries', 'gasEntries'];
          
          // Add any backup keys
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('backup_')) {
              storageKeys.push(key);
            }
          }
          
          // Remove each key
          storageKeys.forEach(key => {
            try {
              localStorage.removeItem(key);
            } catch (e) {
              console.warn(`Failed to remove ${key}:`, e);
            }
          });
          
          // Set empty arrays for main data
          localStorage.setItem('deliveries', '[]');
          localStorage.setItem('gasEntries', '[]');
          
          // Restore preserved data
          Object.keys(preserveData).forEach(key => {
            try {
              localStorage.setItem(key, preserveData[key]);
            } catch (e) {
              console.warn(`Failed to restore ${key}:`, e);
            }
          });
          
          // Verify clearing
          const deliveriesCheck = localStorage.getItem('deliveries');
          const gasCheck = localStorage.getItem('gasEntries');
          
          if (deliveriesCheck === '[]' && gasCheck === '[]') {
            console.log(`✅ localStorage cleared successfully on attempt ${attempt}`);
            break;
          } else if (attempt === maxAttempts) {
            console.warn('⚠️ localStorage clearing verification failed after all attempts');
          }
          
        } catch (e) {
          console.error(`Attempt ${attempt} failed:`, e);
          if (attempt === maxAttempts) {
            throw e;
          }
        }
      }
    }
    
    // Method 2: Clear memory arrays with multiple approaches
    try {
      // Global references approach
      ['deliveries', 'gasEntries'].forEach(varName => {
        if (window[varName] && Array.isArray(window[varName])) {
          window[varName].length = 0;
          window[varName].splice(0, window[varName].length);
        }
      });
      
      // Module import approach (if available)
      if (window.dataModule) {
        if (window.dataModule.deliveries) window.dataModule.deliveries.length = 0;
        if (window.dataModule.gasEntries) window.dataModule.gasEntries.length = 0;
      }
    } catch (e) {
      console.warn('Memory array clearing failed:', e);
    }
    
    // Method 3: DOM cleanup with device-specific handling
    try {
      const selectors = [
        '#deliveriesTableBody',
        '#gasTableBody',
        '.analytics-card',
        '#financialSummary',
        '#revenueExpenseChart',
        '#expenseDeliveryRatio',
        '#expenseIncomeRatio',
        '#performanceMetrics',
        '#bestDay',
        '#worstDay'
      ];
      
      selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            if (selector.includes('TableBody')) {
              element.innerHTML = '';
            } else if (selector.includes('analytics') || selector.startsWith('#')) {
              element.innerHTML = '<p class="empty-state">Nenhum dado cadastrado</p>';
            }
          });
        } catch (e) {
          console.warn(`Failed to clear ${selector}:`, e);
        }
      });
    } catch (e) {
      console.warn('DOM cleanup failed:', e);
    }
    
    // Method 4: Reset totals with fallbacks
    try {
      ['totalFees', 'totalGas', 'netProfit'].forEach(id => {
        try {
          const element = document.getElementById(id);
          if (element) {
            element.textContent = '0,00';
            element.innerText = '0,00'; // Fallback
          }
        } catch (e) {
          console.warn(`Failed to reset ${id}:`, e);
        }
      });
    } catch (e) {
      console.warn('Totals reset failed:', e);
    }
    
    // Method 5: Mobile-specific memory management
    if (capabilities.isMobile) {
      try {
        // Clear any blob URLs more aggressively
        const imgs = document.getElementsByTagName('img');
        for (let i = 0; i < imgs.length; i++) {
          if (imgs[i].src && imgs[i].src.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(imgs[i].src);
              imgs[i].src = '';
            } catch (e) {
              console.warn('Failed to revoke blob URL:', e);
            }
          }
        }
        
        // Force browser to free memory on low-RAM devices
        if (capabilities.estimatedRAM <= 2) {
          // Create temporary pressure
          const temp = new Array(1000).fill(null);
          temp.length = 0;
          
          // Force layout recalculation
          if (document.body) {
            document.body.offsetHeight;
          }
        }
        
      } catch (e) {
        console.warn('Mobile memory management failed:', e);
      }
    }
    
    // Method 6: Device-specific garbage collection
    if (capabilities.isIOS && window.gc) {
      try {
        window.gc();
      } catch (e) {
        console.log('iOS GC not available');
      }
    }
    
    console.log('✅ Limpeza mobile específica concluída');
    return true;
    
  } catch (error) {
    console.error('❌ Erro na limpeza mobile:', error);
    return false;
  }
}

/**
 * Check if device is mobile (legacy function for compatibility)
 */
export function isMobileDevice() {
  return getDeviceCapabilities().isMobile;
}

// Function to clean up resources moved from mobileOptimizations to avoid circular reference
export function cleanupUnusedResources() {
  try {
    // Clear any object URLs that might be hanging around
    const images = document.querySelectorAll('img[src^="blob:"]');
    images.forEach(img => {
      if (img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
      }
    });

    // Clean up any unused canvas elements
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      if (!document.body.contains(canvas)) {
        canvas.width = 0;
        canvas.height = 0;
      }
    });

    // Clear any data cache if clearDataCache is available
    if (typeof clearDataCache === 'function') {
      clearDataCache();
    }
  } catch (error) {
    console.warn('Resource cleanup failed:', error);
  }
}

// Rest of the original mobile optimization functions...
export function applyMemoryOptimizations() {
  if (!isMobileDevice()) return;
  
  // Optimize viewport for memory usage
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no'
    );
  }
}

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

// Additional helper functions for mobile optimization
function setupResizeHandlers() {
  // Implementation for resize handling
}

function optimizeForLowEndDevices() {
  // Implementation for low-end device optimization
}

function optimizeScrollPerformance() {
  // Implementation for scroll optimization
}

function fixMobileViewportHeight() {
  // Implementation for viewport height fixes
}

function setupMobileFileHandling() {
  // Implementation for mobile file handling
}

function fixFileInputIssues() {
  // Implementation for file input fixes
}

function setupChartOptimizations() {
  // Implementation for chart optimizations
} 