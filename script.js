// Definição de diretórios
const DATA_DIR = 'data';
const ANALYTICS_DIR = `${DATA_DIR}/analytics`;

function stringToBinaryId(str) {
    let crc = 0;
    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i);
        for (let j = 0; j < 8; j++) {
            if (crc & 1) {
                crc = (crc >>> 1) ^ 0xC; // 0xC continua sendo o polinômio
            } else {
                crc >>>= 1;
            }
        }
    }
    // Limitar o ID a 4 dígitos
    return (crc & 0xFFFF).toString(16).padStart(4, '0'); // Retorna um ID hexadecimal de 4 dígitos
}

const backupData = () => {
    if (deliveries.length === 0) {
        alert("Não há entregas para fazer backup!");
        return;
    }

    // Exportar os dados para CSV
    exportCSV();

    // Exibir uma mensagem de sucesso
    alert("Backup realizado com sucesso! A planilha foi exportada.");
};


// Garantir que os diretórios existam ao iniciar
(function ensureDirectories() {
    try {
        // Como estamos em um ambiente de navegador, não podemos criar diretórios diretamente
        // Os diretórios serão criados virtualmente quando necessário
        console.log('Sistema inicializado. Os arquivos serão salvos localmente.');
    } catch (error) {
        console.error('Erro ao inicializar o sistema de arquivos:', error);
    }
})();

// Helper functions
const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
};

const formatCurrency = (value) => {
    return parseFloat(value || 0).toFixed(2);
};

const getWeekdayName = (date) => {
    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const d = new Date(date);
    return weekdays[d.getDay()];
};

// State management
let deliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
let editingId = null;
let analyticsFiles = JSON.parse(localStorage.getItem('analyticsFiles') || '[]');
let currentAnalyticsData = null;

// DOM Elements
const deliveryForm = document.getElementById('deliveryForm');
const deliveriesTable = document.getElementById('deliveriesTable');
const searchInput = document.getElementById('searchInput');
const totalFeesElement = document.getElementById('totalFees');
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const closeModal = document.querySelector('.close');
const uploadButton = document.getElementById('uploadButton');
const imageInput = document.getElementById('image');
const imagePreview = document.getElementById('imagePreview');
const importButton = document.getElementById('importButton');
const csvInput = document.getElementById('csvInput');
const finishWeekButton = document.getElementById('finishWeekButton');
const analyticsFileSelect = document.getElementById('analyticsFileSelect');
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const backupButton = document.getElementById('backupButton');
backupButton.onclick = backupData;

// Tab navigation
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.dataset.tab;
        
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        button.classList.add('active');
        document.getElementById(tabId).classList.add('active');
        
        if (tabId === 'analytics') {
            loadAnalyticsFiles();
            renderAnalytics();
        }
    });
});

// Update total
const updateTotal = () => {
    const total = deliveries.reduce((sum, delivery) => sum + (parseFloat(delivery.fee) || 0), 0);
    totalFeesElement.textContent = formatCurrency(total);
};

// Save to localStorage
const saveDeliveries = () => {
    localStorage.setItem('deliveries', JSON.stringify(deliveries));
    updateTotal();
};

const uniqueOrderNumbers = new Set();

// Render table
const renderTable = async (items = deliveries) => {
    const tbody = deliveriesTable.querySelector('tbody');
    tbody.innerHTML = '';

    for (const delivery of items) {
        // Criar a data sem aplicar o ajuste de fuso horário
        const [year, month, day] = delivery.date.split('-'); // Supondo formato ISO (aaaa-mm-dd)
        const adjustedDate = new Date(year, month - 1, day); // Mês começa em 0

        // Formatar a data no formato "dd / mm / aaaa" usando toLocaleDateString
        const formattedDate = adjustedDate.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).replace(/\//g, ' / '); // Adiciona espaços ao redor das barras

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="table-date">${formattedDate}</td>
            <td class="table-number">${delivery.orderNumber}</td>
            <td class="table-value">${delivery.fee ? `R$ ${formatCurrency(delivery.fee)}` : '-'}</td>
            <td class="table-status">
                <span class="status-badge ${delivery.fee ? 'status-completed' : 'status-pending'}">
                    ${delivery.fee ? 'Taxa Registrada' : 'Taxa Pendente'}
                </span>
            </td>
            <td>
                ${delivery.imageId ? `
                    <img src="${await getImageFromIndexedDB(delivery.imageId)}" 
                        alt="Comprovante" 
                        class="table-image"
                        loading="lazy"
                        onclick="openModal('${await getImageFromIndexedDB(delivery.imageId)}')">
                ` : ''}
            </td>
            <td class="table-actions">
                <button onclick="editDelivery('${delivery.id}')" class="button outline">Editar</button>
                <button onclick="deleteDelivery('${delivery.id}')" class="button outline">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    }
};

