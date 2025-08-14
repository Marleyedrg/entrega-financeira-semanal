/**
 * sync.js
 * Sistema avançado de sincronização entre múltiplas abas
 */

import { deliveries, gasEntries, loadDeliveries, loadGasEntries, updateTotals } from './data.js';
import { renderAnalytics, clearDataCache } from './analytics.js';
import { showToast } from './utils.js';
import { isDataClearingInProgress } from './export.js';

// GitHub Pages specific sync state
const syncState = {
  sessionId: null,
  isPrimary: false,
  syncInProgress: false,
  lastSyncTime: 0,
  githubPagesEnvironment: false
};

// GitHub Pages optimized broadcast channel
let broadcastChannel = null;
let lastUpdateTimestamp = 0;

// Initialize session ID with GitHub Pages considerations
function generateSessionId() {
  return `gh-pages-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Initialize sync system optimized for GitHub Pages
 */
export function initializeSync() {
  console.log('🔄 Inicializando sistema de sincronização (GitHub Pages)...');
  
  // Detect GitHub Pages environment
  syncState.githubPagesEnvironment = 
    window.location.hostname.includes('github.io') || 
    window.location.pathname.includes('/entrega-financeira-semanal/') ||
    window.location.hostname === 'localhost'; // For local testing
  
  // Generate unique session ID for GitHub Pages
  syncState.sessionId = generateSessionId();
  
  // Try to initialize BroadcastChannel for GitHub Pages
  try {
    if (window.BroadcastChannel && typeof BroadcastChannel === 'function') {
      broadcastChannel = new BroadcastChannel('entrega_financeira_sync');
      broadcastChannel.onmessage = (event) => {
        handleSyncMessage(event.data);
      };
      console.log('✅ BroadcastChannel initialized for GitHub Pages');
    } else {
      console.log('⚠️ BroadcastChannel not available on this GitHub Pages environment');
    }
  } catch (error) {
    console.warn('❌ Could not initialize BroadcastChannel on GitHub Pages:', error);
    broadcastChannel = null;
  }
  
  // Set initial sync timestamp
  lastUpdateTimestamp = Date.now();
  
  // Determine if this tab should be primary (GitHub Pages specific logic)
  claimPrimaryStatus();
  
  console.log(`✅ Sync system initialized for GitHub Pages - Session: ${syncState.sessionId}`);
  
  return {
    sessionId: syncState.sessionId,
    isPrimary: syncState.isPrimary,
    githubPages: syncState.githubPagesEnvironment
  };
}

// Send sync message with GitHub Pages optimizations
function sendSyncMessage(message) {
  if (!broadcastChannel) return;
  
  try {
    const githubPagesMessage = {
      ...message,
      sessionId: syncState.sessionId,
      timestamp: Date.now(),
      environment: 'github-pages'
    };
    
    broadcastChannel.postMessage(githubPagesMessage);
  } catch (error) {
    console.warn('Failed to send sync message on GitHub Pages:', error);
  }
}

// Handle incoming sync messages for GitHub Pages
function handleSyncMessage(data) {
  // Ignore messages from the same session
  if (data.sessionId === syncState.sessionId) return;
  
  // Check if message is too old (GitHub Pages CDN considerations)
  const messageAge = Date.now() - (data.timestamp || 0);
  if (messageAge > 30000) { // 30 seconds max age for GitHub Pages
    console.log('Ignoring old sync message on GitHub Pages:', messageAge);
    return;
  }
  
  console.log('📨 Received sync message on GitHub Pages:', data.type);
  
  try {
    switch (data.type) {
      case 'DATA_CHANGED':
        handleDataChange(data);
        break;
      case 'FULL_CLEAR':
        handleFullDataClear();
        break;
      case 'PING':
        sendSyncMessage({ type: 'PONG', originalTimestamp: data.timestamp });
        break;
      case 'CLAIM_PRIMARY':
        handlePrimaryClaim(data);
        break;
      default:
        console.log('Unknown sync message type on GitHub Pages:', data.type);
    }
  } catch (error) {
    console.error('Error handling sync message on GitHub Pages:', error);
  }
}

// Handle data changes for GitHub Pages
function handleDataChange(data) {
  // Skip if we're currently clearing data
  if (isDataClearingInProgress() || sessionStorage.getItem('dataClearing') === 'true') {
    console.log('⏸️ Skipping data change during clearing on GitHub Pages');
    return;
  }
  
  // Skip if message is older than our last update
  if (data.timestamp <= lastUpdateTimestamp) {
    console.log('Ignoring older data change message on GitHub Pages');
    return;
  }
  
  lastUpdateTimestamp = data.timestamp;
  
  // Perform sync with GitHub Pages optimizations
  setTimeout(() => {
    if (!isDataClearingInProgress()) {
      syncData(false);
    }
  }, 100); // Small delay for GitHub Pages
}

// Claim primary status for GitHub Pages environment
function claimPrimaryStatus() {
  if (!broadcastChannel) {
    syncState.isPrimary = true;
    console.log('📌 Primary status claimed (no BroadcastChannel on GitHub Pages)');
    return;
  }
  
  try {
    // Try to claim primary status
    sendSyncMessage({ 
      type: 'CLAIM_PRIMARY', 
      claimTime: Date.now(),
      environment: 'github-pages'
    });
    
    // Set as primary after short delay if no conflicts
    setTimeout(() => {
      if (!syncState.isPrimary) {
        syncState.isPrimary = true;
        console.log('📌 Primary status claimed on GitHub Pages');
      }
    }, 200);
  } catch (error) {
    console.warn('Could not claim primary status on GitHub Pages:', error);
    syncState.isPrimary = true; // Fallback to primary
  }
}

// Handle primary claims for GitHub Pages
function handlePrimaryClaim(data) {
  // If someone else is claiming primary and they're newer, yield
  if (data.claimTime > (syncState.lastSyncTime || 0)) {
    syncState.isPrimary = false;
    console.log('📌 Yielding primary status on GitHub Pages');
  }
}

// Handle full data clear for GitHub Pages
function handleFullDataClear() {
  // Update timestamp to avoid processing old messages
  lastUpdateTimestamp = Date.now();
  
  try {
    // Don't process if clearing is still in progress
    if (isDataClearingInProgress() || 
        sessionStorage.getItem('dataClearing') === 'true' ||
        sessionStorage.getItem('github_pages_clearing')) {
      console.log('⏸️ Aguardando conclusão da limpeza antes de processar sincronização (GitHub Pages)');
      // Retry after clearing is complete
      setTimeout(() => {
        if (!isDataClearingInProgress() && 
            sessionStorage.getItem('dataClearing') !== 'true' &&
            !sessionStorage.getItem('github_pages_clearing')) {
          handleFullDataClear();
        }
      }, 2000); // Longer delay for GitHub Pages
      return;
    }
    
    // Clear local cache
    if (broadcastChannel) {
      // Close and recreate channel for GitHub Pages
      broadcastChannel.close();
      
      // Recreate channel after delay
      setTimeout(() => {
        try {
          broadcastChannel = new BroadcastChannel('entrega_financeira_sync');
          broadcastChannel.onmessage = (event) => {
            handleSyncMessage(event.data);
          };
        } catch (e) {
          console.error('Erro ao recriar canal após limpeza no GitHub Pages:', e);
        }
      }, 500); // Longer delay for GitHub Pages
    }
    
    // Force reload data only if not in clearing process
    if (!isDataClearingInProgress() && 
        sessionStorage.getItem('dataClearing') !== 'true' &&
        !sessionStorage.getItem('github_pages_clearing')) {
      syncData(true);
    }
    
    console.log('Sincronização completa após limpeza no GitHub Pages');
  } catch (error) {
    console.error('Erro ao processar limpeza de dados no GitHub Pages:', error);
  }
}

/**
 * Sync data with localStorage - GitHub Pages optimized
 * @param {boolean} forceFull - Force complete sync, ignoring cache
 */
function syncData(forceFull = false) {
  // Don't sync if clearing is in progress
  if (isDataClearingInProgress() || 
      sessionStorage.getItem('dataClearing') === 'true' ||
      sessionStorage.getItem('github_pages_clearing')) {
    console.log('⏸️ Sincronização pausada - limpeza em andamento (GitHub Pages)');
    return;
  }
  
  if (syncState.syncInProgress && !forceFull) return;
  
  syncState.syncInProgress = true;
  
  try {
    console.log('Sincronizando dados da memória com localStorage (GitHub Pages)...');
    
    // Clear cache if forced sync
    if (forceFull) {
      console.log('Executando sincronização forçada completa (GitHub Pages)');
      
      // Clear memory arrays first
      while (deliveries.length > 0) deliveries.pop();
      while (gasEntries.length > 0) gasEntries.pop();
    }
    
    // Reload data from localStorage only if not clearing
    if (!isDataClearingInProgress() && 
        sessionStorage.getItem('dataClearing') !== 'true' &&
        !sessionStorage.getItem('github_pages_clearing')) {
      loadDeliveries();
      loadGasEntries();
      
      // Update interface
      updateTotals();
      
      // Clear cache and render analytics
      clearDataCache();
      renderAnalytics();
    }
    
    syncState.lastSyncTime = Date.now();
    console.log('Sincronização GitHub Pages completa:', new Date(syncState.lastSyncTime).toLocaleTimeString());
  } catch (error) {
    console.error('Erro durante sincronização no GitHub Pages:', error);
    showToast('Erro ao sincronizar dados', 'error');
  } finally {
    syncState.syncInProgress = false;
  }
}

/**
 * Notify other tabs about changes - GitHub Pages optimized
 */
export function notifyDataChange(changeType = 'update') {
  lastUpdateTimestamp = Date.now();
  
  sendSyncMessage({
    type: 'DATA_CHANGED',
    changeType: changeType,
    timestamp: lastUpdateTimestamp,
    environment: 'github-pages'
  });
}

/**
 * Force sync all tabs - GitHub Pages optimized
 */
export function forceSyncAllTabs() {
  console.log('🔄 Forçando sincronização de todas as abas (GitHub Pages)...');
  
  try {
    sendSyncMessage({
      type: 'FULL_SYNC',
      timestamp: Date.now(),
      forced: true,
      environment: 'github-pages'
    });
    
    // Also sync current tab
    syncData(true);
  } catch (error) {
    console.error('Erro ao forçar sincronização no GitHub Pages:', error);
  }
}

/**
 * Get sync status - GitHub Pages specific
 */
export function getSyncStatus() {
  return {
    ...syncState,
    broadcastChannelAvailable: !!broadcastChannel,
    lastUpdateTime: new Date(lastUpdateTimestamp).toLocaleTimeString(),
    environment: 'GitHub Pages'
  };
}

// Cleanup on page unload for GitHub Pages
window.addEventListener('beforeunload', () => {
  if (broadcastChannel) {
    try {
      broadcastChannel.close();
    } catch (e) {
      console.warn('Error closing BroadcastChannel on GitHub Pages:', e);
    }
  }
}); 