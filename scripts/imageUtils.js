// Image utilities and optimizations
import { isMobileDevice } from './mobile.js';
import { showToast } from './utils.js';

/**
 * Check available storage space for image storage
 * @returns {boolean} True if sufficient storage is available
 */
export function checkStorageSpace() {
  // Estimate current localStorage usage
  let totalSize = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      totalSize += (localStorage[key].length * 2) / 1024 / 1024; // Size in MB
    }
  }
  
  // Warn if storage is near limit (4MB is a conservative estimate for most browsers)
  if (totalSize > 4) {
    showToast('Armazenamento quase cheio. Considere fazer backup e limpar os dados antigos.', 'warning');
    return false;
  }
  
  return true;
}

// Image compression functionality removed - images are now saved in original quality

// Track ongoing image processing operations
const processingOperations = new Set();

/**
 * Process an image for storage preserving original quality
 * @param {File} file - The image file to process
 * @returns {Promise<string|null>} Base64 encoded image or null on error
 */
export async function processImageForStorage(file) {
  if (!file) return null;
  
  // Generate a unique ID for this processing operation
  const operationId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  
  // Register this operation
  processingOperations.add(operationId);
  
  try {
    // Force garbage collection between operations if possible
    if (window.gc) {
      try { window.gc(); } catch (e) { console.log('GC not available'); }
    }
    
    // Validar tipo de arquivo
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Tipo de arquivo não suportado. Use JPG, PNG ou WebP.');
    }
    
    // Check max file size (10MB - increased limit since we're not compressing)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('Arquivo muito grande. O tamanho máximo é 10MB.');
    }
    
    // Check if this operation is still valid before proceeding
    if (!processingOperations.has(operationId)) {
      console.log('Operation cancelled - newer operation started');
      return null;
    }
    
    // Convert file to base64 without compression to preserve original quality
    const base64Image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = function(event) {
        try {
          const base64String = event.target.result;
          resolve(base64String);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = function() {
        reject(new Error('Erro ao ler o arquivo de imagem'));
      };
      
      reader.readAsDataURL(file);
    });
    
    if (!base64Image) {
      throw new Error('Falha ao processar a imagem. Tente novamente.');
    }
    
    // Immediate cleanup to prevent memory leaks
    cleanupAfterProcessing();
    
    return base64Image;
    
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    
    // Mensagens de erro mais específicas
    if (error.name === 'QuotaExceededError') {
      throw new Error('Armazenamento do dispositivo está cheio. Faça backup e limpe seus dados.');
    } else if (error.name === 'NotReadableError') {
      throw new Error('Não foi possível ler a imagem. Tente outra foto.');
    } else if (error.message.includes('tipo de arquivo')) {
      throw new Error(error.message);
    } else if (isMobileDevice()) {
      throw new Error('Erro ao processar a imagem. Tente uma foto menor ou use outro app de câmera.');
    } else {
      throw new Error('Erro ao processar a imagem. ' + error.message);
    }
  } finally {
    // Clean up operation tracking
    processingOperations.delete(operationId);
    cleanupAfterProcessing();
  }
}

/**
 * Performs cleanup after image processing to prevent memory leaks
 */
function cleanupAfterProcessing() {
  // Clean up object URLs
  const images = document.querySelectorAll('img[src^="blob:"]');
  images.forEach(img => {
    if (img.src.startsWith('blob:')) {
      URL.revokeObjectURL(img.src);
    }
  });
  
  // Clean up any canvas elements created during processing
  const canvases = document.querySelectorAll('canvas');
  canvases.forEach(canvas => {
    if (!document.body.contains(canvas)) {
      canvas.width = 0;
      canvas.height = 0;
    }
  });
  
  // Try to force garbage collection if possible
  if (window.gc) {
    try { window.gc(); } catch (e) { /* Ignore errors */ }
  }
}

/**
 * Optimize all stored images by removing metadata
 */
