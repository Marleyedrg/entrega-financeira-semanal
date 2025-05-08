// Variáveis globais para armazenar os dados
let currentAnalyticsData = null;
let deliveries = JSON.parse(localStorage.getItem('deliveries')) || [];
let gasEntries = JSON.parse(localStorage.getItem('gasEntries')) || [];

// Função para obter a data atual formatada para input type="date"
function getCurrentDate() {
  const now = new Date();
  // Ajustar para o fuso horário local
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().split('T')[0];
}

// Função para salvar entregas no localStorage
function saveDeliveries() {
  localStorage.setItem('deliveries', JSON.stringify(deliveries));
  updateDeliveriesTable();
  updateTotals();
}

// Função para salvar registros de gasolina no localStorage
function saveGasEntries() {
  localStorage.setItem('gasEntries', JSON.stringify(gasEntries));
  updateGasTable();
  updateTotals();
}

// Função para atualizar a tabela de entregas
function updateDeliveriesTable() {
  const table = document.getElementById('deliveriesTable').getElementsByTagName('tbody')[0];
  table.innerHTML = '';
  
  deliveries.forEach((delivery, index) => {
    const row = table.insertRow();
    row.innerHTML = `
      <td data-label="Data">${formatDate(delivery.date)}</td>
      <td data-label="Pedido">${delivery.orderNumber}</td>
      <td data-label="Taxa">R$ ${formatCurrency(parseFloat(delivery.fee) || 0)}</td>
      <td data-label="Status">${delivery.fee ? 'Pago' : 'Pendente'}</td>
      <td data-label="Comprovante">
        ${delivery.image ? `<img src="${delivery.image}" alt="Preview" class="table-image" onclick="showImageModal(this.src)">` : 'Sem comprovante'}
      </td>
      <td data-label="Ações">
        <div class="table-actions">
          <button class="button outline edit-button" onclick="editDelivery(${index})">Editar</button>
          <button class="button outline delete-button" onclick="deleteDelivery(${index})">Excluir</button>
        </div>
      </td>
    `;
  });
  renderAnalytics();
}

// Função para atualizar a tabela de gasolina
function updateGasTable() {
  const table = document.getElementById('gasTable').getElementsByTagName('tbody')[0];
  table.innerHTML = '';
  
  gasEntries.forEach((entry, index) => {
    const row = table.insertRow();
    row.innerHTML = `
      <td data-label="Data">${formatDate(entry.date)}</td>
      <td data-label="Valor">R$ ${formatCurrency(parseFloat(entry.amount) || 0)}</td>
      <td data-label="Comprovante">
        ${entry.image ? `<img src="${entry.image}" alt="Preview" class="table-image" onclick="showImageModal(this.src)">` : 'Sem comprovante'}
      </td>
      <td data-label="Ações">
        <div class="table-actions">
          <button class="button outline edit-button" onclick="editGasEntry(${index})">Editar</button>
          <button class="button outline delete-button" onclick="deleteGasEntry(${index})">Excluir</button>
        </div>
      </td>
    `;
  });
  renderAnalytics();
}

// Função para exibir notificações toast
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Animar entrada
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  // Remover após 3 segundos
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

// Função para formatar datas para exibição
function formatDate(dateString) {
  if (!dateString) return '-';
  
  // Ajustar para o fuso horário local
  const date = new Date(dateString + 'T00:00:00');
  if (isNaN(date.getTime())) return '-';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Função para formatar valores monetários
function formatCurrency(value) {
  if (isNaN(value)) return 'R$ 0,00';
  
  return value
    .toFixed(2)
    .replace('.', ',')
    .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
}

// Função para alternar entre as abas
function switchTab(tabId) {
  // Esconder todas as abas
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Desativar todos os botões
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.remove('active');
  });
  
  // Ativar a aba selecionada
  document.getElementById(tabId).classList.add('active');
  
  // Ativar o botão correspondente
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
}

// Função para limpar os dados de análise
function clearAnalytics() {
  if (confirm('Tem certeza que deseja limpar os dados de análise?')) {
    currentAnalyticsData = null;
    renderAnalytics();
    showToast('Dados de análise limpos com sucesso!', 'success');
  }
}

