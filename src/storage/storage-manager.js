class StorageManager {
  constructor() {
    this.storageKeys = EXTENSION_CONSTANTS.STORAGE_KEYS;
    this.version = '1.0.0';
    this.encryptionKey = null;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async init() {
    // Check for data migration needs
    await this.checkAndMigrate();
    
    // Initialize encryption if needed
    await this.initEncryption();
    
    console.log('Storage manager initialized');
  }

  // Core storage operations with caching
  async get(key, useCache = true) {
    try {
      // Check cache first
      if (useCache && this.cache.has(key)) {
        const cached = this.cache.get(key);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        } else {
          this.cache.delete(key);
        }
      }

      // Get from Chrome storage
      const result = await chrome.storage.local.get(key);
      const data = result[key];

      // Decrypt if necessary
      const decryptedData = await this.decryptData(key, data);

      // Cache the result
      if (useCache) {
        this.cache.set(key, {
          data: decryptedData,
          timestamp: Date.now()
        });
      }

      return decryptedData;
    } catch (error) {
      console.error(`Error getting data for key ${key}:`, error);
      throw new Error(EXTENSION_CONSTANTS.ERRORS.STORAGE_ERROR);
    }
  }

  async set(key, data, encrypt = false) {
    try {
      // Encrypt if necessary
      const dataToStore = encrypt ? await this.encryptData(key, data) : data;

      // Store in Chrome storage
      await chrome.storage.local.set({ [key]: dataToStore });

      // Update cache
      this.cache.set(key, {
        data: data, // Store decrypted data in cache
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      console.error(`Error setting data for key ${key}:`, error);
      throw new Error(EXTENSION_CONSTANTS.ERRORS.STORAGE_ERROR);
    }
  }

  async remove(key) {
    try {
      await chrome.storage.local.remove(key);
      this.cache.delete(key);
      return true;
    } catch (error) {
      console.error(`Error removing data for key ${key}:`, error);
      throw new Error(EXTENSION_CONSTANTS.ERRORS.STORAGE_ERROR);
    }
  }

  async clear() {
    try {
      await chrome.storage.local.clear();
      this.cache.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw new Error(EXTENSION_CONSTANTS.ERRORS.STORAGE_ERROR);
    }
  }

  // User data management
  async getUserData() {
    const userData = await this.get(this.storageKeys.USER_DATA);
    return userData || EXTENSION_CONSTANTS.DEFAULT_USER_DATA;
  }

  async saveUserData(userData) {
    // Validate data structure
    const validatedData = this.validateUserData(userData);
    
    // Encrypt sensitive fields
    return await this.set(this.storageKeys.USER_DATA, validatedData, true);
  }

  async updateUserDataField(path, value) {
    const userData = await this.getUserData();
    const updatedData = this.setNestedValue(userData, path, value);
    return await this.saveUserData(updatedData);
  }

  // Settings management
  async getSettings() {
    const settings = await this.get(this.storageKeys.SETTINGS);
    return {
      ...EXTENSION_CONSTANTS.DEFAULT_SETTINGS,
      ...settings
    };
  }

  async saveSettings(settings) {
    const currentSettings = await this.getSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    
    // Validate settings
    const validatedSettings = this.validateSettings(updatedSettings);
    
    return await this.set(this.storageKeys.SETTINGS, validatedSettings);
  }

  async updateSetting(key, value) {
    const settings = await this.getSettings();
    settings[key] = value;
    return await this.saveSettings(settings);
  }

  // Statistics management
  async getStatistics() {
    const stats = await this.get(this.storageKeys.STATISTICS);
    return stats || {
      formsDetected: 0,
      fieldsFilled: 0,
      successfulFills: 0,
      errors: 0,
      lastUpdated: Date.now(),
      installDate: Date.now()
    };
  }

  async updateStatistics(updates) {
    const currentStats = await this.getStatistics();
    const updatedStats = {
      ...currentStats,
      ...updates,
      lastUpdated: Date.now()
    };
    
    return await this.set(this.storageKeys.STATISTICS, updatedStats);
  }

  async incrementStatistic(key, amount = 1) {
    const stats = await this.getStatistics();
    stats[key] = (stats[key] || 0) + amount;
    return await this.updateStatistics(stats);
  }

  // Field mappings management
  async getFieldMappings() {
    const mappings = await this.get(this.storageKeys.FIELD_MAPPINGS);
    return mappings || {};
  }

  async saveFieldMapping(fieldSignature, mappingPath) {
    const mappings = await this.getFieldMappings();
    mappings[fieldSignature] = {
      path: mappingPath,
      confidence: 1.0,
      created: Date.now(),
      used: 1
    };
    
    return await this.set(this.storageKeys.FIELD_MAPPINGS, mappings);
  }

  async updateFieldMappingUsage(fieldSignature) {
    const mappings = await this.getFieldMappings();
    if (mappings[fieldSignature]) {
      mappings[fieldSignature].used++;
      mappings[fieldSignature].lastUsed = Date.now();
      return await this.set(this.storageKeys.FIELD_MAPPINGS, mappings);
    }
  }

  // Data import/export functionality
  async exportData() {
    try {
      const userData = await this.getUserData();
      const settings = await this.getSettings();
      const statistics = await this.getStatistics();
      const fieldMappings = await this.getFieldMappings();

      const exportData = {
        version: this.version,
        exportDate: new Date().toISOString(),
        userData: userData,
        settings: settings,
        statistics: statistics,
        fieldMappings: fieldMappings
      };

      // Create downloadable file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      return {
        blob: blob,
        filename: `form-autofill-data-${new Date().toISOString().split('T')[0]}.json`
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error('Failed to export data');
    }
  }

  async importData(importDataString) {
    try {
      const importData = JSON.parse(importDataString);
      
      // Validate import data structure
      if (!this.validateImportData(importData)) {
        throw new Error('Invalid import data format');
      }

      // Create backup before importing
      await this.createBackup();

      // Import data
      if (importData.userData) {
        await this.saveUserData(importData.userData);
      }

      if (importData.settings) {
        await this.saveSettings(importData.settings);
      }

      if (importData.fieldMappings) {
        await this.set(this.storageKeys.FIELD_MAPPINGS, importData.fieldMappings);
      }

      // Don't import statistics to avoid overwriting current usage data
      
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      throw new Error('Failed to import data: ' + error.message);
    }
  }

  // Backup and restore
  async createBackup() {
    const backupData = await this.exportData();
    const backupKey = `backup_${Date.now()}`;
    
    return await this.set(backupKey, backupData, false);
  }

  async listBackups() {
    try {
      const allData = await chrome.storage.local.get(null);
      const backups = [];

      Object.keys(allData).forEach(key => {
        if (key.startsWith('backup_')) {
          const timestamp = parseInt(key.split('_')[1]);
          backups.push({
            key: key,
            date: new Date(timestamp),
            timestamp: timestamp
          });
        }
      });

      return backups.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }

  async restoreBackup(backupKey) {
    try {
      const backup = await this.get(backupKey, false);
      if (!backup) {
        throw new Error('Backup not found');
      }

      return await this.importData(JSON.stringify(backup));
    } catch (error) {
      console.error('Error restoring backup:', error);
      throw new Error('Failed to restore backup: ' + error.message);
    }
  }

  async deleteBackup(backupKey) {
    return await this.remove(backupKey);
  }

  // Data migration
  async checkAndMigrate() {
    try {
      const currentVersion = await this.get('data_version');
      
      if (!currentVersion) {
        // First time setup
        await this.set('data_version', this.version);
        return;
      }

      if (currentVersion !== this.version) {
        console.log(`Migrating data from ${currentVersion} to ${this.version}`);
        await this.migrateData(currentVersion, this.version);
        await this.set('data_version', this.version);
      }
    } catch (error) {
      console.error('Error during migration:', error);
    }
  }

  async migrateData(fromVersion, toVersion) {
    // Handle data migration between versions
    console.log(`Migration from ${fromVersion} to ${toVersion} completed`);
  }

  // Encryption (basic implementation - in production, use proper encryption)
  async initEncryption() {
    // In a real implementation, this would set up proper encryption
    // For now, we'll use a simple obfuscation
    this.encryptionKey = 'form-autofill-key';
  }

  async encryptData(key, data) {
    // Only encrypt sensitive data
    const sensitiveKeys = [this.storageKeys.USER_DATA];
    
    if (!sensitiveKeys.includes(key) || !data) {
      return data;
    }

    // Simple obfuscation (replace with real encryption in production)
    try {
      const jsonString = JSON.stringify(data);
      const encoded = btoa(jsonString);
      return { encrypted: true, data: encoded };
    } catch (error) {
      console.error('Encryption error:', error);
      return data;
    }
  }

  async decryptData(key, data) {
    if (!data || !data.encrypted) {
      return data;
    }

    try {
      const decoded = atob(data.data);
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  }

  // Validation methods
  validateUserData(userData) {
    const required = ['personal', 'address', 'professional', 'preferences'];
    
    required.forEach(section => {
      if (!userData[section]) {
        userData[section] = EXTENSION_CONSTANTS.DEFAULT_USER_DATA[section];
      }
    });

    return userData;
  }

  validateSettings(settings) {
    const defaults = EXTENSION_CONSTANTS.DEFAULT_SETTINGS;
    
    Object.keys(defaults).forEach(key => {
      if (!(key in settings)) {
        settings[key] = defaults[key];
      }
    });

    return settings;
  }

  validateImportData(data) {
    return data && 
           typeof data === 'object' && 
           data.version &&
           (data.userData || data.settings || data.fieldMappings);
  }

  // Utility methods
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const result = { ...obj };
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    return result;
  }

  getNestedValue(obj, path) {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (!current || typeof current !== 'object' || !(key in current)) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  // Cache management
  clearCache() {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Storage usage information
  async getStorageUsage() {
    try {
      const usage = await chrome.storage.local.getBytesInUse();
      const quota = chrome.storage.local.QUOTA_BYTES;
      
      return {
        used: usage,
        available: quota - usage,
        total: quota,
        percentage: (usage / quota) * 100
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return null;
    }
  }

  async cleanupOldData() {
    try {
      // Clean up old backups (keep only last 5)
      const backups = await this.listBackups();
      
      if (backups.length > 5) {
        const oldBackups = backups.slice(5);
        for (const backup of oldBackups) {
          await this.deleteBackup(backup.key);
        }
      }

      // Clear cache to free memory
      this.clearCache();
      
      console.log('Storage cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}