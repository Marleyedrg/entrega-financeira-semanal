import { formatCurrency, formatDate, getWeekdayName } from './utils.js';
import { deliveries, gasEntries } from './data.js';

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
  weekdayChartElement.innerHTML = `
    <div class="bar-chart">
      ${Object.entries(weekdayCounts)
        .map(([day, count]) => `
          <div class="bar" style="height: ${count ? Math.max((count / Math.max(...Object.values(weekdayCounts))) * 180, 10) : 0}px">
            <div class="bar-value">${count}</div>
            <div class="bar-label">${day.substring(0, 3)}</div>
          </div>
        `)
        .join("")}
    </div>
  `;

  // Análise de dias de pico
  const sortedDays = Object.entries(weekdayCounts).sort((a, b) => b[1] - a[1]);
  const peakDay = sortedDays[0];
  const worstDay = sortedDays.find(day => day[1] > 0) || sortedDays[sortedDays.length - 1];
  const peakDayElement = document.getElementById("peakDay");

  if (peakDay && peakDay[1] > 0) {
    peakDayElement.innerHTML = `
      <div class="peak-days-grid">
        <div class="peak-day-card">
          <h4>Melhor Dia</h4>
          <p>O dia com maior número de entregas foi <span class="highlight">${peakDay[0]}</span> com <span class="highlight">${peakDay[1]} ${peakDay[1] === 1 ? 'entrega' : 'entregas'}</span>.</p>
          <p>Isso representa <span class="highlight">${Math.round((peakDay[1] / deliveries.length) * 100)}%</span> do total de entregas.</p>
          <p>Valor arrecadado neste dia: <span class="highlight">R$ ${formatCurrency(weekdayFees[peakDay[0]])}</span></p>
        </div>
        <div class="peak-day-card">
          <h4>Dia Mais Fraco</h4>
          <p>O dia com menor número de entregas foi <span class="highlight">${worstDay[0]}</span> com <span class="highlight">${worstDay[1]} ${worstDay[1] === 1 ? 'entrega' : 'entregas'}</span>.</p>
          <p>Isso representa <span class="highlight">${Math.round((worstDay[1] / deliveries.length) * 100)}%</span> do total de entregas.</p>
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
  const feesPercentage = totalAmount > 0 ? (totalFees / totalAmount) * 100 : 0;
  const gasPercentage = totalAmount > 0 ? (totalGas / totalAmount) * 100 : 0;

  const revenueExpenseChartElement = document.getElementById("revenueExpenseChart");
  revenueExpenseChartElement.innerHTML = `
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
    <div class="horizontal-bar-chart">
      ${sortedGasDates
        .map(([date, amount]) => {
          const maxAmount = Math.max(...Object.values(gasByDate));
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
  const dateCount = {};
  const dateFees = {};

  deliveries.forEach((delivery) => {
    const formattedDate = formatDate(delivery.date);
    dateCount[formattedDate] = (dateCount[formattedDate] || 0) + 1;
    if (delivery.fee) {
      dateFees[formattedDate] = (dateFees[formattedDate] || 0) + Number.parseFloat(delivery.fee);
    }
  });

  const deliveryHistoryElement = document.getElementById("deliveryHistory");

  if (Object.keys(dateCount).length > 1) {
    const sortedDates = Object.entries(dateCount).sort((a, b) => {
      const dateA = new Date(a[0].split("/").reverse().join("-"));
      const dateB = new Date(b[0].split("/").reverse().join("-"));
      return dateA - dateB;
    });

    deliveryHistoryElement.innerHTML = `
      <div class="bar-chart">
        ${sortedDates
          .slice(0, 7)
          .map(([date, count]) => {
            const fee = dateFees[date] || 0;
            return `
              <div class="bar" style="height: ${count ? Math.max((count / Math.max(...Object.values(dateCount))) * 180, 10) : 0}px">
                <div class="bar-value">${count}</div>
                <div class="bar-label">${date}</div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  } else {
    deliveryHistoryElement.innerHTML = `
      <p class="empty-state">Dados insuficientes para gerar o gráfico de histórico.</p>
    `;
  }
}

// Função para renderizar tendências
function renderTrends() {
  const trendsElement = document.getElementById("trends");

  if (deliveries.length > 1) {
    const sortedDeliveries = [...deliveries].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA - dateB;
    });

    const midPoint = Math.floor(sortedDeliveries.length / 2);
    const firstHalf = sortedDeliveries.slice(0, midPoint);
    const secondHalf = sortedDeliveries.slice(midPoint);

    const firstHalfFees = firstHalf.reduce((sum, d) => sum + (Number.parseFloat(d.fee) || 0), 0);
    const secondHalfFees = secondHalf.reduce((sum, d) => sum + (Number.parseFloat(d.fee) || 0), 0);

    const feesChange = firstHalfFees > 0 
      ? ((secondHalfFees - firstHalfFees) / firstHalfFees) * 100 
      : secondHalfFees > 0 ? 100 : 0;

    let gasChange = 0;
    if (gasEntries.length > 1) {
      const sortedGasData = [...gasEntries].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
      });

      const gasMidPoint = Math.floor(sortedGasData.length / 2);
      const firstHalfGas = sortedGasData.slice(0, gasMidPoint);
      const secondHalfGas = sortedGasData.slice(gasMidPoint);

      const firstHalfGasAmount = firstHalfGas.reduce((sum, entry) => sum + Number.parseFloat(entry.amount), 0);
      const secondHalfGasAmount = secondHalfGas.reduce((sum, entry) => sum + Number.parseFloat(entry.amount), 0);

      gasChange = firstHalfGasAmount > 0
        ? ((secondHalfGasAmount - firstHalfGasAmount) / firstHalfGasAmount) * 100
        : secondHalfGasAmount > 0 ? 100 : 0;
    }

    const firstHalfGasAmount = gasEntries.length > 0
      ? gasEntries
          .filter((entry) => {
            const entryDate = new Date(entry.date);
            return firstHalf.some((d) => {
              const deliveryDate = new Date(d.date);
              return entryDate.getTime() <= deliveryDate.getTime();
            });
          })
          .reduce((sum, entry) => sum + Number.parseFloat(entry.amount), 0)
      : 0;

    const secondHalfGasAmount = gasEntries.length > 0
      ? gasEntries
          .filter((entry) => {
            const entryDate = new Date(entry.date);
            return secondHalf.some((d) => {
              const deliveryDate = new Date(d.date);
              return entryDate.getTime() > deliveryDate.getTime();
            });
          })
          .reduce((sum, entry) => sum + Number.parseFloat(entry.amount), 0)
      : 0;

    const firstHalfProfit = firstHalfFees - firstHalfGasAmount;
    const secondHalfProfit = secondHalfFees - secondHalfGasAmount;

    const profitChange = firstHalfProfit > 0
      ? ((secondHalfProfit - firstHalfProfit) / firstHalfProfit) * 100
      : secondHalfProfit > 0 ? 100 : 0;

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
    `;
  } else {
    trendsElement.innerHTML = `
      <p class="empty-state">Dados insuficientes para analisar tendências.</p>
    `;
  }
}

// Função para renderizar evolução do lucro
function renderProfitEvolution() {
  const profitEvolutionChartElement = document.getElementById("profitEvolutionChart");

  if (deliveries.length === 0 && gasEntries.length === 0) {
    profitEvolutionChartElement.innerHTML = `
      <p class="empty-state">Nenhum dado disponível para análise.</p>
    `;
    return;
  }

  const dailyProfits = {};
  const dailyFees = {};
  const dailyGasExpenses = {};

  const allDates = [...deliveries.map((d) => new Date(d.date)), ...gasEntries.map((g) => new Date(g.date))];

  if (allDates.length > 0) {
    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

    const dateRange = [];
    const currentDate = new Date(minDate);

    while (currentDate <= maxDate) {
      const formattedDate = formatDate(currentDate.toISOString().split("T")[0]);
      dateRange.push(formattedDate);
      dailyFees[formattedDate] = 0;
      dailyGasExpenses[formattedDate] = 0;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    deliveries.forEach((delivery) => {
      if (delivery.fee) {
        const formattedDate = formatDate(delivery.date);
        dailyFees[formattedDate] = (dailyFees[formattedDate] || 0) + Number.parseFloat(delivery.fee);
      }
    });

    gasEntries.forEach((entry) => {
      const formattedDate = formatDate(entry.date);
      dailyGasExpenses[formattedDate] = (dailyGasExpenses[formattedDate] || 0) + Number.parseFloat(entry.amount);
    });

    let cumulativeProfit = 0;
    const cumulativeProfits = {};

    const sortedDates = Object.keys(dailyFees).sort((a, b) => {
      const dateA = new Date(a.split("/").reverse().join("-"));
      const dateB = new Date(b.split("/").reverse().join("-"));
      return dateA - dateB;
    });

    sortedDates.forEach((date) => {
      const dailyFee = dailyFees[date] || 0;
      const dailyGasExpense = dailyGasExpenses[date] || 0;
      const dailyProfit = dailyFee - dailyGasExpense;
      dailyProfits[date] = dailyProfit;

      cumulativeProfit += dailyProfit;
      cumulativeProfits[date] = cumulativeProfit;
    });

    if (sortedDates.length > 1) {
      const profitValues = Object.values(cumulativeProfits);
      const maxProfit = Math.max(...profitValues);
      const minProfit = Math.min(...profitValues);
      const range = Math.max(Math.abs(maxProfit), Math.abs(minProfit));

      const baseHeight = 100;
      const chartHeight = 200;

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
      `;
    } else {
      profitEvolutionChartElement.innerHTML = `
        <p class="empty-state">Dados insuficientes para gerar o gráfico de evolução do lucro.</p>
      `;
    }
  } else {
    profitEvolutionChartElement.innerHTML = `
      <p class="empty-state">Nenhum dado disponível para análise.</p>
    `;
  }
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