// Inicializar os manipuladores de eventos quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  // Configurar os botões de aba
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Configurar o botão de importação de CSV para análise
  const importAnalyticsButton = document.getElementById('importAnalyticsButton');
  const analyticsCSVInput = document.getElementById('analyticsCSVInput');

  importAnalyticsButton.addEventListener('click', () => {
    analyticsCSVInput.click();
  });

  // Configurar o botão de limpar análise
  const clearAnalyticsButton = document.getElementById('clearAnalyticsButton');
  clearAnalyticsButton.addEventListener('click', clearAnalytics);

  // Configurar o input de arquivo CSV para análise
  analyticsCSVInput.addEventListener('change', handleAnalyticsCSVImport);

  // Configurar o formulário de entregas
  const deliveryForm = document.getElementById('deliveryForm');
  deliveryForm.addEventListener('submit', handleDeliveryFormSubmit);

  // Configurar o botão de upload de imagem
  const uploadButton = document.getElementById('uploadButton');
  const imageInput = document.getElementById('image');
  const imagePreview = document.getElementById('imagePreview');

  uploadButton.addEventListener('click', () => {
    imageInput.click();
  });

  imageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview.innerHTML = `
          <img src="${e.target.result}" alt="Preview" class="table-image" onclick="showImageModal(this.src)">
        `;
      };
      reader.readAsDataURL(file);
    }
  });

  // Configurar o formulário de gasolina
  const gasForm = document.getElementById('gasForm');
  gasForm.addEventListener('submit', handleGasFormSubmit);

  // Configurar o input de imagem da gasolina
  const gasImageInput = document.getElementById('gasImage');
  gasImageInput.addEventListener('change', (event) => {
    handleGasImageUpload(event.target);
  });

  // Configurar o modal de imagem
  const modal = document.getElementById('imageModal');
  const closeButton = modal.querySelector('.close');
  
  closeButton.addEventListener('click', closeImageModal);
  
  // Fechar modal ao clicar fora da imagem
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeImageModal();
    }
  });

  // Definir a data atual nos campos de data
  const dateInput = document.getElementById('date');
  const gasDateInput = document.getElementById('gasDate');
  
  if (dateInput) dateInput.value = getCurrentDate();
  if (gasDateInput) gasDateInput.value = getCurrentDate();

  // Configurar botão de finalizar semana
  const finishWeekButton = document.getElementById('finishWeekButton');
  if (finishWeekButton) {
    finishWeekButton.addEventListener('click', finishWeek);
  }

  // Carregar dados salvos
  updateDeliveriesTable();
  updateGasTable();
  updateTotals();

  // Inicializar a primeira aba
  switchTab('register');
});

// Função auxiliar para obter o nome do dia da semana em português
const getWeekdayName = (dateString) => {
  const date = new Date(dateString)
  const weekday = date.getDay()
  const weekdays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
  return weekdays[weekday]
}

