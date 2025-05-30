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

/**
 * Compress an image for storage
 * @param {File} file - The image file to compress
 * @param {number} maxWidth - Maximum width to resize to
 * @param {number} quality - Compression quality (0-1)
 * @returns {Promise<string>} Base64 encoded compressed image
 */
export function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    // Create a unique object URL
    const url = URL.createObjectURL(file);
    const img = new Image();
    
    // Set up error handling first
    img.onerror = () => {
      // Clean up resources
      URL.revokeObjectURL(url);
      reject(new Error('Falha ao carregar a imagem'));
    };
    
    img.onload = () => {
      try {
        // Create canvas for compression
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Resize if necessary
        if (width > maxWidth) {
          height = Math.floor(height * (maxWidth / width));
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw image on canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to compressed format
        canvas.toBlob((blob) => {
          // Always release the object URL immediately after use
          URL.revokeObjectURL(url);
          
          if (blob) {
            const reader = new FileReader();
            
            reader.onloadend = () => {
              // Ensure we're resolving with a valid result
              if (reader.result) {
                // Clean up to prevent memory leaks
                canvas.width = 0;
                canvas.height = 0;
                resolve(reader.result);
              } else {
                reject(new Error('Resultado da compressão da imagem é inválido'));
              }
            };
            
            reader.onerror = (e) => {
              reject(new Error(`Erro ao ler blob comprimido: ${e.message}`));
            };
            
            reader.readAsDataURL(blob);
          } else {
            reject(new Error('Falha na compressão da imagem - blob nulo'));
          }
        }, 'image/jpeg', quality);
      } catch (err) {
        // Make sure to release the URL in case of error
        URL.revokeObjectURL(url);
        reject(new Error(`Erro ao processar imagem: ${err.message}`));
      }
    };
    
    // Start loading the image
    img.src = url;
  });
}

// Track ongoing image processing operations
const processingOperations = new Set();

/**
 * Process and optimize an image for storage with mobile-specific settings
 * @param {File} file - The image file to process
 * @returns {Promise<string|null>} Base64 encoded processed image or null on error
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
    
    // Check max file size (5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      showToast('Comprimindo imagem...', 'info');
    }
    
    // Determine quality based on device and file size
    const mobile = isMobileDevice();
    
    // Ajustar configurações para melhor performance em dispositivos móveis
    let quality = mobile ? 0.5 : 0.7;  // Reduced from 0.6 to 0.5 for mobile
    let maxWidth = mobile ? 600 : 1000;  // Reduced from 800 to 600 for mobile
    
    // Reduzir ainda mais para arquivos muito grandes
    if (file.size > 3 * 1024 * 1024) { // Mais que 3MB
      quality = mobile ? 0.3 : 0.5;  // Reduced from 0.4 to 0.3 for mobile
      maxWidth = mobile ? 500 : 700;  // Reduced from 600 to 500 for mobile
    }
    
    // Implementar compressão em etapas para arquivos muito grandes em dispositivos móveis
    if (mobile && file.size > 2 * 1024 * 1024) {
      // For very large files on mobile, do multi-step compression
      let compressedImage = null;
      
      try {
        // First step - more aggressive resizing
        compressedImage = await compressImage(file, maxWidth * 0.8, quality);
        
        // Check if this operation is still valid
        if (!processingOperations.has(operationId)) {
          return null;
        }
        
        // Create a new blob from the base64 string
        const base64Response = await fetch(compressedImage);
        const intermediateBlob = await base64Response.blob();
        
        // Second step - further compression 
        if (intermediateBlob.size > 1 * 1024 * 1024) {
          compressedImage = await compressImage(
            new File([intermediateBlob], file.name, { type: 'image/jpeg' }), 
            maxWidth * 0.7, 
            quality * 0.9
          );
        }
      } catch (innerError) {
        console.warn('Multi-step compression failed, falling back to standard compression', innerError);
        // Fall back to standard compression
      }
      
      // If multi-step compression succeeded, return the result
      if (compressedImage) {
        return compressedImage;
      }
      
      // If it failed, proceed with standard compression
    }
    
    // Check if this operation is still valid before proceeding
    if (!processingOperations.has(operationId)) {
      console.log('Operation cancelled - newer operation started');
      return null;
    }
    
    // Compress the image
    const compressedImage = await compressImage(file, maxWidth, quality);
    
    if (!compressedImage) {
      throw new Error('Falha ao processar a imagem. Tente novamente.');
    }
    
    // Immediate cleanup to prevent memory leaks
    cleanupAfterProcessing();
    
    return compressedImage;
    
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
    
    // Create high quality mode toggle
    setupHighQualityMode(modal, modalImg, imageUrl);
    
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

// Variables for tracking high quality mode
let isHighQualityMode = false;
let originalSrc = null;
let highQualitySrc = null;

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
    const highQualityToggle = document.getElementById('highQualityToggle');
    
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
        if (highQualityToggle) highQualityToggle.onclick = null;
        
        // Clean up memory
        originalSrc = null;
        highQualitySrc = null;
        isHighQualityMode = false;
        
        setTimeout(() => {
            modal.style.display = 'none';
            modal.onclick = null; // Remove click handler
            
            // Reset zoom when closing
            resetZoomState();
        }, 300);
    }
}

/**
 * Sets up high quality mode toggle and functionality
 * @param {HTMLElement} modal - The modal element
 * @param {HTMLImageElement} modalImg - The modal image element
 * @param {string} imageUrl - The original image URL
 */
