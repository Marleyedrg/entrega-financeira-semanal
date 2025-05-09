import { formatCurrency, formatDate, getWeekdayName } from './utils.js';
import { deliveries, gasEntries } from './data.js';
import { 
  generateLinePath, 
  generateDataPoints, 
  getBestProfitDay, 
  getWorstProfitDay,
  optimizeChartRendering,
  makeChartResponsive,
  adjustChartSize
} from './charts.js';

// Função principal de renderização de análises
export function renderAnalytics() {
  if ((!deliveries || deliveries.length === 0) && (!gasEntries || gasEntries.length === 0)) {
    showEmptyStates();
    return;
  }

  renderWeekdayAnalysis();
  renderFinancialSummary();
  renderRevenueExpenseChart();
  renderGasExpenseChart();
  renderPerformanceMetrics();
  renderDeliveryHistory();
  renderTrends();
  renderProfitEvolution();
  
  // Apply optimizations to all chart containers after rendering
  const chartContainers = document.querySelectorAll('.chart-container');
  chartContainers.forEach(container => {
    optimizeChartRendering(container);
    makeChartResponsive(container);
  });
  
  // Add specific optimizations for chart types
  adjustChartSize("revenueExpenseChart", { mobileWidth: 150, mobileHeight: 150 });
  adjustChartSize("profitEvolutionChart", { mobileWidth: 180, mobileHeight: 180 });
}

// Função para renderizar análise por dia da semana
function renderWeekdayAnalysis() {
  const weekdayCounts = {
    Domingo: 0, Segunda: 0, Terça: 0,
    Quarta: 0, Quinta: 0, Sexta: 0, Sábado: 0
  };

  const weekdayFees = {
    Domingo: 0, Segunda: 0, Terça: 0,
    Quarta: 0, Quinta: 0, Sexta: 0, Sábado: 0
  };

  deliveries.forEach((delivery) => {
    const day = getWeekdayName(delivery.date);
    weekdayCounts[day] = (weekdayCounts[day] || 0) + 1;
    if (delivery.fee) {
      weekdayFees[day] = (weekdayFees[day] || 0) + Number.parseFloat(delivery.fee);
    }
  });

  // Renderizar gráfico de barras para entregas por dia da semana
  const weekdayChartElement = document.getElementById("weekdayChart");
  const maxCount = Math.max(...Object.values(weekdayCounts), 1); // Evitar divisão por zero
  
  weekdayChartElement.innerHTML = `
    <div class="chart-container">
      <div class="bar-chart">
        ${Object.entries(weekdayCounts)
          .map(([day, count]) => `
            <div class="bar" style="height: ${count ? Math.max((count / maxCount) * 150, 10) : 0}px">
              <div class="bar-value">${count}</div>
              <div class="bar-label">${day.substring(0, 3)}</div>
            </div>
          `)
          .join("")}
      </div>
    </div>
  `;

  // Análise de dias de pico
  const sortedDays = Object.entries(weekdayCounts).sort((a, b) => b[1] - a[1]);
  const peakDay = sortedDays[0];
  
  // Encontrar o pior dia que tenha pelo menos uma entrega
  const activeDays = sortedDays.filter(day => day[1] > 0);
  const worstDay = activeDays.length > 0 ? activeDays[activeDays.length - 1] : sortedDays[sortedDays.length - 1];
  
  const peakDayElement = document.getElementById("peakDay");
  const totalDeliveries = deliveries.length || 1; // Evitar divisão por zero

  if (peakDay && peakDay[1] > 0) {
    peakDayElement.innerHTML = `
      <div class="peak-days-grid">
        <div class="peak-day-card">
          <h4>Melhor Dia</h4>
          <p>O dia com maior número de entregas foi <span class="highlight">${peakDay[0]}</span> com <span class="highlight">${peakDay[1]} ${peakDay[1] === 1 ? 'entrega' : 'entregas'}</span>.</p>
          <p>Isso representa <span class="highlight">${Math.round((peakDay[1] / totalDeliveries) * 100)}%</span> do total de entregas.</p>
          <p>Valor arrecadado neste dia: <span class="highlight">R$ ${formatCurrency(weekdayFees[peakDay[0]])}</span></p>
        </div>
        <div class="peak-day-card">
          <h4>Dia Mais Fraco</h4>
          <p>O dia com menor número de entregas foi <span class="highlight">${worstDay[0]}</span> com <span class="highlight">${worstDay[1]} ${worstDay[1] === 1 ? 'entrega' : 'entregas'}</span>.</p>
          <p>Isso representa <span class="highlight">${Math.round((worstDay[1] / totalDeliveries) * 100)}%</span> do total de entregas.</p>
          <p>Valor arrecadado neste dia: <span class="highlight">R$ ${formatCurrency(weekdayFees[worstDay[0]])}</span></p>
        </div>
      </div>
    `;
  } else {
    peakDayElement.innerHTML = `<p class="empty-state">Nenhum dado suficiente para análise dos dias.</p>`;
  }
}