// Refatorar renderAnalytics para usar dados locais sem sobrescrever currentAnalyticsData
const renderAnalytics = () => {
  let analyticsData;
  if (currentAnalyticsData) {
    analyticsData = currentAnalyticsData;
  } else {
    // Se não houver dados locais, mostrar empty state
    if ((!deliveries || deliveries.length === 0) && (!gasEntries || gasEntries.length === 0)) {
      document.getElementById("weekdayChart").innerHTML =
        '<p class="empty-state">Nenhum dado cadastrado</p>'
      document.getElementById("peakDay").innerHTML = '<p class="empty-state">Nenhum dado cadastrado</p>'
      document.getElementById("financialSummary").innerHTML = '<p class="empty-state">Nenhum dado cadastrado</p>'
      document.getElementById("deliveryHistory").innerHTML = '<p class="empty-state">Nenhum dado cadastrado</p>'
      document.getElementById("gasExpenseChart").innerHTML = '<p class="empty-state">Nenhum dado cadastrado</p>'
      document.getElementById("revenueExpenseChart").innerHTML = '<p class="empty-state">Nenhum dado cadastrado</p>'
      document.getElementById("performanceMetrics").innerHTML = '<p class="empty-state">Nenhum dado cadastrado</p>'
      document.getElementById("trends").innerHTML = '<p class="empty-state">Nenhum dado cadastrado</p>'
      document.getElementById("profitEvolutionChart").innerHTML = '<p class="empty-state">Nenhum dado cadastrado</p>'
      return;
    }
    analyticsData = {
      data: deliveries,
      gasData: gasEntries
    };
  }

  // O resto da função permanece igual, mas usando analyticsData
  const deliveriesData = analyticsData.data || [];
  const gasData = analyticsData.gasData || [];

  // Análise 1: Entregas por dia da semana
  const weekdayCounts = {
    Domingo: 0,
    Segunda: 0,
    Terça: 0,
    Quarta: 0,
    Quinta: 0,
    Sexta: 0,
    Sábado: 0,
  }

  const weekdayFees = {
    Domingo: 0,
    Segunda: 0,
    Terça: 0,
    Quarta: 0,
    Quinta: 0,
    Sexta: 0,
    Sábado: 0,
  }

  deliveriesData.forEach((delivery) => {
    const day = getWeekdayName(delivery.date)
    weekdayCounts[day] = (weekdayCounts[day] || 0) + 1
    if (delivery.fee) {
      weekdayFees[day] = (weekdayFees[day] || 0) + Number.parseFloat(delivery.fee)
    }
  })

  // Renderizar gráfico de barras para entregas por dia da semana
  const weekdayChartElement = document.getElementById("weekdayChart")
  weekdayChartElement.innerHTML = `
    <div class="bar-chart">
      ${Object.entries(weekdayCounts)
        .map(
          ([day, count]) => `
          <div class="bar" style="height: ${count ? Math.max((count / Math.max(...Object.values(weekdayCounts))) * 180, 10) : 0}px">
            <div class="bar-value">${count}</div>
            <div class="bar-label">${day.substring(0, 3)}</div>
          </div>
        `,
        )
        .join("")}
    </div>
  `

  // Análise 2: Dia com mais entregas
  const sortedDays = Object.entries(weekdayCounts).sort((a, b) => b[1] - a[1]);
  const peakDay = sortedDays[0];
  const peakDayElement = document.getElementById("peakDay");

  if (peakDay && peakDay[1] > 0) {
    peakDayElement.innerHTML = `
      <p>O dia com maior número de entregas foi <span class="highlight">${peakDay[0]}</span> com <span class="highlight">${peakDay[1]} entregas</span>.</p>
      <p>Isso representa <span class="highlight">${Math.round((peakDay[1] / deliveriesData.length) * 100)}%</span> do total de entregas.</p>
      <p>Valor arrecadado neste dia: <span class="highlight">R$ ${formatCurrency(weekdayFees[peakDay[0]])}</span></p>
    `
  } else {
    peakDayElement.innerHTML = `<p class="empty-state">Nenhum dado suficiente para análise do dia com mais entregas.</p>`;
  }

  // Análise 3: Resumo Financeiro
  const totalFees = deliveriesData.reduce((sum, delivery) => sum + (Number.parseFloat(delivery.fee) || 0), 0)
  const totalGas = gasData.reduce((sum, entry) => sum + (Number.parseFloat(entry.amount) || 0), 0)
  const completedDeliveries = deliveriesData.filter((d) => d.fee).length
  const pendingDeliveries = deliveriesData.filter((d) => !d.fee).length
  const netProfit = totalFees - totalGas
  const profitMargin = totalFees > 0 ? (netProfit / totalFees) * 100 : 0

  const financialSummaryElement = document.getElementById("financialSummary")
  financialSummaryElement.innerHTML = `
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-value">R$ ${formatCurrency(totalFees)}</div>
        <div class="metric-label">Total Taxas</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">R$ ${formatCurrency(totalGas)}</div>
        <div class="metric-label">Total Gasolina</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">R$ ${formatCurrency(netProfit)}</div>
        <div class="metric-label">Lucro Líquido</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${profitMargin.toFixed(1)}%</div>
        <div class="metric-label">Margem de Lucro</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${completedDeliveries}</div>
        <div class="metric-label">Entregas Pagas</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${pendingDeliveries}</div>
        <div class="metric-label">Entregas Pendentes</div>
      </div>
    </div>
  `

  // Análise 4: Gráfico de Receitas vs Despesas
  const revenueExpenseChartElement = document.getElementById("revenueExpenseChart")

  // Calcular a porcentagem para o gráfico de pizza
  const totalAmount = totalFees + totalGas
  const feesPercentage = totalAmount > 0 ? (totalFees / totalAmount) * 100 : 0
  const gasPercentage = totalAmount > 0 ? (totalGas / totalAmount) * 100 : 0

  revenueExpenseChartElement.innerHTML = `
    <div class="pie-chart">
      <div class="pie-segment" style="background-color: #16a34a; transform: rotate(0deg);"></div>
      <div class="pie-segment" style="background-color: #dc2626; transform: rotate(${feesPercentage * 3.6}deg);"></div>
    </div>
    <div class="pie-label">
      <div class="pie-label-item">
        <span class="pie-color" style="background-color: #16a34a;"></span>
        <span>Taxas: ${feesPercentage.toFixed(1)}%</span>
      </div>
      <div class="pie-label-item">
        <span class="pie-color" style="background-color: #dc2626;"></span>
        <span>Gasolina: ${gasPercentage.toFixed(1)}%</span>
      </div>
    </div>
  `

  // Análise 5: Gastos com Gasolina
  const gasExpenseChartElement = document.getElementById("gasExpenseChart")

  if (gasData.length === 0) {
    gasExpenseChartElement.innerHTML = '<p class="empty-state">Não há dados de gasolina para este período</p>'
  } else {
    // Agrupar gastos com gasolina por data
    const gasByDate = {}
    gasData.forEach((entry) => {
      const formattedDate = formatDate(entry.date)
      gasByDate[formattedDate] = (gasByDate[formattedDate] || 0) + Number.parseFloat(entry.amount)
    })

    // Ordenar por data
    const sortedGasDates = Object.entries(gasByDate).sort((a, b) => {
      const dateA = new Date(a[0].split("/").reverse().join("-"))
      const dateB = new Date(b[0].split("/").reverse().join("-"))
      return dateA - dateB
    })

    // Criar gráfico de barras horizontais
    gasExpenseChartElement.innerHTML = `
      <div class="horizontal-bar-chart">
        ${sortedGasDates
          .map(([date, amount]) => {
            const maxAmount = Math.max(...Object.values(gasByDate))
            const percentage = (amount / maxAmount) * 100
            return `
            <div class="horizontal-bar">
              <div class="horizontal-bar-label">${date}</div>
              <div class="horizontal-bar-track">
                <div class="horizontal-bar-fill" style="width: ${percentage}%"></div>
              </div>
              <div class="horizontal-bar-value">R$ ${formatCurrency(amount)}</div>
            </div>
          `
          })
          .join("")}
      </div>
    `
  }

  // Análise 6: Métricas de Desempenho
  const performanceMetricsElement = document.getElementById("performanceMetrics")

  // Calcular métricas de desempenho
  const avgFeePerDelivery = completedDeliveries > 0 ? totalFees / completedDeliveries : 0
  const avgGasPerDelivery = completedDeliveries > 0 ? totalGas / completedDeliveries : 0
  const avgProfitPerDelivery = completedDeliveries > 0 ? netProfit / completedDeliveries : 0
  const deliveriesPerDay = {}

  deliveriesData.forEach((delivery) => {
    const formattedDate = formatDate(delivery.date)
    deliveriesPerDay[formattedDate] = (deliveriesPerDay[formattedDate] || 0) + 1
  })

  const avgDeliveriesPerDay =
    Object.values(deliveriesPerDay).length > 0
      ? Object.values(deliveriesPerDay).reduce((sum, count) => sum + count, 0) / Object.values(deliveriesPerDay).length
      : 0

  performanceMetricsElement.innerHTML = `
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-value">R$ ${formatCurrency(avgFeePerDelivery)}</div>
        <div class="metric-label">Média por Entrega</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">R$ ${formatCurrency(avgGasPerDelivery)}</div>
        <div class="metric-label">Gasto Médio</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">R$ ${formatCurrency(avgProfitPerDelivery)}</div>
        <div class="metric-label">Lucro por Entrega</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${avgDeliveriesPerDay.toFixed(1)}</div>
        <div class="metric-label">Entregas/Dia</div>
      </div>
    </div>
  `

  // Análise 7: Histórico de Entregas (Gráfico por data)
  const dateCount = {}
  const dateFees = {}

  deliveriesData.forEach((delivery) => {
    const formattedDate = formatDate(delivery.date)
    dateCount[formattedDate] = (dateCount[formattedDate] || 0) + 1
    if (delivery.fee) {
      dateFees[formattedDate] = (dateFees[formattedDate] || 0) + Number.parseFloat(delivery.fee)
    }
  })

  const deliveryHistoryElement = document.getElementById("deliveryHistory")

  if (Object.keys(dateCount).length > 1) {
    // Ordenar por data
    const sortedDates = Object.entries(dateCount).sort((a, b) => {
      const dateA = new Date(a[0].split("/").reverse().join("-"))
      const dateB = new Date(b[0].split("/").reverse().join("-"))
      return dateA - dateB
    })

    deliveryHistoryElement.innerHTML = `
      <div class="bar-chart">
        ${sortedDates
          .slice(0, 7)
          .map(([date, count]) => {
            const fee = dateFees[date] || 0
            return `
            <div class="bar" style="height: ${count ? Math.max((count / Math.max(...Object.values(dateCount))) * 180, 10) : 0}px">
              <div class="bar-value">${count}</div>
              <div class="bar-label">${date}</div>
            </div>
          `
          })
          .join("")}
      </div>
    `
  } else {
    deliveryHistoryElement.innerHTML = `
      <p class="empty-state">Dados insuficientes para gerar o gráfico de histórico.</p>
    `
  }

  // Análise 8: Tendências
  const trendsElement = document.getElementById("trends")

  // Calcular tendências (comparando primeira metade vs segunda metade do período)
  if (deliveriesData.length > 1) {
    // Ordenar entregas por data
    const sortedDeliveries = [...deliveriesData].sort((a, b) => {
      const dateA = new Date(a.date)
      const dateB = new Date(b.date)
      return dateA - dateB
    })

    const midPoint = Math.floor(sortedDeliveries.length / 2)
    const firstHalf = sortedDeliveries.slice(0, midPoint)
    const secondHalf = sortedDeliveries.slice(midPoint)

    const firstHalfFees = firstHalf.reduce((sum, d) => sum + (Number.parseFloat(d.fee) || 0), 0)
    const secondHalfFees = secondHalf.reduce((sum, d) => sum + (Number.parseFloat(d.fee) || 0), 0)

    const feesChange =
      firstHalfFees > 0 ? ((secondHalfFees - firstHalfFees) / firstHalfFees) * 100 : secondHalfFees > 0 ? 100 : 0

    // Calcular tendência de gastos com gasolina
    let gasChange = 0
    if (gasData.length > 1) {
      const sortedGasData = [...gasData].sort((a, b) => {
        const dateA = new Date(a.date)
        const dateB = new Date(b.date)
        return dateA - dateB
      })

      const gasMidPoint = Math.floor(sortedGasData.length / 2)
      const firstHalfGas = sortedGasData.slice(0, gasMidPoint)
      const secondHalfGas = sortedGasData.slice(gasMidPoint)

      const firstHalfGasAmount = firstHalfGas.reduce((sum, entry) => sum + Number.parseFloat(entry.amount), 0)
      const secondHalfGasAmount = secondHalfGas.reduce((sum, entry) => sum + Number.parseFloat(entry.amount), 0)

      gasChange =
        firstHalfGasAmount > 0
          ? ((secondHalfGasAmount - firstHalfGasAmount) / firstHalfGasAmount) * 100
          : secondHalfGasAmount > 0
            ? 100
            : 0
    }

    // Calcular tendência de lucro
    const firstHalfGasAmount =
      gasData.length > 0
        ? gasData
            .filter((entry) => {
              const entryDate = new Date(entry.date)
              return firstHalf.some((d) => {
                const deliveryDate = new Date(d.date)
                return entryDate.getTime() <= deliveryDate.getTime()
              })
            })
            .reduce((sum, entry) => sum + Number.parseFloat(entry.amount), 0)
        : 0

    const secondHalfGasAmount =
      gasData.length > 0
        ? gasData
            .filter((entry) => {
              const entryDate = new Date(entry.date)
              return secondHalf.some((d) => {
                const deliveryDate = new Date(d.date)
                return entryDate.getTime() > deliveryDate.getTime()
              })
            })
            .reduce((sum, entry) => sum + Number.parseFloat(entry.amount), 0)
        : 0

    const firstHalfProfit = firstHalfFees - firstHalfGasAmount
    const secondHalfProfit = secondHalfFees - secondHalfGasAmount

    const profitChange =
      firstHalfProfit > 0
        ? ((secondHalfProfit - firstHalfProfit) / firstHalfProfit) * 100
        : secondHalfProfit > 0
          ? 100
          : 0

    trendsElement.innerHTML = `
      <p>
        <span class="trend-icon ${feesChange > 0 ? "trend-up" : feesChange < 0 ? "trend-down" : "trend-neutral"}">
          ${feesChange > 0 ? "↑" : feesChange < 0 ? "↓" : "→"}
        </span>
        Receita: <span class="highlight">${feesChange.toFixed(1)}%</span> 
        ${feesChange > 0 ? "aumento" : feesChange < 0 ? "queda" : "estável"}
      </p>
      <p>
        <span class="trend-icon ${gasChange > 0 ? "trend-up" : gasChange < 0 ? "trend-down" : "trend-neutral"}">
          ${gasChange > 0 ? "↑" : gasChange < 0 ? "↓" : "→"}
        </span>
        Gastos com gasolina: <span class="highlight">${gasChange.toFixed(1)}%</span> 
        ${gasChange > 0 ? "aumento" : gasChange < 0 ? "queda" : "estável"}
      </p>
      <p>
        <span class="trend-icon ${profitChange > 0 ? "trend-up" : profitChange < 0 ? "trend-down" : "trend-neutral"}">
          ${profitChange > 0 ? "↑" : profitChange < 0 ? "↓" : "→"}
        </span>
        Lucro: <span class="highlight">${profitChange.toFixed(1)}%</span> 
        ${profitChange > 0 ? "aumento" : profitChange < 0 ? "queda" : "estável"}
      </p>
      <p>Comparação entre primeira e segunda metade do período.</p>
    `
  } else {
    trendsElement.innerHTML = `
      <p class="empty-state">Dados insuficientes para analisar tendências.</p>
    `
  }

  // NOVA ANÁLISE: Evolução do Lucro ao Longo do Tempo
  const profitEvolutionChartElement = document.getElementById("profitEvolutionChart")

  // Calcular lucro diário
  const dailyProfits = {}
  const dailyFees = {}
  const dailyGasExpenses = {}

  // Inicializar com todas as datas do período
  if (deliveriesData.length > 0 || gasData.length > 0) {
    // Encontrar a data mais antiga e mais recente
    const allDates = [...deliveriesData.map((d) => new Date(d.date)), ...gasData.map((g) => new Date(g.date))]

    if (allDates.length > 0) {
      const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())))
      const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())))

      // Criar um array com todas as datas no intervalo
      const dateRange = []
      const currentDate = new Date(minDate)

      while (currentDate <= maxDate) {
        const formattedDate = formatDate(currentDate.toISOString().split("T")[0])
        dateRange.push(formattedDate)
        dailyFees[formattedDate] = 0
        dailyGasExpenses[formattedDate] = 0
        currentDate.setDate(currentDate.getDate() + 1)
      }

      // Calcular taxas por dia
      deliveriesData.forEach((delivery) => {
        if (delivery.fee) {
          const formattedDate = formatDate(delivery.date)
          dailyFees[formattedDate] = (dailyFees[formattedDate] || 0) + Number.parseFloat(delivery.fee)
        }
      })

      // Calcular gastos com gasolina por dia
      gasData.forEach((entry) => {
        const formattedDate = formatDate(entry.date)
        dailyGasExpenses[formattedDate] = (dailyGasExpenses[formattedDate] || 0) + Number.parseFloat(entry.amount)
      })

      // Calcular lucro diário e lucro acumulado
      let cumulativeProfit = 0
      const cumulativeProfits = {}

      // Ordenar as datas cronologicamente
      const sortedDates = Object.keys(dailyFees).sort((a, b) => {
        const dateA = new Date(a.split("/").reverse().join("-"))
        const dateB = new Date(b.split("/").reverse().join("-"))
        return dateA - dateB
      })

      sortedDates.forEach((date) => {
        const dailyFee = dailyFees[date] || 0
        const dailyGasExpense = dailyGasExpenses[date] || 0
        const dailyProfit = dailyFee - dailyGasExpense
        dailyProfits[date] = dailyProfit

        cumulativeProfit += dailyProfit
        cumulativeProfits[date] = cumulativeProfit
      })

      // Renderizar o gráfico de evolução do lucro
      if (sortedDates.length > 1) {
        // Encontrar o valor máximo e mínimo para escala do gráfico
        const profitValues = Object.values(cumulativeProfits)
        const maxProfit = Math.max(...profitValues)
        const minProfit = Math.min(...profitValues)
        const range = Math.max(Math.abs(maxProfit), Math.abs(minProfit))

        // Altura base do gráfico
        const baseHeight = 100
        const chartHeight = 200

        profitEvolutionChartElement.innerHTML = `
          <div class="line-chart-container">
            <div class="line-chart-y-axis">
              <div class="line-chart-y-label">R$ ${formatCurrency(maxProfit)}</div>
              <div class="line-chart-y-label">R$ 0.00</div>
              <div class="line-chart-y-label">R$ ${minProfit < 0 ? formatCurrency(minProfit) : "0.00"}</div>
            </div>
            <div class="line-chart">
              <div class="line-chart-zero-line"></div>
              <svg class="line-chart-svg" viewBox="0 0 ${sortedDates.length * 50} 200" preserveAspectRatio="none">
                <path class="line-chart-path" d="${generateLinePath(sortedDates, cumulativeProfits, baseHeight, chartHeight, range)}" />
                ${generateDataPoints(sortedDates, cumulativeProfits, baseHeight, chartHeight, range)}
              </svg>
              <div class="line-chart-x-labels">
                ${sortedDates
                  .map(
                    (date, index) => `
                  <div class="line-chart-x-label" style="left: ${(index / (sortedDates.length - 1)) * 100}%">
                    ${date}
                  </div>
                `,
                  )
                  .join("")}
              </div>
            </div>
          </div>
          <div class="line-chart-legend">
            <div class="line-chart-legend-item">
              <span class="line-chart-legend-color profit-positive"></span>
              <span>Lucro Acumulado</span>
            </div>
            <div class="line-chart-info">
              <p>Lucro total no período: <span class="highlight ${cumulativeProfit >= 0 ? "profit-positive-text" : "profit-negative-text"}">
                R$ ${formatCurrency(cumulativeProfit)}
              </span></p>
              <p>Melhor dia: <span class="highlight profit-positive-text">
                ${getBestProfitDay(dailyProfits)}
              </span></p>
              <p>Pior dia: <span class="highlight profit-negative-text">
                ${getWorstProfitDay(dailyProfits)}
              </span></p>
            </div>
          </div>
        `
      } else {
        profitEvolutionChartElement.innerHTML = `
          <p class="empty-state">Dados insuficientes para gerar o gráfico de evolução do lucro.</p>
        `
      }
    } else {
      profitEvolutionChartElement.innerHTML = `
        <p class="empty-state">Nenhum dado disponível para análise.</p>
      `
    }
  } else {
    profitEvolutionChartElement.innerHTML = `
      <p class="empty-state">Nenhum dado disponível para análise.</p>
    `
  }
}