export function optimizeStoredImages() {
  try {
    // Process deliveries
    const deliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
    if (deliveries && deliveries.length) {
      let modified = false;
      const updatedDeliveries = deliveries.map(delivery => {
        if (delivery.image && delivery.image.length > 100000) { // If image is larger than ~100KB
          // Remove metadata part of base64 to save space
          const newEntry = {...delivery};
          if (newEntry.image.startsWith('data:image')) {
            newEntry.image = newEntry.image.replace(/^data:image\/\w+;base64,/, '');
            modified = true;
          }
          return newEntry;
        }
        return delivery;
      });
      
      if (modified) {
        localStorage.setItem('deliveries', JSON.stringify(updatedDeliveries));
      }
    }
    
    // Process gas entries
    const gasEntries = JSON.parse(localStorage.getItem('gasEntries') || '[]');
    if (gasEntries && gasEntries.length) {
      let modified = false;
      const updatedGasEntries = gasEntries.map(entry => {
        if (entry.image && entry.image.length > 100000) {
          const newEntry = {...entry};
          if (newEntry.image.startsWith('data:image')) {
            newEntry.image = newEntry.image.replace(/^data:image\/\w+;base64,/, '');
            modified = true;
          }
          return newEntry;
        }
        return entry;
      });
      
      if (modified) {
        localStorage.setItem('gasEntries', JSON.stringify(updatedGasEntries));
      }
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao otimizar imagens:', error);
    return false;
  }
}

/**
 * Format image for display, ensuring proper base64 format
 * @param {string} imageSrc - The image source (potentially optimized without header)
 * @returns {string} Full image display HTML or text
 */
export function formatImageDisplay(imageSrc) {
  if (!imageSrc) return 'Sem comprovante';
  
  // Check if image is in optimized format (without data:image header)
  const imageUrl = imageSrc.startsWith('data:') 
    ? imageSrc 
    : `data:image/jpeg;base64,${imageSrc}`;
  
  return `<img src="${imageUrl}" alt="Preview" class="table-image" onclick="showImageModal(this.src)">`;
}

/**
 * Display an image in a modal with mobile touch support
 * @param {string} src - Base64 image data
 */
export function showImageModal(src) {
  if (!src) {
    console.log('Imagem não disponível para visualização');
    showToast('Imagem não disponível para este pedido', 'warning');
    return;
  }
  
  try {
    const modal = document.getElementById('imageModal');
    if (!modal) {
      console.error('Modal de imagem não encontrado');
      return;
    }
    
    const modalImg = document.getElementById('modalImage');
    const zoomLevel = document.querySelector('.zoom-level');
    const zoomInButton = document.getElementById('zoomIn');
    const zoomOutButton = document.getElementById('zoomOut');
    
    if (!modalImg) {
      console.error('Elemento de imagem modal não encontrado');
      return;
    }
    
    // Reset zoom state on opening
    resetZoomState();
    
    // Add data URL prefix if not present
    const imageUrl = src.startsWith('data:image') ? src : `data:image/jpeg;base64,${src}`;
    
    // Set image source
    modalImg.src = imageUrl;
    
    // High quality functionality removed - images are now saved in original quality
    
    modal.style.display = 'block';
    
    // Add show class after a small delay to trigger transition
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
    
    // Set up zoom buttons
    if (zoomInButton) {
        zoomInButton.onclick = function() {
            updateZoom(currentScale + 0.5);
        };
    }
    
    if (zoomOutButton) {
        zoomOutButton.onclick = function() {
            updateZoom(currentScale - 0.5);
        };
    }
    
    // Set up touch events for mobile
    setupTouchEvents(modalImg);
    
    // Set up click outside to close
    modal.onclick = function(event) {
        if (event.target === modal && !isZooming && !isDragging) {
            closeImageModal();
        }
    };
    
    // Set up keyboard event for escape key
    const escKeyHandler = function(event) {
        if (event.key === 'Escape') {
            closeImageModal();
            document.removeEventListener('keydown', escKeyHandler);
        }
    };
    document.addEventListener('keydown', escKeyHandler);
    
    console.log('Imagem aberta no modal com sucesso');
  } catch (error) {
    console.error('Erro ao abrir imagem no modal:', error);
    showToast('Erro ao abrir a imagem', 'error');
  }
}

// Variables for tracking image zoom and pan state
let currentScale = 1;
let maxScale = 5;  // Maximum zoom level
let minScale = 0.5;  // Minimum zoom level
let startX = 0;
let startY = 0;
let initialDistance = 0;
let initialScale = 1;
let offsetX = 0;
let offsetY = 0;
let lastTapTime = 0;
let isZooming = false;
let isDragging = false;

// High quality mode variables removed - images are now saved in original quality

// Set up all touch events for mobile
function setupTouchEvents(element) {
    // Touch start event
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    
    // Touch move event
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    // Touch end event
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Add mouse wheel support for desktop
    element.addEventListener('wheel', handleMouseWheel, { passive: false });
}

// Handle touch start
function handleTouchStart(e) {
    e.preventDefault();
    
    const modal = document.getElementById('imageModal');
    
    if (e.touches.length === 1) {
        // Single touch - prepare for drag or double tap
        startX = e.touches[0].clientX - offsetX;
        startY = e.touches[0].clientY - offsetY;
        
        // Check for double tap
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;
        
        if (tapLength < 300 && tapLength > 0) {
            // Double tap detected
            if (currentScale > 1) {
                // If zoomed in, reset zoom
                resetZoomState();
            } else {
                // If at normal zoom, zoom in to 2x
                updateZoom(2);
            }
            e.preventDefault();
        }
        
        lastTapTime = currentTime;
        isDragging = true;
        
        // Add visual feedback for dragging
        if (currentScale > 1 && modal) {
            modal.classList.add('dragging');
        }
        
    } else if (e.touches.length === 2) {
        // Pinch gesture started
        isZooming = true;
        isDragging = false;
        
        // Calculate distance between two touch points
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialDistance = Math.sqrt(dx * dx + dy * dy);
        initialScale = currentScale;
        
        // Add visual feedback for zooming
        if (modal) {
            modal.classList.add('zooming');
        }
    }
}

// Handle touch move
function handleTouchMove(e) {
    e.preventDefault();
    
    if (isZooming && e.touches.length === 2) {
        // Handle pinch zoom
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate new scale based on how much fingers moved
        let newScale = initialScale * (distance / initialDistance);
        
        // Ensure scale stays within bounds
        newScale = Math.max(minScale, Math.min(maxScale, newScale));
        
        updateZoom(newScale);
        
    } else if (isDragging && e.touches.length === 1 && currentScale > 1) {
        // Only allow dragging when zoomed in
        const x = e.touches[0].clientX - startX;
        const y = e.touches[0].clientY - startY;
        
        // Apply movement constraints based on zoom level
        const modalImage = document.getElementById('modalImage');
        const imgWidth = modalImage.width * currentScale;
        const imgHeight = modalImage.height * currentScale;
        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight;
        
        // Calculate maximum allowed drag distance
        const maxX = Math.max(0, (imgWidth - containerWidth) / 2);
        const maxY = Math.max(0, (imgHeight - containerHeight) / 2);
        
        // Apply constraints
        offsetX = Math.max(-maxX, Math.min(maxX, x));
        offsetY = Math.max(-maxY, Math.min(maxY, y));
        
        // Apply transform
        applyTransform();
    }
}

// Handle touch end
function handleTouchEnd(e) {
    const modal = document.getElementById('imageModal');
    
    // Remove visual feedback classes
    if (modal) {
        modal.classList.remove('dragging', 'zooming');
    }
    
    isZooming = false;
    
    // Small timeout before disabling dragging to prevent unwanted clicks
    setTimeout(() => {
        isDragging = false;
    }, 100);
}

// Handle mouse wheel for desktop zoom
function handleMouseWheel(e) {
    e.preventDefault();
    
    // Determine zoom direction based on wheel delta
    const delta = Math.sign(e.deltaY) * -0.2;
    
    // Apply zoom centered on mouse position
    const newScale = Math.max(minScale, Math.min(maxScale, currentScale + delta));
    
    // Only update if scale actually changed
    if (newScale !== currentScale) {
        const modal = document.getElementById('imageModal');
        if (modal) {
            // Add visual feedback
            modal.classList.add('zooming');
            
            // Remove class after transition completes
            setTimeout(() => {
                modal.classList.remove('zooming');
            }, 300);
        }
        
        // Update zoom level
        updateZoom(newScale);
    }
}

// Update zoom level
function updateZoom(newScale) {
    // Clamp scale to min/max values
    currentScale = Math.max(minScale, Math.min(maxScale, newScale));
    
    // Update the zoom level display
    const zoomLevel = document.querySelector('.zoom-level');
    if (zoomLevel) {
        zoomLevel.textContent = `${Math.round(currentScale * 100)}%`;
    }
    
    // If scale is reset to 1, reset offsets too
    if (currentScale <= 1) {
        offsetX = 0;
        offsetY = 0;
    }
    
    // Apply the transform
    applyTransform();
}

// Apply transform to the image
function applyTransform() {
    const modalImage = document.getElementById('modalImage');
    if (modalImage) {
        modalImage.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${currentScale})`;
    }
}

// Reset zoom state
function resetZoomState() {
    currentScale = 1;
    offsetX = 0;
    offsetY = 0;
    isZooming = false;
    isDragging = false;
    
    // Update the zoom level display
    const zoomLevel = document.querySelector('.zoom-level');
    if (zoomLevel) {
        zoomLevel.textContent = '100%';
    }
    
    // Reset transform
    const modalImage = document.getElementById('modalImage');
    if (modalImage) {
        modalImage.style.transform = 'translate(0px, 0px) scale(1)';
    }
}

// Close image modal with cleanup for high quality mode
function closeImageModal() {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    
    if (modal) {
        // Remove visual feedback classes
        modal.classList.remove('show', 'dragging', 'zooming');
        
        // Clean up touch and mouse event listeners
        if (modalImg) {
            modalImg.removeEventListener('touchstart', handleTouchStart);
            modalImg.removeEventListener('touchmove', handleTouchMove);
            modalImg.removeEventListener('touchend', handleTouchEnd);
            modalImg.removeEventListener('wheel', handleMouseWheel);
        }
        
        // Remove button event listeners
        const zoomInButton = document.getElementById('zoomIn');
        const zoomOutButton = document.getElementById('zoomOut');
        
        if (zoomInButton) zoomInButton.onclick = null;
        if (zoomOutButton) zoomOutButton.onclick = null;
        
        setTimeout(() => {
            modal.style.display = 'none';
            modal.onclick = null; // Remove click handler
            
            // Reset zoom when closing
            resetZoomState();
        }, 300);
    }
}

// High quality mode functionality removed - images are now saved in original quality

// High quality toggle functionality removed - images are now saved in original quality

// High quality image creation functionality removed - images are now saved in original quality

// Sharpening functionality removed - images are now saved in original quality 