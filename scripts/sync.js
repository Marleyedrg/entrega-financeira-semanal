/**
 * sync.js
 * Sistema avançado de sincronização entre múltiplas abas
 */

import { 
  loadDeliveries, 
  loadGasEntries, 
  updateTotals, 
  deliveries, 
  gasEntries 
} from './data.js';
import { showToast } from './utils.js';
import { renderAnalytics, clearDataCache } from './analytics.js';

// Identificador único para esta sessão/aba
const SESSION_ID = generateSessionId();

// Broadcast Channel para comunicação entre abas (mais eficiente que o storage event)
let broadcastChannel = null;

// Timestamp da última atualização recebida
let lastUpdateTimestamp = Date.now();

// Estado atual da sincronização
const syncState = {
  isPrimary: false,
  connectedTabs: 0,
  lastSyncTime: null,
  pendingChanges: [],
  syncInProgress: false
};

/**
 * Gera um ID de sessão único para identificar esta aba
 */
function generateSessionId() {
  return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Inicializa o sistema de sincronização
 */
export function initializeSync() {
  // Tentar usar Broadcast Channel API, que é mais eficiente
  try {
    broadcastChannel = new BroadcastChannel('entrega_financeira_sync');
    
    broadcastChannel.onmessage = (event) => {
      handleSyncMessage(event.data);
    };
    
    // Anunciar presença para outras abas
    broadcastChannel.postMessage({
      type: 'TAB_CONNECTED',
      sessionId: SESSION_ID,
      timestamp: Date.now()
    });
    
    console.log('Broadcast Channel inicializado');
  } catch (e) {
    console.warn('Broadcast Channel não suportado, usando fallback com localStorage');
    
    // Fallback para localStorage
    window.addEventListener('storage', (event) => {
      if (event.key === 'deliveries' || event.key === 'gasEntries') {
        handleStorageEvent(event);
      } else if (event.key === 'sync_message') {
        try {
          const message = JSON.parse(event.newValue);
          handleSyncMessage(message);
        } catch (error) {
          console.error('Erro ao processar mensagem de sincronização:', error);
        }
      }
    });
    
    // Anunciar presença usando localStorage
    localStorage.setItem('sync_message', JSON.stringify({
      type: 'TAB_CONNECTED',
      sessionId: SESSION_ID,
      timestamp: Date.now()
    }));
  }
  
  // Iniciar verificação de primário
  checkPrimaryStatus();
  
  // Adicionar listener para verificar mudanças antes de fechar
  window.addEventListener('beforeunload', () => {
    sendSyncMessage({
      type: 'TAB_DISCONNECTED',
      sessionId: SESSION_ID,
      timestamp: Date.now()
    });
  });
  
  // Verificar periodicamente se há abas ativas
  setInterval(checkPrimaryStatus, 30000);
  
  return {
    sessionId: SESSION_ID,
    isPrimary: () => syncState.isPrimary
  };
}

/**
 * Enviar mensagem de sincronização para outras abas
 */
function sendSyncMessage(message) {
  message.sessionId = SESSION_ID;
  
  if (broadcastChannel) {
    broadcastChannel.postMessage(message);
  } else {
    // Usar localStorage como fallback
    localStorage.setItem('sync_message', JSON.stringify(message));
    
    // Precisamos remover e recriar para disparar eventos em outras abas
    setTimeout(() => {
      localStorage.removeItem('sync_message');
    }, 50);
  }
}

/**
 * Processar mensagem de sincronização recebida
 */
function handleSyncMessage(message) {
  if (!message || message.sessionId === SESSION_ID) return;
  
  // Ignorar mensagens muito antigas (mais de 1 minuto)
  if (message.timestamp && Date.now() - message.timestamp > 60000) return;
  
  switch (message.type) {
    case 'TAB_CONNECTED':
      syncState.connectedTabs++;
      checkPrimaryStatus();
      break;
      
    case 'TAB_DISCONNECTED':
      syncState.connectedTabs = Math.max(0, syncState.connectedTabs - 1);
      checkPrimaryStatus();
      break;
      
    case 'PRIMARY_CLAIMING':
      // Outra aba está tentando se tornar primária
      if (syncState.isPrimary) {
        // Responder afirmando que já somos primários
        sendSyncMessage({
          type: 'PRIMARY_CLAIMED',
          timestamp: Date.now()
        });
      }
      break;
      
    case 'PRIMARY_CLAIMED':
      syncState.isPrimary = false;
      break;
      
    case 'DATA_CHANGED':
      if (message.timestamp > lastUpdateTimestamp) {
        lastUpdateTimestamp = message.timestamp;
        syncData();
      }
      break;
      
    case 'SYNC_REQUEST':
      // Responder com o estado atual se somos primários
      if (syncState.isPrimary) {
        sendSyncMessage({
          type: 'SYNC_RESPONSE',
          timestamp: Date.now()
        });
      }
      break;
      
    case 'FULL_CLEAR':
      // Recebeu notificação de limpeza completa dos dados
      handleFullDataClear();
      break;
  }
}

/**
 * Processar evento de storage do localStorage (fallback)
 */
function handleStorageEvent(event) {
  if (event.key === 'deliveries' || event.key === 'gasEntries') {
    if (event.newValue !== event.oldValue) {
      // Se a mudança veio de outra aba, atualizar dados
      if (!syncState.syncInProgress) {
        syncData();
      }
    }
  }
}

/**
 * Verificar se esta aba deve ser primária
 */
function checkPrimaryStatus() {
  // Se não houver outras abas conectadas, tornar-se primário
  if (syncState.connectedTabs === 0 && !syncState.isPrimary) {
    claimPrimaryStatus();
  }
}

/**
 * Tentar se tornar a aba primária
 */
function claimPrimaryStatus() {
  sendSyncMessage({
    type: 'PRIMARY_CLAIMING',
    timestamp: Date.now()
  });
  
  // Aguardar respostas por um curto período
  setTimeout(() => {
    // Se ninguém contestou, assumir como primário
    if (!syncState.isPrimary) {
      syncState.isPrimary = true;
      console.log('Esta aba agora é primária');
      
      // Sincronizar estado uma vez como primário
      syncData();
    }
  }, 300);
}

/**
 * Lida com a limpeza completa dos dados
 * Chamada quando outra aba executa uma limpeza completa
 */
function handleFullDataClear() {
  // Atualizar timestamp para evitar que mensagens antigas sejam processadas
  lastUpdateTimestamp = Date.now();
  
  try {
    // Limpar cache local
    if (broadcastChannel) {
      // Fechar e recriar o canal para limpar buffers internos
      broadcastChannel.close();
      
      // Recriar o canal após um pequeno delay
      setTimeout(() => {
        try {
          broadcastChannel = new BroadcastChannel('entrega_financeira_sync');
          broadcastChannel.onmessage = (event) => {
            handleSyncMessage(event.data);
          };
        } catch (e) {
          console.error('Erro ao recriar canal após limpeza:', e);
        }
      }, 300);
    }
    
    // Forçar recarga de dados
    syncData(true);
    
    console.log('Sincronização completa após limpeza de dados');
  } catch (error) {
    console.error('Erro ao processar limpeza de dados:', error);
  }
}

/**
 * Sincronizar dados com localStorage
 * @param {boolean} forceFull - Forçar sincronização completa, ignorando cache
 */
function syncData(forceFull = false) {
  if (syncState.syncInProgress && !forceFull) return;
  
  syncState.syncInProgress = true;
  
  try {
    console.log('Sincronizando dados da memória com localStorage...');
    
    // Limpar cache se for sincronização forçada
    if (forceFull) {
      console.log('Executando sincronização forçada completa');
      // Não utilize cache para esta sincronização
      
      // Limpar arrays em memória primeiro
      // (não usamos .length = 0 para preservar as referências originais)
      while (deliveries.length > 0) deliveries.pop();
      while (gasEntries.length > 0) gasEntries.pop();
    }
    
    // Recarregar dados do localStorage
    loadDeliveries();
    loadGasEntries();
    
    // Atualizar interface
    updateTotals();
    
    // Limpar cache de análise e renderizar novamente
    clearDataCache();
    renderAnalytics();
    
    syncState.lastSyncTime = Date.now();
    console.log('Sincronização completa:', new Date(syncState.lastSyncTime).toLocaleTimeString());
  } catch (error) {
    console.error('Erro durante sincronização:', error);
    showToast('Erro ao sincronizar dados', 'error');
  } finally {
    syncState.syncInProgress = false;
  }
}

/**
 * Notificar outras abas sobre mudanças
 */
export function notifyDataChange(changeType = 'update') {
  lastUpdateTimestamp = Date.now();
  
  sendSyncMessage({
    type: 'DATA_CHANGED',
    changeType: changeType,
    timestamp: lastUpdateTimestamp
  });
}

/**
 * Forçar sincronização de dados em todas as abas
 */
export function forceSyncAllTabs() {
  sendSyncMessage({
    type: 'SYNC_REQUEST',
    timestamp: Date.now()
  });
  
  // Atualizar a própria aba também
  syncData();
  
  return syncState.lastSyncTime;
}

/**
 * Verificar estado de sincronização
 */
export function getSyncStatus() {
  return {
    ...syncState,
    sessionId: SESSION_ID
  };
} 