// Função auxiliar para gerar o caminho SVG para o gráfico de linha
function generateLinePath(dates, profits, baseHeight, chartHeight, range) {
  if (dates.length === 0) return ""

  let path = `M 0 ${baseHeight}`

  dates.forEach((date, index) => {
    const profit = profits[date]
    // Calcular a posição Y com base no lucro
    // Valores positivos vão para cima, negativos para baixo
    const yPos = baseHeight - (profit / range) * baseHeight

    // Adicionar ponto ao caminho
    path += ` L ${index * 50} ${yPos}`
  })

  return path
}

// Função auxiliar para gerar os pontos de dados no gráfico
function generateDataPoints(dates, profits, baseHeight, chartHeight, range) {
  if (dates.length === 0) return ""

  let points = ""

  dates.forEach((date, index) => {
    const profit = profits[date]
    // Calcular a posição Y com base no lucro
    const yPos = baseHeight - (profit / range) * baseHeight

    // Adicionar círculo para o ponto de dados
    const color = profit >= 0 ? "#16a34a" : "#dc2626"
    points += `<circle cx="${index * 50}" cy="${yPos}" r="4" fill="${color}" class="data-point" data-value="R$ ${formatCurrency(profit)}" data-date="${date}" />`
  })

  return points
}

// Função para encontrar o dia com maior lucro
function getBestProfitDay(dailyProfits) {
  const entries = Object.entries(dailyProfits)
  if (entries.length === 0) return "N/A"

  const bestDay = entries.reduce((best, current) => {
    return current[1] > best[1] ? current : best
  }, entries[0])

  return `${bestDay[0]} (R$ ${formatCurrency(bestDay[1])})`
}

