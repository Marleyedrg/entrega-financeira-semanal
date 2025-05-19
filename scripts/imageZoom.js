// Constantes para controle do zoom
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

// Variáveis globais
let currentZoom = 1;
let initialPinchDistance = 0;
let lastPinchDistance = 0;
let isDragging = false;
let startX = 0;
let startY = 0;
let translateX = 0;
let translateY = 0;

// Elementos do DOM
const modal = document.getElementById('imageModal');
const modalContent = modal.querySelector('.modal-content');
const modalImage = document.getElementById('modalImage');
const zoomLevel = document.querySelector('.zoom-level');
const zoomIn = document.getElementById('zoomIn');
const zoomOut = document.getElementById('zoomOut');

// Função para atualizar o zoom
function updateZoom(zoom) {
    // Limita o zoom entre MIN_ZOOM e MAX_ZOOM
    currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    
    // Atualiza a transformação da imagem
    modalImage.style.transform = `scale(${currentZoom})`;
    
    // Atualiza o indicador de zoom
    zoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
    
    // Atualiza o estado dos botões
    zoomIn.disabled = currentZoom >= MAX_ZOOM;
    zoomOut.disabled = currentZoom <= MIN_ZOOM;
}

// Função para calcular a distância entre dois pontos
function getDistance(point1, point2) {
    const dx = point1.clientX - point2.clientX;
    const dy = point1.clientY - point2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// Event Listeners para desktop
modalImage.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    // Determina a direção do scroll
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    
    // Calcula o novo zoom
    const newZoom = currentZoom + delta;
    updateZoom(newZoom);
});

// Event Listeners para mobile
modalImage.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
        // Inicia o zoom com dois dedos
        initialPinchDistance = getDistance(e.touches[0], e.touches[1]);
        lastPinchDistance = initialPinchDistance;
    } else if (e.touches.length === 1 && currentZoom > 1) {
        // Inicia o arrasto com um dedo
        isDragging = true;
        startX = e.touches[0].clientX - translateX;
        startY = e.touches[0].clientY - translateY;
    }
});

modalImage.addEventListener('touchmove', (e) => {
    e.preventDefault();
    
    if (e.touches.length === 2) {
        // Atualiza o zoom com dois dedos
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const scale = currentDistance / initialPinchDistance;
        const newZoom = currentZoom * (currentDistance / lastPinchDistance);
        
        updateZoom(newZoom);
        lastPinchDistance = currentDistance;
    } else if (e.touches.length === 1 && isDragging) {
        // Atualiza a posição durante o arrasto
        translateX = e.touches[0].clientX - startX;
        translateY = e.touches[0].clientY - startY;
        
        modalImage.style.transform = `scale(${currentZoom}) translate(${translateX / currentZoom}px, ${translateY / currentZoom}px)`;
    }
});

modalImage.addEventListener('touchend', () => {
    isDragging = false;
    initialPinchDistance = 0;
    lastPinchDistance = 0;
});

// Event Listeners para os botões de zoom
zoomIn.addEventListener('click', () => {
    updateZoom(currentZoom + ZOOM_STEP);
});

zoomOut.addEventListener('click', () => {
    updateZoom(currentZoom - ZOOM_STEP);
});

// Reset do zoom quando o modal é fechado
modal.querySelector('.close').addEventListener('click', () => {
    currentZoom = 1;
    translateX = 0;
    translateY = 0;
    modalImage.style.transform = 'scale(1)';
    zoomLevel.textContent = '100%';
});

// Exporta as funções necessárias
export function initializeImageZoom() {
    // Inicializa o zoom
    updateZoom(1);
} 