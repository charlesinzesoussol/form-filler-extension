// Unit tests for FormFiller class

describe('FormFiller', () => {
  let formFiller;
  let mockFieldMapper;
  let mockUserData;

  beforeEach(() => {
    // Mock FieldMapper
    mockFieldMapper = {
      mapValueToField: jest.fn()
    };
    
    formFiller = new FormFiller(mockFieldMapper);
    
    // Mock user data
    mockUserData = {
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
        zipCode: '12345',
        country: 'United States'
      }
    };
    
    // Mock DOM events
    global.Event = class Event {
      constructor(type, options = {}) {
        this.type = type;
        this.bubbles = options.bubbles || false;
        this.cancelable = options.cancelable || false;
      }
    };
  });

  describe('fillField', () => {
    test('should fill text input successfully', async () => {
      const mockElement = createMockInput('text', 'firstName');
      const fieldDescriptor = createFieldDescriptor(mockElement, 'text', true);
      
      mockFieldMapper.mapValueToField.mockReturnValue('John');
      
      const result = await formFiller.fillField(fieldDescriptor, mockUserData);
      
      expect(result).toBe(true);
      expect(mockElement.value).toBe('John');
      expect(mockElement.dispatchEvent).toHaveBeenCalledTimes(2); // input and change events
    });

    test('should not fill non-fillable fields', async () => {
      const mockElement = createMockInput('text', 'firstName');
      const fieldDescriptor = createFieldDescriptor(mockElement, 'text', false, 'Field is disabled');
      
      const result = await formFiller.fillField(fieldDescriptor, mockUserData);
      
      expect(result).toBe(false);
      expect(mockElement.value).toBe('');
      expect(formFiller.getErrors()).toHaveLength(1);
    });

    test('should handle null/undefined values gracefully', async () => {
      const mockElement = createMockInput('text', 'firstName');
      const fieldDescriptor = createFieldDescriptor(mockElement, 'text', true);
      
      mockFieldMapper.mapValueToField.mockReturnValue(null);
      
      const result = await formFiller.fillField(fieldDescriptor, mockUserData);
      
      expect(result).toBe(false);
      expect(mockElement.value).toBe('');
    });
  });

  describe('fillByType', () => {
    test('should fill email input with validation', async () => {
      const mockElement = createMockInput('email', 'email');
      
      const result = await formFiller.fillByType(mockElement, 'email', 'john.doe@example.com');
      
      expect(result).toBe(true);
      expect(mockElement.value).toBe('john.doe@example.com');
    });

    test('should fill number input with constraints', async () => {
      const mockElement = createMockInput('number', 'age');
      mockElement.min = '0';
      mockElement.max = '120';
      
      const result = await formFiller.fillByType(mockElement, 'number', '25');
      
      expect(result).toBe(true);
      expect(mockElement.value).toBe('25');
    });

    test('should reject number input outside constraints', async () => {
      const mockElement = createMockInput('number', 'age');
      mockElement.min = '0';
      mockElement.max = '120';
      
      const result = await formFiller.fillByType(mockElement, 'number', '150');
      
      expect(result).toBe(false);
      expect(mockElement.value).toBe('');
    });

    test('should fill textarea with maxlength constraint', async () => {
      const mockElement = createMockTextarea('message');
      mockElement.maxLength = 100;
      
      const longText = 'A'.repeat(150);
      const result = await formFiller.fillByType(mockElement, 'textarea', longText);
      
      expect(result).toBe(true);
      expect(mockElement.value).toHaveLength(100);
    });

    test('should fill select field by finding matching option', async () => {
      const mockElement = createMockSelect('country', [
        { value: 'us', text: 'United States' },
        { value: 'ca', text: 'Canada' },
        { value: 'mx', text: 'Mexico' }
      ]);
      
      const result = await formFiller.fillByType(mockElement, 'select-one', 'United States');
      
      expect(result).toBe(true);
      expect(mockElement.selectedIndex).toBe(0);
    });

    test('should fill checkbox based on value', async () => {
      const mockElement = createMockInput('checkbox', 'subscribe');
      
      const result = await formFiller.fillByType(mockElement, 'checkbox', true);
      
      expect(result).toBe(true);
      expect(mockElement.checked).toBe(true);
    });

    test('should fill radio button in group', async () => {
      const mockElement = createMockInput('radio', 'gender');
      mockElement.value = 'male';
      
      // Mock document.querySelectorAll for radio group
      global.document = {
        querySelectorAll: jest.fn(() => [
          createMockInput('radio', 'gender', 'male'),
          createMockInput('radio', 'gender', 'female')
        ])
      };
      
      const result = await formFiller.fillByType(mockElement, 'radio', 'male');
      
      expect(result).toBe(true);
    });
  });

  describe('fillDateTimeInput', () => {
    test('should fill date input with proper format', async () => {
      const mockElement = createMockInput('date', 'birthDate');
      const testDate = new Date('1990-01-15');
      
      const result = await formFiller.fillDateTimeInput(mockElement, 'date', testDate);
      
      expect(result).toBe(true);
      expect(mockElement.value).toBe('1990-01-15');
    });

    test('should fill datetime-local input', async () => {
      const mockElement = createMockInput('datetime-local', 'appointment');
      const testDate = new Date('2024-01-15T14:30:00');
      
      const result = await formFiller.fillDateTimeInput(mockElement, 'datetime-local', testDate);
      
      expect(result).toBe(true);
      expect(mockElement.value).toBe('2024-01-15T14:30');
    });

    test('should reject invalid date', async () => {
      const mockElement = createMockInput('date', 'birthDate');
      
      const result = await formFiller.fillDateTimeInput(mockElement, 'date', 'invalid-date');
      
      expect(result).toBe(false);
    });
  });

  describe('fillAllFields', () => {
    test('should fill multiple fields with progress tracking', async () => {
      const fieldDescriptors = [
        createFieldDescriptor(createMockInput('text', 'firstName'), 'text', true),
        createFieldDescriptor(createMockInput('email', 'email'), 'email', true),
        createFieldDescriptor(createMockInput('text', 'lastName'), 'text', true)
      ];
      
      mockFieldMapper.mapValueToField
        .mockReturnValueOnce('John')
        .mockReturnValueOnce('john.doe@example.com')
        .mockReturnValueOnce('Doe');
      
      const progressUpdates = [];
      const onProgress = jest.fn((progress) => progressUpdates.push(progress));
      
      const results = await formFiller.fillAllFields(fieldDescriptors, mockUserData, {
        delay: 0,
        onProgress
      });
      
      expect(results.total).toBe(3);
      expect(results.filled).toBe(3);
      expect(results.success).toBe(true);
      expect(progressUpdates).toHaveLength(3);
      expect(onProgress).toHaveBeenCalledTimes(3);
    });

    test('should handle errors gracefully with skipErrors option', async () => {
      const fieldDescriptors = [
        createFieldDescriptor(createMockInput('text', 'firstName'), 'text', true),
        createFieldDescriptor(createMockInput('text', 'invalid'), 'text', false, 'Protected field'),
        createFieldDescriptor(createMockInput('text', 'lastName'), 'text', true)
      ];
      
      mockFieldMapper.mapValueToField
        .mockReturnValueOnce('John')
        .mockReturnValueOnce('Doe');
      
      const results = await formFiller.fillAllFields(fieldDescriptors, mockUserData, {
        delay: 0,
        skipErrors: true
      });
      
      expect(results.total).toBe(2); // Only fillable fields counted
      expect(results.filled).toBe(2);
      expect(results.success).toBe(true);
    });

    test('should stop on first error when skipErrors is false', async () => {
      const fieldDescriptors = [
        createFieldDescriptor(createMockInput('text', 'firstName'), 'text', true),
        createFieldDescriptor(createMockInput('text', 'invalid'), 'text', false, 'Protected field'),
        createFieldDescriptor(createMockInput('text', 'lastName'), 'text', true)
      ];
      
      mockFieldMapper.mapValueToField.mockReturnValue('John');
      
      const results = await formFiller.fillAllFields(fieldDescriptors, mockUserData, {
        delay: 0,
        skipErrors: false
      });
      
      expect(results.filled).toBe(1); // Should stop after first fillable field
    });
  });

  describe('addVisualFeedback', () => {
    test('should add success class to filled field', () => {
      const mockElement = createMockInput('text', 'firstName');
      
      formFiller.addVisualFeedback(mockElement, 'filled');
      
      expect(mockElement.classList.add).toHaveBeenCalledWith('form-fill-success');
    });

    test('should add error class to failed field', () => {
      const mockElement = createMockInput('text', 'firstName');
      
      formFiller.addVisualFeedback(mockElement, 'error');
      
      expect(mockElement.classList.add).toHaveBeenCalledWith('form-fill-error');
    });

    test('should remove feedback classes before adding new ones', () => {
      const mockElement = createMockInput('text', 'firstName');
      
      formFiller.addVisualFeedback(mockElement, 'filled');
      
      expect(mockElement.classList.remove).toHaveBeenCalledWith(
        'form-fill-success', 'form-fill-error', 'form-fill-processing'
      );
    });
  });

  describe('triggerFieldEvents', () => {
    test('should trigger input and change events', () => {
      const mockElement = createMockInput('text', 'firstName');
      
      formFiller.triggerFieldEvents(mockElement, 'text');
      
      expect(mockElement.dispatchEvent).toHaveBeenCalledTimes(4); // input, change, focus, blur
    });
  });

  // Helper functions
  function createMockInput(type, name, value = '') {
    return {
      type: type,
      name: name,
      value: value,
      disabled: false,
      readOnly: false,
      min: '',
      max: '',
      step: '',
      checked: false,
      classList: {
        add: jest.fn(),
        remove: jest.fn()
      },
      dispatchEvent: jest.fn()
    };
  }

  function createMockTextarea(name) {
    return {
      tagName: 'TEXTAREA',
      name: name,
      value: '',
      maxLength: -1,
      classList: {
        add: jest.fn(),
        remove: jest.fn()
      },
      dispatchEvent: jest.fn()
    };
  }

  function createMockSelect(name, options = []) {
    const mockOptions = options.map((opt, index) => ({
      value: opt.value,
      text: opt.text,
      selected: false
    }));
    
    return {
      tagName: 'SELECT',
      name: name,
      options: mockOptions,
      selectedIndex: -1,
      multiple: false,
      classList: {
        add: jest.fn(),
        remove: jest.fn()
      },
      dispatchEvent: jest.fn()
    };
  }

  function createFieldDescriptor(element, type, fillable, reason = '') {
    return {
      element: element,
      type: type,
      subtype: element.type || type,
      name: element.name,
      id: element.id || '',
      label: '',
      placeholder: element.placeholder || '',
      required: element.required || false,
      value: element.value || '',
      fillable: fillable,
      reason: reason
    };
  }
});