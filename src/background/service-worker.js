// Import constants (in Manifest V3, use importScripts)
importScripts('../utils/constants.js');

class ExtensionServiceWorker {
  constructor() {
    this.activeOperations = new Map();
    this.tabStates = new Map();
    this.init();
  }

  init() {
    // Set up message listeners
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Indicates we will respond asynchronously
    });

    // Handle tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });

    // Handle tab removal
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.cleanupTabState(tabId);
    });

    // Handle extension startup
    chrome.runtime.onStartup.addListener(() => {
      this.handleStartup();
    });

    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    // Handle keyboard shortcuts
    chrome.commands.onCommand.addListener((command) => {
      this.handleCommand(command);
    });

    console.log('Form Auto-Fill service worker initialized');
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      const { type, data } = message;
      const tabId = sender.tab?.id;
      
      console.log(`Received message: ${type}`, { tabId, data });

      switch (type) {
        case EXTENSION_CONSTANTS.MESSAGES.DETECT_FORMS:
          await this.handleDetectForms(tabId, data, sendResponse);
          break;

        case EXTENSION_CONSTANTS.MESSAGES.FILL_FORMS:
          await this.handleFillForms(tabId, data, sendResponse);
          break;

        case EXTENSION_CONSTANTS.MESSAGES.GET_STATUS:
          await this.handleGetStatus(tabId, sendResponse);
          break;

        case EXTENSION_CONSTANTS.MESSAGES.UPDATE_SETTINGS:
          await this.handleUpdateSettings(data, sendResponse);
          break;

        case EXTENSION_CONSTANTS.MESSAGES.GET_USER_DATA:
          await this.handleGetUserData(sendResponse);
          break;

        case EXTENSION_CONSTANTS.MESSAGES.SAVE_USER_DATA:
          await this.handleSaveUserData(data, sendResponse);
          break;

        case EXTENSION_CONSTANTS.MESSAGES.DETECTION_COMPLETE:
          await this.handleDetectionComplete(tabId, data, sendResponse);
          break;

        case EXTENSION_CONSTANTS.MESSAGES.FILLING_COMPLETE:
          await this.handleFillingComplete(tabId, data, sendResponse);
          break;

        case EXTENSION_CONSTANTS.MESSAGES.FILLING_PROGRESS:
          await this.handleFillingProgress(tabId, data);
          break;

        case EXTENSION_CONSTANTS.MESSAGES.ERROR_OCCURRED:
          await this.handleError(tabId, data);
          break;

        default:
          console.warn('Unknown message type:', type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleDetectForms(tabId, data, sendResponse) {
    try {
      // Check permissions
      const permission = await this.hasPermission(tabId);
      if (!permission.allowed) {
        sendResponse({ 
          success: false, 
          error: permission.reason
        });
        return;
      }

      // Use the actual tabId from permission check if available
      const actualTabId = permission.tabId || tabId;

      // Update tab state
      this.updateTabState(actualTabId, { status: 'detecting' });

      // Send message to content script to start detection
      try {
        const response = await chrome.tabs.sendMessage(actualTabId, {
          type: EXTENSION_CONSTANTS.MESSAGES.START_DETECTION,
          data: data
        });

        sendResponse({ success: true, data: response });
      } catch (messageError) {
        console.error('Failed to communicate with content script:', messageError);
        // Try to inject content script if it's not present
        try {
          await chrome.scripting.executeScript({
            target: { tabId: actualTabId },
            files: [
              'src/utils/constants.js',
              'src/utils/security.js',
              'src/utils/field-mapper.js',
              'src/content/form-detector.js',
              'src/content/form-filler.js',
              'src/content/content.js'
            ]
          });
          
          // Wait a bit for script to initialize
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Try sending message again
          const response = await chrome.tabs.sendMessage(actualTabId, {
            type: EXTENSION_CONSTANTS.MESSAGES.START_DETECTION,
            data: data
          });

          sendResponse({ success: true, data: response });
        } catch (injectionError) {
          console.error('Failed to inject content script:', injectionError);
          sendResponse({ 
            success: false, 
            error: 'Unable to communicate with page. Try refreshing the page.' 
          });
        }
      }
    } catch (error) {
      console.error('Error in handleDetectForms:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleFillForms(tabId, data, sendResponse) {
    try {
      // Check permissions
      const permission = await this.hasPermission(tabId);
      if (!permission.allowed) {
        sendResponse({ 
          success: false, 
          error: permission.reason
        });
        return;
      }

      // Get user data
      const userData = await this.getUserData();
      if (!userData) {
        sendResponse({ 
          success: false, 
          error: EXTENSION_CONSTANTS.ERRORS.INVALID_DATA 
        });
        return;
      }

      // Update tab state
      this.updateTabState(tabId, { status: 'filling' });

      // Start operation tracking
      const operationId = this.generateOperationId();
      this.activeOperations.set(operationId, {
        tabId,
        type: 'fill_forms',
        startTime: Date.now(),
        status: 'active'
      });

      // Send message to content script to start filling
      const response = await chrome.tabs.sendMessage(tabId, {
        type: EXTENSION_CONSTANTS.MESSAGES.START_FILLING,
        data: { 
          userData, 
          options: data,
          operationId 
        }
      });

      sendResponse({ 
        success: true, 
        operationId,
        data: response 
      });
    } catch (error) {
      console.error('Error in handleFillForms:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleGetStatus(tabId, sendResponse) {
    try {
      const tabState = this.getTabState(tabId);
      const settings = await this.getSettings();
      
      sendResponse({
        success: true,
        data: {
          tabState,
          settings,
          extensionEnabled: settings.enableExtension
        }
      });
    } catch (error) {
      console.error('Error in handleGetStatus:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleUpdateSettings(data, sendResponse) {
    try {
      await this.saveSettings(data);
      sendResponse({ 
        success: true, 
        message: EXTENSION_CONSTANTS.SUCCESS.SETTINGS_UPDATED 
      });
    } catch (error) {
      console.error('Error in handleUpdateSettings:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleGetUserData(sendResponse) {
    try {
      const userData = await this.getUserData();
      sendResponse({ success: true, data: userData });
    } catch (error) {
      console.error('Error in handleGetUserData:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleSaveUserData(data, sendResponse) {
    try {
      await this.saveUserData(data);
      sendResponse({ 
        success: true, 
        message: EXTENSION_CONSTANTS.SUCCESS.DATA_SAVED 
      });
    } catch (error) {
      console.error('Error in handleSaveUserData:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleDetectionComplete(tabId, data, sendResponse) {
    try {
      // Update tab state with detection results
      this.updateTabState(tabId, {
        status: 'detected',
        formCount: data.formCount,
        fieldCount: data.fieldCount,
        lastDetection: Date.now()
      });

      // Update statistics
      await this.updateStatistics('forms_detected', data.formCount);
      
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error in handleDetectionComplete:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleFillingComplete(tabId, data, sendResponse) {
    try {
      const { operationId, results } = data;
      
      // Update operation status
      if (this.activeOperations.has(operationId)) {
        const operation = this.activeOperations.get(operationId);
        operation.status = 'completed';
        operation.endTime = Date.now();
        operation.results = results;
      }

      // Update tab state
      this.updateTabState(tabId, {
        status: 'completed',
        lastFilling: Date.now(),
        lastResults: results
      });

      // Update statistics
      await this.updateStatistics('fields_filled', results.filled);
      
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error in handleFillingComplete:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleFillingProgress(tabId, data) {
    try {
      // Update tab state with progress
      this.updateTabState(tabId, {
        progress: data.progress,
        currentField: data.currentField
      });

      // Notify popup if open
      this.notifyPopup('filling_progress', data);
    } catch (error) {
      console.error('Error in handleFillingProgress:', error);
    }
  }

  async handleError(tabId, data) {
    try {
      console.error('Content script error:', data);
      
      // Update tab state
      this.updateTabState(tabId, {
        status: 'error',
        lastError: {
          message: data.error,
          timestamp: Date.now()
        }
      });

      // Log error for monitoring
      this.logError('content_script_error', data);
    } catch (error) {
      console.error('Error in handleError:', error);
    }
  }

  async hasPermission(tabId) {
    try {
      // If no tabId provided, get the active tab
      let tab;
      if (tabId) {
        try {
          tab = await chrome.tabs.get(tabId);
        } catch (error) {
          console.error('Failed to get specific tab:', error);
          // Fall back to active tab if specific tab fails
          const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTabs.length > 0) {
            tab = activeTabs[0];
          }
        }
      } else {
        const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTabs.length > 0) {
          tab = activeTabs[0];
        }
      }
      
      if (!tab) {
        return { allowed: false, reason: 'Unable to access tab information' };
      }
      
      // Check if URL is supported
      if (!tab.url) {
        return { allowed: false, reason: 'Page not loaded yet' };
      }
      
      if (tab.url.startsWith('chrome://') || 
          tab.url.startsWith('chrome-extension://') ||
          tab.url.startsWith('moz-extension://') ||
          tab.url.startsWith('edge://') ||
          tab.url.startsWith('about:')) {
        return { allowed: false, reason: 'Internal browser pages not supported' };
      }

      // Test if content script is available
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'ping' });
      } catch (error) {
        // Content script not available, try to inject it
        console.log('Content script not available, attempting injection...');
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: [
              'src/utils/constants.js',
              'src/utils/security.js', 
              'src/utils/field-mapper.js',
              'src/content/form-detector.js',
              'src/content/form-filler.js',
              'src/content/content.js'
            ]
          });
          console.log('Content script injected successfully');
          
          // Wait a moment for initialization
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (injectionError) {
          console.error('Failed to inject content script:', injectionError);
          return { allowed: false, reason: 'Cannot access this page' };
        }
      }

      return { allowed: true, reason: 'Ready to fill forms', tabId: tab.id };
    } catch (error) {
      console.error('Error checking permissions:', error);
      return { allowed: false, reason: 'Unable to access tab information' };
    }
  }

  // Storage operations
  async getUserData() {
    try {
      const result = await chrome.storage.local.get(
        EXTENSION_CONSTANTS.STORAGE_KEYS.USER_DATA
      );
      
      return result[EXTENSION_CONSTANTS.STORAGE_KEYS.USER_DATA] || 
             EXTENSION_CONSTANTS.DEFAULT_USER_DATA;
    } catch (error) {
      console.error('Error getting user data:', error);
      throw new Error(EXTENSION_CONSTANTS.ERRORS.STORAGE_ERROR);
    }
  }

  async saveUserData(userData) {
    try {
      await chrome.storage.local.set({
        [EXTENSION_CONSTANTS.STORAGE_KEYS.USER_DATA]: userData
      });
    } catch (error) {
      console.error('Error saving user data:', error);
      throw new Error(EXTENSION_CONSTANTS.ERRORS.STORAGE_ERROR);
    }
  }

  async getSettings() {
    try {
      const result = await chrome.storage.local.get(
        EXTENSION_CONSTANTS.STORAGE_KEYS.SETTINGS
      );
      
      return {
        ...EXTENSION_CONSTANTS.DEFAULT_SETTINGS,
        ...result[EXTENSION_CONSTANTS.STORAGE_KEYS.SETTINGS]
      };
    } catch (error) {
      console.error('Error getting settings:', error);
      return EXTENSION_CONSTANTS.DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings) {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      
      await chrome.storage.local.set({
        [EXTENSION_CONSTANTS.STORAGE_KEYS.SETTINGS]: updatedSettings
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      throw new Error(EXTENSION_CONSTANTS.ERRORS.STORAGE_ERROR);
    }
  }

  async updateStatistics(metric, value) {
    try {
      const result = await chrome.storage.local.get(
        EXTENSION_CONSTANTS.STORAGE_KEYS.STATISTICS
      );
      
      const stats = result[EXTENSION_CONSTANTS.STORAGE_KEYS.STATISTICS] || {};
      
      if (!stats[metric]) {
        stats[metric] = 0;
      }
      
      stats[metric] += value;
      stats.lastUpdated = Date.now();
      
      await chrome.storage.local.set({
        [EXTENSION_CONSTANTS.STORAGE_KEYS.STATISTICS]: stats
      });
    } catch (error) {
      console.error('Error updating statistics:', error);
    }
  }

  // Tab state management
  updateTabState(tabId, updates) {
    if (!this.tabStates.has(tabId)) {
      this.tabStates.set(tabId, {
        id: tabId,
        status: 'idle',
        created: Date.now()
      });
    }
    
    const currentState = this.tabStates.get(tabId);
    const newState = { ...currentState, ...updates, lastUpdated: Date.now() };
    this.tabStates.set(tabId, newState);
    
    return newState;
  }

  getTabState(tabId) {
    return this.tabStates.get(tabId) || { status: 'unknown' };
  }

  cleanupTabState(tabId) {
    this.tabStates.delete(tabId);
    
    // Clean up any active operations for this tab
    for (const [operationId, operation] of this.activeOperations.entries()) {
      if (operation.tabId === tabId) {
        this.activeOperations.delete(operationId);
      }
    }
  }

  // Event handlers
  handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
      // Reset tab state when page loads
      this.updateTabState(tabId, { 
        status: 'ready',
        url: tab.url,
        title: tab.title
      });
    }
  }

  async handleStartup() {
    console.log('Extension startup');
    // Clear temporary state
    this.activeOperations.clear();
    this.tabStates.clear();
  }

  async handleInstallation(details) {
    console.log('Extension installed/updated:', details);
    
    if (details.reason === 'install') {
      // Set up default data for new installation
      await this.saveUserData(EXTENSION_CONSTANTS.DEFAULT_USER_DATA);
      await this.saveSettings(EXTENSION_CONSTANTS.DEFAULT_SETTINGS);
    }
  }

  // Utility methods
  generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async notifyPopup(type, data) {
    try {
      // Try to send message to popup if it's open
      await chrome.runtime.sendMessage({
        type: `popup_${type}`,
        data: data
      });
    } catch (error) {
      // Popup is probably not open, which is fine
    }
  }

  logError(type, data) {
    const errorLog = {
      type,
      data,
      timestamp: Date.now(),
      url: data.url || 'unknown'
    };
    
    console.error('Logged error:', errorLog);
    // In production, this would send to error monitoring service
  }

  async handleCommand(command) {
    try {
      console.log('Keyboard command received:', command);
      
      if (command === 'fill-forms-fake') {
        // Get current active tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) {
          console.log('No active tab found for keyboard shortcut');
          return;
        }
        
        const tabId = tabs[0].id;
        
        // Check permissions
        const permission = await this.hasPermission(tabId);
        if (!permission.allowed) {
          console.log('Cannot fill forms on this page:', permission.reason);
          return;
        }

        // Send message to content script to fill with fake data
        try {
          const response = await chrome.tabs.sendMessage(tabId, {
            type: 'FILL_FORMS_FAKE',
            data: { delay: 50 }
          });
          
          console.log('Fake fill result:', response);
        } catch (error) {
          console.error('Error filling forms with fake data:', error);
        }
      }
    } catch (error) {
      console.error('Error handling keyboard command:', error);
    }
  }
}

// Initialize the service worker
const serviceWorker = new ExtensionServiceWorker();