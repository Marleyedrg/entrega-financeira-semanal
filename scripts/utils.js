// Função para obter a data atual no formato YYYY-MM-DD
export function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Função para formatar uma data para exibição
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Função para normalizar uma data para o formato YYYY-MM-DD
export function normalizeDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
export function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
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