/**
 * Mobile Optimizations Module
 * 
 * This module serves as a central entry point for all mobile optimizations
 * applied throughout the application.
 */

// Core mobile functionality
export { 
  isMobileDevice,
  setupMobileOptimizations
} from './mobile.js';

// Image optimizations for mobile
export {
  processImageForStorage,
  optimizeStoredImages,
  formatImageDisplay,
  showImageModal
} from './imageUtils.js';

// Chart optimizations for mobile
export {
  generateLinePath,
  generateDataPoints,
  getBestProfitDay,
  getWorstProfitDay,
  optimizeChartRendering,
  makeChartResponsive,
  adjustChartSize
} from './charts.js'; 