// Função para encontrar o dia com menor lucro (ou maior prejuízo)
function getWorstProfitDay(dailyProfits) {
  const entries = Object.entries(dailyProfits)
  if (entries.length === 0) return "N/A"

  const worstDay = entries.reduce((worst, current) => {
    return current[1] < worst[1] ? current : worst
  }, entries[0])

  return `${worstDay[0]} (R$ ${formatCurrency(worstDay[1])})`
}

// Função para gerar CSV com os dados
function generateCSV() {
  const headers = ['Data', 'Tipo', 'Número do Pedido', 'Valor Pedido', 'Valor Gasolina', 'Status'];
  const rows = [];
  
  // Adicionar entregas
  deliveries.forEach(delivery => {
    rows.push([
      formatDate(delivery.date),
      'Entrega',
      delivery.orderNumber,
      delivery.fee,
      '',
      delivery.fee ? 'Pago' : 'Pendente'
    ]);
  });
  
  // Adicionar registros de gasolina
  gasEntries.forEach(entry => {
    rows.push([
      formatDate(entry.date),
      'Gasolina',
      '',
      '',
      entry.amount,
      'Pago'
    ]);
  });
  
  // Converter para CSV
  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}

// Função para processar o arquivo CSV de análise (novo formato)
function handleAnalyticsCSVImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const lines = text.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Processar dados de entregas e gasolina
    const deliveries = [];
    const gasData = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(',').map(v => v.trim());
      const entry = {};
      headers.forEach((header, index) => {
        entry[header] = values[index];
      });
      if (entry['Tipo'] === 'Gasolina') {
        gasData.push({
          date: parseCSVDate(entry['Data']),
          amount: parseFloat(entry['Valor Gasolina']) || 0,
          image: null
        });
      } else if (entry['Tipo'] === 'Entrega') {
        deliveries.push({
          date: parseCSVDate(entry['Data']),
          orderNumber: entry['Número do Pedido'],
          fee: parseFloat(entry['Valor Pedido']) || 0,
          image: null
        });
      }
    }
    currentAnalyticsData = {
      data: deliveries,
      gasData: gasData
    };
    renderAnalytics();
    showToast('Dados importados com sucesso!', 'success');
  };
  reader.readAsText(file);
}