// Função para renderizar resumo financeiro
function renderFinancialSummary() {
  const totalFees = deliveries.reduce((sum, delivery) => {
    return sum + (parseFloat(delivery.fee) || 0);
  }, 0);
  
  const totalGas = gasEntries.reduce((sum, entry) => {
    return sum + (parseFloat(entry.amount) || 0);
  }, 0);
  
  const completedDeliveries = deliveries.filter((d) => d.fee).length;
  const pendingDeliveries = deliveries.filter((d) => !d.fee).length;
  const netProfit = totalFees - totalGas;
  const profitMargin = totalFees > 0 ? (netProfit / totalFees) * 100 : 0;

  const financialSummaryElement = document.getElementById("financialSummary");
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
  `;
}

// Função para renderizar gráfico de receitas vs despesas
function renderRevenueExpenseChart() {
  const totalFees = deliveries.reduce((sum, d) => sum + (parseFloat(d.fee) || 0), 0);
  const totalGas = gasEntries.reduce((sum, g) => sum + (parseFloat(g.amount) || 0), 0);
  const totalAmount = totalFees + totalGas;
  
  // Verifique se há dados significativos antes de calcular percentuais
  if (totalAmount <= 0) {
    document.getElementById("revenueExpenseChart").innerHTML = `
      <p class="empty-state">Não há dados suficientes para análise de receitas vs despesas</p>
    `;
    return;
  }
  
  const feesPercentage = (totalFees / totalAmount) * 100;
  const gasPercentage = (totalGas / totalAmount) * 100;

  const revenueExpenseChartElement = document.getElementById("revenueExpenseChart");
  revenueExpenseChartElement.innerHTML = `
    <div class="chart-container">
      <div class="pie-chart" style="background-image: conic-gradient(#16a34a 0% ${feesPercentage}%, #dc2626 ${feesPercentage}% 100%);">
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
    </div>
  `;
}

// Função para renderizar gráfico de gastos com gasolina
function renderGasExpenseChart() {
  const gasExpenseChartElement = document.getElementById("gasExpenseChart");

  if (gasEntries.length === 0) {
    gasExpenseChartElement.innerHTML = '<p class="empty-state">Não há dados de gasolina para este período</p>';
    return;
  }

  const gasByDate = {};
  gasEntries.forEach((entry) => {
    const formattedDate = formatDate(entry.date);
    gasByDate[formattedDate] = (gasByDate[formattedDate] || 0) + Number.parseFloat(entry.amount);
  });

  const sortedGasDates = Object.entries(gasByDate).sort((a, b) => {
    const dateA = new Date(a[0].split("/").reverse().join("-"));
    const dateB = new Date(b[0].split("/").reverse().join("-"));
    return dateA - dateB;
  });

  gasExpenseChartElement.innerHTML = `
    <div class="chart-container">
      <div class="horizontal-bar-chart">
        ${sortedGasDates
          .map(([date, amount]) => {
            const maxAmount = Math.max(...Object.values(gasByDate), 1); // Evitar divisão por zero
            const percentage = (amount / maxAmount) * 100;
            return `
              <div class="horizontal-bar">
                <div class="horizontal-bar-label">${date}</div>
                <div class="horizontal-bar-track">
                  <div class="horizontal-bar-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="horizontal-bar-value">R$ ${formatCurrency(amount)}</div>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

// Função para renderizar métricas de desempenho
function renderPerformanceMetrics() {
  const totalFees = deliveries.reduce((sum, d) => sum + (parseFloat(d.fee) || 0), 0);
  const totalGas = gasEntries.reduce((sum, g) => sum + (parseFloat(g.amount) || 0), 0);
  const completedDeliveries = deliveries.filter((d) => d.fee).length;
  
  const avgFeePerDelivery = completedDeliveries > 0 ? totalFees / completedDeliveries : 0;
  const avgGasPerDelivery = completedDeliveries > 0 ? totalGas / completedDeliveries : 0;
  const avgProfitPerDelivery = completedDeliveries > 0 ? (totalFees - totalGas) / completedDeliveries : 0;

  const deliveriesPerDay = {};
  deliveries.forEach((delivery) => {
    const formattedDate = formatDate(delivery.date);
    deliveriesPerDay[formattedDate] = (deliveriesPerDay[formattedDate] || 0) + 1;
  });

  const avgDeliveriesPerDay = Object.values(deliveriesPerDay).length > 0
    ? Object.values(deliveriesPerDay).reduce((sum, count) => sum + count, 0) / Object.values(deliveriesPerDay).length
    : 0;

  const performanceMetricsElement = document.getElementById("performanceMetrics");
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
  `;
}

// Função para renderizar histórico de entregas
function renderDeliveryHistory() {
  const deliveryHistoryElement = document.getElementById("deliveryHistory");
  
  if (deliveries.length === 0) {
    deliveryHistoryElement.innerHTML = '<p class="empty-state">Nenhuma entrega registrada no período</p>';
    return;
  }
  
  // Agrupar entregas por data
  const entriesByDate = {};
  deliveries.forEach((delivery) => {
    const formattedDate = formatDate(delivery.date);
    if (!entriesByDate[formattedDate]) {
      entriesByDate[formattedDate] = {
        count: 0,
        total: 0,
      };
    }
    entriesByDate[formattedDate].count += 1;
    entriesByDate[formattedDate].total += parseFloat(delivery.fee) || 0;
  });
  
  // Ordenar datas
  const sortedDates = Object.keys(entriesByDate).sort((a, b) => {
    const dateA = new Date(a.split("/").reverse().join("-"));
    const dateB = new Date(b.split("/").reverse().join("-"));
    return dateA - dateB;
  });
  
  // Limitar a exibição a no máximo 10 datas para evitar sobrecarga visual
  const displayDates = sortedDates.length > 10 ? sortedDates.slice(-10) : sortedDates;
  
  const maxCount = Math.max(...Object.values(entriesByDate).map(entry => entry.count), 1);
  
  deliveryHistoryElement.innerHTML = `
    <div class="chart-container">
      <div class="bar-chart">
        ${displayDates.map((date) => {
          const { count } = entriesByDate[date];
          const height = Math.max((count / maxCount) * 150, 10);
          
          return `
            <div class="bar" style="height: ${height}px">
              <div class="bar-value">${count}</div>
              <div class="bar-label">${date}</div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

// Função para renderizar tendências
function renderTrends() {
  const trendsElement = document.getElementById('trends');
  
  if (deliveries.length < 2) {
    trendsElement.innerHTML = '<p class="empty-state">Dados insuficientes para análise de tendências.</p>';
    return;
  }
  
  // Ordenar as entregas por data
  const sortedDeliveries = [...deliveries].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Se tivermos poucos dias, não faz sentido dividir em dois períodos
  if (new Set(sortedDeliveries.map(d => d.date)).size < 2) {
    trendsElement.innerHTML = '<p class="empty-state">Dados insuficientes para análise de tendências. São necessários pelo menos 2 dias diferentes.</p>';
    return;
  }
  
  // Dividir em dois períodos
  const midIndex = Math.floor(sortedDeliveries.length / 2);
  const firstPeriod = sortedDeliveries.slice(0, midIndex);
  const secondPeriod = sortedDeliveries.slice(midIndex);
  
  // Fazer o mesmo para gastos de gasolina
  const sortedGas = [...gasEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
  const midGasIndex = Math.floor(sortedGas.length / 2);
  const firstGasPeriod = sortedGas.slice(0, midGasIndex);
  const secondGasPeriod = sortedGas.slice(midGasIndex);
  
  // Calcular métricas para cada período
  const period1Revenue = firstPeriod.reduce((sum, d) => sum + (parseFloat(d.fee) || 0), 0);
  const period2Revenue = secondPeriod.reduce((sum, d) => sum + (parseFloat(d.fee) || 0), 0);
  
  const period1Gas = firstGasPeriod.reduce((sum, g) => sum + (parseFloat(g.amount) || 0), 0);
  const period2Gas = secondGasPeriod.reduce((sum, g) => sum + (parseFloat(g.amount) || 0), 0);
  
  const period1Profit = period1Revenue - period1Gas;
  const period2Profit = period2Revenue - period2Gas;
  
  // Calcular variações percentuais
  const revenueChange = period1Revenue > 0 ? ((period2Revenue - period1Revenue) / period1Revenue) * 100 : period2Revenue > 0 ? 100 : 0;
  const gasChange = period1Gas > 0 ? ((period2Gas - period1Gas) / period1Gas) * 100 : period2Gas > 0 ? 100 : 0;
  const profitChange = Math.abs(period1Profit) > 0 ? ((period2Profit - period1Profit) / Math.abs(period1Profit)) * 100 : period2Profit !== 0 ? 100 : 0;
  
  // Determinar ícones de tendência
  const revenueIcon = revenueChange > 0 ? '↑' : revenueChange < 0 ? '↓' : '–';
  const gasIcon = gasChange > 0 ? '↑' : gasChange < 0 ? '↓' : '–';
  const profitIcon = profitChange > 0 ? '↑' : profitChange < 0 ? '↓' : '–';
  
  // Classes para cores baseadas na tendência
  const revenueClass = revenueChange > 0 ? 'trend-up' : revenueChange < 0 ? 'trend-down' : 'trend-neutral';
  const gasClass = gasChange > 0 ? 'trend-up' : gasChange < 0 ? 'trend-down' : 'trend-neutral';
  const profitClass = profitChange > 0 ? 'trend-up' : profitChange < 0 ? 'trend-down' : 'trend-neutral';
  
  // Construir a interface
  trendsElement.innerHTML = `
    <div>
      <p>
        <span class="trend-icon ${revenueClass}">${revenueIcon}</span>
        Receita: <span class="highlight">${Math.abs(revenueChange).toFixed(1)}%</span> 
        ${revenueChange > 0 ? 'aumento' : revenueChange < 0 ? 'redução' : 'sem alteração'}
      </p>
      
      <p>
        <span class="trend-icon ${gasClass}">${gasIcon}</span>
        Gastos com gasolina: <span class="highlight">${Math.abs(gasChange).toFixed(1)}%</span>
        ${gasChange > 0 ? 'aumento' : gasChange < 0 ? 'redução' : 'sem alteração'}
      </p>
      
      <p>
        <span class="trend-icon ${profitClass}">${profitIcon}</span>
        Lucro: <span class="highlight">${Math.abs(profitChange).toFixed(1)}%</span>
        ${profitChange > 0 ? 'aumento' : profitChange < 0 ? 'redução' : 'sem alteração'}
      </p>
      
      <p style="font-style: italic; color: var(--text-muted); margin-top: 8px;">
        Comparação entre primeira e segunda metade do período.
      </p>
    </div>
  `;
}

// Função para renderizar evolução do lucro
function renderProfitEvolution() {
  const profitEvolutionChart = document.getElementById("profitEvolutionChart");
  
  if (deliveries.length === 0 && gasEntries.length === 0) {
    profitEvolutionChart.innerHTML = '<p class="empty-state">Não há dados suficientes para análise</p>';
    return;
  }
  
  // Calcular lucro por dia
  const dailyProfits = {};
  let totalProfit = 0;
  
  // Agrupar todas as datas únicas
  const allDates = new Set();
  deliveries.forEach(delivery => allDates.add(delivery.date));
  gasEntries.forEach(entry => allDates.add(entry.date));
  
  // Converter para array e ordenar
  const sortedDates = Array.from(allDates).sort();
  
  // Calcular lucro acumulado para cada dia
  sortedDates.forEach(date => {
    // Calcular receitas do dia
    const dayFees = deliveries
      .filter(delivery => delivery.date === date)
      .reduce((sum, delivery) => sum + (parseFloat(delivery.fee) || 0), 0);
    
    // Calcular gastos do dia
    const dayGas = gasEntries
      .filter(entry => entry.date === date)
      .reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
    
    // Lucro do dia
    const dayProfit = dayFees - dayGas;
    
    // Atualizar lucro total
    totalProfit += dayProfit;
    
    // Armazenar na estrutura
    dailyProfits[date] = {
      date,
      dayProfit,
      totalProfit,
      formattedDate: formatDate(date)
    };
  });
  
  // Se tivermos apenas poucos pontos, simplificar a visualização
  const finalDates = sortedDates.length > 15 
    ? sortedDates.filter((_, index, arr) => {
        // Manter o primeiro, o último e alguns pontos intermediários
        return index === 0 || index === arr.length - 1 || index % Math.ceil(arr.length / 10) === 0;
      })
    : sortedDates;
  
  // Encontrar valores máximo e mínimo para escala
  const profits = finalDates.map(date => dailyProfits[date].totalProfit);
  const minProfit = Math.min(...profits);
  const maxProfit = Math.max(...profits);
  const range = Math.max(Math.abs(minProfit), Math.abs(maxProfit), 100);
  
  const bestDay = getBestProfitDay(dailyProfits);
  const worstDay = getWorstProfitDay(dailyProfits);
  
  // Construir gráfico e resumo
  profitEvolutionChart.innerHTML = `
    <div class="chart-container">
      <div class="line-chart-container">
        <div class="line-chart">
          <div class="line-chart-zero-line"></div>
          <svg class="line-chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#3b82f6" />
                <stop offset="100%" stop-color="#8b5cf6" />
              </linearGradient>
            </defs>
            ${generateLinePath(finalDates, dailyProfits, 50, 90, range)}
            ${generateDataPoints(finalDates, dailyProfits, 50, 90, range)}
          </svg>
          <div class="line-chart-x-labels">
            ${finalDates.map((date, index) => {
              const percentage = index / (finalDates.length - 1) * 100;
              return `<div class="line-chart-x-label" style="left: ${percentage}%">${formatDate(date)}</div>`;
            }).join('')}
          </div>
        </div>
      </div>
      <div class="line-chart-y-axis">
        <div>R$ ${formatCurrency(range)}</div>
        <div>R$ 0.00</div>
        <div>R$ ${formatCurrency(-range)}</div>
      </div>
    </div>
    <div class="summary-container">
      <p>Lucro total no período: <span class="${totalProfit >= 0 ? 'profit-positive-text' : 'profit-negative-text'}">R$ ${formatCurrency(totalProfit)}</span></p>
      <p>Melhor dia: <span class="highlight">${formatDate(bestDay.date)} (R$ ${formatCurrency(bestDay.dayProfit)})</span></p>
      <p>Pior dia: <span class="highlight">${formatDate(worstDay.date)} (R$ ${formatCurrency(worstDay.dayProfit)})</span></p>
    </div>
  `;
}

// Função para mostrar estados vazios
function showEmptyStates() {
  const elements = [
    "weekdayChart", "peakDay", "financialSummary", "deliveryHistory",
    "gasExpenseChart", "revenueExpenseChart", "performanceMetrics",
    "trends", "profitEvolutionChart"
  ];
  
  elements.forEach(id => {
    document.getElementById(id).innerHTML = '<p class="empty-state">Nenhum dado cadastrado</p>';
  });
}

// Exportar funções auxiliares para uso em outros módulos
export {
  generateLinePath,
  generateDataPoints,
  getBestProfitDay,
  getWorstProfitDay
}; 