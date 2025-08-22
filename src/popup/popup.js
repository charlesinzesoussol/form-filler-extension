class PopupManager {
  constructor() {
    this.currentTab = null;
    this.extensionState = {
      status: 'ready',
      formCount: 0,
      fieldCount: 0,
      fillableCount: 0,
      isDetecting: false,
      isFilling: false
    };
    
    this.elements = {};
    this.init();
  }

  async init() {
    // Get DOM elements
    this.cacheElements();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Get current tab with retry logic
    let retries = 3;
    while (retries > 0) {
      await this.getCurrentTab();
      if (this.currentTab) break;
      
      retries--;
      if (retries > 0) {
        console.log(`Retrying tab access... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // Load initial state
    await this.loadExtensionState();
    
    // Update UI
    this.updateUI();
    
    console.log('Popup initialized');
  }

  cacheElements() {
    // Main elements
    this.elements = {
      // Status elements
      statusText: document.getElementById('statusText'),
      formCount: document.getElementById('formCount'),
      
      // Form details
      formDetails: document.getElementById('formDetails'),
      fieldCount: document.getElementById('fieldCount'),
      fillableCount: document.getElementById('fillableCount'),
      
      // Progress
      progressSection: document.getElementById('progressSection'),
      progressFill: document.getElementById('progressFill'),
      progressText: document.getElementById('progressText'),
      
      // Error
      errorSection: document.getElementById('errorSection'),
      errorMessage: document.getElementById('errorMessage'),
      
      // Buttons
      detectBtn: document.getElementById('detectBtn'),
      fillBtn: document.getElementById('fillBtn'),
      fillFakeBtn: document.getElementById('fillFakeBtn'),
      settingsBtn: document.getElementById('settingsBtn'),
      
      // Settings panel
      settingsPanel: document.getElementById('settingsPanel'),
      closeSettingsBtn: document.getElementById('closeSettingsBtn'),
      autoDetect: document.getElementById('autoDetect'),
      visualFeedback: document.getElementById('visualFeedback'),
      fillDelay: document.getElementById('fillDelay'),
      editDataBtn: document.getElementById('editDataBtn')
    };
  }

  setupEventListeners() {
    // Main action buttons
    this.elements.detectBtn.addEventListener('click', () => this.detectForms());
    this.elements.fillBtn.addEventListener('click', () => this.fillForms());
    this.elements.fillFakeBtn.addEventListener('click', () => this.fillFormsFake());
    
    // Settings
    this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
    this.elements.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
    this.elements.editDataBtn.addEventListener('click', () => this.editUserData());
    
    // Settings changes
    this.elements.autoDetect.addEventListener('change', (e) => {
      this.updateSetting('autoDetectForms', e.target.checked);
    });
    this.elements.visualFeedback.addEventListener('change', (e) => {
      this.updateSetting('showVisualFeedback', e.target.checked);
    });
    this.elements.fillDelay.addEventListener('change', (e) => {
      this.updateSetting('fillDelay', parseInt(e.target.value));
    });
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });
  }

  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error('No active tab found');
      }
      
      // Additional validation for tab accessibility
      if (!tab.url) {
        throw new Error('Tab URL not accessible');
      }
      
      if (tab.url.startsWith('chrome://') || 
          tab.url.startsWith('chrome-extension://') ||
          tab.url.startsWith('moz-extension://') ||
          tab.url.startsWith('edge://') ||
          tab.url.startsWith('about:')) {
        throw new Error('Internal browser pages not supported');
      }
      
      this.currentTab = tab;
      return tab;
    } catch (error) {
      console.error('Error getting current tab:', error);
      this.showError('Navigate to a regular website to use the extension');
      return null;
    }
  }

  async loadExtensionState() {
    try {
      if (!this.currentTab) {
        console.warn('No current tab available for loading extension state');
        this.showError('No active tab found');
        return;
      }
      
      console.log('Loading extension state for tab:', this.currentTab.id, this.currentTab.url);
      
      // Get status from background script
      const response = await chrome.runtime.sendMessage({
        type: EXTENSION_CONSTANTS.MESSAGES.GET_STATUS,
        data: { tabId: this.currentTab.id }
      });
      
      console.log('Extension state response:', response);
      
      if (response && response.success) {
        this.extensionState = {
          ...this.extensionState,
          ...response.data.tabState
        };
        
        // Load settings
        await this.loadSettings();
      } else {
        console.error('Failed to get extension state:', response);
        this.showError(response?.error || 'Failed to load extension state');
      }
    } catch (error) {
      console.error('Error loading extension state:', error);
      if (error.message.includes('Extension context invalidated')) {
        this.showError('Extension was updated. Please refresh the page.');
      } else if (error.message.includes('Could not establish connection')) {
        this.showError('Extension communication error. Try refreshing the page.');
      } else {
        this.showError('Failed to load extension state');
      }
    }
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: EXTENSION_CONSTANTS.MESSAGES.GET_USER_DATA
      });
      
      if (response.success && response.data) {
        const settings = response.data.preferences || {};
        
        // Update settings UI
        this.elements.autoDetect.checked = settings.autoDetect !== false;
        this.elements.visualFeedback.checked = settings.showVisualFeedback !== false;
        this.elements.fillDelay.value = settings.fillDelay || 50;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  updateUI() {
    // Update status and form info
    this.updateStatus();
    this.updateFormInfo();
    this.updateButtons();
  }

  updateStatus() {
    const { status, isDetecting, isFilling, formCount } = this.extensionState;
    
    let statusText = 'Ready';
    
    if (isDetecting) {
      statusText = 'Detecting...';
    } else if (isFilling) {
      statusText = 'Filling...';
    } else if (status === 'detected') {
      statusText = 'Forms found';
    } else if (status === 'completed') {
      statusText = 'Complete';
    } else if (status === 'error') {
      statusText = 'Error';
    }
    
    this.elements.statusText.textContent = statusText;
    
    // Show form count if detected
    if (status === 'detected' || status === 'completed') {
      this.elements.formCount.textContent = `${formCount || 0} forms`;
      this.elements.formCount.style.display = 'inline';
    } else {
      this.elements.formCount.style.display = 'none';
    }
  }

  updateFormInfo() {
    const { fieldCount, fillableCount, status } = this.extensionState;
    
    if (status === 'detected' || status === 'completed') {
      this.elements.fieldCount.textContent = fieldCount || 0;
      this.elements.fillableCount.textContent = fillableCount || 0;
      this.elements.formDetails.style.display = 'block';
    } else {
      this.elements.formDetails.style.display = 'none';
    }
  }

  updateButtons() {
    const { status, isDetecting, isFilling } = this.extensionState;
    
    // Detect button
    this.elements.detectBtn.disabled = isDetecting || isFilling;
    if (isDetecting) {
      this.elements.detectBtn.classList.add('loading');
    } else {
      this.elements.detectBtn.classList.remove('loading');
    }
    
    // Fill button
    const canFill = status === 'detected' && this.extensionState.fillableCount > 0;
    this.elements.fillBtn.disabled = !canFill || isDetecting || isFilling;
    if (isFilling) {
      this.elements.fillBtn.classList.add('loading');
    } else {
      this.elements.fillBtn.classList.remove('loading');
    }

    // Fake Fill button - always enabled if not currently filling
    this.elements.fillFakeBtn.disabled = isDetecting || isFilling;
    if (isFilling) {
      this.elements.fillFakeBtn.classList.add('loading');
    } else {
      this.elements.fillFakeBtn.classList.remove('loading');
    }
  }

  // Action methods
  async detectForms() {
    try {
      if (!this.currentTab) {
        this.showError('No active tab found');
        return;
      }
      
      this.extensionState.isDetecting = true;
      this.updateUI();
      
      const response = await chrome.runtime.sendMessage({
        type: EXTENSION_CONSTANTS.MESSAGES.DETECT_FORMS,
        data: { tabId: this.currentTab.id }
      });
      
      if (response.success) {
        // Detection started successfully
        // Wait for completion message
      } else {
        throw new Error(response.error || 'Detection failed');
      }
    } catch (error) {
      console.error('Error detecting forms:', error);
      this.showError(error.message);
      this.extensionState.isDetecting = false;
      this.updateUI();
    }
  }

  async fillForms() {
    try {
      if (!this.currentTab) {
        this.showError('No active tab found');
        return;
      }
      
      this.extensionState.isFilling = true;
      this.updateUI();
      this.showProgress(0, 'Starting form fill...');
      
      const response = await chrome.runtime.sendMessage({
        type: EXTENSION_CONSTANTS.MESSAGES.FILL_FORMS,
        data: { 
          tabId: this.currentTab.id,
          skipErrors: true,
          delay: this.elements.fillDelay.value || 50
        }
      });
      
      if (response.success) {
        // Filling started successfully
        // Progress will be updated via messages
      } else {
        throw new Error(response.error || 'Fill operation failed');
      }
    } catch (error) {
      console.error('Error filling forms:', error);
      this.showError(error.message);
      this.extensionState.isFilling = false;
      this.hideProgress();
      this.updateUI();
    }
  }

  async fillFormsFake() {
    try {
      if (!this.currentTab) {
        this.showError('No active tab found');
        return;
      }
      
      this.extensionState.isFilling = true;
      this.updateUI();
      this.showProgress(0, 'Filling with fake data...');
      
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        type: 'FILL_FORMS_FAKE',
        data: { 
          delay: this.elements.fillDelay?.value || 50
        }
      });
      
      this.extensionState.isFilling = false;
      this.hideProgress();
      
      if (response.success) {
        this.extensionState.status = 'completed';
        this.updateStatus();
        console.log('Fake fill completed:', response.results);
      } else {
        throw new Error(response.error || 'Fake fill operation failed');
      }
      
      this.updateUI();
    } catch (error) {
      console.error('Error filling forms with fake data:', error);
      this.showError(error.message);
      this.extensionState.isFilling = false;
      this.hideProgress();
      this.updateUI();
    }
  }

  async clearForms() {
    try {
      if (!this.currentTab) return;
      
      // Clear forms on the page
      await chrome.tabs.sendMessage(this.currentTab.id, {
        type: 'CLEAR_FORMS'
      });
      
      // Reset state
      this.extensionState.status = 'ready';
      this.extensionState.formCount = 0;
      this.extensionState.fieldCount = 0;
      this.extensionState.fillableCount = 0;
      
      this.updateUI();
    } catch (error) {
      console.error('Error clearing forms:', error);
      this.showError('Failed to clear forms');
    }
  }

  async refreshPage() {
    try {
      if (!this.currentTab) return;
      
      await chrome.tabs.reload(this.currentTab.id);
      window.close();
    } catch (error) {
      console.error('Error refreshing page:', error);
      this.showError('Failed to refresh page');
    }
  }

  // UI state management
  showProgress(percent, details) {
    this.elements.progressText.textContent = `${percent}%`;
    this.elements.progressFill.style.width = `${percent}%`;
    this.elements.progressSection.style.display = 'block';
  }

  hideProgress() {
    this.elements.progressSection.style.display = 'none';
  }

  showError(message) {
    // Add helpful context for common restriction messages
    let helpText = '';
    
    if (message.includes('Chrome internal pages') || message.includes('Internal browser pages')) {
      helpText = 'Navigate to a regular website';
    } else if (message.includes('Extension pages')) {
      helpText = 'Cannot work on extension pages';
    } else if (message.includes('Local files')) {
      helpText = 'Local files need special permissions';
    }
    
    this.elements.errorMessage.textContent = helpText || message;
    this.elements.errorSection.style.display = 'block';
    
    // Auto-hide error after 5 seconds
    setTimeout(() => {
      this.elements.errorSection.style.display = 'none';
    }, 5000);
  }

  dismissError() {
    this.elements.errorSection.style.display = 'none';
  }

  // Panel management
  openSettings() {
    this.elements.settingsPanel.style.display = 'flex';
  }

  closeSettings() {
    this.elements.settingsPanel.style.display = 'none';
  }

  async loadDataSummary() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: EXTENSION_CONSTANTS.MESSAGES.GET_USER_DATA
      });
      
      if (response.success && response.data) {
        const data = response.data;
        let summary = '<div style="font-weight: 600; margin-bottom: 8px;">Personal Data:</div>';
        
        if (data.personal) {
          summary += `<div>Name: ${data.personal.firstName || ''} ${data.personal.lastName || ''}</div>`;
          summary += `<div>Email: ${data.personal.email || 'Not set'}</div>`;
          summary += `<div>Phone: ${data.personal.phone || 'Not set'}</div>`;
        }
        
        if (data.address) {
          summary += '<div style="font-weight: 600; margin: 12px 0 8px 0;">Address:</div>';
          summary += `<div>City: ${data.address.city || 'Not set'}</div>`;
          summary += `<div>State: ${data.address.state || 'Not set'}</div>`;
        }
        
        this.elements.dataSummary.innerHTML = summary;
      }
    } catch (error) {
      console.error('Error loading data summary:', error);
      this.elements.dataSummary.innerHTML = '<div>Error loading data</div>';
    }
  }

  // Settings management
  async updateSetting(key, value) {
    try {
      await chrome.runtime.sendMessage({
        type: EXTENSION_CONSTANTS.MESSAGES.UPDATE_SETTINGS,
        data: { [key]: value }
      });
    } catch (error) {
      console.error('Error updating setting:', error);
      this.showError('Failed to update setting');
    }
  }

  // Data management
  async editUserData() {
    // Open options page for data editing
    chrome.tabs.create({ url: 'options.html' });
  }

  async exportData() {
    try {
      this.showLoading();
      
      const response = await chrome.runtime.sendMessage({
        type: 'EXPORT_DATA'
      });
      
      if (response.success) {
        // Create download link
        const blob = new Blob([JSON.stringify(response.data, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `form-autofill-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        throw new Error(response.error || 'Export failed');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      this.showError('Failed to export data');
    } finally {
      this.hideLoading();
    }
  }

  async importData() {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
          this.showLoading();
          
          const text = await file.text();
          const response = await chrome.runtime.sendMessage({
            type: 'IMPORT_DATA',
            data: text
          });
          
          if (response.success) {
            this.showError('Data imported successfully');
            this.loadDataSummary();
          } else {
            throw new Error(response.error || 'Import failed');
          }
        } catch (error) {
          console.error('Error importing data:', error);
          this.showError('Failed to import data');
        } finally {
          this.hideLoading();
        }
      };
      
      input.click();
    } catch (error) {
      console.error('Error setting up import:', error);
      this.showError('Failed to set up import');
    }
  }

  // Other actions
  openTemplates() {
    // Open templates management
    chrome.tabs.create({ url: 'templates.html' });
  }

  openHelp() {
    // Open help page
    chrome.tabs.create({ url: 'https://example.com/help' });
  }

  // Message handling
  handleMessage(message, sender, sendResponse) {
    const { type, data } = message;
    
    switch (type) {
      case 'popup_filling_progress':
        this.handleFillingProgress(data);
        break;
        
      case 'popup_detection_complete':
        this.handleDetectionComplete(data);
        break;
        
      case 'popup_filling_complete':
        this.handleFillingComplete(data);
        break;
        
      case 'popup_error':
        this.handleError(data);
        break;
    }
  }

  handleFillingProgress(data) {
    const { progress, currentField } = data;
    const percent = Math.round((progress.completed / progress.total) * 100);
    const details = `Filling ${currentField.name || 'field'} (${progress.completed}/${progress.total})`;
    
    this.showProgress(percent, details);
  }

  handleDetectionComplete(data) {
    this.extensionState.isDetecting = false;
    this.extensionState.status = 'detected';
    this.extensionState.formCount = data.formCount || 0;
    this.extensionState.fieldCount = data.fieldCount || 0;
    this.extensionState.fillableCount = data.fillableCount || 0;
    
    this.updateUI();
    
    if (this.extensionState.fillableCount === 0) {
      this.showError('No fillable forms found on this page');
    }
  }

  handleFillingComplete(data) {
    this.extensionState.isFilling = false;
    this.extensionState.status = 'completed';
    this.hideProgress();
    this.updateUI();
    
    // Show success animation
    document.body.classList.add('success-flash');
    setTimeout(() => {
      document.body.classList.remove('success-flash');
    }, 600);
    
    if (data.results) {
      const { filled, total, errors } = data.results;
      let message = `Filled ${filled} of ${total} fields`;
      
      if (errors > 0) {
        message += ` (${errors} errors)`;
      }
      
      this.elements.statusSubtitle.textContent = message;
    }
  }

  handleError(data) {
    this.extensionState.isDetecting = false;
    this.extensionState.isFilling = false;
    this.extensionState.status = 'error';
    
    this.hideProgress();
    this.updateUI();
    this.showError(data.error || 'An error occurred');
  }

  // Keyboard handling
  handleKeyboard(e) {
    // Escape key closes panels
    if (e.key === 'Escape') {
      if (this.elements.settingsPanel.style.display === 'flex') {
        this.closeSettings();
      } else if (this.elements.dataPanel.style.display === 'flex') {
        this.closeDataPanel();
      }
    }
    
    // Ctrl/Cmd + D for detect
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      this.detectForms();
    }
    
    // Ctrl/Cmd + F for fill
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      if (!this.elements.fillBtn.disabled) {
        this.fillForms();
      }
    }
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});