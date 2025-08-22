// Unit tests for FormDetector class
// Note: These tests would typically run in a browser environment with DOM support

describe('FormDetector', () => {
  let formDetector;
  let mockDocument;

  beforeEach(() => {
    // Set up mock DOM environment
    formDetector = new FormDetector();
    
    // Create a mock document with form elements
    mockDocument = {
      querySelectorAll: jest.fn(),
      body: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
      }
    };
    
    // Mock window object
    global.window = {
      getComputedStyle: jest.fn(() => ({
        display: 'block',
        visibility: 'visible'
      })),
      MutationObserver: jest.fn(() => ({
        observe: jest.fn(),
        disconnect: jest.fn()
      }))
    };
    
    global.document = mockDocument;
  });

  afterEach(() => {
    formDetector.stopDynamicDetection();
  });

  describe('detectFormFields', () => {
    test('should detect all standard input types', () => {
      // Mock form elements
      const mockElements = [
        createMockElement('input', { type: 'text', name: 'firstName' }),
        createMockElement('input', { type: 'email', name: 'email' }),
        createMockElement('textarea', { name: 'message' }),
        createMockElement('select', { name: 'country' })
      ];
      
      mockDocument.querySelectorAll.mockReturnValue(mockElements);
      
      const fields = formDetector.detectFormFields(mockDocument);
      
      expect(fields).toHaveLength(4);
      expect(fields[0].type).toBe('text');
      expect(fields[1].type).toBe('email');
      expect(fields[2].type).toBe('textarea');
      expect(fields[3].type).toBe('select-one');
    });

    test('should exclude disabled fields', () => {
      const mockElements = [
        createMockElement('input', { type: 'text', name: 'enabled' }),
        createMockElement('input', { type: 'text', name: 'disabled', disabled: true })
      ];
      
      mockDocument.querySelectorAll.mockReturnValue(mockElements);
      
      const fields = formDetector.detectFormFields(mockDocument);
      
      expect(fields).toHaveLength(1);
      expect(fields[0].name).toBe('enabled');
    });

    test('should exclude readonly fields', () => {
      const mockElements = [
        createMockElement('input', { type: 'text', name: 'editable' }),
        createMockElement('input', { type: 'text', name: 'readonly', readOnly: true })
      ];
      
      mockDocument.querySelectorAll.mockReturnValue(mockElements);
      
      const fields = formDetector.detectFormFields(mockDocument);
      
      expect(fields).toHaveLength(1);
      expect(fields[0].name).toBe('editable');
    });

    test('should exclude hidden fields', () => {
      const mockElements = [
        createMockElement('input', { type: 'text', name: 'visible' }),
        createMockElement('input', { type: 'text', name: 'hidden', style: { display: 'none' } })
      ];
      
      // Mock offsetParent to simulate visibility
      mockElements[0].offsetParent = document.body;
      mockElements[1].offsetParent = null;
      
      mockDocument.querySelectorAll.mockReturnValue(mockElements);
      
      const fields = formDetector.detectFormFields(mockDocument);
      
      expect(fields).toHaveLength(1);
      expect(fields[0].name).toBe('visible');
    });

    test('should exclude protected fields (CAPTCHA)', () => {
      const mockElements = [
        createMockElement('input', { type: 'text', name: 'normal' }),
        createMockElement('input', { type: 'text', name: 'captcha', className: 'g-recaptcha' })
      ];
      
      mockDocument.querySelectorAll.mockReturnValue(mockElements);
      
      const fields = formDetector.detectFormFields(mockDocument);
      
      expect(fields).toHaveLength(1);
      expect(fields[0].name).toBe('normal');
    });
  });

  describe('getFieldLabel', () => {
    test('should find label with for attribute', () => {
      const mockInput = createMockElement('input', { type: 'text', id: 'testInput' });
      const mockLabel = createMockElement('label', { 
        textContent: 'Test Label',
        getAttribute: () => 'testInput'
      });
      
      mockDocument.querySelector = jest.fn(() => mockLabel);
      
      const label = formDetector.getFieldLabel(mockInput);
      
      expect(label).toBe('Test Label');
      expect(mockDocument.querySelector).toHaveBeenCalledWith('label[for="testInput"]');
    });

    test('should find parent label', () => {
      const mockLabel = createMockElement('label', { textContent: 'Parent Label' });
      const mockInput = createMockElement('input', { 
        type: 'text',
        closest: jest.fn(() => mockLabel)
      });
      
      mockDocument.querySelector = jest.fn(() => null);
      
      const label = formDetector.getFieldLabel(mockInput);
      
      expect(label).toBe('Parent Label');
    });

    test('should fall back to aria-label', () => {
      const mockInput = createMockElement('input', { 
        type: 'text',
        getAttribute: jest.fn((attr) => attr === 'aria-label' ? 'ARIA Label' : null),
        closest: jest.fn(() => null)
      });
      
      mockDocument.querySelector = jest.fn(() => null);
      
      const label = formDetector.getFieldLabel(mockInput);
      
      expect(label).toBe('ARIA Label');
    });
  });

  describe('isProtectedField', () => {
    test('should identify CAPTCHA fields', () => {
      const captchaField = createMockElement('input', { 
        classList: ['g-recaptcha'],
        parentElement: null
      });
      
      const isProtected = formDetector.isProtectedField(captchaField);
      
      expect(isProtected).toBe(true);
    });

    test('should identify honeypot fields', () => {
      const honeypotField = createMockElement('input', { 
        name: 'honeypot',
        classList: [],
        parentElement: null
      });
      
      const isProtected = formDetector.isProtectedField(honeypotField);
      
      expect(isProtected).toBe(true);
    });

    test('should not flag normal fields as protected', () => {
      const normalField = createMockElement('input', { 
        name: 'firstName',
        classList: [],
        parentElement: null
      });
      
      const isProtected = formDetector.isProtectedField(normalField);
      
      expect(isProtected).toBe(false);
    });
  });

  describe('setupDynamicDetection', () => {
    test('should set up MutationObserver', () => {
      const mockObserver = {
        observe: jest.fn(),
        disconnect: jest.fn()
      };
      
      global.MutationObserver = jest.fn(() => mockObserver);
      
      formDetector.setupDynamicDetection();
      
      expect(global.MutationObserver).toHaveBeenCalled();
      expect(mockObserver.observe).toHaveBeenCalled();
      expect(formDetector.isObserving).toBe(true);
    });

    test('should not set up multiple observers', () => {
      const mockObserver = {
        observe: jest.fn(),
        disconnect: jest.fn()
      };
      
      global.MutationObserver = jest.fn(() => mockObserver);
      
      formDetector.setupDynamicDetection();
      formDetector.setupDynamicDetection();
      
      expect(global.MutationObserver).toHaveBeenCalledTimes(1);
    });
  });

  describe('getFieldsByType', () => {
    test('should filter fields by type', () => {
      const mockElements = [
        createMockElement('input', { type: 'text', name: 'text1' }),
        createMockElement('input', { type: 'email', name: 'email1' }),
        createMockElement('input', { type: 'text', name: 'text2' })
      ];
      
      mockDocument.querySelectorAll.mockReturnValue(mockElements);
      formDetector.detectFormFields(mockDocument);
      
      const textFields = formDetector.getFieldsByType('text');
      const emailFields = formDetector.getFieldsByType('email');
      
      expect(textFields).toHaveLength(2);
      expect(emailFields).toHaveLength(1);
      expect(textFields[0].name).toBe('text1');
      expect(textFields[1].name).toBe('text2');
      expect(emailFields[0].name).toBe('email1');
    });
  });

  // Helper function to create mock DOM elements
  function createMockElement(tagName, attributes = {}) {
    const element = {
      tagName: tagName.toUpperCase(),
      type: attributes.type || '',
      name: attributes.name || '',
      id: attributes.id || '',
      disabled: attributes.disabled || false,
      readOnly: attributes.readOnly || false,
      required: attributes.required || false,
      placeholder: attributes.placeholder || '',
      value: attributes.value || '',
      classList: attributes.classList || [],
      className: attributes.className || '',
      style: attributes.style || {},
      offsetParent: attributes.offsetParent !== undefined ? attributes.offsetParent : document.body,
      offsetHeight: attributes.offsetHeight || 20,
      offsetWidth: attributes.offsetWidth || 100,
      textContent: attributes.textContent || '',
      parentElement: attributes.parentElement || null,
      closest: attributes.closest || jest.fn(() => null),
      querySelector: attributes.querySelector || jest.fn(() => null),
      querySelectorAll: attributes.querySelectorAll || jest.fn(() => []),
      getAttribute: attributes.getAttribute || jest.fn(() => null),
      hasAttribute: attributes.hasAttribute || jest.fn(() => false),
      matches: attributes.matches || jest.fn(() => false)
    };
    
    // Mock classList methods
    if (Array.isArray(element.classList)) {
      element.classList.includes = (className) => element.classList.indexOf(className) !== -1;
      element.classList.add = (className) => {
        if (!element.classList.includes(className)) {
          element.classList.push(className);
        }
      };
      element.classList.remove = (className) => {
        const index = element.classList.indexOf(className);
        if (index !== -1) {
          element.classList.splice(index, 1);
        }
      };
    }
    
    return element;
  }
});