// Função auxiliar para converter data do formato dd/mm/yyyy para yyyy-mm-dd
function parseCSVDate(dateStr) {
  if (!dateStr) return '';
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Função para manipular o envio do formulário de entregas
function handleDeliveryFormSubmit(event) {
  event.preventDefault();
  
  const orderNumber = document.getElementById('orderNumber').value.trim();
  const fee = document.getElementById('fee').value;
  const date = document.getElementById('date').value;
  const imagePreview = document.getElementById('imagePreview');
  
  // Validar campos obrigatórios
  if (!orderNumber || !date) {
    showToast('Por favor, preencha todos os campos obrigatórios', 'error');
    return;
  }

  // Validar se o número do pedido não está vazio ou contém apenas espaços
  if (orderNumber.length === 0) {
    showToast('O número do pedido é obrigatório!', 'error');
    return;
  }

  // Verificar se já existe um pedido com o mesmo número no mesmo dia
  const isDuplicate = deliveries.some(delivery => 
    delivery.orderNumber === orderNumber && delivery.date === date
  );

  if (isDuplicate) {
    showToast('Já existe um pedido com este número registrado nesta data!', 'error');
    return;
  }
  
  // Criar nova entrega
  const newDelivery = {
    date,
    orderNumber,
    fee: parseFloat(fee) || 0,
    image: imagePreview.querySelector('img')?.src || null
  };
  
  // Adicionar à lista de entregas
  deliveries.push(newDelivery);
  
  // Salvar no localStorage
  saveDeliveries();
  
  // Limpar formulário
  event.target.reset();
  imagePreview.innerHTML = '';
  
  // Restaurar a data atual
  document.getElementById('date').value = getCurrentDate();
  
  showToast('Entrega registrada com sucesso!', 'success');
}

// Função para excluir uma entrega
function deleteDelivery(index) {
  deliveries.splice(index, 1);
  saveDeliveries();
  showToast('Entrega excluída com sucesso!', 'success');
}

// Função para atualizar os totais
function updateTotals() {
  const table = document.getElementById('deliveriesTable').getElementsByTagName('tbody')[0];
  const rows = table.getElementsByTagName('tr');
  
  let totalFees = 0;
  let totalGas = 0;
  
  // Calcular total de taxas
  for (let row of rows) {
    const feeCell = row.cells[2];
    const fee = parseFloat(feeCell.textContent.replace('R$ ', '').replace('.', '').replace(',', '.')) || 0;
    totalFees += fee;
  }
  
  // Calcular total de gasolina (se houver tabela de gasolina)
  const gasTable = document.getElementById('gasTable');
  if (gasTable) {
    const gasRows = gasTable.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
    for (let row of gasRows) {
      const amountCell = row.cells[1];
      const amount = parseFloat(amountCell.textContent.replace('R$ ', '').replace('.', '').replace(',', '.')) || 0;
      totalGas += amount;
    }
  }
  
  // Atualizar elementos na tela
  document.getElementById('totalFees').textContent = formatCurrency(totalFees);
  document.getElementById('totalGas').textContent = formatCurrency(totalGas);
  
  const netProfit = totalFees - totalGas;
  const netProfitElement = document.getElementById('netProfit');
  netProfitElement.textContent = formatCurrency(netProfit);
  netProfitElement.className = netProfit >= 0 ? 'total-profit' : 'total-loss';
  renderAnalytics();
}

// Função para manipular o upload de imagem de gasolina
function handleGasImageUpload(input) {
  const file = input.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imagePreview = document.getElementById('gasImagePreview');
      imagePreview.innerHTML = `
        <img src="${e.target.result}" alt="Preview" class="table-image" onclick="showImageModal(this.src)">
      `;
    };
    reader.readAsDataURL(file);
  }
}

