class FormAutoFillContentScript {
  constructor() {
    this.formDetector = null;
    this.formFiller = null;
    this.fieldMapper = null;
    this.securityUtils = null;
    
    this.isInitialized = false;
    this.isActive = false;
    this.detectedFields = [];
    this.currentOperation = null;
    
    this.init();
  }

  async init() {
    try {
      // Initialize utility classes
      this.securityUtils = new SecurityUtils();
      this.fieldMapper = new FieldMapper();
      this.formDetector = new FormDetector();
      this.formFiller = new FormFiller(this.fieldMapper);
      
      // Set up message listeners
      this.setupMessageListeners();
      
      // Set up page event listeners
      this.setupPageEventListeners();
      
      // Check if we should auto-detect forms
      await this.checkAutoDetection();
      
      this.isInitialized = true;
      console.log('Form Auto-Fill content script initialized');
      
      // Notify service worker that content script is ready
      this.sendMessage(EXTENSION_CONSTANTS.MESSAGES.FORM_COUNT_UPDATE, {
        status: 'ready',
        url: window.location.href
      });
      
    } catch (error) {
      console.error('Error initializing content script:', error);
      this.sendErrorMessage('Initialization failed', error);
    }
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Indicates we will respond asynchronously
    });
  }

  setupPageEventListeners() {
    // Listen for form field updates from FormDetector
    window.addEventListener('formFieldsUpdated', (event) => {
      this.handleFormFieldsUpdated(event.detail);
    });
    
    // Handle page navigation
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseOperations();
      } else {
        this.resumeOperations();
      }
    });
    
    // Handle dynamic content changes
    this.setupDynamicContentObserver();
  }

  setupDynamicContentObserver() {
    // Set up observer for dynamic content that might affect forms
    const observer = new MutationObserver((mutations) => {
      let shouldRecheck = false;
      
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if added node contains forms
              if (node.matches('form') || node.querySelector('form')) {
                shouldRecheck = true;
              }
              // Check if added node contains form fields
              if (node.matches('input, textarea, select') || 
                  node.querySelector('input, textarea, select')) {
                shouldRecheck = true;
              }
            }
          });
        }
      });
      
      if (shouldRecheck && this.isActive) {
        // Debounce re-detection
        clearTimeout(this.recheckTimeout);
        this.recheckTimeout = setTimeout(() => {
          this.detectFormsInternal(false);
        }, 500);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    this.dynamicObserver = observer;
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      const { type, data } = message;
      
      switch (type) {
        case 'ping':
          sendResponse({ success: true, message: 'pong' });
          break;
          
        case EXTENSION_CONSTANTS.MESSAGES.START_DETECTION:
          await this.handleStartDetection(data, sendResponse);
          break;
          
        case EXTENSION_CONSTANTS.MESSAGES.START_FILLING:
          await this.handleStartFilling(data, sendResponse);
          break;
          
        case EXTENSION_CONSTANTS.MESSAGES.STOP_FILLING:
          await this.handleStopFilling(data, sendResponse);
          break;
          
        case EXTENSION_CONSTANTS.MESSAGES.GET_FORM_COUNT:
          await this.handleGetFormCount(sendResponse);
          break;
          
        case 'CLEAR_FORMS':
          await this.handleClearForms(sendResponse);
          break;
          
        case 'GET_PAGE_INFO':
          await this.handleGetPageInfo(sendResponse);
          break;

        case 'FILL_FORMS_FAKE':
          await this.handleFillFormsFake(data, sendResponse);
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

  async handleStartDetection(data, sendResponse) {
    try {
      this.isActive = true;
      await this.detectFormsInternal(true);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error in form detection:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleStartFilling(data, sendResponse) {
    try {
      const { userData, options, operationId } = data;
      
      if (!this.detectedFields || this.detectedFields.length === 0) {
        throw new Error('No forms detected. Please detect forms first.');
      }
      
      this.currentOperation = {
        id: operationId,
        type: 'filling',
        startTime: Date.now(),
        options: options
      };
      
      // Start filling process
      const results = await this.fillFormsInternal(userData, options);
      
      // Send completion message
      this.sendMessage(EXTENSION_CONSTANTS.MESSAGES.FILLING_COMPLETE, {
        operationId: operationId,
        results: results
      });
      
      this.currentOperation = null;
      sendResponse({ success: true, results });
      
    } catch (error) {
      console.error('Error in form filling:', error);
      this.currentOperation = null;
      sendResponse({ success: false, error: error.message });
      this.sendErrorMessage('Form filling failed', error);
    }
  }

  async handleStopFilling(data, sendResponse) {
    try {
      if (this.currentOperation && this.currentOperation.type === 'filling') {
        this.currentOperation.cancelled = true;
        // Clean up any visual feedback
        this.formFiller.clearFeedback();
      }
      
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error stopping fill operation:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleGetFormCount(sendResponse) {
    try {
      const formCount = document.querySelectorAll('form').length;
      const fieldCount = this.detectedFields.length;
      const fillableCount = this.detectedFields.filter(field => field.fillable).length;
      
      sendResponse({
        success: true,
        data: {
          formCount,
          fieldCount,
          fillableCount,
          url: window.location.href,
          title: document.title
        }
      });
    } catch (error) {
      console.error('Error getting form count:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleClearForms(sendResponse) {
    try {
      // Clear all form fields
      const fields = document.querySelectorAll('input, textarea, select');
      
      fields.forEach(field => {
        if (!field.disabled && !field.readOnly) {
          if (field.type === 'checkbox' || field.type === 'radio') {
            field.checked = false;
          } else if (field.tagName === 'SELECT') {
            field.selectedIndex = 0;
          } else {
            field.value = '';
          }
          
          // Trigger events
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      
      // Clear visual feedback
      this.formFiller.clearFeedback();
      
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error clearing forms:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleGetPageInfo(sendResponse) {
    try {
      const info = {
        url: window.location.href,
        title: document.title,
        domain: window.location.hostname,
        hasPasswordFields: document.querySelectorAll('input[type="password"]').length > 0,
        hasEmailFields: document.querySelectorAll('input[type="email"]').length > 0,
        formCount: document.querySelectorAll('form').length,
        totalInputs: document.querySelectorAll('input, textarea, select').length
      };
      
      sendResponse({ success: true, data: info });
    } catch (error) {
      console.error('Error getting page info:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async detectFormsInternal(notify = true) {
    try {
      // Detect all form fields
      this.detectedFields = this.formDetector.detectFormFields();
      
      // Filter out protected fields for security
      this.detectedFields = this.detectedFields.filter(field => {
        return !this.securityUtils.isProtectedField(field.element) &&
               !this.securityUtils.isHoneypotField(field.element);
      });
      
      // Set up dynamic detection
      this.formDetector.setupDynamicDetection();
      
      if (notify) {
        // Group fields by their parent forms
        const formGroups = this.groupFieldsByForms(this.detectedFields);
        
        // Send detection results to service worker
        this.sendMessage(EXTENSION_CONSTANTS.MESSAGES.DETECTION_COMPLETE, {
          formCount: document.querySelectorAll('form').length,
          fieldCount: this.detectedFields.length,
          fillableCount: this.detectedFields.filter(field => field.fillable).length,
          protectedCount: this.detectedFields.filter(field => !field.fillable).length,
          formGroups: formGroups,
          url: window.location.href,
          timestamp: Date.now()
        });
      }
      
      return this.detectedFields;
    } catch (error) {
      console.error('Error detecting forms:', error);
      throw error;
    }
  }

  async fillFormsInternal(userData, options = {}) {
    try {
      // Validate user data
      const validation = this.securityUtils.validateUserData(userData);
      if (!validation.isValid) {
        throw new Error('Invalid user data: ' + validation.errors.join(', '));
      }
      
      // Get fillable fields
      const fillableFields = this.detectedFields.filter(field => field.fillable);
      
      if (fillableFields.length === 0) {
        throw new Error('No fillable fields found');
      }
      
      // Fill forms with progress tracking
      const results = await this.formFiller.fillAllFields(fillableFields, userData, {
        delay: options.delay || 50,
        skipErrors: options.skipErrors !== false,
        onProgress: (progress) => {
          // Send progress update
          this.sendMessage(EXTENSION_CONSTANTS.MESSAGES.FILLING_PROGRESS, {
            progress: progress,
            operationId: this.currentOperation?.id
          });
        },
        onFieldFilled: (fieldDescriptor, success) => {
          // Optional: Send individual field updates
          if (!success) {
            console.warn('Failed to fill field:', fieldDescriptor.name);
          }
        }
      });
      
      return results;
    } catch (error) {
      console.error('Error filling forms:', error);
      throw error;
    }
  }

  handleFormFieldsUpdated(detail) {
    // Handle dynamic form field updates
    this.detectedFields = detail.fields || [];
    
    // Notify service worker of the update
    this.sendMessage(EXTENSION_CONSTANTS.MESSAGES.FORM_COUNT_UPDATE, {
      fieldCount: this.detectedFields.length,
      fillableCount: this.detectedFields.filter(field => field.fillable).length,
      url: window.location.href,
      timestamp: Date.now()
    });
  }

  async checkAutoDetection() {
    try {
      // Always auto-detect forms when page loads
      const waitForPageLoad = () => {
        if (document.readyState === 'complete') {
          // Wait a bit more for dynamic content
          setTimeout(() => {
            this.detectFormsInternal(true);
          }, 500);
        } else {
          setTimeout(waitForPageLoad, 100);
        }
      };
      
      waitForPageLoad();
      
      // Also detect when new content is added
      this.setupContinuousDetection();
    } catch (error) {
      console.error('Error in auto-detection:', error);
    }
  }

  setupContinuousDetection() {
    // Detect forms periodically for dynamic content
    this.detectionInterval = setInterval(() => {
      const currentFormCount = document.querySelectorAll('form').length;
      const currentFieldCount = document.querySelectorAll('input, textarea, select').length;
      
      if (currentFormCount !== this.lastFormCount || currentFieldCount !== this.lastFieldCount) {
        this.lastFormCount = currentFormCount;
        this.lastFieldCount = currentFieldCount;
        this.detectFormsInternal(false);
      }
    }, 2000);
  }

  // Utility methods
  sendMessage(type, data = {}) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({
          type: type,
          data: data
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  sendErrorMessage(message, error) {
    this.sendMessage(EXTENSION_CONSTANTS.MESSAGES.ERROR_OCCURRED, {
      error: message,
      details: error?.message || '',
      url: window.location.href,
      timestamp: Date.now()
    });
  }

  pauseOperations() {
    // Pause any ongoing operations when page becomes hidden
    if (this.currentOperation) {
      this.currentOperation.paused = true;
    }
  }

  resumeOperations() {
    // Resume operations when page becomes visible
    if (this.currentOperation && this.currentOperation.paused) {
      this.currentOperation.paused = false;
    }
  }

  cleanup() {
    try {
      // Stop dynamic detection
      if (this.formDetector) {
        this.formDetector.stopDynamicDetection();
      }
      
      // Clear any visual feedback
      if (this.formFiller) {
        this.formFiller.clearFeedback();
      }
      
      // Stop dynamic observer
      if (this.dynamicObserver) {
        this.dynamicObserver.disconnect();
      }
      
      // Clear timeouts and intervals
      if (this.recheckTimeout) {
        clearTimeout(this.recheckTimeout);
      }
      
      if (this.detectionInterval) {
        clearInterval(this.detectionInterval);
      }
      
      // Reset state
      this.isActive = false;
      this.detectedFields = [];
      this.currentOperation = null;
      this.lastFormCount = 0;
      this.lastFieldCount = 0;
      
      console.log('Content script cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  groupFieldsByForms(fields) {
    const formGroups = [];
    const orphanFields = [];
    const processedForms = new Set();
    
    fields.forEach(field => {
      const formElement = field.element.closest('form');
      
      if (formElement) {
        const formId = formElement.id || formElement.name || `form_${formGroups.length}`;
        
        if (!processedForms.has(formElement)) {
          processedForms.add(formElement);
          
          const formFields = fields.filter(f => 
            f.element.closest('form') === formElement
          );
          
          formGroups.push({
            id: formId,
            element: formElement,
            action: formElement.action || '',
            method: formElement.method || 'GET',
            fieldCount: formFields.length,
            fillableCount: formFields.filter(f => f.fillable).length,
            fields: formFields
          });
        }
      } else {
        orphanFields.push(field);
      }
    });
    
    // Add orphan fields as a separate group if any exist
    if (orphanFields.length > 0) {
      formGroups.push({
        id: 'orphan_fields',
        element: null,
        action: '',
        method: '',
        fieldCount: orphanFields.length,
        fillableCount: orphanFields.filter(f => f.fillable).length,
        fields: orphanFields
      });
    }
    
    return formGroups;
  }

  // Public API for debugging and testing
  getDetectedFields() {
    return this.detectedFields;
  }

  getFormCount() {
    return document.querySelectorAll('form').length;
  }

  getFillableFieldsCount() {
    return this.detectedFields.filter(field => field.fillable).length;
  }

  getOperationStatus() {
    return {
      isInitialized: this.isInitialized,
      isActive: this.isActive,
      currentOperation: this.currentOperation,
      detectedFieldsCount: this.detectedFields.length
    };
  }

  // Manual triggers for testing
  async manualDetect() {
    return await this.detectFormsInternal(true);
  }

  async manualFill(userData) {
    if (!this.detectedFields.length) {
      await this.detectFormsInternal(false);
    }
    
    return await this.fillFormsInternal(userData, { delay: 100 });
  }

  async handleFillFormsFake(data, sendResponse) {
    try {
      console.log('Filling forms with fake data...');
      
      // Ensure forms are detected
      if (!this.detectedFields || this.detectedFields.length === 0) {
        await this.detectFormsInternal(false);
      }

      if (this.detectedFields.length === 0) {
        sendResponse({ success: false, error: 'No fillable forms found' });
        return;
      }

      // Fill forms with fake data
      const results = await this.formFiller.fillAllFieldsWithFakeData(this.detectedFields, {
        delay: data.delay || 50,
        skipErrors: true,
        onProgress: (progress) => {
          console.log(`Fake fill progress: ${progress.completed}/${progress.total}`);
        }
      });

      console.log('Fake fill completed:', results);
      sendResponse({ success: true, results });
      
    } catch (error) {
      console.error('Error in fake form filling:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
}

// Initialize content script when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.formAutoFillContentScript = new FormAutoFillContentScript();
  });
} else {
  // DOM is already ready
  window.formAutoFillContentScript = new FormAutoFillContentScript();
}

// Make it available globally for debugging
window.FormAutoFillContentScript = FormAutoFillContentScript;