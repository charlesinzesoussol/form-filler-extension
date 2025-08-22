// Extension constants and configurations
const EXTENSION_CONSTANTS = {
  // Extension metadata
  NAME: 'Form Auto-Fill',
  VERSION: '1.0.0',
  
  // Message types for communication between components
  MESSAGES: {
    // From popup to service worker
    DETECT_FORMS: 'DETECT_FORMS',
    FILL_FORMS: 'FILL_FORMS',
    GET_STATUS: 'GET_STATUS',
    UPDATE_SETTINGS: 'UPDATE_SETTINGS',
    GET_USER_DATA: 'GET_USER_DATA',
    SAVE_USER_DATA: 'SAVE_USER_DATA',
    
    // From service worker to content script
    START_DETECTION: 'START_DETECTION',
    START_FILLING: 'START_FILLING',
    STOP_FILLING: 'STOP_FILLING',
    GET_FORM_COUNT: 'GET_FORM_COUNT',
    
    // From content script to service worker
    DETECTION_COMPLETE: 'DETECTION_COMPLETE',
    FILLING_COMPLETE: 'FILLING_COMPLETE',
    FILLING_PROGRESS: 'FILLING_PROGRESS',
    FORM_COUNT_UPDATE: 'FORM_COUNT_UPDATE',
    ERROR_OCCURRED: 'ERROR_OCCURRED'
  },
  
  // Storage keys
  STORAGE_KEYS: {
    USER_DATA: 'form_fill_user_data',
    SETTINGS: 'form_fill_settings',
    STATISTICS: 'form_fill_statistics',
    FIELD_MAPPINGS: 'form_fill_field_mappings'
  },
  
  // Field mapping patterns for intelligent field detection
  FIELD_PATTERNS: {
    firstName: [
      'first.?name', 'fname', 'firstname', 'given.?name', 'forename',
      'prenom', 'nombre', 'nome', 'prénom'
    ],
    lastName: [
      'last.?name', 'lname', 'lastname', 'surname', 'family.?name',
      'nom', 'apellido', 'sobrenome', 'nom.?de.?famille'
    ],
    fullName: [
      'full.?name', 'name', 'fullname', 'complete.?name', 'nom.?complet',
      'nombre.?completo', 'nome.?completo'
    ],
    email: [
      'email', 'e.?mail', 'mail', 'electronic.?mail', 'correo',
      'correio', 'courriel', 'adresse.?mail'
    ],
    phone: [
      'phone', 'telephone', 'tel', 'mobile', 'cell', 'telefono',
      'telefone', 'téléphone', 'numero'
    ],
    address: [
      'address', 'street', 'addr', 'dirección', 'endereço', 'adresse',
      'rue', 'calle', 'rua'
    ],
    city: [
      'city', 'town', 'locality', 'ciudad', 'cidade', 'ville',
      'municipio', 'município'
    ],
    state: [
      'state', 'province', 'region', 'estado', 'provincia', 'région',
      'état', 'região'
    ],
    zipCode: [
      'zip', 'postal', 'postcode', 'zip.?code', 'postal.?code',
      'codigo.?postal', 'código.?postal', 'code.?postal'
    ],
    country: [
      'country', 'nation', 'país', 'país', 'pays', 'nación', 'nação'
    ],
    company: [
      'company', 'organization', 'org', 'employer', 'empresa',
      'organisation', 'société', 'compañía', 'companhia'
    ],
    website: [
      'website', 'url', 'web', 'site', 'homepage', 'página.?web',
      'página.?web', 'site.?web'
    ]
  },
  
  // Default user data template
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
  
  // Default extension settings
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
  
  // Visual feedback CSS classes
  CSS_CLASSES: {
    SUCCESS: 'form-fill-success',
    ERROR: 'form-fill-error',
    PROCESSING: 'form-fill-processing',
    CONTAINER: 'form-fill-container',
    OVERLAY: 'form-fill-overlay'
  },
  
  // Protected field indicators
  PROTECTED_PATTERNS: {
    CAPTCHA: ['captcha', 'recaptcha', 'g-recaptcha', 'hcaptcha'],
    HONEYPOT: ['honeypot', 'bot-field', 'spam-check', 'website', 'url'],
    SECURITY: ['csrf', 'token', 'nonce', '_token', 'authenticity_token']
  },
  
  // Timeouts and delays
  TIMEOUTS: {
    FORM_DETECTION: 5000,
    FORM_FILLING: 30000,
    MESSAGE_RESPONSE: 10000,
    MUTATION_DEBOUNCE: 100,
    VISUAL_FEEDBACK: 2000
  },
  
  // Limits and constraints
  LIMITS: {
    MAX_FIELDS_PER_FORM: 100,
    MAX_FORMS_PER_PAGE: 10,
    MAX_TEXT_LENGTH: 1000,
    MAX_RETRIES: 3,
    MIN_FIELD_VISIBILITY: 10 // pixels
  },
  
  // Error messages
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
  
  // Success messages
  SUCCESS: {
    FORMS_DETECTED: 'Forms detected successfully',
    FIELDS_FILLED: 'Fields filled successfully',
    DATA_SAVED: 'User data saved successfully',
    SETTINGS_UPDATED: 'Settings updated successfully'
  }
};

// Make constants available globally
if (typeof window !== 'undefined') {
  window.EXTENSION_CONSTANTS = EXTENSION_CONSTANTS;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXTENSION_CONSTANTS;
}