// Função para manipular o envio do formulário de gasolina
function handleGasFormSubmit(event) {
  event.preventDefault();
  
  const date = document.getElementById('gasDate').value;
  const amount = document.getElementById('gasAmount').value;
  const imagePreview = document.getElementById('gasImagePreview');
  
  // Validar campos obrigatórios
  if (!date || !amount) {
    showToast('Por favor, preencha todos os campos obrigatórios', 'error');
    return;
  }
  
  // Criar novo registro de gasolina
  const newGasEntry = {
    date,
    amount: parseFloat(amount) || 0,
    image: imagePreview.querySelector('img')?.src || null
  };
  
  // Adicionar à lista de registros de gasolina
  gasEntries.push(newGasEntry);
  
  // Salvar no localStorage
  saveGasEntries();
  
  // Limpar formulário
  event.target.reset();
  imagePreview.innerHTML = '';
  
  // Restaurar a data atual
  document.getElementById('gasDate').value = getCurrentDate();
  
  showToast('Abastecimento registrado com sucesso!', 'success');
}

// Função para excluir um registro de gasolina
function deleteGasEntry(index) {
  gasEntries.splice(index, 1);
  saveGasEntries();
  showToast('Registro de gasolina excluído com sucesso!', 'success');
}

// Função para mostrar o modal de imagem
function showImageModal(src) {
  const modal = document.getElementById('imageModal');
  const modalImg = document.getElementById('modalImage');
  
  modal.style.display = 'block';
  modalImg.src = src;
  
  // Adicionar classe para animação
  setTimeout(() => {
    modal.classList.add('show');
  }, 100);
}

