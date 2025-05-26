/**
 * Utility for handling base path issues in different environments
 * Ensures resources are loaded correctly regardless of deployment environment
 */

// Determine the base path for the application based on its deployment location
export function getBasePath() {
  // If we're in development, use the base from Vite's import.meta
  if (import.meta && import.meta.env && import.meta.env.BASE_URL) {
    return import.meta.env.BASE_URL;
  }
  
  // If running in GitHub Pages, the URL will include the repo name
  if (window.location.pathname.includes('/entrega-financeira-semanal/')) {
    return '/entrega-financeira-semanal/';
  }
  
  // Default case - running at root
  return '/';
}

// Resolve a path against the base path to ensure it loads correctly
export function resolvePath(path) {
  const basePath = getBasePath();
  
  // If the path is already absolute (starts with http, https, or //) or is a data URL, return it as is
  if (path && (
    path.startsWith('http://') || 
    path.startsWith('https://') || 
    path.startsWith('//') ||
    path.startsWith('data:')
  )) {
    return path;
  }
  
  // Remove any leading slashes from the path to avoid double slashes
  const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
  
  // Combine the base path with the normalized path
  return `${basePath}${normalizedPath}`;
}

// Utility function to convert all relative URLs in a DOM element's attributes
export function fixElementUrls(element) {
  if (!element) return;
  
  // Process background images and other style properties
  if (element.style && element.style.backgroundImage) {
    const urlMatch = element.style.backgroundImage.match(/url\(['"]?([^'")]+)['"]?\)/);
    if (urlMatch && urlMatch[1]) {
      const newUrl = resolvePath(urlMatch[1]);
      element.style.backgroundImage = `url('${newUrl}')`;
    }
  }
  
  // Process common URL attributes
  const urlAttributes = ['src', 'href', 'data-src', 'poster'];
  urlAttributes.forEach(attr => {
    if (element.hasAttribute(attr)) {
      const value = element.getAttribute(attr);
      if (value && !value.startsWith('#') && !value.startsWith('javascript:')) {
        element.setAttribute(attr, resolvePath(value));
      }
    }
  });
  
  // Process srcset attribute for responsive images
  if (element.hasAttribute('srcset')) {
    const srcset = element.getAttribute('srcset');
    const newSrcset = srcset.split(',').map(src => {
      const [url, descriptor] = src.trim().split(/\s+/);
      return `${resolvePath(url)} ${descriptor || ''}`.trim();
    }).join(', ');
    element.setAttribute('srcset', newSrcset);
  }
}

// Initialize the basePath handling
export function initializeBasePath() {
  // Set a global variable for use in other scripts
  window.__APP_BASE_PATH = getBasePath();
  
  // Auto-fix all image sources on load
  document.addEventListener('DOMContentLoaded', () => {
    // Fix all images
    document.querySelectorAll('img').forEach(fixElementUrls);
    
    // Fix all links
    document.querySelectorAll('a').forEach(fixElementUrls);
    
    // Fix all video and audio sources
    document.querySelectorAll('video, audio').forEach(el => {
      fixElementUrls(el);
      el.querySelectorAll('source').forEach(fixElementUrls);
    });
    
    console.log('Base path initialized:', window.__APP_BASE_PATH);
  });
}

// Run initialization
initializeBasePath(); 