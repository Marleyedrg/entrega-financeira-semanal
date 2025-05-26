// Função para obter a data atual no formato YYYY-MM-DD
export function getCurrentDate() {
  const now = new Date();
  return now.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD in local timezone
}

// Função para formatar uma data para exibição
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString + 'T12:00:00'); // Add noon time to avoid timezone issues
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString('pt-BR'); // Returns DD/MM/YYYY in Brazilian format
}

// Função para normalizar uma data para o formato YYYY-MM-DD
export function normalizeDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString + 'T12:00:00'); // Add noon time to avoid timezone issues
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD consistently
}

// Função para formatar valores monetários
export function formatCurrency(value) {
  if (isNaN(value)) return '0,00';
  
  return value
    .toFixed(2)
    .replace('.', ',')
    .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
}

// Função para obter nome do dia da semana
export function getWeekdayName(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  const weekdays = [
    "Domingo", "Segunda", "Terça", "Quarta",
    "Quinta", "Sexta", "Sábado"
  ];
  return weekdays[date.getDay()];
}

// Função para converter data do CSV
export function parseCSVDate(dateStr) {
  if (!dateStr) return '';
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Função para mostrar notificações toast
export function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  // If duration is 0, don't auto-hide the toast
  if (duration !== 0) {
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, duration);
  }
  
  return toast;
}

// Função para resolver caminhos relativos considerando o GitHub Pages
export function getResourcePath(path) {
  // Se a função global existir (definida em index.html), use-a
  if (window.getResourcePath) {
    return window.getResourcePath(path);
  }
  
  // Caso contrário, implemente a lógica aqui
  if (!path) return path;
  if (path.startsWith('http') || path.startsWith('//') || path.startsWith('data:')) return path;
  
  const basePath = window.__APP_BASE_PATH || '/';
  // Remove leading slash if exists to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return basePath + cleanPath;
}

// Export image handling functions from imageUtils.js
export { 
  compressImage, 
  checkStorageSpace, 
  processImageForStorage, 
  showImageModal,
  formatImageDisplay,
  optimizeStoredImages
} from './imageUtils.js';

// Export mobile detection from mobile.js
export { isMobileDevice } from './mobile.js';

// Função para verificar se há entregas duplicadas
export function checkDuplicateDelivery(orderNumber, date, deliveries, excludeId = null) {
  const normalizedDate = normalizeDate(date);
  return deliveries.some(delivery => 
    delivery.orderNumber === orderNumber && 
    delivery.date === normalizedDate &&
    (!excludeId || delivery.id !== excludeId)
  );
} 