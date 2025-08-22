// Integration tests for the complete extension workflow

describe('Extension Integration Tests', () => {
  let mockChrome;
  let mockDocument;
  let contentScript;

  beforeEach(async () => {
    // Set up comprehensive mock environment
    setupMockEnvironment();
    
    // Initialize content script
    contentScript = new FormAutoFillContentScript();
    await new Promise(resolve => setTimeout(resolve, 100)); // Allow initialization
  });

  afterEach(() => {
    if (contentScript) {
      contentScript.cleanup();
    }
    jest.clearAllMocks();
  });

  describe('End-to-End Form Detection and Filling', () => {
    test('should detect and fill a complete contact form', async () => {
      // Set up a realistic contact form
      const contactForm = createContactForm();
      document.body.appendChild(contactForm);
      
      const userData = {
        personal: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '555-0123'
        },
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345'
        },
        professional: {
          company: 'Example Corp',
          website: 'https://example.com'
        }
      };
      
      // Simulate form detection
      await contentScript.handleStartDetection({}, jest.fn());
      
      expect(contentScript.getDetectedFields()).toHaveLength(8);
      expect(contentScript.getFillableFieldsCount()).toBe(8);
      
      // Simulate form filling
      const fillResult = await contentScript.handleStartFilling({
        userData,
        options: { delay: 0, skipErrors: true },
        operationId: 'test-op-1'
      }, jest.fn());
      
      expect(fillResult).toEqual({
        success: true,
        results: expect.objectContaining({
          total: 8,
          filled: 8,
          success: true
        })
      });
      
      // Verify all fields were filled correctly
      expect(document.getElementById('firstName').value).toBe('John');
      expect(document.getElementById('lastName').value).toBe('Doe');
      expect(document.getElementById('email').value).toBe('john.doe@example.com');
      expect(document.getElementById('phone').value).toBe('555-0123');
      expect(document.getElementById('street').value).toBe('123 Main St');
      expect(document.getElementById('city').value).toBe('Anytown');
      expect(document.getElementById('state').value).toBe('CA');
      expect(document.getElementById('zipCode').value).toBe('12345');
    });

    test('should handle forms with validation requirements', async () => {
      const formWithValidation = createFormWithValidation();
      document.body.appendChild(formWithValidation);
      
      const userData = {
        personal: {
          email: 'invalid-email', // Invalid email to test validation
          phone: '123' // Too short phone number
        }
      };
      
      await contentScript.handleStartDetection({}, jest.fn());
      
      const fillResult = await contentScript.handleStartFilling({
        userData,
        options: { delay: 0, skipErrors: true },
        operationId: 'test-op-2'
      }, jest.fn());
      
      // Should handle validation errors gracefully
      expect(fillResult.success).toBe(true);
      expect(fillResult.results.errors).toBeGreaterThan(0);
    });

    test('should skip protected fields (CAPTCHA, honeypots)', async () => {
      const formWithProtectedFields = createFormWithProtectedFields();
      document.body.appendChild(formWithProtectedFields);
      
      await contentScript.handleStartDetection({}, jest.fn());
      
      const detectedFields = contentScript.getDetectedFields();
      const fillableFields = detectedFields.filter(field => field.fillable);
      
      // Should detect all fields but exclude protected ones from fillable
      expect(detectedFields.length).toBeGreaterThan(fillableFields.length);
      
      // Verify specific protected fields are not fillable
      const captchaField = detectedFields.find(field => field.name === 'captcha');
      const honeypotField = detectedFields.find(field => field.name === 'honeypot');
      
      expect(captchaField.fillable).toBe(false);
      expect(honeypotField.fillable).toBe(false);
    });

    test('should handle dynamic form fields', async () => {
      const dynamicForm = createDynamicForm();
      document.body.appendChild(dynamicForm);
      
      // Initial detection
      await contentScript.handleStartDetection({}, jest.fn());
      const initialFieldCount = contentScript.getDetectedFields().length;
      
      // Add dynamic field
      const newField = document.createElement('input');
      newField.type = 'text';
      newField.name = 'dynamicField';
      newField.id = 'dynamicField';
      dynamicForm.appendChild(newField);
      
      // Wait for dynamic detection
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const updatedFieldCount = contentScript.getDetectedFields().length;
      expect(updatedFieldCount).toBe(initialFieldCount + 1);
    });
  });

  describe('Service Worker Communication', () => {
    test('should communicate between popup and content script', async () => {
      const mockSendResponse = jest.fn();
      
      // Simulate popup requesting form detection
      await contentScript.handleMessage({
        type: EXTENSION_CONSTANTS.MESSAGES.START_DETECTION,
        data: {}
      }, {}, mockSendResponse);
      
      expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
      
      // Simulate popup requesting form count
      await contentScript.handleMessage({
        type: EXTENSION_CONSTANTS.MESSAGES.GET_FORM_COUNT,
        data: {}
      }, {}, mockSendResponse);
      
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          formCount: expect.any(Number),
          fieldCount: expect.any(Number),
          fillableCount: expect.any(Number)
        })
      });
    });

    test('should handle message errors gracefully', async () => {
      const mockSendResponse = jest.fn();
      
      // Send invalid message type
      await contentScript.handleMessage({
        type: 'INVALID_MESSAGE_TYPE',
        data: {}
      }, {}, mockSendResponse);
      
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Unknown message type'
      });
    });
  });

  describe('Security and Privacy', () => {
    test('should not fill password fields by default', async () => {
      const formWithPassword = createFormWithPassword();
      document.body.appendChild(formWithPassword);
      
      const userData = {
        personal: {
          username: 'testuser',
          password: 'secret123'
        }
      };
      
      await contentScript.handleStartDetection({}, jest.fn());
      
      const fillResult = await contentScript.handleStartFilling({
        userData,
        options: { delay: 0 },
        operationId: 'test-op-3'
      }, jest.fn());
      
      // Username should be filled, password should not
      expect(document.getElementById('username').value).toBe('testuser');
      expect(document.getElementById('password').value).toBe('');
    });

    test('should sanitize user input data', async () => {
      const form = createBasicForm();
      document.body.appendChild(form);
      
      const maliciousUserData = {
        personal: {
          firstName: '<script>alert("xss")</script>John',
          email: 'test@example.com<script>alert("xss")</script>'
        }
      };
      
      await contentScript.handleStartDetection({}, jest.fn());
      
      await contentScript.handleStartFilling({
        userData: maliciousUserData,
        options: { delay: 0 },
        operationId: 'test-op-4'
      }, jest.fn());
      
      // Script tags should be sanitized
      const firstNameValue = document.getElementById('firstName').value;
      expect(firstNameValue).not.toContain('<script>');
      expect(firstNameValue).toContain('John');
    });

    test('should respect user privacy settings', async () => {
      const form = createContactForm();
      document.body.appendChild(form);
      
      const userData = {
        personal: {
          firstName: 'John',
          email: 'john@example.com'
        },
        preferences: {
          fillPasswords: false,
          skipProtectedFields: true,
          showVisualFeedback: false
        }
      };
      
      await contentScript.handleStartDetection({}, jest.fn());
      
      await contentScript.handleStartFilling({
        userData,
        options: { delay: 0 },
        operationId: 'test-op-5'
      }, jest.fn());
      
      // Should respect privacy preferences
      const filledFields = document.querySelectorAll('.form-fill-success');
      expect(filledFields.length).toBe(0); // No visual feedback should be shown
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle large forms efficiently', async () => {
      const largeForm = createLargeForm(100); // 100 fields
      document.body.appendChild(largeForm);
      
      const startTime = Date.now();
      
      await contentScript.handleStartDetection({}, jest.fn());
      
      const detectionTime = Date.now() - startTime;
      expect(detectionTime).toBeLessThan(1000); // Should complete within 1 second
      
      expect(contentScript.getDetectedFields().length).toBe(100);
    });

    test('should handle malformed HTML gracefully', async () => {
      const malformedForm = createMalformedForm();
      document.body.appendChild(malformedForm);
      
      // Should not throw errors
      await expect(contentScript.handleStartDetection({}, jest.fn()))
        .resolves.not.toThrow();
      
      // Should still detect valid fields
      expect(contentScript.getDetectedFields().length).toBeGreaterThan(0);
    });

    test('should clean up properly on page navigation', () => {
      const form = createBasicForm();
      document.body.appendChild(form);
      
      // Set up some state
      contentScript.isActive = true;
      contentScript.detectedFields = [{ name: 'test' }];
      
      // Simulate page navigation
      contentScript.cleanup();
      
      expect(contentScript.isActive).toBe(false);
      expect(contentScript.detectedFields).toEqual([]);
      expect(contentScript.currentOperation).toBeNull();
    });
  });

  // Helper functions to create test forms
  function setupMockEnvironment() {
    // Mock Chrome APIs
    mockChrome = {
      runtime: {
        sendMessage: jest.fn().mockResolvedValue({ success: true }),
        onMessage: {
          addListener: jest.fn()
        }
      },
      storage: {
        local: {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue()
        }
      }
    };
    
    global.chrome = mockChrome;
    
    // Mock DOM
    global.document = {
      readyState: 'complete',
      body: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
      },
      createElement: (tagName) => ({
        tagName: tagName.toUpperCase(),
        appendChild: jest.fn(),
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
        addEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
        style: {},
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          contains: jest.fn(() => false)
        }
      }),
      getElementById: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      addEventListener: jest.fn()
    };
    
    global.window = {
      location: {
        href: 'https://example.com/test',
        hostname: 'example.com'
      },
      addEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
      MutationObserver: jest.fn(() => ({
        observe: jest.fn(),
        disconnect: jest.fn()
      })),
      getComputedStyle: jest.fn(() => ({
        display: 'block',
        visibility: 'visible'
      }))
    };
    
    // Mock constants
    global.EXTENSION_CONSTANTS = {
      MESSAGES: {
        START_DETECTION: 'START_DETECTION',
        START_FILLING: 'START_FILLING',
        GET_FORM_COUNT: 'GET_FORM_COUNT',
        DETECTION_COMPLETE: 'DETECTION_COMPLETE',
        FILLING_COMPLETE: 'FILLING_COMPLETE',
        ERROR_OCCURRED: 'ERROR_OCCURRED'
      }
    };
  }

  function createContactForm() {
    const form = document.createElement('form');
    
    const fields = [
      { type: 'text', name: 'firstName', id: 'firstName' },
      { type: 'text', name: 'lastName', id: 'lastName' },
      { type: 'email', name: 'email', id: 'email' },
      { type: 'tel', name: 'phone', id: 'phone' },
      { type: 'text', name: 'street', id: 'street' },
      { type: 'text', name: 'city', id: 'city' },
      { type: 'text', name: 'state', id: 'state' },
      { type: 'text', name: 'zipCode', id: 'zipCode' }
    ];
    
    fields.forEach(fieldInfo => {
      const field = document.createElement('input');
      Object.assign(field, fieldInfo);
      field.value = '';
      field.dispatchEvent = jest.fn();
      form.appendChild(field);
      
      // Mock getElementById for this field
      if (fieldInfo.id) {
        document.getElementById.mockImplementation(id => 
          id === fieldInfo.id ? field : null
        );
      }
    });
    
    return form;
  }

  function createFormWithValidation() {
    const form = document.createElement('form');
    
    const emailField = document.createElement('input');
    emailField.type = 'email';
    emailField.name = 'email';
    emailField.required = true;
    form.appendChild(emailField);
    
    const phoneField = document.createElement('input');
    phoneField.type = 'tel';
    phoneField.name = 'phone';
    phoneField.pattern = '[0-9]{10}';
    form.appendChild(phoneField);
    
    return form;
  }

  function createFormWithProtectedFields() {
    const form = document.createElement('form');
    
    // Normal field
    const normalField = document.createElement('input');
    normalField.type = 'text';
    normalField.name = 'firstName';
    form.appendChild(normalField);
    
    // CAPTCHA field
    const captchaField = document.createElement('input');
    captchaField.type = 'text';
    captchaField.name = 'captcha';
    captchaField.classList = ['g-recaptcha'];
    form.appendChild(captchaField);
    
    // Honeypot field
    const honeypotField = document.createElement('input');
    honeypotField.type = 'text';
    honeypotField.name = 'honeypot';
    honeypotField.style.display = 'none';
    form.appendChild(honeypotField);
    
    return form;
  }

  function createDynamicForm() {
    const form = document.createElement('form');
    
    const field = document.createElement('input');
    field.type = 'text';
    field.name = 'initialField';
    form.appendChild(field);
    
    return form;
  }

  function createFormWithPassword() {
    const form = document.createElement('form');
    
    const usernameField = document.createElement('input');
    usernameField.type = 'text';
    usernameField.name = 'username';
    usernameField.id = 'username';
    usernameField.value = '';
    form.appendChild(usernameField);
    
    const passwordField = document.createElement('input');
    passwordField.type = 'password';
    passwordField.name = 'password';
    passwordField.id = 'password';
    passwordField.value = '';
    form.appendChild(passwordField);
    
    document.getElementById.mockImplementation(id => {
      if (id === 'username') return usernameField;
      if (id === 'password') return passwordField;
      return null;
    });
    
    return form;
  }

  function createBasicForm() {
    const form = document.createElement('form');
    
    const field = document.createElement('input');
    field.type = 'text';
    field.name = 'firstName';
    field.id = 'firstName';
    field.value = '';
    form.appendChild(field);
    
    document.getElementById.mockImplementation(id => 
      id === 'firstName' ? field : null
    );
    
    return form;
  }

  function createLargeForm(fieldCount) {
    const form = document.createElement('form');
    
    for (let i = 0; i < fieldCount; i++) {
      const field = document.createElement('input');
      field.type = 'text';
      field.name = `field${i}`;
      field.id = `field${i}`;
      form.appendChild(field);
    }
    
    return form;
  }

  function createMalformedForm() {
    const form = document.createElement('form');
    
    // Valid field
    const validField = document.createElement('input');
    validField.type = 'text';
    validField.name = 'valid';
    form.appendChild(validField);
    
    // Field with missing attributes
    const incompleteField = document.createElement('input');
    // Intentionally missing type and name
    form.appendChild(incompleteField);
    
    return form;
  }
});