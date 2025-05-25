/**
 * Mobile Optimizations Module
 * 
 * This module serves as a central entry point for all mobile optimizations
 * applied throughout the application.
 */

// Core mobile functionality
export { 
  isMobileDevice,
  setupMobileOptimizations
} from './mobile.js';

// Image optimizations for mobile
export {
  processImageForStorage,
  optimizeStoredImages,
  formatImageDisplay,
  showImageModal
} from './imageUtils.js';

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

/**
 * Run all additional memory optimizations for mobile devices
 */
export function applyMemoryOptimizations() {
  // Apply memory-related optimizations
  setupImageCleanupRoutine();
  optimizeMemoryUsage();
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
}

/**
 * Clean up unused resources to optimize memory usage
 */
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

    // Force browser to free memory if possible
    if (window.gc) {
      try {
        window.gc();
      } catch (e) {
        console.log('Garbage collection not available');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error cleaning up resources:', error);
    return false;
  }
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
}

/**
 * Fix issues with image file inputs on various browsers
 */
export function fixFileInputIssues() {
  // Find all file inputs
  const fileInputs = document.querySelectorAll('input[type="file"]');
  
  fileInputs.forEach(input => {
    // Create a new input element to replace the old one
    const newInput = input.cloneNode(false);
    
    // Remove capture attribute that can cause issues on some mobile browsers
    newInput.removeAttribute('capture');
    
    // Ensure multiple is set correctly
    if (newInput.hasAttribute('multiple')) {
      newInput.setAttribute('multiple', 'multiple');
    } else {
      newInput.setAttribute('multiple', 'false');
    }
    
    // Replace the old input with the new one
    if (input.parentNode) {
      input.parentNode.replaceChild(newInput, input);
    }
  });
}

// Default export 
export default {
  applyMemoryOptimizations,
  cleanupUnusedResources,
  fixFileInputIssues
}; 