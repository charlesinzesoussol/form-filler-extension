class FormDetector {
  constructor() {
    this.detectedFields = [];
    this.observer = null;
    this.isObserving = false;
  }

  detectFormFields(rootElement = document) {
    // Comprehensive CSS selectors for all form field types
    const selectors = [
      'input[type="text"]', 'input[type="email"]', 'input[type="password"]',
      'input[type="number"]', 'input[type="tel"]', 'input[type="url"]',
      'input[type="search"]', 'input[type="date"]', 'input[type="time"]',
      'input[type="datetime-local"]', 'input[type="month"]', 'input[type="week"]',
      'input[type="color"]', 'input[type="range"]',
      'input:not([type])', // Default input type is text
      'textarea', 'select', 'input[type="checkbox"]', 'input[type="radio"]'
    ];
    
    // Detect regular DOM fields
    const fields = Array.from(rootElement.querySelectorAll(selectors.join(',')));
    
    // Detect Shadow DOM fields
    const shadowFields = this.detectShadowDOMFields(rootElement);
    
    // Combine all fields and filter fillable ones
    const allFields = [...fields, ...shadowFields];
    
    this.detectedFields = allFields
      .map(field => this.createFieldDescriptor(field))
      .filter(descriptor => descriptor.fillable);
    
    return this.detectedFields;
  }

  detectShadowDOMFields(rootElement) {
    const shadowFields = [];
    
    // Find all elements with shadow roots
    const allElements = rootElement.querySelectorAll('*');
    
    allElements.forEach(element => {
      if (element.shadowRoot) {
        // Recursively detect fields in shadow DOM
        const shadowRootFields = this.detectFormFields(element.shadowRoot);
        shadowFields.push(...shadowRootFields.map(descriptor => descriptor.element));
      }
    });
    
    return shadowFields;
  }

  createFieldDescriptor(element) {
    const classification = this.classifyField(element);
    
    const descriptor = {
      element: element,
      type: this.getFieldType(element),
      subtype: element.type || 'text',
      name: element.name || '',
      id: element.id || '',
      label: this.getFieldLabel(element),
      placeholder: element.placeholder || '',
      required: element.required || false,
      value: this.getFieldValue(element),
      fillable: this.isFieldFillable(element),
      reason: '',
      // Enhanced classification from Fake Filler functionality
      category: classification.category,
      fieldSubtype: classification.subtype,
      confidence: classification.confidence,
      detectedFrom: classification.detectedFrom
    };

    // Set reason if not fillable
    if (!descriptor.fillable) {
      descriptor.reason = this.getUnfillableReason(element);
    }

    return descriptor;
  }

  getFieldType(element) {
    const tagName = element.tagName.toLowerCase();
    
    if (tagName === 'input') {
      return element.type || 'text';
    } else if (tagName === 'textarea') {
      return 'textarea';
    } else if (tagName === 'select') {
      return element.multiple ? 'select-multiple' : 'select-one';
    }
    
    return 'unknown';
  }

  getFieldLabel(element) {
    // Try to find associated label
    let label = '';
    
    // Check for label with 'for' attribute
    if (element.id) {
      const labelElement = document.querySelector(`label[for="${element.id}"]`);
      if (labelElement) {
        label = labelElement.textContent.trim();
      }
    }
    
    // Check for parent label
    if (!label) {
      const parentLabel = element.closest('label');
      if (parentLabel) {
        label = parentLabel.textContent.trim();
      }
    }
    
    // Check for aria-label
    if (!label) {
      label = element.getAttribute('aria-label') || '';
    }
    
    // Check for aria-labelledby
    if (!label) {
      const labelledBy = element.getAttribute('aria-labelledby');
      if (labelledBy) {
        const labelElement = document.getElementById(labelledBy);
        if (labelElement) {
          label = labelElement.textContent.trim();
        }
      }
    }
    
    return label;
  }

  getFieldValue(element) {
    const type = this.getFieldType(element);
    
    switch (type) {
      case 'checkbox':
      case 'radio':
        return element.checked;
      case 'select-one':
        return element.selectedIndex >= 0 ? element.options[element.selectedIndex].value : '';
      case 'select-multiple':
        return Array.from(element.selectedOptions).map(option => option.value);
      default:
        return element.value || '';
    }
  }

  isFieldFillable(element) {
    // Check basic properties that prevent filling
    if (element.disabled || element.readOnly) {
      return false;
    }
    
    // Check visibility
    if (element.offsetParent === null && 
        element.style.display !== 'none' && 
        element.style.visibility !== 'hidden') {
      // Element might be hidden with CSS
      const styles = window.getComputedStyle(element);
      if (styles.display === 'none' || styles.visibility === 'hidden') {
        return false;
      }
    }
    
    // Check for protected fields
    if (this.isProtectedField(element)) {
      return false;
    }
    
    // File inputs cannot be programmatically filled for security
    if (element.type === 'file') {
      return false;
    }
    
    return true;
  }

  isProtectedField(element) {
    // Check for CAPTCHA elements
    const captchaClasses = ['captcha', 'recaptcha', 'g-recaptcha', 'hcaptcha'];
    const classList = Array.from(element.classList);
    
    if (captchaClasses.some(cls => classList.includes(cls))) {
      return true;
    }
    
    // Check parent elements for CAPTCHA containers
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      const parentClasses = Array.from(parent.classList);
      if (captchaClasses.some(cls => parentClasses.includes(cls))) {
        return true;
      }
      parent = parent.parentElement;
    }
    
    // Check for honeypot fields (hidden fields meant to catch bots)
    if (element.style.display === 'none' || 
        element.style.visibility === 'hidden' ||
        element.style.opacity === '0' ||
        element.offsetHeight === 0 ||
        element.offsetWidth === 0) {
      return true;
    }
    
    // Check for common honeypot field names
    const honeypotNames = ['honeypot', 'bot-field', 'spam-check', 'website', 'url'];
    const fieldName = (element.name || '').toLowerCase();
    const fieldId = (element.id || '').toLowerCase();
    
    if (honeypotNames.some(name => fieldName.includes(name) || fieldId.includes(name))) {
      return true;
    }
    
    return false;
  }

  getUnfillableReason(element) {
    if (element.disabled) return 'Field is disabled';
    if (element.readOnly) return 'Field is read-only';
    if (element.type === 'file') return 'File inputs cannot be filled for security';
    if (this.isProtectedField(element)) return 'Protected field (CAPTCHA/honeypot)';
    if (element.offsetParent === null) return 'Field is hidden';
    
    return 'Unknown reason';
  }

  setupDynamicDetection() {
    if (this.isObserving) {
      return;
    }
    
    this.observer = new MutationObserver((mutations) => {
      let shouldRedetect = false;
      
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          // Check if any added nodes contain form fields
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const formFields = node.querySelectorAll('input, textarea, select');
              if (formFields.length > 0) {
                shouldRedetect = true;
              }
            }
          });
        } else if (mutation.type === 'attributes') {
          // Check if attributes that affect fillability changed
          const target = mutation.target;
          if (target.matches && target.matches('input, textarea, select')) {
            if (mutation.attributeName === 'disabled' || 
                mutation.attributeName === 'readonly' ||
                mutation.attributeName === 'type') {
              shouldRedetect = true;
            }
          }
        }
      });
      
      if (shouldRedetect) {
        // Debounce redetection to avoid excessive calls
        clearTimeout(this.redetectTimeout);
        this.redetectTimeout = setTimeout(() => {
          this.redetectForms();
        }, 100);
      }
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'readonly', 'type', 'style', 'class']
    });
    
    this.isObserving = true;
  }

  redetectForms() {
    // Re-detect all forms and notify content script
    const newFields = this.detectFormFields();
    
    // Dispatch custom event to notify about form changes
    window.dispatchEvent(new CustomEvent('formFieldsUpdated', {
      detail: { fields: newFields }
    }));
  }

  stopDynamicDetection() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      this.isObserving = false;
    }
    
    if (this.redetectTimeout) {
      clearTimeout(this.redetectTimeout);
    }
  }

  getDetectedFields() {
    return this.detectedFields;
  }

  getFieldById(id) {
    return this.detectedFields.find(field => field.id === id);
  }

  getFieldByName(name) {
    return this.detectedFields.find(field => field.name === name);
  }

  getFieldsByType(type) {
    return this.detectedFields.filter(field => field.type === type);
  }

  getFillableFieldsCount() {
    return this.detectedFields.filter(field => field.fillable).length;
  }

  getProtectedFieldsCount() {
    return this.detectedFields.filter(field => !field.fillable).length;
  }

  classifyField(element) {
    const type = element.type ? element.type.toLowerCase() : 'text';
    const name = element.name || '';
    const id = element.id || '';
    const placeholder = element.placeholder || '';
    const className = element.className || '';
    const label = this.getFieldLabel(element);
    
    // Combine all text attributes for analysis
    const allText = `${name} ${id} ${placeholder} ${className} ${label}`.toLowerCase();
    
    // Determine field category and type with enhanced detection
    let category = 'general';
    let subtype = type;
    let confidence = 0.5;
    
    // Personal information detection
    if (allText.match(/\b(firstname|fname|first.name|given.name|prénom|prenom)\b/)) {
      category = 'personal';
      subtype = 'firstName';
      confidence = 0.9;
    } else if (allText.match(/\b(lastname|lname|last.name|surname|family.name|nom|nom.famille)\b/)) {
      category = 'personal';
      subtype = 'lastName';
      confidence = 0.9;
    } else if (allText.match(/\b(fullname|full.name|name|nom.complet)\b/) && !allText.match(/\b(user|company|file|project)\b/)) {
      category = 'personal';
      subtype = 'fullName';
      confidence = 0.8;
    } else if (type === 'email' || allText.match(/\b(email|e.mail|mail|courriel)\b/)) {
      category = 'personal';
      subtype = 'email';
      confidence = 0.95;
    } else if (allText.match(/\b(phone|tel|telephone|mobile|cell|fax|téléphone)\b/)) {
      category = 'personal';
      subtype = 'phone';
      confidence = 0.9;
    } else if (allText.match(/\b(username|user.name|login|account|utilisateur)\b/)) {
      category = 'personal';
      subtype = 'username';
      confidence = 0.85;
    } else if (type === 'password' || allText.match(/\b(password|pass|pwd|mot.de.passe)\b/)) {
      category = 'personal';
      subtype = 'password';
      confidence = 0.95;
    }
    
    // Address information detection
    else if (allText.match(/\b(address|street|addr|address1|address2|adresse|rue)\b/)) {
      category = 'address';
      if (allText.match(/\b(address2|apt|apartment|suite|unit|appartement)\b/)) {
        subtype = 'address2';
      } else {
        subtype = 'address1';
      }
      confidence = 0.9;
    } else if (allText.match(/\b(city|town|locality|ville|localité)\b/)) {
      category = 'address';
      subtype = 'city';
      confidence = 0.9;
    } else if (allText.match(/\b(state|province|region|county|état|région)\b/)) {
      category = 'address';
      subtype = 'state';
      confidence = 0.9;
    } else if (allText.match(/\b(zip|postal|postcode|zipcode|postalcode|code.postal)\b/)) {
      category = 'address';
      subtype = 'zipCode';
      confidence = 0.9;
    } else if (allText.match(/\b(country|nation|pays)\b/)) {
      category = 'address';
      subtype = 'country';
      confidence = 0.9;
    }
    
    // Work/Business information detection
    else if (allText.match(/\b(company|organization|employer|business|corp|entreprise|société)\b/)) {
      category = 'work';
      subtype = 'company';
      confidence = 0.85;
    } else if (allText.match(/\b(job|title|position|occupation|role|poste|titre)\b/)) {
      category = 'work';
      subtype = 'jobTitle';
      confidence = 0.85;
    }
    
    // Date and time detection
    else if (type === 'date' || allText.match(/\b(date|birth|dob|birthday|naissance)\b/)) {
      category = 'datetime';
      if (allText.match(/\b(birth|dob|birthday|naissance)\b/)) {
        subtype = 'birthDate';
      } else {
        subtype = 'date';
      }
      confidence = 0.9;
    } else if (type === 'time' || allText.match(/\b(time|hour|minute|heure|temps)\b/)) {
      category = 'datetime';
      subtype = 'time';
      confidence = 0.9;
    }
    
    // Number detection
    else if (type === 'number' || allText.match(/\b(age|number|num|quantity|amount|nombre|quantité|âge)\b/)) {
      category = 'number';
      if (allText.match(/\b(age|âge)\b/)) {
        subtype = 'age';
      } else if (allText.match(/\b(price|cost|salary|income|prix|salaire|coût)\b/)) {
        subtype = 'price';
      } else if (allText.match(/\b(quantity|qty|amount|quantité)\b/)) {
        subtype = 'quantity';
      } else {
        subtype = 'number';
      }
      confidence = 0.8;
    }
    
    // Web-related detection
    else if (type === 'url' || allText.match(/\b(url|website|site|link|homepage|lien)\b/)) {
      category = 'web';
      subtype = 'url';
      confidence = 0.9;
    } else if (type === 'color' || allText.match(/\b(color|colour|couleur)\b/)) {
      category = 'web';
      subtype = 'color';
      confidence = 0.9;
    }
    
    // Financial detection
    else if (allText.match(/\b(credit.card|creditcard|card.number|carte.crédit)\b/)) {
      category = 'financial';
      subtype = 'creditCard';
      confidence = 0.9;
    } else if (allText.match(/\b(cvv|cvc|security.code|code.sécurité)\b/)) {
      category = 'financial';
      subtype = 'cvv';
      confidence = 0.9;
    } else if (allText.match(/\b(ssn|social.security|tax.id|nas)\b/)) {
      category = 'financial';
      subtype = 'ssn';
      confidence = 0.9;
    }
    
    // Text content detection
    else if (element.tagName === 'TEXTAREA' || allText.match(/\b(message|comment|description|notes|details|bio|about|commentaire|remarques)\b/)) {
      category = 'text';
      subtype = 'paragraph';
      confidence = 0.8;
    }
    
    // Generic text fallback
    else if (type === 'text' || !type) {
      category = 'text';
      subtype = 'text';
      confidence = 0.6;
    }
    
    return {
      category,
      subtype,
      originalType: type,
      confidence,
      detectedFrom: this.getDetectionSource(allText, type)
    };
  }

  getDetectionSource(allText, type) {
    const sources = [];
    
    if (type && type !== 'text') sources.push('input-type');
    if (allText.includes('name')) sources.push('name-attribute');
    if (allText.includes('id')) sources.push('id-attribute');
    if (allText.includes('placeholder')) sources.push('placeholder');
    if (allText.includes('class')) sources.push('class-name');
    
    return sources.length > 0 ? sources.join(', ') : 'heuristic';
  }
}