// Form handling
deliveryForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const orderNumber = e.target.orderNumber.value.trim();
    const fee = e.target.fee.value ? parseFloat(e.target.fee.value) : null;
    const date = e.target.date.value; // Mantém a data inserida
    const imageUrl = imagePreview.querySelector('img')?.src || null;

    // Criar um ID único com base na data, número do pedido e valor
    const uniqueIdString = `${date}_${orderNumber}_${fee || '0.00'}`;
    const uniqueId = stringToBinaryId(uniqueIdString);

    // Verificar se o ID único já existe, ignorando o pedido que está sendo editado
    if (!editingId && uniqueOrderNumbers.has(uniqueId)) {
        alert('Este pedido já foi registrado!');
        return;
    }

    // Adicionar o ID único ao Set
    if (!editingId) {
        uniqueOrderNumbers.add(uniqueId);
    }

    const formData = {
        id: editingId || uniqueId, // Usar o ID existente ao editar
        orderNumber,
        fee,
        date,
        imageId: deliveryForm.imageId || null, // Salvar apenas o ID da imagem
        weekday: getWeekdayName(date),
        timestamp: Date.now()
    };

    if (editingId) {
        // Atualizar o pedido existente
        deliveries = deliveries.map(d => d.id === editingId ? { ...formData } : d);
        editingId = null;
    } else {
        // Adicionar um novo pedido
        deliveries.unshift(formData);
    }

    saveDeliveries();
    renderTable();

    // Limpar os campos do formulário após o registro
    deliveryForm.orderNumber.value = '';
    deliveryForm.fee.value = '';
    imagePreview.innerHTML = '';
    e.target.querySelector('button[type="submit"]').textContent = 'Registrar Pedido';
});

// Inicializar o campo de data com a data atual
window.addEventListener('DOMContentLoaded', () => {
    const dateField = document.getElementById('date');
    if (dateField && !dateField.value) {
        const today = new Date().toISOString().split('T')[0]; // Formato ISO (aaaa-mm-dd)
        dateField.value = today;
    }
});

// Função para aplicar máscara de data no formato dd/mm/aaaa
const applyDateMask = (input) => {
    if (input.type !== 'date') { // Verifica se o campo não é do tipo "date"
        input.value = input.value
            .replace(/\D/g, '') // Remove caracteres não numéricos
            .replace(/(\d{2})(\d)/, '$1/$2') // Adiciona a primeira barra
            .replace(/(\d{2})(\d)/, '$1/$2') // Adiciona a segunda barra
            .slice(0, 10); // Limita o tamanho a 10 caracteres
    }
};

// Adicionar evento de input para aplicar a máscara
const dateField = document.getElementById('date');
dateField.addEventListener('input', () => applyDateMask(dateField));

// Search functionality
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = deliveries.filter(d => 
        d.orderNumber.toLowerCase().includes(searchTerm)
    );
    renderTable(filtered);
});

// Image handling
function openModal(imageUrl) {
    if (!imageUrl) {
        alert('Imagem não encontrada!');
        return;
    }

    modalImage.src = imageUrl; // Define a URL da imagem no modal
    imageModal.style.display = 'block'; // Exibe o modal
}

closeModal.onclick = () => {
    imageModal.style.display = 'none';
};

window.onclick = (e) => {
    if (e.target === imageModal) {
        imageModal.style.display = 'none';
    }
};

uploadButton.onclick = () => imageInput.click();

imageInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        resizeImage(file, 800, 800, async (resizedDataUrl) => {
            const imageId = Date.now().toString(); // Gerar um ID único para a imagem
            await saveImageToIndexedDB(imageId, resizedDataUrl); // Salvar a imagem no IndexedDB

            // Exibir o preview da imagem
            imagePreview.innerHTML = `
                <img src="${resizedDataUrl}" alt="Preview" style="max-width: 100%; height: auto;">
            `;

            // Salvar apenas o ID da imagem no formulário ou no objeto de entrega
            deliveryForm.imageId = imageId;
        });
    } else {
        alert('Por favor, selecione um arquivo de imagem válido.');
    }
};

const dbName = 'imageDatabase';
const storeName = 'images';

// Inicializar o IndexedDB
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Salvar imagem no IndexedDB
async function saveImageToIndexedDB(id, imageData) {
    const db = await initIndexedDB();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    store.put({ id, imageData });

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject(event.target.error);
    });
}

// Recuperar imagem do IndexedDB
async function getImageFromIndexedDB(id) {
    const db = await initIndexedDB();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result?.imageData || null);
        request.onerror = (event) => reject(event.target.error);
    });
}

function resizeImage(file, maxWidth, maxHeight, callback) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Redimensionar mantendo a proporção
            if (width > maxWidth) {
                height = height * (maxWidth / width);
                width = maxWidth;
            }
            if (height > maxHeight) {
                width = width * (maxHeight / height);
                height = maxHeight;
            }

            // Configurar o canvas para o novo tamanho
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);

            // Converter o canvas para um Data URL (imagem redimensionada)
            callback(canvas.toDataURL('image/jpeg', 0.7)); // Qualidade 70%
        };
        img.src = event.target.result; // Definir a imagem carregada no FileReader
    };
    reader.readAsDataURL(file); // Ler o arquivo como Data URL
}

// CSV Import/Export
const generateFileName = () => {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['janeiro', 'fevereiro', 'maio', 'junho', 
                   'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const month = months[date.getMonth()];
    const weekNumber = Math.ceil(date.getDate() / 7);

    // Obter informações para o ID
    const totalDeliveries = deliveries.length;
    const firstDeliveryInfo = deliveries.length > 0 ? `${deliveries[deliveries.length - 1].orderNumber}_${deliveries[deliveries.length - 1].fee || '0.00'}` : 'N/A';
    const lastDeliveryInfo = deliveries.length > 0 ? `${deliveries[0].orderNumber}_${deliveries[0].fee || '0.00'}` : 'N/A';

    // Concatenar as informações para gerar o finalID
    const idString = `${totalDeliveries}_${firstDeliveryInfo}_${lastDeliveryInfo}`;
    const finalID = stringToBinaryId(idString); // Gera um ID único com base na string

    // Retornar o nome do arquivo com o finalID
    return `${month}semana${weekNumber}_${finalID}`;
};

// Função para ajustar a data ao fuso horário local
const adjustDateToLocal = (dateString) => {
    const date = new Date(dateString);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().split('T')[0]; // Retorna apenas a parte da data no formato ISO
};

importButton.onclick = () => csvInput.click();

csvInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const lines = e.target.result.split('\n');
                const newDeliveries = lines.slice(1).map(line => {
                    if (!line.trim()) return null;
                    const [date, orderNumber, fee, status] = line.split(',');
                    const deliveryDate = new Date(date.split('/').reverse().join('-')).toISOString().split('T')[0];
                    return {
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        date: deliveryDate,
                        orderNumber: orderNumber.trim(),
                        fee: fee.trim() !== '-' ? parseFloat(fee) : null,
                        imageUrl: null,
                        weekday: getWeekdayName(deliveryDate),
                        timestamp: Date.now()
                    };
                }).filter(d => d !== null);
                deliveries = [...newDeliveries, ...deliveries];
                saveDeliveries();
                renderTable();
                alert(`${newDeliveries.length} entregas importadas com sucesso.`);
            } catch (error) {
                alert('Erro ao importar arquivo. Verifique se o formato está correto.');
            }
        };
        reader.readAsText(file);
    }
};