function setupHighQualityMode(modal, modalImg, imageUrl) {
  // Create high quality toggle if it doesn't exist
  let highQualityToggle = document.getElementById('highQualityToggle');
  
  if (!highQualityToggle) {
    // Create the container for high quality toggle
    const qualityControlsContainer = document.createElement('div');
    qualityControlsContainer.className = 'quality-controls';
    
    // Create toggle button
    highQualityToggle = document.createElement('button');
    highQualityToggle.id = 'highQualityToggle';
    highQualityToggle.title = 'Alternar modo de alta qualidade';
    highQualityToggle.innerHTML = '<i class="fas fa-glasses"></i> Alta Qualidade';
    
    // Add the toggle to container
    qualityControlsContainer.appendChild(highQualityToggle);
    
    // Add container to modal
    modal.appendChild(qualityControlsContainer);
  }
  
  // Reset high quality mode state
  isHighQualityMode = false;
  originalSrc = imageUrl;
  highQualitySrc = null;
  
  // Set appropriate classes based on initial state
  highQualityToggle.classList.remove('active');
  highQualityToggle.innerHTML = '<i class="fas fa-glasses"></i> Alta Qualidade';
  
  // Set up click handler for toggle
  highQualityToggle.onclick = function(event) {
    event.stopPropagation(); // Prevent closing modal
    toggleHighQualityMode(modalImg, highQualityToggle);
  };
}

/**
 * Toggles between normal and high quality image modes
 * @param {HTMLImageElement} modalImg - The modal image element
 * @param {HTMLButtonElement} toggleButton - The high quality toggle button
 */
function toggleHighQualityMode(modalImg, toggleButton) {
  // Toggle state
  isHighQualityMode = !isHighQualityMode;
  
  if (isHighQualityMode) {
    // Show loading indicator
    modalImg.classList.add('loading');
    toggleButton.disabled = true;
    toggleButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
    
    // If we haven't created the high quality version yet
    if (!highQualitySrc) {
      // Create high quality version - enhanced clarity with sharpening
      createHighQualityVersion(originalSrc).then(enhancedSrc => {
        highQualitySrc = enhancedSrc;
        if (isHighQualityMode) { // Check state again in case user switched back quickly
          modalImg.src = highQualitySrc;
          toggleButton.innerHTML = '<i class="fas fa-glasses"></i> Modo Normal';
          toggleButton.classList.add('active');
        }
        modalImg.classList.remove('loading');
        toggleButton.disabled = false;
      }).catch(error => {
        console.error('Erro ao criar versão de alta qualidade:', error);
        isHighQualityMode = false;
        modalImg.src = originalSrc;
        modalImg.classList.remove('loading');
        toggleButton.disabled = false;
        toggleButton.innerHTML = '<i class="fas fa-glasses"></i> Alta Qualidade';
        toggleButton.classList.remove('active');
        showToast('Não foi possível melhorar a qualidade da imagem', 'error');
      });
    } else {
      // Use already created high quality version
      modalImg.src = highQualitySrc;
      modalImg.classList.remove('loading');
      toggleButton.disabled = false;
      toggleButton.innerHTML = '<i class="fas fa-glasses"></i> Modo Normal';
      toggleButton.classList.add('active');
    }
  } else {
    // Switch back to original version
    modalImg.src = originalSrc;
    toggleButton.innerHTML = '<i class="fas fa-glasses"></i> Alta Qualidade';
    toggleButton.classList.remove('active');
  }
  
  // Reset zoom after changing image
  resetZoomState();
}

/**
 * Creates a high quality version of the image
 * @param {string} imageUrl - The original image URL
 * @returns {Promise<string>} A promise that resolves to the enhanced image URL
 */
function createHighQualityVersion(imageUrl) {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      
      img.onload = function() {
        try {
          // Create a canvas with the original image dimensions
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set canvas size to match image, but at least 1200px wide for better quality
          const targetWidth = Math.max(img.width, 1200);
          const scale = targetWidth / img.width;
          canvas.width = targetWidth;
          canvas.height = img.height * scale;
          
          // Enable image smoothing for better upscaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Draw the image at the larger size
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Apply sharpening filter for better clarity
          applySharpening(ctx, canvas.width, canvas.height);
          
          // Convert to high quality JPEG
          canvas.toBlob(blob => {
            if (blob) {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = err => reject(err);
              reader.readAsDataURL(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, 'image/jpeg', 0.95); // High quality setting
        } catch (err) {
          reject(err);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      
      // Load the image
      img.src = imageUrl;
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Applies a sharpening filter to the canvas context
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {number} width - The canvas width
 * @param {number} height - The canvas height
 */
function applySharpening(ctx, width, height) {
  try {
    // Get image data
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Simple sharpening convolution
    const sharpen = (data, width, height, factor = 0.5) => {
      // Create a copy of the original data
      const tempData = new Uint8ClampedArray(data);
      
      // Apply convolution to each pixel (except edges)
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          
          // For each RGB channel (skip alpha)
          for (let c = 0; c < 3; c++) {
            const currentPixel = tempData[idx + c];
            
            // Get surrounding pixels
            const top = tempData[idx - width * 4 + c];
            const bottom = tempData[idx + width * 4 + c];
            const left = tempData[idx - 4 + c];
            const right = tempData[idx + 4 + c];
            
            // Apply sharpening: 5×center - surrounding pixels
            const sharpened = 5 * currentPixel - top - bottom - left - right;
            
            // Blend original with sharpened using factor
            data[idx + c] = Math.min(255, Math.max(0, 
              currentPixel + (sharpened - currentPixel) * factor
            ));
          }
        }
      }
    };
    
    // Apply sharpening
    sharpen(data, width, height, 0.3);
    
    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);
  } catch (err) {
    console.error('Error applying sharpening:', err);
    // Continue without sharpening if there's an error
  }
} 