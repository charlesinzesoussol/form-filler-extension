// Jest setup file for Form Auto-Fill Extension tests

// Mock Chrome Extension APIs
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onInstalled: {
      addListener: jest.fn()
    },
    onStartup: {
      addListener: jest.fn()
    },
    lastError: null
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
      getBytesInUse: jest.fn(),
      QUOTA_BYTES: 5242880
    }
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
    create: jest.fn(),
    reload: jest.fn(),
    get: jest.fn(),
    onUpdated: {
      addListener: jest.fn()
    },
    onRemoved: {
      addListener: jest.fn()
    }
  },
  action: {
    setTitle: jest.fn(),
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn()
  }
};

// Mock DOM APIs
global.MutationObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn()
}));

global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn()
}));

// Mock crypto API for secure random generation
global.crypto = {
  getRandomValues: jest.fn((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  })
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Mock extension constants
global.EXTENSION_CONSTANTS = {
  NAME: 'Form Auto-Fill',
  VERSION: '1.0.0',
  
  MESSAGES: {
    DETECT_FORMS: 'DETECT_FORMS',
    FILL_FORMS: 'FILL_FORMS',
    GET_STATUS: 'GET_STATUS',
    UPDATE_SETTINGS: 'UPDATE_SETTINGS',
    GET_USER_DATA: 'GET_USER_DATA',
    SAVE_USER_DATA: 'SAVE_USER_DATA',
    START_DETECTION: 'START_DETECTION',
    START_FILLING: 'START_FILLING',
    STOP_FILLING: 'STOP_FILLING',
    GET_FORM_COUNT: 'GET_FORM_COUNT',
    DETECTION_COMPLETE: 'DETECTION_COMPLETE',
    FILLING_COMPLETE: 'FILLING_COMPLETE',
    FILLING_PROGRESS: 'FILLING_PROGRESS',
    FORM_COUNT_UPDATE: 'FORM_COUNT_UPDATE',
    ERROR_OCCURRED: 'ERROR_OCCURRED'
  },
  
  STORAGE_KEYS: {
    USER_DATA: 'form_fill_user_data',
    SETTINGS: 'form_fill_settings',
    STATISTICS: 'form_fill_statistics',
    FIELD_MAPPINGS: 'form_fill_field_mappings'
  },
  
  FIELD_PATTERNS: {
    firstName: ['first.?name', 'fname', 'firstname', 'given.?name'],
    lastName: ['last.?name', 'lname', 'lastname', 'surname'],
    email: ['email', 'e.?mail', 'mail'],
    phone: ['phone', 'telephone', 'tel', 'mobile'],
    address: ['address', 'street', 'addr'],
    city: ['city', 'town', 'locality'],
    state: ['state', 'province', 'region'],
    zipCode: ['zip', 'postal', 'postcode']
  },
  
  DEFAULT_USER_DATA: {
    personal: {
      firstName: '',
      lastName: '',
      fullName: '',
      email: '',
      phone: '',
      dateOfBirth: ''
    },
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    professional: {
      company: '',
      jobTitle: '',
      website: ''
    },
    preferences: {
      fillPasswords: false,
      skipProtectedFields: true,
      showVisualFeedback: true,
      enableAutoDetection: true,
      fillDelay: 50
    }
  },
  
  DEFAULT_SETTINGS: {
    enableExtension: true,
    autoDetectForms: true,
    showNotifications: true,
    debugMode: false,
    respectValidation: true,
    skipHiddenFields: true,
    maxFieldsPerPage: 1000,
    fillTimeout: 30000
  },
  
  CSS_CLASSES: {
    SUCCESS: 'form-fill-success',
    ERROR: 'form-fill-error',
    PROCESSING: 'form-fill-processing',
    CONTAINER: 'form-fill-container',
    OVERLAY: 'form-fill-overlay'
  },
  
  PROTECTED_PATTERNS: {
    CAPTCHA: ['captcha', 'recaptcha', 'g-recaptcha', 'hcaptcha'],
    HONEYPOT: ['honeypot', 'bot-field', 'spam-check', 'website', 'url'],
    SECURITY: ['csrf', 'token', 'nonce', '_token', 'authenticity_token']
  },
  
  TIMEOUTS: {
    FORM_DETECTION: 5000,
    FORM_FILLING: 30000,
    MESSAGE_RESPONSE: 10000,
    MUTATION_DEBOUNCE: 100,
    VISUAL_FEEDBACK: 2000
  },
  
  LIMITS: {
    MAX_FIELDS_PER_FORM: 100,
    MAX_FORMS_PER_PAGE: 10,
    MAX_TEXT_LENGTH: 1000,
    MAX_RETRIES: 3,
    MIN_FIELD_VISIBILITY: 10
  },
  
  ERRORS: {
    PERMISSION_DENIED: 'Permission denied to access this page',
    FORM_NOT_FOUND: 'No fillable forms found on this page',
    FIELD_NOT_FILLABLE: 'Field cannot be filled',
    VALIDATION_FAILED: 'Field validation failed',
    TIMEOUT_EXCEEDED: 'Operation timed out',
    INVALID_DATA: 'Invalid user data provided',
    STORAGE_ERROR: 'Failed to access extension storage',
    COMMUNICATION_ERROR: 'Failed to communicate with extension components'
  },
  
  SUCCESS: {
    FORMS_DETECTED: 'Forms detected successfully',
    FIELDS_FILLED: 'Fields filled successfully',
    DATA_SAVED: 'User data saved successfully',
    SETTINGS_UPDATED: 'Settings updated successfully'
  }
};

// Mock utility classes for testing
global.FormDetector = class MockFormDetector {
  constructor() {
    this.detectedFields = [];
    this.isObserving = false;
  }
  
  detectFormFields() {
    return this.detectedFields;
  }
  
  setupDynamicDetection() {
    this.isObserving = true;
  }
  
  stopDynamicDetection() {
    this.isObserving = false;
  }
  
  getDetectedFields() {
    return this.detectedFields;
  }
};

global.FormFiller = class MockFormFiller {
  constructor() {
    this.filledFields = [];
    this.errors = [];
  }
  
  async fillField() {
    return true;
  }
  
  async fillAllFields() {
    return { total: 0, filled: 0, errors: 0, success: true };
  }
  
  getFilledFields() {
    return this.filledFields;
  }
  
  getErrors() {
    return this.errors;
  }
  
  clearFeedback() {
    // Mock implementation
  }
};

global.FieldMapper = class MockFieldMapper {
  mapValueToField() {
    return 'mock-value';
  }
};

global.SecurityUtils = class MockSecurityUtils {
  sanitizeInput(value) {
    return String(value);
  }
  
  validateUserData() {
    return { isValid: true, errors: [] };
  }
  
  isProtectedField() {
    return false;
  }
  
  isHoneypotField() {
    return false;
  }
};

global.StorageManager = class MockStorageManager {
  constructor() {
    this.cache = new Map();
  }
  
  async get() {
    return null;
  }
  
  async set() {
    return true;
  }
  
  async getUserData() {
    return EXTENSION_CONSTANTS.DEFAULT_USER_DATA;
  }
  
  async saveUserData() {
    return true;
  }
  
  async getSettings() {
    return EXTENSION_CONSTANTS.DEFAULT_SETTINGS;
  }
  
  async saveSettings() {
    return true;
  }
};

// Suppress specific console warnings in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  
  // Reset DOM
  document.body.innerHTML = '';
  
  // Clear any timers
  jest.clearAllTimers();
});

// Mock fetch for tests that might use it
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('')
  })
);

// Mock URL for tests
global.URL = class MockURL {
  constructor(url) {
    this.href = url;
    this.protocol = url.split(':')[0] + ':';
    this.hostname = url.split('://')[1]?.split('/')[0] || '';
  }
  
  toString() {
    return this.href;
  }
};

// Mock Blob for file operations
global.Blob = class MockBlob {
  constructor(parts, options) {
    this.parts = parts;
    this.type = options?.type || '';
    this.size = parts.reduce((size, part) => size + part.length, 0);
  }
};

// Utility function to create mock DOM elements
global.createMockElement = (tagName, attributes = {}) => {
  return {
    tagName: tagName.toUpperCase(),
    ...attributes,
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(() => false),
      toggle: jest.fn()
    },
    style: {},
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    getAttribute: jest.fn(),
    setAttribute: jest.fn(),
    hasAttribute: jest.fn(() => false),
    removeAttribute: jest.fn(),
    matches: jest.fn(() => false),
    closest: jest.fn(() => null)
  };
};

// Add custom matchers if needed
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false
      };
    }
  }
});

console.log('Jest setup completed for Form Auto-Fill Extension tests');