const exportCSV = () => {
    const headers = ['Data', 'Número do Pedido', 'Taxa', 'Status'];
    const csvContent = deliveries.map(d => {
        const date = new Date(d.date.includes('-') ? d.date : d.date.split('/').reverse().join('-'));
        const formattedDate = `${String(date.getDate() + 1).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        return [
            formattedDate,
            d.orderNumber,
            d.fee?.toFixed(2) || '-',
            d.fee ? 'Taxa Registrada' : 'Taxa Pendente'
        ];
    });

    const csv = [
        headers.join(','),
        ...csvContent.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${generateFileName()}.csv`;
    link.click();
};

// Analytics Functions
const saveAnalyticsData = () => {
    if (deliveries.length === 0) {
        alert("Não há entregas para salvar!");
        return;
    }
    const fileName = generateFileName();
    const data = {
        id: fileName,
        name: fileName,
        date: new Date().toISOString(),
        data: [...deliveries]
    };
    analyticsFiles.push(data);
    localStorage.setItem('analyticsFiles', JSON.stringify(analyticsFiles));
    
    // Limpar entregas atuais após salvar
    deliveries = [];
    saveDeliveries();
    renderTable();
    alert(`Dados salvos com sucesso! Arquivo: ${fileName}`);
};

const loadAnalyticsFiles = () => {
    analyticsFileSelect.innerHTML = '<option value="">Selecione um arquivo de dados</option>';
    
    analyticsFiles.forEach(file => {
        const option = document.createElement('option');
        option.value = file.id;
        option.textContent = `${file.name} (${new Date(file.date).toLocaleDateString('pt-BR')})`;
        analyticsFileSelect.appendChild(option);
    });
};

analyticsFileSelect.addEventListener('change', (e) => {
    const fileId = e.target.value;
    if (!fileId) {
        currentAnalyticsData = null;
        renderAnalytics();
        return;
    }
    currentAnalyticsData = analyticsFiles.find(file => file.id === fileId);
    renderAnalytics();
});

const renderAnalytics = () => {
    if (!currentAnalyticsData) {
        document.getElementById('weekdayChart').innerHTML = '<p class="empty-state">Selecione um arquivo para visualizar os dados</p>';
        document.getElementById('peakDay').innerHTML = '<p class="empty-state">Nenhum dado selecionado</p>';
        document.getElementById('financialSummary').innerHTML = '<p class="empty-state">Nenhum dado selecionado</p>';
        document.getElementById('deliveryHistory').innerHTML = '<p class="empty-state">Nenhum dado selecionado</p>';
        return;
    }
    const deliveries = currentAnalyticsData.data;
    
    // Análise 1: Entregas por dia da semana
    const weekdayCounts = {
        'Domingo': 0,
        'Segunda': 0,
        'Terça': 0,
        'Quarta': 0,
        'Quinta': 0,
        'Sexta': 0,
        'Sábado': 0,
    };
    const weekdayFees = {
        'Domingo': 0,
        'Segunda': 0,
        'Terça': 0,
        'Quarta': 0,
        'Quinta': 0,
        'Sexta': 0,
        'Sábado': 0,
    };
    deliveries.forEach(delivery => {
        const day = getWeekdayName(delivery.date);
        weekdayCounts[day] = (weekdayCounts[day] || 0) + 1;
        if (delivery.fee) {
            weekdayFees[day] = (weekdayFees[day] || 0) + parseFloat(delivery.fee);
        }
    });
    
    // Renderizar gráfico de barras para entregas por dia da semana
    const weekdayChartElement = document.getElementById('weekdayChart');
    weekdayChartElement.innerHTML = `
        <div class="bar-chart">
            ${Object.entries(weekdayCounts).map(([day, count]) => `
                <div class="bar" style="height: ${count ? Math.max((count / Math.max(...Object.values(weekdayCounts))) * 180, 10) : 0}px">
                    <div class="bar-value">${count}</div>
                    <div class="bar-label">${day.substring(0, 3)}</div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Análise 2: Dia com mais entregas
    const sortedDays = Object.entries(weekdayCounts)
        .sort((a, b) => b[1] - a[1]);
    const peakDay = sortedDays[0];
    const peakDayElement = document.getElementById('peakDay');
    
    peakDayElement.innerHTML = `
        <p>O dia com maior número de entregas foi <span class="highlight">${peakDay[0]}</span> com <span class="highlight">${peakDay[1]} entregas</span>.</p>
        <p>Isso representa <span class="highlight">${Math.round((peakDay[1] / deliveries.length) * 100)}%</span> do total de entregas.</p>
    `;
    
    // Análise 3: Resumo Financeiro
    const totalFees = deliveries.reduce((sum, delivery) => sum + (parseFloat(delivery.fee) || 0), 0);
    const completedDeliveries = deliveries.filter(d => d.fee).length;
    const pendingDeliveries = deliveries.filter(d => !d.fee).length;
    const financialSummaryElement = document.getElementById('financialSummary');
    financialSummaryElement.innerHTML = `
        <p>Total arrecadado: <span class="highlight">R$ ${formatCurrency(totalFees)}</span></p>
        <p>Média por entrega: <span class="highlight">R$ ${completedDeliveries ? formatCurrency(totalFees / completedDeliveries) : '0.00'}</span></p>
        <p>Entregas pagas: <span class="highlight">${completedDeliveries}</span></p>
        <p>Entregas pendentes: <span class="highlight">${pendingDeliveries}</span></p>
        <p>Total de entregas: <span class="highlight">${deliveries.length}</span></p>
    `;
    
    // Análise 4: Histórico de Entregas (Gráfico por data)
    const dateCount = {};
    deliveries.forEach(delivery => {
        const formattedDate = formatDate(delivery.date);
        dateCount[formattedDate] = (dateCount[formattedDate] || 0) + 1;
    });
    const deliveryHistoryElement = document.getElementById('deliveryHistory');
    if (Object.keys(dateCount).length > 1) {
        deliveryHistoryElement.innerHTML = `
            <div class="bar-chart">
                ${Object.entries(dateCount).slice(0, 7).map(([date, count]) => `
                    <div class="bar" style="height: ${count ? Math.max((count / Math.max(...Object.values(dateCount))) * 180, 10) : 0}px">
                        <div class="bar-value">${count}</div>
                        <div class="bar-label">${date}</div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        deliveryHistoryElement.innerHTML = `
            <p class="empty-state">Dados insuficientes para gerar o gráfico de histórico.</p>
        `;
    }
};

// Salvar dados e criar arquivo JSON ao finalizar semana
finishWeekButton.onclick = () => {
    exportCSV();
    saveAnalyticsData();
};

// Edit and Delete functions
window.editDelivery = (id) => {
    const delivery = deliveries.find(d => d.id === id);
    if (delivery) {
        editingId = id;

        // Preencher os campos do formulário com os dados da entrega
        deliveryForm.orderNumber.value = delivery.orderNumber;
        deliveryForm.fee.value = delivery.fee || '';
        deliveryForm.date.value = delivery.date;
        if (delivery.imageId) {
            getImageFromIndexedDB(delivery.imageId).then(imageData => {
                imagePreview.innerHTML = `<img src="${imageData}" alt="Preview">`;
            });
        }
        deliveryForm.querySelector('button[type="submit"]').textContent = 'Atualizar Pedido';

        // Criar âncora para o campo do número do pedido
        const orderNumberField = deliveryForm.orderNumber;
        orderNumberField.classList.add('highlight'); // Adiciona uma classe para destacar o campo

        // Garantir que a rolagem funcione em todos os dispositivos
        setTimeout(() => {
            orderNumberField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);

        // Remover o destaque após alguns segundos
        setTimeout(() => {
            orderNumberField.classList.remove('highlight');
        }, 3000); // Remove a classe após 3 segundos
    }
};

window.deleteDelivery = (id) => {
    if (confirm('Tem certeza que deseja excluir esta entrega?')) {
        deliveries = deliveries.filter(d => d.id !== id);
        saveDeliveries();
        renderTable();
    }
};

window.openModal = openModal;

// Initial render
renderTable();
updateTotal();
