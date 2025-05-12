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
    const url = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
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
        if (blob) {
          const reader = new FileReader();
          reader.onloadend = () => {
            // Release temporary URL
            URL.revokeObjectURL(url);
            resolve(reader.result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        } else {
          reject(new Error('Falha na compressão da imagem'));
        }
      }, 'image/jpeg', quality);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Falha ao carregar a imagem'));
    };
    
    img.src = url;
  });
}

/**
 * Process and optimize an image for storage with mobile-specific settings
 * @param {File} file - The image file to process
 * @returns {Promise<string|null>} Base64 encoded processed image or null on error
 */
export async function processImageForStorage(file) {
  if (!file) return null;
  
  try {
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
    let quality = mobile ? 0.6 : 0.8;
    let maxWidth = mobile ? 800 : 1200;
    
    // Reduzir ainda mais para arquivos muito grandes
    if (file.size > 3 * 1024 * 1024) { // Mais que 3MB
      quality = mobile ? 0.4 : 0.6;
      maxWidth = mobile ? 600 : 800;
    }
    
    // Compress the image
    const compressedImage = await compressImage(file, maxWidth, quality);
    
    if (!compressedImage) {
      throw new Error('Falha ao processar a imagem. Tente novamente.');
    }
    
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
    } else if (mobile) {
      throw new Error('Erro ao processar a imagem. Tente uma foto menor ou use outro app de câmera.');
    } else {
      throw new Error('Erro ao processar a imagem. ' + error.message);
    }
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
 * Display an image in a modal
 * @param {string} src - Base64 image data
 */
export function showImageModal(src) {
  if (!src) return;
  
  const modal = document.getElementById('imageModal');
  const modalImg = document.getElementById('modalImage');
  
  // Add data URL prefix if not present
  const imageUrl = src.startsWith('data:image') ? src : `data:image/jpeg;base64,${src}`;
  
  modalImg.src = imageUrl;
  modal.style.display = 'block';
  
  // Add show class after a small delay to trigger transition
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);
} 