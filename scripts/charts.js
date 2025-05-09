// Chart utilities and optimizations
import { isMobileDevice } from './mobile.js';

/**
 * Generate path for line chart with optimizations for mobile
 * @param {Array} dates - Array of dates
 * @param {Object} profits - Object containing profit data
 * @param {number} baseHeight - Base height for chart
 * @param {number} chartHeight - Chart height
 * @param {number} range - Data range
 * @returns {string} SVG path
 */
export function generateLinePath(dates, profits, baseHeight, chartHeight, range) {
  if (dates.length === 0) return '';
  
  // Determine the scale factor
  const scale = chartHeight / (range * 2);
  
  // Use simplified path for mobile to improve performance
  if (isMobileDevice() && dates.length > 20) {
    // Sample fewer points on mobile for better performance
    const sampledDates = sampleDates(dates, 15);
    
    return `M ${0} ${baseHeight - profits[sampledDates[0]].totalProfit * scale} ` +
      sampledDates.map((date, index) => {
        const x = (index / (sampledDates.length - 1)) * 100;
        const y = baseHeight - profits[date].totalProfit * scale;
        return `L ${x} ${y}`;
      }).join(' ');
  }
  
  // Use full resolution for desktop
  return `M ${0} ${baseHeight - profits[dates[0]].totalProfit * scale} ` +
    dates.map((date, index) => {
      const x = (index / (dates.length - 1)) * 100;
      const y = baseHeight - profits[date].totalProfit * scale;
      return `L ${x} ${y}`;
    }).join(' ');
}

/**
 * Sample dates to reduce number of points on mobile devices
 * @param {Array} dates - Array of dates to sample
 * @param {number} maxPoints - Maximum number of points to include
 * @returns {Array} Sampled dates
 */
function sampleDates(dates, maxPoints) {
  if (dates.length <= maxPoints) return dates;
  
  // Always include first and last dates
  const result = [dates[0]];
  
  // Sample evenly between first and last
  const step = Math.ceil((dates.length - 2) / (maxPoints - 2));
  for (let i = step; i < dates.length - 1; i += step) {
    result.push(dates[i]);
  }
  
  // Add the last date
  result.push(dates[dates.length - 1]);
  
  return result;
}

/**
 * Generate data points for chart with mobile optimizations
 * @param {Array} dates - Array of dates
 * @param {Object} profits - Object containing profit data
 * @param {number} baseHeight - Base height for chart
 * @param {number} chartHeight - Chart height
 * @param {number} range - Data range
 * @returns {string} SVG data points
 */
export function generateDataPoints(dates, profits, baseHeight, chartHeight, range) {
  if (dates.length === 0) return '';
  
  // Determine the scale factor
  const scale = chartHeight / (range * 2);
  
  // Use fewer data points on mobile to improve performance
  if (isMobileDevice() && dates.length > 20) {
    const sampledDates = sampleDates(dates, 15);
    
    return sampledDates.map((date, index) => {
      const x = (index / (sampledDates.length - 1)) * 100;
      const y = baseHeight - profits[date].totalProfit * scale;
      return `<circle class="data-point" cx="${x}" cy="${y}" r="4"></circle>`;
    }).join('');
  }
  
  // Generate data points
  return dates.map((date, index) => {
    const x = (index / (dates.length - 1)) * 100;
    const y = baseHeight - profits[date].totalProfit * scale;
    return `<circle class="data-point" cx="${x}" cy="${y}" r="4"></circle>`;
  }).join('');
}

/**
 * Get best profit day
 * @param {Object} dailyProfits - Daily profit data
 * @returns {Object} Best day data
 */
export function getBestProfitDay(dailyProfits) {
  const entries = Object.entries(dailyProfits);
  if (entries.length === 0) return "N/A";

  const bestDay = entries.reduce((best, current) => {
    return current[1].dayProfit > best[1].dayProfit ? current : best;
  }, entries[0]);

  return dailyProfits[bestDay[0]];
}

/**
 * Get worst profit day
 * @param {Object} dailyProfits - Daily profit data
 * @returns {Object} Worst day data
 */
export function getWorstProfitDay(dailyProfits) {
  const entries = Object.entries(dailyProfits);
  if (entries.length === 0) return "N/A";

  const worstDay = entries.reduce((worst, current) => {
    return current[1].dayProfit < worst[1].dayProfit ? current : worst;
  }, entries[0]);

  return dailyProfits[worstDay[0]];
}

/**
 * Optimize chart rendering based on device type
 * @param {Element} container - The container element
 */
export function optimizeChartRendering(container) {
  if (!container) return;
  
  // Apply mobile-specific optimizations
  if (isMobileDevice()) {
    // Add GPU acceleration
    const chartElements = container.querySelectorAll('.pie-chart, .bar-chart, .line-chart');
    chartElements.forEach(chart => {
      chart.style.willChange = 'transform';
      chart.style.transform = 'translateZ(0)';
    });
    
    // Fix z-index issues for overlapping elements
    const labels = container.querySelectorAll('.bar-value, .pie-label');
    labels.forEach(label => {
      label.style.zIndex = '2';
    });
  }
}

/**
 * Create responsive chart layout
 * @param {Element} container - The chart container
 * @param {Object} options - Configuration options
 */
export function makeChartResponsive(container, options = {}) {
  if (!container) return;
  
  // Apply responsive fixes
  if (isMobileDevice()) {
    // Enable horizontal scrolling for charts that need it
    const needsScroll = container.querySelector('.bar-chart, .line-chart');
    if (needsScroll) {
      container.style.overflowX = 'auto';
      container.style.webkitOverflowScrolling = 'touch';
    }
    
    // Fix overlapping labels in pie charts
    const pieLabel = container.querySelector('.pie-label');
    if (pieLabel) {
      pieLabel.style.flexDirection = 'column';
      pieLabel.style.alignItems = 'center';
      pieLabel.style.marginTop = '45px';
    }
  }
}

/**
 * Adjust chart size based on screen size
 * @param {string} chartId - ID of chart container
 * @param {Object} options - Size options
 */
export function adjustChartSize(chartId, options = {}) {
  const container = document.getElementById(chartId);
  if (!container) return;
  
  // Default options
  const defaults = {
    mobileWidth: 150,
    mobileHeight: 150,
    tabletWidth: 200,
    tabletHeight: 200
  };
  
  const config = {...defaults, ...options};
  
  // Detect device type
  if (window.innerWidth <= 480) {
    // Mobile
    if (container.querySelector('.pie-chart')) {
      const pieChart = container.querySelector('.pie-chart');
      pieChart.style.width = `${config.mobileWidth}px`;
      pieChart.style.height = `${config.mobileHeight}px`;
      pieChart.style.margin = '0 auto 40px auto';
    }
  } else if (window.innerWidth <= 768) {
    // Tablet
    if (container.querySelector('.pie-chart')) {
      const pieChart = container.querySelector('.pie-chart');
      pieChart.style.width = `${config.tabletWidth}px`;
      pieChart.style.height = `${config.tabletHeight}px`;
      pieChart.style.margin = '0 auto 40px auto';
    }
  }
} 