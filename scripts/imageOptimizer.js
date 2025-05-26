/**
 * Image Optimizer
 * 
 * Provides specialized image optimization functions for mobile devices
 * to reduce memory usage and improve performance.
 */

import { isMobileDevice } from './mobile.js';
import { showToast } from './utils.js';

/**
 * Checks if device has enough memory for image processing
 * @returns {boolean} True if the device has enough memory
 */
export function hasEnoughMemory() {
  // Use performance.memory if available (Chrome/Chromium browsers)
  if (window.performance && window.performance.memory) {
    const memory = window.performance.memory;
    // If device has less than 300MB of available memory, warn the user
    if (memory.jsHeapSizeLimit - memory.usedJSHeapSize < 300 * 1024 * 1024) {
      return false;
    }
  }
  
  // For other browsers, check localStorage usage as a proxy for memory usage
  try {
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += (localStorage[key].length * 2) / 1024 / 1024; // Size in MB
      }
    }
    
    // If using more than 70% of a typical browser's localStorage limit (5MB), warn
    if (totalSize > 3.5) {
      return false;
    }
  } catch (e) {
    console.warn('Error checking localStorage usage:', e);
  }
  
  return true;
}

/**
 * Aggressively optimizes images for low-memory devices
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<string>} Optimized base64 image
 */
export async function optimizeForLowMemory(base64Image) {
  if (!base64Image) return null;
  
  try {
    // Create a new image element
    const img = new Image();
    
    // Create a promise to handle the image loading
    const loadPromise = new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Falha ao carregar imagem para otimização'));
    });
    
    // Set the source of the image (safe because we're not creating an object URL)
    img.src = base64Image;
    
    // Wait for the image to load
    await loadPromise;
    
    // Create a canvas for the optimized image
    const canvas = document.createElement('canvas');
    
    // For very low memory devices, reduce dimensions drastically
    let targetWidth = Math.min(400, img.width);
    let targetHeight = Math.round(img.height * (targetWidth / img.width));
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    // Draw the image on the canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    
    // Convert to very low quality JPEG
    const optimizedDataURL = canvas.toDataURL('image/jpeg', 0.3);
    
    // Clean up resources
    canvas.width = 0;
    canvas.height = 0;
    img.src = '';
    
    return optimizedDataURL;
  } catch (error) {
    console.error('Erro na otimização agressiva de imagem:', error);
    // Return the original image if optimization fails
    return base64Image;
  }
}

/**
 * Reduces memory usage by downsampling existing images in storage
 * Useful for fixing memory issues after they've occurred
 */
export function downsampleStoredImages() {
  if (!isMobileDevice()) return; // Only for mobile devices
  
  try {
    // Get the deliveries from localStorage
    const deliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
    if (!deliveries.length) return;
    
    showToast('Otimizando imagens para economizar memória...', 'info');
    
    // Process a batch of images asynchronously to avoid freezing the UI
    const batchSize = 2;
    let processed = 0;
    
    const processBatch = async () => {
      const batch = deliveries.slice(processed, processed + batchSize)
        .filter(delivery => delivery.image && delivery.image.length > 20000);
      
      for (const delivery of batch) {
        try {
          // Only optimize images that haven't been optimized yet or are large
          if (delivery.image && delivery.image.length > 20000) {
            // Reconstruct full base64 image
            const base64Image = `data:image/jpeg;base64,${delivery.image}`;
            
            // Optimize the image
            const optimized = await optimizeForLowMemory(base64Image);
            
            // If optimization succeeded, update the delivery
            if (optimized) {
              // Strip the data URL prefix
              delivery.image = optimized.replace(/^data:image\/\w+;base64,/, '');
            }
          }
        } catch (error) {
          console.error('Error optimizing image for delivery:', delivery.id, error);
        }
      }
      
      processed += batch.length;
      
      // Save progress so far
      localStorage.setItem('deliveries', JSON.stringify(deliveries));
      
      // Continue with the next batch if there are more images to process
      if (processed < deliveries.length) {
        setTimeout(processBatch, 100); // Add delay to prevent UI freezing
      } else {
        showToast('Otimização de imagens concluída!', 'success');
      }
    };
    
    // Start processing
    processBatch();
    
    return true;
  } catch (error) {
    console.error('Erro ao otimizar imagens armazenadas:', error);
    return false;
  }
}

/**
 * Detects memory issues and attempts to recover
 * @returns {boolean} True if recovery was attempted
 */
export function detectAndRecoverFromMemoryIssues() {
  if (!isMobileDevice()) return false;
  
  // Check if browser seems to be running low on memory
  if (!hasEnoughMemory()) {
    showToast('Memória do dispositivo baixa. Otimizando...', 'warning');
    
    // Cleanup any object URLs
    const images = document.querySelectorAll('img[src^="blob:"]');
    images.forEach(img => {
      if (img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
      }
    });
    
    // Attempt to downsample images
    setTimeout(() => {
      downsampleStoredImages();
    }, 1000);
    
    return true;
  }
  
  return false;
}

// Default export for easier imports
export default {
  hasEnoughMemory,
  optimizeForLowMemory,
  downsampleStoredImages,
  detectAndRecoverFromMemoryIssues
}; 