// Função para fechar o modal de imagem
function closeImageModal() {
  const modal = document.getElementById('imageModal');
  modal.classList.remove('show');
  
  // Esperar a animação terminar antes de esconder
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
}

// Função para finalizar a semana e limpar os dados
function finishWeek() {
  if (confirm('Tem certeza que deseja finalizar a semana? Todos os dados serão exportados e limpos.')) {
    // Criar CSV com os dados
    const csvContent = generateCSV();
    
    // Criar link para download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `entregas_${getCurrentDate()}.csv`;
    
    // Simular clique para download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpar dados
    deliveries = [];
    gasEntries = [];
    localStorage.removeItem('deliveries');
    localStorage.removeItem('gasEntries');
    
    // Atualizar tabelas
    updateDeliveriesTable();
    updateGasTable();
    updateTotals();
    
    showToast('Semana finalizada com sucesso!', 'success');
  }
}

// Função para editar uma entrega
function editDelivery(index) {
  const delivery = deliveries[index];
  
  // Preencher o formulário com os dados da entrega
  document.getElementById('orderNumber').value = delivery.orderNumber;
  document.getElementById('fee').value = delivery.fee;
  document.getElementById('date').value = delivery.date;
  
  // Atualizar preview da imagem
  const imagePreview = document.getElementById('imagePreview');
  if (delivery.image) {
    imagePreview.innerHTML = `<img src="${delivery.image}" alt="Preview" class="table-image" onclick="showImageModal(this.src)">`;
  } else {
    imagePreview.innerHTML = '';
  }
  
  // Adicionar botão de salvar edição
  const form = document.getElementById('deliveryForm');
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.textContent = 'Salvar Edição';
  
  // Remover handler antigo e adicionar novo
  form.onsubmit = (event) => {
    event.preventDefault();
    
    // Atualizar dados da entrega
    delivery.orderNumber = document.getElementById('orderNumber').value;
    delivery.fee = parseFloat(document.getElementById('fee').value) || 0;
    delivery.date = document.getElementById('date').value;
    delivery.image = imagePreview.querySelector('img')?.src || null;
    
    // Salvar alterações
    saveDeliveries();
    
    // Limpar formulário
    form.reset();
    imagePreview.innerHTML = '';
    
    // Restaurar botão original
    submitButton.textContent = 'Registrar Entrega';
    form.onsubmit = handleDeliveryFormSubmit;
    
    // Restaurar data atual
    document.getElementById('date').value = getCurrentDate();
    
    showToast('Entrega atualizada com sucesso!', 'success');
  };
}

// Função para editar um registro de gasolina
function editGasEntry(index) {
  const entry = gasEntries[index];
  
  // Preencher o formulário com os dados do registro
  document.getElementById('gasDate').value = entry.date;
  document.getElementById('gasAmount').value = entry.amount;
  
  // Atualizar preview da imagem
  const imagePreview = document.getElementById('gasImagePreview');
  if (entry.image) {
    imagePreview.innerHTML = `<img src="${entry.image}" alt="Preview" class="table-image" onclick="showImageModal(this.src)">`;
  } else {
    imagePreview.innerHTML = '';
  }
  
  // Adicionar botão de salvar edição
  const form = document.getElementById('gasForm');
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.textContent = 'Salvar Edição';
  
  // Remover handler antigo e adicionar novo
  form.onsubmit = (event) => {
    event.preventDefault();
    
    // Atualizar dados do registro
    entry.date = document.getElementById('gasDate').value;
    entry.amount = parseFloat(document.getElementById('gasAmount').value) || 0;
    entry.image = imagePreview.querySelector('img')?.src || null;
    
    // Salvar alterações
    saveGasEntries();
    
    // Limpar formulário
    form.reset();
    imagePreview.innerHTML = '';
    
    // Restaurar botão original
    submitButton.textContent = 'Registrar Abastecimento';
    form.onsubmit = handleGasFormSubmit;
    
    // Restaurar data atual
    document.getElementById('gasDate').value = getCurrentDate();
    
    showToast('Registro de gasolina atualizado com sucesso!', 'success');
  };
}
