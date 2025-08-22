// Unit tests for StorageManager class

describe('StorageManager', () => {
  let storageManager;
  let mockChromeStorage;

  beforeEach(() => {
    // Mock Chrome storage API
    mockChromeStorage = {
      local: {
        get: jest.fn(),
        set: jest.fn(),
        remove: jest.fn(),
        clear: jest.fn(),
        getBytesInUse: jest.fn(),
        QUOTA_BYTES: 5242880 // 5MB
      }
    };
    
    global.chrome = {
      storage: mockChromeStorage
    };
    
    // Mock constants
    global.EXTENSION_CONSTANTS = {
      STORAGE_KEYS: {
        USER_DATA: 'form_fill_user_data',
        SETTINGS: 'form_fill_settings',
        STATISTICS: 'form_fill_statistics',
        FIELD_MAPPINGS: 'form_fill_field_mappings'
      },
      DEFAULT_USER_DATA: {
        personal: {
          firstName: '',
          lastName: '',
          email: ''
        },
        address: {
          street: '',
          city: '',
          state: ''
        },
        professional: {
          company: '',
          website: ''
        },
        preferences: {
          fillPasswords: false,
          skipProtectedFields: true
        }
      },
      DEFAULT_SETTINGS: {
        enableExtension: true,
        autoDetectForms: true,
        showNotifications: true
      }
    };
    
    storageManager = new StorageManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get and set operations', () => {
    test('should get data from storage successfully', async () => {
      const testData = { test: 'value' };
      mockChromeStorage.local.get.mockResolvedValue({ testKey: testData });
      
      const result = await storageManager.get('testKey');
      
      expect(result).toEqual(testData);
      expect(mockChromeStorage.local.get).toHaveBeenCalledWith('testKey');
    });

    test('should set data to storage successfully', async () => {
      const testData = { test: 'value' };
      mockChromeStorage.local.set.mockResolvedValue();
      
      const result = await storageManager.set('testKey', testData);
      
      expect(result).toBe(true);
      expect(mockChromeStorage.local.set).toHaveBeenCalledWith({ testKey: testData });
    });

    test('should handle storage errors gracefully', async () => {
      mockChromeStorage.local.get.mockRejectedValue(new Error('Storage error'));
      
      await expect(storageManager.get('testKey')).rejects.toThrow('Storage error');
    });

    test('should use cache for repeated gets', async () => {
      const testData = { test: 'value' };
      mockChromeStorage.local.get.mockResolvedValue({ testKey: testData });
      
      // First call
      await storageManager.get('testKey');
      
      // Second call should use cache
      const result = await storageManager.get('testKey');
      
      expect(result).toEqual(testData);
      expect(mockChromeStorage.local.get).toHaveBeenCalledTimes(1);
    });

    test('should bypass cache when requested', async () => {
      const testData = { test: 'value' };
      mockChromeStorage.local.get.mockResolvedValue({ testKey: testData });
      
      // First call with cache
      await storageManager.get('testKey', true);
      
      // Second call without cache
      await storageManager.get('testKey', false);
      
      expect(mockChromeStorage.local.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('user data management', () => {
    test('should return default user data when none exists', async () => {
      mockChromeStorage.local.get.mockResolvedValue({});
      
      const userData = await storageManager.getUserData();
      
      expect(userData).toEqual(EXTENSION_CONSTANTS.DEFAULT_USER_DATA);
    });

    test('should save user data with validation', async () => {
      const userData = {
        personal: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com'
        },
        address: {
          city: 'New York'
        }
      };
      
      mockChromeStorage.local.set.mockResolvedValue();
      
      const result = await storageManager.saveUserData(userData);
      
      expect(result).toBe(true);
      expect(mockChromeStorage.local.set).toHaveBeenCalled();
      
      const savedData = mockChromeStorage.local.set.mock.calls[0][0];
      expect(savedData).toHaveProperty(EXTENSION_CONSTANTS.STORAGE_KEYS.USER_DATA);
    });

    test('should validate user data structure', async () => {
      const incompleteUserData = {
        personal: {
          firstName: 'John'
        }
        // Missing other required sections
      };
      
      mockChromeStorage.local.set.mockResolvedValue();
      
      await storageManager.saveUserData(incompleteUserData);
      
      const savedData = mockChromeStorage.local.set.mock.calls[0][0];
      const userData = savedData[EXTENSION_CONSTANTS.STORAGE_KEYS.USER_DATA];
      
      // Should have all required sections
      expect(userData).toHaveProperty('personal');
      expect(userData).toHaveProperty('address');
      expect(userData).toHaveProperty('professional');
      expect(userData).toHaveProperty('preferences');
    });

    test('should update nested user data field', async () => {
      const existingData = {
        personal: { firstName: 'John', lastName: 'Doe' },
        address: { city: 'New York' },
        professional: {},
        preferences: {}
      };
      
      mockChromeStorage.local.get.mockResolvedValue({
        [EXTENSION_CONSTANTS.STORAGE_KEYS.USER_DATA]: existingData
      });
      mockChromeStorage.local.set.mockResolvedValue();
      
      await storageManager.updateUserDataField('personal.email', 'john@example.com');
      
      const savedData = mockChromeStorage.local.set.mock.calls[0][0];
      const userData = savedData[EXTENSION_CONSTANTS.STORAGE_KEYS.USER_DATA];
      
      expect(userData.personal.email).toBe('john@example.com');
      expect(userData.personal.firstName).toBe('John'); // Should preserve existing data
    });
  });

  describe('settings management', () => {
    test('should merge settings with defaults', async () => {
      const partialSettings = { enableExtension: false };
      mockChromeStorage.local.get.mockResolvedValue({
        [EXTENSION_CONSTANTS.STORAGE_KEYS.SETTINGS]: partialSettings
      });
      
      const settings = await storageManager.getSettings();
      
      expect(settings.enableExtension).toBe(false); // User setting
      expect(settings.autoDetectForms).toBe(true); // Default setting
      expect(settings.showNotifications).toBe(true); // Default setting
    });

    test('should save settings correctly', async () => {
      const newSettings = { enableExtension: false, autoDetectForms: false };
      
      mockChromeStorage.local.get.mockResolvedValue({
        [EXTENSION_CONSTANTS.STORAGE_KEYS.SETTINGS]: { enableExtension: true }
      });
      mockChromeStorage.local.set.mockResolvedValue();
      
      await storageManager.saveSettings(newSettings);
      
      const savedData = mockChromeStorage.local.set.mock.calls[0][0];
      const settings = savedData[EXTENSION_CONSTANTS.STORAGE_KEYS.SETTINGS];
      
      expect(settings.enableExtension).toBe(false);
      expect(settings.autoDetectForms).toBe(false);
      expect(settings.showNotifications).toBe(true); // Should preserve existing default
    });
  });

  describe('statistics management', () => {
    test('should return default statistics when none exist', async () => {
      mockChromeStorage.local.get.mockResolvedValue({});
      
      const stats = await storageManager.getStatistics();
      
      expect(stats).toHaveProperty('formsDetected', 0);
      expect(stats).toHaveProperty('fieldsFilled', 0);
      expect(stats).toHaveProperty('successfulFills', 0);
      expect(stats).toHaveProperty('errors', 0);
    });

    test('should update statistics correctly', async () => {
      const existingStats = {
        formsDetected: 5,
        fieldsFilled: 20,
        successfulFills: 3,
        errors: 1
      };
      
      mockChromeStorage.local.get.mockResolvedValue({
        [EXTENSION_CONSTANTS.STORAGE_KEYS.STATISTICS]: existingStats
      });
      mockChromeStorage.local.set.mockResolvedValue();
      
      await storageManager.updateStatistics({ fieldsFilled: 25, successfulFills: 4 });
      
      const savedData = mockChromeStorage.local.set.mock.calls[0][0];
      const stats = savedData[EXTENSION_CONSTANTS.STORAGE_KEYS.STATISTICS];
      
      expect(stats.fieldsFilled).toBe(25);
      expect(stats.successfulFills).toBe(4);
      expect(stats.formsDetected).toBe(5); // Should preserve unchanged values
      expect(stats).toHaveProperty('lastUpdated');
    });

    test('should increment statistics', async () => {
      const existingStats = { fieldsFilled: 10 };
      
      mockChromeStorage.local.get.mockResolvedValue({
        [EXTENSION_CONSTANTS.STORAGE_KEYS.STATISTICS]: existingStats
      });
      mockChromeStorage.local.set.mockResolvedValue();
      
      await storageManager.incrementStatistic('fieldsFilled', 5);
      
      const savedData = mockChromeStorage.local.set.mock.calls[0][0];
      const stats = savedData[EXTENSION_CONSTANTS.STORAGE_KEYS.STATISTICS];
      
      expect(stats.fieldsFilled).toBe(15);
    });
  });

  describe('data export and import', () => {
    test('should export data with correct structure', async () => {
      const userData = { personal: { firstName: 'John' } };
      const settings = { enableExtension: true };
      const statistics = { fieldsFilled: 5 };
      
      mockChromeStorage.local.get
        .mockResolvedValueOnce({ [EXTENSION_CONSTANTS.STORAGE_KEYS.USER_DATA]: userData })
        .mockResolvedValueOnce({ [EXTENSION_CONSTANTS.STORAGE_KEYS.SETTINGS]: settings })
        .mockResolvedValueOnce({ [EXTENSION_CONSTANTS.STORAGE_KEYS.STATISTICS]: statistics })
        .mockResolvedValueOnce({});
      
      const exportResult = await storageManager.exportData();
      
      expect(exportResult).toHaveProperty('blob');
      expect(exportResult).toHaveProperty('filename');
      expect(exportResult.filename).toMatch(/form-autofill-data-\d{4}-\d{2}-\d{2}\.json/);
    });

    test('should import data correctly', async () => {
      const importData = {
        version: '1.0.0',
        userData: { personal: { firstName: 'Jane' } },
        settings: { enableExtension: false }
      };
      
      mockChromeStorage.local.set.mockResolvedValue();
      
      // Mock createBackup
      storageManager.createBackup = jest.fn().mockResolvedValue(true);
      
      const result = await storageManager.importData(JSON.stringify(importData));
      
      expect(result).toBe(true);
      expect(storageManager.createBackup).toHaveBeenCalled();
      expect(mockChromeStorage.local.set).toHaveBeenCalledTimes(2); // userData and settings
    });

    test('should validate import data format', async () => {
      const invalidData = { invalid: 'format' };
      
      await expect(storageManager.importData(JSON.stringify(invalidData)))
        .rejects.toThrow('Invalid import data format');
    });
  });

  describe('encryption and decryption', () => {
    test('should encrypt sensitive data', async () => {
      await storageManager.initEncryption();
      
      const sensitiveData = { password: 'secret123' };
      const encrypted = await storageManager.encryptData(
        EXTENSION_CONSTANTS.STORAGE_KEYS.USER_DATA, 
        sensitiveData
      );
      
      expect(encrypted).toHaveProperty('encrypted', true);
      expect(encrypted).toHaveProperty('data');
      expect(encrypted.data).not.toBe(JSON.stringify(sensitiveData));
    });

    test('should decrypt data correctly', async () => {
      await storageManager.initEncryption();
      
      const originalData = { test: 'value' };
      const encrypted = await storageManager.encryptData(
        EXTENSION_CONSTANTS.STORAGE_KEYS.USER_DATA,
        originalData
      );
      
      const decrypted = await storageManager.decryptData(
        EXTENSION_CONSTANTS.STORAGE_KEYS.USER_DATA,
        encrypted
      );
      
      expect(decrypted).toEqual(originalData);
    });

    test('should not encrypt non-sensitive data', async () => {
      const nonSensitiveData = { setting: 'value' };
      const result = await storageManager.encryptData(
        EXTENSION_CONSTANTS.STORAGE_KEYS.SETTINGS,
        nonSensitiveData
      );
      
      expect(result).toEqual(nonSensitiveData);
    });
  });

  describe('utility methods', () => {
    test('should set nested values correctly', () => {
      const obj = { a: { b: { c: 'old' } } };
      const result = storageManager.setNestedValue(obj, 'a.b.c', 'new');
      
      expect(result.a.b.c).toBe('new');
      expect(result).not.toBe(obj); // Should return new object
    });

    test('should get nested values correctly', () => {
      const obj = { a: { b: { c: 'value' } } };
      const result = storageManager.getNestedValue(obj, 'a.b.c');
      
      expect(result).toBe('value');
    });

    test('should return undefined for non-existent nested paths', () => {
      const obj = { a: { b: 'value' } };
      const result = storageManager.getNestedValue(obj, 'a.b.c.d');
      
      expect(result).toBeUndefined();
    });

    test('should get storage usage information', async () => {
      mockChromeStorage.local.getBytesInUse.mockResolvedValue(1000000); // 1MB
      
      const usage = await storageManager.getStorageUsage();
      
      expect(usage).toEqual({
        used: 1000000,
        available: 4242880, // 5MB - 1MB
        total: 5242880,
        percentage: 19.073486328125
      });
    });
  });

  describe('cache management', () => {
    test('should clear cache', () => {
      storageManager.cache.set('test', { data: 'value', timestamp: Date.now() });
      
      storageManager.clearCache();
      
      expect(storageManager.cache.size).toBe(0);
    });

    test('should provide cache statistics', () => {
      storageManager.cache.set('test1', { data: 'value1', timestamp: Date.now() });
      storageManager.cache.set('test2', { data: 'value2', timestamp: Date.now() });
      
      const stats = storageManager.getCacheStats();
      
      expect(stats.size).toBe(2);
      expect(stats.keys).toEqual(['test1', 'test2']);
    });
  });
});