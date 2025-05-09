// Mobile utilities and optimizations
import { renderAnalytics } from './analytics.js';

/**
 * Detect if current device is mobile
 * @returns {boolean} True if device is mobile
 */
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Setup all mobile-specific optimizations
 */
export function setupMobileOptimizations() {
  // Debounce resize operations for better performance
  setupResizeHandlers();
  
  // Apply mobile-specific optimizations
  if (isMobileDevice()) {
    // Apply performance optimizations for low-end devices
    optimizeForLowEndDevices();
    
    // Optimize scroll performance
    optimizeScrollPerformance();
    
    // Fix viewport height issues on mobile browsers
    fixMobileViewportHeight();
  }

  // Apply chart optimizations
  setupChartOptimizations();
}

/**
 * Setup resize handlers with debouncing
 */
function setupResizeHandlers() {
  let resizeTimer;
  
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    document.body.classList.add('resize-transition-stopper');
    
    resizeTimer = setTimeout(() => {
      document.body.classList.remove('resize-transition-stopper');
      
      // Re-render charts when in analytics tab
      if (document.querySelector('.tab-content.active#analytics')) {
        renderAnalytics();
      }
    }, 250);
  });
}

/**
 * Optimize for low-end devices by reducing animations
 */
function optimizeForLowEndDevices() {
  if (window.navigator.deviceMemory && window.navigator.deviceMemory < 4) {
    document.documentElement.classList.add('reduce-motion');
  }
}

/**
 * Optimize scroll performance with passive listeners and GPU acceleration
 */
function optimizeScrollPerformance() {
  let scrollTimer;
  
  document.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    document.body.classList.add('is-scrolling');
    
    scrollTimer = setTimeout(() => {
      document.body.classList.remove('is-scrolling');
    }, 150);
  }, { passive: true });
}

/**
 * Fix the 100vh issue on mobile browsers
 */
function fixMobileViewportHeight() {
  const appHeight = () => {
    const doc = document.documentElement;
    doc.style.setProperty('--app-height', `${window.innerHeight}px`);
  };
  
  window.addEventListener('resize', appHeight);
  appHeight(); // Initial call
}

/**
 * Setup optimizations specific to the chart components
 */
function setupChartOptimizations() {
  // Add GPU acceleration to charts for smoother animations
  const addGpuAcceleration = () => {
    const charts = document.querySelectorAll('.pie-chart, .bar-chart, .line-chart');
    charts.forEach(chart => {
      chart.style.willChange = 'transform';
      chart.style.transform = 'translateZ(0)';
    });
  };

  // Call once at setup
  if (document.readyState === 'complete') {
    addGpuAcceleration();
  } else {
    window.addEventListener('load', addGpuAcceleration);
  }

  // Add listeners for tab changes to ensure charts are optimized
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (button.dataset.tab === 'analytics') {
        setTimeout(addGpuAcceleration, 100);
      }
    });
  });
} 