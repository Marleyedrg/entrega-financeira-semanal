/**
 * Mobile Optimizations Module
 * 
 * This module serves as a central entry point for all mobile optimizations
 * applied throughout the application.
 */

// Import directly from mobile.js to avoid scope issues
import { 
  setupMobileOptimizations,
  cleanupUnusedResources,
  applyMemoryOptimizations,
  fixFileInputIssues
} from './mobile.js';

// Re-export the functions from mobile.js
export { 
  setupMobileOptimizations,
  cleanupUnusedResources,
  applyMemoryOptimizations,
  fixFileInputIssues
};

// Define isMobileDevice directly to avoid circular dependency
/**
 * Check if device is mobile
 * @returns {boolean} True if mobile device
 */
export function isMobileDevice() {
  return window.innerWidth <= 768 || 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Image optimizations for mobile
export {
  processImageForStorage,
  optimizeStoredImages,
  formatImageDisplay,
  showImageModal
} from './imageUtils.js';

// Advanced image optimization for mobile
import {
  hasEnoughMemory,
  optimizeForLowMemory,
  downsampleStoredImages,
  detectAndRecoverFromMemoryIssues
} from './imageOptimizer.js';

// Chart optimizations for mobile
export {
  generateLinePath,
  generateDataPoints,
  getBestProfitDay,
  getWorstProfitDay,
  optimizeChartRendering,
  makeChartResponsive,
  adjustChartSize
} from './charts.js';

// Mobile specific optimizations
import { showToast } from './utils.js';

// Re-export needed functions from imageOptimizer.js, but avoid duplicate exports
export { hasEnoughMemory, optimizeForLowMemory, downsampleStoredImages };

// Explicitly re-export detectAndRecoverFromMemoryIssues to avoid duplicate export
// by using a new name for our import
const { detectAndRecoverFromMemoryIssues: recoverMemory } = { detectAndRecoverFromMemoryIssues };
export { recoverMemory as detectAndRecoverFromMemoryIssues };

/**
 * Run all additional memory optimizations for mobile devices
 */
export function applyAdvancedMemoryOptimizations() {
  // Apply memory-related optimizations
  setupImageCleanupRoutine();
  optimizeMemoryUsage();
  
  // Add periodic memory check for mobile devices
  if (isMobileDevice()) {
    setupPeriodicMemoryCheck();
  }
}

/**
 * Sets up a routine to clean up image resources
 */
function setupImageCleanupRoutine() {
  // Force cleanup on tab visibility change (when user switches tabs/apps)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Force garbage collection on tab hide if possible
      cleanupUnusedResources();
    }
  });

  // Clean up on device orientation change (common on mobile)
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      cleanupUnusedResources();
    }, 300);
  });
  
  // Monitor back button for cleanup
  window.addEventListener('popstate', () => {
    cleanupUnusedResources();
  });
}

/**
 * Setup periodic memory checks to prevent out of memory errors
 */
function setupPeriodicMemoryCheck() {
  // Check memory status every 30 seconds
  const memoryCheckInterval = setInterval(() => {
    // Only run check if page is visible
    if (document.visibilityState === 'visible') {
      // Check if memory is running low
      if (!hasEnoughMemory()) {
        // Attempt recovery
        detectAndRecoverFromMemoryIssues();
      }
    }
  }, 30000);
  
  // Clear interval when page is unloaded
  window.addEventListener('beforeunload', () => {
    clearInterval(memoryCheckInterval);
  });
}

/**
 * Apply optimizations for better memory usage
 */
function optimizeMemoryUsage() {
  // Setup cleanup on file input focus
  const fileInputs = document.querySelectorAll('input[type="file"]');
  fileInputs.forEach(input => {
    input.addEventListener('focus', () => {
      // Clean up resources before opening file picker
      cleanupUnusedResources();
    });
  });

  // Setup cleanup for image preview containers
  const setupPreviewContainerCleanup = () => {
    const containers = [
      document.getElementById('imagePreview'),
      document.getElementById('editImagePreview')
    ];

    containers.forEach(container => {
      if (container) {
        // Create a mutation observer to watch for DOM changes
        const observer = new MutationObserver((mutations) => {
          mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
              // When nodes are removed, clean up resources
              cleanupUnusedResources();
            }
          });
        });

        // Start observing
        observer.observe(container, { childList: true, subtree: true });
      }
    });
  };

  // Setup cleanup for preview containers
  setupPreviewContainerCleanup();
  
  // Optimize existing stored images on startup for mobile
  if (isMobileDevice()) {
    // Delay to not interfere with initial page load
    setTimeout(() => {
      // Check if memory is low before optimizing
      if (!hasEnoughMemory()) {
        downsampleStoredImages();
      }
    }, 5000);
  }
}

// Export additional optimization functions
export default {
  applyAdvancedMemoryOptimizations,
  cleanupUnusedResources, // This is now properly in scope as it's directly imported
  fixFileInputIssues,
  hasEnoughMemory,
  optimizeForLowMemory,
  downsampleStoredImages,
  detectAndRecoverFromMemoryIssues: recoverMemory
}; 