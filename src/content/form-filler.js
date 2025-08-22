class FormFiller {
  constructor(fieldMapper) {
    this.fieldMapper = fieldMapper;
    this.filledFields = [];
    this.errors = [];
    // Initialize fake data generator for Fake Filler functionality
    this.fakeDataGenerator = new FakeDataGenerator();
  }

  async fillField(fieldDescriptor, userData) {
    try {
      const field = fieldDescriptor.element;
      const type = fieldDescriptor.type;
      
      // Skip if field is not fillable
      if (!fieldDescriptor.fillable) {
        this.errors.push(`Cannot fill field: ${fieldDescriptor.reason}`);
        return false;
      }

      // Get appropriate value for this field
      const value = this.fieldMapper.mapValueToField(fieldDescriptor, userData);
      
      if (value === null || value === undefined) {
        // No appropriate value found
        return false;
      }

      // Fill based on field type
      const success = await this.fillByType(field, type, value);
      
      if (success) {
        this.addVisualFeedback(field, 'filled');
        this.filledFields.push(fieldDescriptor);
        
        // Trigger events to notify frameworks
        this.triggerFieldEvents(field, type);
      }
      
      return success;
    } catch (error) {
      this.errors.push(`Error filling field ${fieldDescriptor.name}: ${error.message}`);
      this.addVisualFeedback(fieldDescriptor.element, 'error');
      return false;
    }
  }

  async fillByType(field, type, value) {
    switch (type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'url':
      case 'search':
        return this.fillTextInput(field, value);
        
      case 'password':
        return this.fillPasswordInput(field, value);
        
      case 'number':
      case 'range':
        return this.fillNumberInput(field, value);
        
      case 'date':
      case 'datetime-local':
      case 'time':
      case 'month':
      case 'week':
        return this.fillDateTimeInput(field, type, value);
        
      case 'color':
        return this.fillColorInput(field, value);
        
      case 'textarea':
        return this.fillTextarea(field, value);
        
      case 'select-one':
        return this.fillSelectOne(field, value);
        
      case 'select-multiple':
        return this.fillSelectMultiple(field, value);
        
      case 'checkbox':
        return this.fillCheckbox(field, value);
        
      case 'radio':
        return this.fillRadio(field, value);
        
      default:
        console.warn(`Unsupported field type: ${type}`);
        return false;
    }
  }

  fillTextInput(field, value) {
    if (typeof value !== 'string') {
      value = String(value);
    }
    
    field.value = value;
    return true;
  }

  fillPasswordInput(field, value) {
    // Only fill password if explicitly allowed in user preferences
    // This should be checked by the field mapper
    if (typeof value !== 'string') {
      value = String(value);
    }
    
    field.value = value;
    return true;
  }

  fillNumberInput(field, value) {
    const numValue = Number(value);
    
    if (isNaN(numValue)) {
      return false;
    }
    
    // Check min/max constraints
    if (field.min !== '' && numValue < Number(field.min)) {
      return false;
    }
    
    if (field.max !== '' && numValue > Number(field.max)) {
      return false;
    }
    
    // Check step constraint
    if (field.step !== '' && field.step !== 'any') {
      const step = Number(field.step);
      const min = Number(field.min) || 0;
      if ((numValue - min) % step !== 0) {
        return false;
      }
    }
    
    field.value = numValue.toString();
    return true;
  }

  fillDateTimeInput(field, type, value) {
    let dateValue;
    
    if (value instanceof Date) {
      dateValue = value;
    } else if (typeof value === 'string') {
      dateValue = new Date(value);
    } else {
      return false;
    }
    
    if (isNaN(dateValue.getTime())) {
      return false;
    }
    
    // Format date according to input type
    let formattedValue;
    
    switch (type) {
      case 'date':
        formattedValue = dateValue.toISOString().split('T')[0];
        break;
      case 'datetime-local':
        formattedValue = dateValue.toISOString().slice(0, 16);
        break;
      case 'time':
        formattedValue = dateValue.toTimeString().slice(0, 5);
        break;
      case 'month':
        formattedValue = dateValue.toISOString().slice(0, 7);
        break;
      case 'week':
        // Week format: YYYY-W##
        const year = dateValue.getFullYear();
        const week = this.getWeekNumber(dateValue);
        formattedValue = `${year}-W${week.toString().padStart(2, '0')}`;
        break;
      default:
        return false;
    }
    
    field.value = formattedValue;
    return true;
  }

  fillColorInput(field, value) {
    // Ensure value is in hex format
    if (typeof value !== 'string' || !value.match(/^#[0-9A-Fa-f]{6}$/)) {
      return false;
    }
    
    field.value = value.toLowerCase();
    return true;
  }

  fillTextarea(field, value) {
    if (typeof value !== 'string') {
      value = String(value);
    }
    
    // Check maxlength constraint
    if (field.maxLength > 0 && value.length > field.maxLength) {
      value = value.substring(0, field.maxLength);
    }
    
    field.value = value;
    return true;
  }

  fillSelectOne(field, value) {
    // Try to find matching option by value first, then by text
    const option = this.findMatchingOption(field, value);
    
    if (option) {
      field.selectedIndex = option.index;
      return true;
    }
    
    return false;
  }

  fillSelectMultiple(field, values) {
    if (!Array.isArray(values)) {
      values = [values];
    }
    
    // Clear current selection
    Array.from(field.options).forEach(option => {
      option.selected = false;
    });
    
    let anySelected = false;
    
    values.forEach(value => {
      const option = this.findMatchingOption(field, value);
      if (option) {
        option.element.selected = true;
        anySelected = true;
      }
    });
    
    return anySelected;
  }

  fillCheckbox(field, value) {
    // Checkbox value can be boolean or checked based on field label/value
    let shouldCheck = false;
    
    if (typeof value === 'boolean') {
      shouldCheck = value;
    } else {
      // Try to determine if checkbox should be checked based on context
      shouldCheck = this.shouldCheckBox(field, value);
    }
    
    field.checked = shouldCheck;
    return true;
  }

  fillRadio(field, value) {
    // Radio buttons in the same group (same name) should be handled together
    const radioGroup = document.querySelectorAll(`input[type="radio"][name="${field.name}"]`);
    
    // Try to find matching radio button by value or label
    for (const radio of radioGroup) {
      if (radio.value === value || 
          this.getFieldLabel(radio).toLowerCase().includes(String(value).toLowerCase())) {
        radio.checked = true;
        return true;
      }
    }
    
    return false;
  }

  findMatchingOption(selectField, value) {
    const options = Array.from(selectField.options);
    
    // First try exact value match
    for (let i = 0; i < options.length; i++) {
      if (options[i].value === value) {
        return { element: options[i], index: i };
      }
    }
    
    // Then try exact text match
    for (let i = 0; i < options.length; i++) {
      if (options[i].text === value) {
        return { element: options[i], index: i };
      }
    }
    
    // Finally try partial text match (case insensitive)
    const valueStr = String(value).toLowerCase();
    for (let i = 0; i < options.length; i++) {
      if (options[i].text.toLowerCase().includes(valueStr)) {
        return { element: options[i], index: i };
      }
    }
    
    return null;
  }

  shouldCheckBox(field, value) {
    // Logic to determine if checkbox should be checked based on field context
    const label = this.getFieldLabel(field).toLowerCase();
    const fieldValue = field.value.toLowerCase();
    const checkValue = String(value).toLowerCase();
    
    // Check if value indicates positive intent
    const positiveValues = ['true', 'yes', 'on', '1', 'checked', 'selected'];
    if (positiveValues.includes(checkValue)) {
      return true;
    }
    
    // Check if value matches field value or label
    if (fieldValue === checkValue || label.includes(checkValue)) {
      return true;
    }
    
    return false;
  }

  getFieldLabel(element) {
    // This method is similar to FormDetector's getFieldLabel
    let label = '';
    
    if (element.id) {
      const labelElement = document.querySelector(`label[for="${element.id}"]`);
      if (labelElement) {
        label = labelElement.textContent.trim();
      }
    }
    
    if (!label) {
      const parentLabel = element.closest('label');
      if (parentLabel) {
        label = parentLabel.textContent.trim();
      }
    }
    
    if (!label) {
      label = element.getAttribute('aria-label') || '';
    }
    
    return label;
  }

  triggerFieldEvents(field, type) {
    // Trigger appropriate events to notify frameworks and validation
    const events = ['input', 'change'];
    
    events.forEach(eventType => {
      const event = new Event(eventType, {
        bubbles: true,
        cancelable: true
      });
      
      field.dispatchEvent(event);
    });
    
    // Trigger focus and blur to simulate user interaction
    field.dispatchEvent(new Event('focus', { bubbles: true }));
    
    // Use setTimeout to simulate realistic user interaction timing
    setTimeout(() => {
      field.dispatchEvent(new Event('blur', { bubbles: true }));
    }, 50);
  }

  addVisualFeedback(field, status) {
    // Remove existing feedback classes
    field.classList.remove('form-fill-success', 'form-fill-error', 'form-fill-processing');
    
    // Add appropriate feedback class
    switch (status) {
      case 'filled':
        field.classList.add('form-fill-success');
        // Remove success class after a delay
        setTimeout(() => {
          field.classList.remove('form-fill-success');
        }, 2000);
        break;
        
      case 'error':
        field.classList.add('form-fill-error');
        // Remove error class after a longer delay
        setTimeout(() => {
          field.classList.remove('form-fill-error');
        }, 3000);
        break;
        
      case 'processing':
        field.classList.add('form-fill-processing');
        break;
    }
  }

  async fillAllFields(fieldDescriptors, userData, options = {}) {
    const { 
      delay = 50, 
      skipErrors = true, 
      onProgress = null,
      onFieldFilled = null 
    } = options;
    
    this.filledFields = [];
    this.errors = [];
    
    const fillableFields = fieldDescriptors.filter(field => field.fillable);
    let completedCount = 0;
    
    for (const fieldDescriptor of fillableFields) {
      try {
        // Add processing visual feedback
        this.addVisualFeedback(fieldDescriptor.element, 'processing');
        
        const success = await this.fillField(fieldDescriptor, userData);
        
        if (success) {
          completedCount++;
          if (onFieldFilled) {
            onFieldFilled(fieldDescriptor, true);
          }
        } else if (!skipErrors) {
          break;
        }
        
        // Progress callback
        if (onProgress) {
          onProgress({
            total: fillableFields.length,
            completed: completedCount,
            current: fieldDescriptor,
            success: success
          });
        }
        
        // Small delay between fields to simulate natural interaction
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        this.errors.push(`Error processing field ${fieldDescriptor.name}: ${error.message}`);
        
        if (onFieldFilled) {
          onFieldFilled(fieldDescriptor, false);
        }
        
        if (!skipErrors) {
          break;
        }
      }
    }
    
    return {
      total: fillableFields.length,
      filled: completedCount,
      errors: this.errors.length,
      success: completedCount > 0
    };
  }

  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  getFilledFields() {
    return this.filledFields;
  }

  getErrors() {
    return this.errors;
  }

  clearFeedback() {
    // Remove all visual feedback classes from filled fields
    this.filledFields.forEach(fieldDescriptor => {
      const field = fieldDescriptor.element;
      field.classList.remove('form-fill-success', 'form-fill-error', 'form-fill-processing');
    });
  }

  reset() {
    this.clearFeedback();
    this.filledFields = [];
    this.errors = [];
  }

  // Fake Filler functionality - fill field with fake data
  async fillFieldWithFakeData(fieldDescriptor) {
    try {
      const field = fieldDescriptor.element;
      const type = fieldDescriptor.type;
      
      // Skip if field is not fillable
      if (!fieldDescriptor.fillable) {
        this.errors.push(`Cannot fill field: ${fieldDescriptor.reason}`);
        return false;
      }

      // Generate fake data based on field classification
      const fakeValue = this.generateFakeDataForField(fieldDescriptor);
      
      if (fakeValue === null || fakeValue === undefined) {
        return false;
      }

      // Fill based on field type
      const success = await this.fillByType(field, type, fakeValue);
      
      if (success) {
        this.addVisualFeedback(field, 'filled');
        this.filledFields.push(fieldDescriptor);
        
        // Trigger events to notify frameworks
        this.triggerFieldEvents(field, type);
      }
      
      return success;
    } catch (error) {
      this.errors.push(`Error filling field ${fieldDescriptor.name}: ${error.message}`);
      this.addVisualFeedback(fieldDescriptor.element, 'error');
      return false;
    }
  }

  generateFakeDataForField(fieldDescriptor) {
    const { category, fieldSubtype, type, name, placeholder } = fieldDescriptor;
    
    // Use the enhanced classification to generate appropriate fake data
    switch (category) {
      case 'personal':
        return this.generatePersonalData(fieldSubtype);
      case 'address':
        return this.generateAddressData(fieldSubtype);
      case 'work':
        return this.generateWorkData(fieldSubtype);
      case 'datetime':
        return this.generateDateTimeData(fieldSubtype);
      case 'number':
        return this.generateNumberData(fieldSubtype);
      case 'web':
        return this.generateWebData(fieldSubtype);
      case 'financial':
        return this.generateFinancialData(fieldSubtype);
      case 'text':
        return this.generateTextData(fieldSubtype, fieldDescriptor);
      default:
        // Fallback to field type detection
        return this.fakeDataGenerator.generateByFieldType(type, name, placeholder);
    }
  }

  generatePersonalData(subtype) {
    switch (subtype) {
      case 'firstName':
        return this.fakeDataGenerator.generateFirstName();
      case 'lastName':
        return this.fakeDataGenerator.generateLastName();
      case 'fullName':
        return this.fakeDataGenerator.generateFullName();
      case 'email':
        return this.fakeDataGenerator.generateEmail();
      case 'phone':
        return this.fakeDataGenerator.generatePhoneNumber();
      case 'username':
        return this.fakeDataGenerator.generateUsername();
      case 'password':
        return this.fakeDataGenerator.generatePassword();
      default:
        return this.fakeDataGenerator.generateFullName();
    }
  }

  generateAddressData(subtype) {
    switch (subtype) {
      case 'address1':
        return this.fakeDataGenerator.generateStreetAddress();
      case 'address2':
        return Math.random() > 0.5 ? `Apt ${this.fakeDataGenerator.randomInt(1, 999)}` : '';
      case 'city':
        return this.fakeDataGenerator.generateCity();
      case 'state':
        return this.fakeDataGenerator.generateState();
      case 'zipCode':
        return this.fakeDataGenerator.generateZipCode();
      case 'country':
        return this.fakeDataGenerator.generateCountry();
      default:
        return this.fakeDataGenerator.generateStreetAddress();
    }
  }

  generateWorkData(subtype) {
    switch (subtype) {
      case 'company':
        return this.fakeDataGenerator.generateCompanyName();
      case 'jobTitle':
        return this.fakeDataGenerator.generateJobTitle();
      default:
        return this.fakeDataGenerator.generateCompanyName();
    }
  }

  generateDateTimeData(subtype) {
    switch (subtype) {
      case 'birthDate':
        return this.fakeDataGenerator.generateBirthDate();
      case 'date':
        return this.fakeDataGenerator.generateDate();
      case 'time':
        return this.fakeDataGenerator.generateTime();
      default:
        return this.fakeDataGenerator.generateDate();
    }
  }

  generateNumberData(subtype) {
    switch (subtype) {
      case 'age':
        return this.fakeDataGenerator.generateAge();
      case 'price':
        return this.fakeDataGenerator.generatePrice();
      case 'quantity':
        return this.fakeDataGenerator.generateQuantity();
      default:
        return this.fakeDataGenerator.randomInt(1, 1000);
    }
  }

  generateWebData(subtype) {
    switch (subtype) {
      case 'url':
        return this.fakeDataGenerator.generateUrl();
      case 'color':
        return this.fakeDataGenerator.generateHexColor();
      default:
        return this.fakeDataGenerator.generateUrl();
    }
  }

  generateFinancialData(subtype) {
    switch (subtype) {
      case 'creditCard':
        return this.fakeDataGenerator.generateCreditCardNumber();
      case 'cvv':
        return this.fakeDataGenerator.generateCVV();
      case 'ssn':
        return this.fakeDataGenerator.generateSSN();
      default:
        return this.fakeDataGenerator.generateCreditCardNumber();
    }
  }

  generateTextData(subtype, fieldDescriptor) {
    const element = fieldDescriptor.element;
    
    if (subtype === 'paragraph' || element.tagName === 'TEXTAREA') {
      return this.fakeDataGenerator.generateLoremParagraph();
    }
    
    // For regular text inputs, generate shorter text
    return this.fakeDataGenerator.generateLoremWords(3);
  }

  // Fill all fields with fake data (Fake Filler main functionality)
  async fillAllFieldsWithFakeData(fieldDescriptors, options = {}) {
    const { 
      delay = 50, 
      skipErrors = true, 
      onProgress = null,
      onFieldFilled = null 
    } = options;
    
    this.filledFields = [];
    this.errors = [];
    
    const fillableFields = fieldDescriptors.filter(field => field.fillable);
    let completedCount = 0;
    
    for (const fieldDescriptor of fillableFields) {
      try {
        // Add processing visual feedback
        this.addVisualFeedback(fieldDescriptor.element, 'processing');
        
        const success = await this.fillFieldWithFakeData(fieldDescriptor);
        
        if (success) {
          completedCount++;
          if (onFieldFilled) {
            onFieldFilled(fieldDescriptor, true);
          }
        } else if (!skipErrors) {
          break;
        }
        
        // Progress callback
        if (onProgress) {
          onProgress({
            total: fillableFields.length,
            completed: completedCount,
            current: fieldDescriptor,
            success: success
          });
        }
        
        // Small delay between fields to simulate natural interaction
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        this.errors.push(`Error processing field ${fieldDescriptor.name}: ${error.message}`);
        
        if (onFieldFilled) {
          onFieldFilled(fieldDescriptor, false);
        }
        
        if (!skipErrors) {
          break;
        }
      }
    }
    
    return {
      total: fillableFields.length,
      filled: completedCount,
      errors: this.errors.length,
      success: completedCount > 0
    };
  }
}