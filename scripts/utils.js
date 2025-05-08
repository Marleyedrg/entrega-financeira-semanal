// Função para obter a data atual formatada
export function getCurrentDate() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().split('T')[0];
}

// Função para formatar datas
export function formatDate(dateString) {
  if (!dateString) return '-';
  
  const date = new Date(dateString + 'T00:00:00');
  if (isNaN(date.getTime())) return '-';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
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

// Função para mostrar o modal de imagem
export function showImageModal(src) {
  const modal = document.getElementById('imageModal');
  const modalImg = document.getElementById('modalImage');
  
  modal.style.display = 'block';
  modalImg.src = src;
  
  setTimeout(() => {
    modal.classList.add('show');
  }, 100);
}

// Função para verificar se existe uma entrega duplicada
export function checkDuplicateDelivery(orderNumber, date, deliveries, excludeIndex = -1) {
  return deliveries.some((delivery, index) => 
    index !== excludeIndex && 
    delivery.orderNumber === orderNumber && 
    delivery.date === date
  );
} 