// Função para gerar o caminho SVG para o gráfico de linha
function generateLinePath(dates, profits, baseHeight, chartHeight, range) {
  if (dates.length === 0) return "";

  let path = `M 0 ${baseHeight}`;

  dates.forEach((date, index) => {
    const profit = profits[date];
    const yPos = baseHeight - (profit / range) * baseHeight;
    path += ` L ${index * 50} ${yPos}`;
  });

  return path;
}

// Função para gerar os pontos de dados no gráfico
function generateDataPoints(dates, profits, baseHeight, chartHeight, range) {
  if (dates.length === 0) return "";

  let points = "";

  dates.forEach((date, index) => {
    const profit = profits[date];
    const yPos = baseHeight - (profit / range) * baseHeight;
    const color = profit >= 0 ? "#16a34a" : "#dc2626";
    points += `<circle cx="${index * 50}" cy="${yPos}" r="4" fill="${color}" class="data-point" data-value="R$ ${formatCurrency(profit)}" data-date="${date}" />`;
  });

  return points;
}

// Função para encontrar o dia com maior lucro
function getBestProfitDay(dailyProfits) {
  const entries = Object.entries(dailyProfits);
  if (entries.length === 0) return "N/A";

  const bestDay = entries.reduce((best, current) => {
    return current[1] > best[1] ? current : best;
  }, entries[0]);

  return `${bestDay[0]} (R$ ${formatCurrency(bestDay[1])})`;
}

// Função para encontrar o dia com menor lucro
function getWorstProfitDay(dailyProfits) {
  const entries = Object.entries(dailyProfits);
  if (entries.length === 0) return "N/A";

  const worstDay = entries.reduce((worst, current) => {
    return current[1] < worst[1] ? current : worst;
  }, entries[0]);

  return `${worstDay[0]} (R$ ${formatCurrency(worstDay[1])})`;
}

// Exportar funções auxiliares para uso em outros módulos
export {
  generateLinePath,
  generateDataPoints,
  getBestProfitDay,
  getWorstProfitDay
}; 