// Data Backup System - Prevents data loss
// This system automatically backs up data before critical operations

const BACKUP_KEY_PREFIX = 'backup_';
const MAX_BACKUPS = 5;

/**
 * Creates a backup of current data
 * @param {string} reason - Reason for backup
 * @returns {string} Backup ID
 */
export function createDataBackup(reason = 'manual') {
  try {
    const timestamp = Date.now();
    const backupId = `${BACKUP_KEY_PREFIX}${timestamp}`;
    
    const backupData = {
      id: backupId,
      timestamp,
      reason,
      data: {
        deliveries: localStorage.getItem('deliveries'),
        gasEntries: localStorage.getItem('gasEntries')
      }
    };
    
    localStorage.setItem(backupId, JSON.stringify(backupData));
    
    // Clean old backups
    cleanOldBackups();
    
    console.log(`Data backup created: ${backupId} (reason: ${reason})`);
    return backupId;
  } catch (error) {
    console.error('Failed to create data backup:', error);
    return null;
  }
}

/**
 * Restores data from a backup
 * @param {string} backupId - Backup ID to restore
 * @returns {boolean} Success status
 */
export function restoreFromBackup(backupId) {
  try {
    const backupData = localStorage.getItem(backupId);
    if (!backupData) {
      console.error('Backup not found:', backupId);
      return false;
    }
    
    const backup = JSON.parse(backupData);
    
    // Restore data
    if (backup.data.deliveries) {
      localStorage.setItem('deliveries', backup.data.deliveries);
    }
    if (backup.data.gasEntries) {
      localStorage.setItem('gasEntries', backup.data.gasEntries);
    }
    
    console.log(`Data restored from backup: ${backupId}`);
    return true;
  } catch (error) {
    console.error('Failed to restore from backup:', error);
    return false;
  }
}

/**
 * Lists available backups
 * @returns {Array} List of backup info
 */
export function listBackups() {
  const backups = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(BACKUP_KEY_PREFIX)) {
      try {
        const backupData = JSON.parse(localStorage.getItem(key));
        backups.push({
          id: key,
          timestamp: backupData.timestamp,
          reason: backupData.reason,
          date: new Date(backupData.timestamp).toLocaleString()
        });
      } catch (error) {
        console.error('Invalid backup data:', key);
      }
    }
  }
  
  return backups.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Removes old backups to prevent localStorage bloat
 */
function cleanOldBackups() {
  const backups = listBackups();
  
  if (backups.length > MAX_BACKUPS) {
    const toDelete = backups.slice(MAX_BACKUPS);
    toDelete.forEach(backup => {
      localStorage.removeItem(backup.id);
      console.log(`Removed old backup: ${backup.id}`);
    });
  }
}

/**
 * Creates automatic backup before critical operations
 * @param {string} operation - Description of operation
 * @returns {string|null} Backup ID or null if failed
 */
export function autoBackup(operation) {
  return createDataBackup(`auto_${operation}`);
}

/**
 * Emergency data recovery - tries to find the most recent valid backup
 * @returns {boolean} Success status
 */
export function emergencyRecover() {
  console.log('🚨 Emergency data recovery initiated');
  
  const backups = listBackups();
  
  for (const backup of backups) {
    console.log(`Trying to recover from backup: ${backup.id}`);
    
    if (restoreFromBackup(backup.id)) {
      console.log('✅ Emergency recovery successful');
      return true;
    }
  }
  
  console.log('❌ Emergency recovery failed - no valid backups found');
  return false;
} 