
// Helper functions
const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
};

const formatCurrency = (value) => {
    return parseFloat(value || 0).toFixed(2);
};

// State management
let deliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
let editingId = null;

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

// Render table
const renderTable = (items = deliveries) => {
    const tbody = deliveriesTable.querySelector('tbody');
    tbody.innerHTML = '';

    items.forEach(delivery => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(delivery.date)}</td>
            <td>${delivery.orderNumber}</td>
            <td>${delivery.fee ? formatCurrency(delivery.fee) : '-'}</td>
            <td>
                <span class="status-badge ${delivery.fee ? 'status-completed' : 'status-pending'}">
                    ${delivery.fee ? 'Taxa Registrada' : 'Taxa Pendente'}
                </span>
            </td>
            <td>
                ${delivery.imageUrl ? `
                    <img src="${delivery.imageUrl}" 
                         alt="Comprovante" 
                         class="table-image"
                         onclick="openModal('${delivery.imageUrl}')">
                ` : ''}
            </td>
            <td class="table-actions">
                <button onclick="editDelivery('${delivery.id}')" class="button outline">
                    Editar
                </button>
                <button onclick="deleteDelivery('${delivery.id}')" class="button outline">
                    Excluir
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

// Form handling
deliveryForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = {
        orderNumber: e.target.orderNumber.value,
        fee: e.target.fee.value ? parseFloat(e.target.fee.value) : null,
        date: e.target.date.value,
        imageUrl: imagePreview.querySelector('img')?.src,
        id: editingId || Date.now().toString()
    };

    if (editingId) {
        deliveries = deliveries.map(d => d.id === editingId ? {...formData} : d);
        editingId = null;
    } else {
        deliveries.unshift(formData);
    }

    saveDeliveries();
    renderTable();
    deliveryForm.reset();
    imagePreview.innerHTML = '';
    e.target.querySelector('button[type="submit"]').textContent = 'Registrar Pedido';
});

// Search functionality
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = deliveries.filter(d => 
        d.orderNumber.toLowerCase().includes(searchTerm)
    );
    renderTable(filtered);
});

// Image handling
const openModal = (imageUrl) => {
    modalImage.src = imageUrl;
    imageModal.style.display = 'block';
};

closeModal.onclick = () => {
    imageModal.style.display = 'none';
};

window.onclick = (e) => {
    if (e.target === imageModal) {
        imageModal.style.display = 'none';
    }
};

uploadButton.onclick = () => imageInput.click();

imageInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
            `;
        };
        reader.readAsDataURL(file);
    }
};

// CSV Import/Export
const generateFileName = () => {
    const date = new Date();
    const months = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 
                   'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const month = months[date.getMonth()];
    const weekNumber = Math.ceil(date.getDate() / 7);
    const randomId = Math.floor(Math.random() * 900) + 100;
    return `${month}semana${weekNumber}_${randomId}`;
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
                    return {
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        date: new Date(date.split('/').reverse().join('-')).toISOString().split('T')[0],
                        orderNumber: orderNumber.trim(),
                        fee: fee.trim() !== '-' ? parseFloat(fee) : null,
                        imageUrl: null
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
    const csvContent = deliveries.map(d => [
        formatDate(d.date),
        d.orderNumber,
        d.fee?.toFixed(2) || '-',
        d.fee ? 'Taxa Registrada' : 'Taxa Pendente'
    ]);

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

finishWeekButton.onclick = () => {
    exportCSV();
    deliveries = [];
    saveDeliveries();
    renderTable();
};

// Edit and Delete functions
const editDelivery = (id) => {
    const delivery = deliveries.find(d => d.id === id);
    if (delivery) {
        editingId = id;
        deliveryForm.orderNumber.value = delivery.orderNumber;
        deliveryForm.fee.value = delivery.fee || '';
        deliveryForm.date.value = delivery.date;
        if (delivery.imageUrl) {
            imagePreview.innerHTML = `<img src="${delivery.imageUrl}" alt="Preview">`;
        }
        deliveryForm.querySelector('button[type="submit"]').textContent = 'Atualizar Pedido';
    }
};

const deleteDelivery = (id) => {
    if (confirm('Tem certeza que deseja excluir esta entrega?')) {
        deliveries = deliveries.filter(d => d.id !== id);
        saveDeliveries();
        renderTable();
    }
};

// Initial render
renderTable();
updateTotal();
