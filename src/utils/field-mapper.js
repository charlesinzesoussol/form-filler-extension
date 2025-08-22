class FieldMapper {
  constructor() {
    this.patterns = EXTENSION_CONSTANTS.FIELD_PATTERNS;
    this.fieldCache = new Map();
  }

  mapValueToField(fieldDescriptor, userData) {
    const cacheKey = this.generateCacheKey(fieldDescriptor);
    
    // Check cache first
    if (this.fieldCache.has(cacheKey)) {
      const cachedMapping = this.fieldCache.get(cacheKey);
      return this.getValueFromPath(userData, cachedMapping);
    }

    // Determine the best mapping for this field
    const mapping = this.determineFieldMapping(fieldDescriptor);
    
    if (mapping) {
      // Cache the mapping for future use
      this.fieldCache.set(cacheKey, mapping);
      return this.getValueFromPath(userData, mapping);
    }

    return null;
  }

  determineFieldMapping(fieldDescriptor) {
    const { element, type, subtype, name, id, label, placeholder } = fieldDescriptor;
    
    // Check for password fields - only fill if explicitly enabled
    if (subtype === 'password') {
      return this.shouldFillPassword(fieldDescriptor) ? 'personal.password' : null;
    }

    // Build searchable text from field attributes
    const searchText = this.buildSearchText(name, id, label, placeholder);
    
    // Try to match against known patterns
    const mapping = this.matchFieldPattern(searchText, type);
    
    if (mapping) {
      return mapping;
    }

    // Try semantic analysis based on context
    return this.analyzeFieldContext(fieldDescriptor);
  }

  buildSearchText(name, id, label, placeholder) {
    return [name, id, label, placeholder]
      .filter(text => text && typeof text === 'string')
      .join(' ')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  matchFieldPattern(searchText, fieldType) {
    // Score each pattern against the search text
    const scores = new Map();
    
    Object.entries(this.patterns).forEach(([fieldName, patterns]) => {
      let maxScore = 0;
      
      patterns.forEach(pattern => {
        const score = this.calculatePatternScore(searchText, pattern);
        maxScore = Math.max(maxScore, score);
      });
      
      if (maxScore > 0) {
        scores.set(fieldName, maxScore);
      }
    });

    // Find the best match
    if (scores.size > 0) {
      const bestMatch = Array.from(scores.entries())
        .sort((a, b) => b[1] - a[1])[0];
      
      // Only return match if score is above threshold
      if (bestMatch[1] > 0.6) {
        return this.mapFieldNameToDataPath(bestMatch[0]);
      }
    }

    return null;
  }

  calculatePatternScore(searchText, pattern) {
    // Convert pattern to regex
    const regexPattern = pattern.replace(/\./g, '\\s*').replace(/\?/g, '\\s*');
    const regex = new RegExp(regexPattern, 'i');
    
    if (regex.test(searchText)) {
      // Calculate match quality based on how much of the search text matches
      const matches = searchText.match(regex);
      if (matches && matches[0]) {
        return matches[0].length / searchText.length;
      }
    }
    
    // Try partial word matching
    const patternWords = pattern.split(/[.\?]/);
    let matchedWords = 0;
    
    patternWords.forEach(word => {
      if (word && searchText.includes(word.toLowerCase())) {
        matchedWords++;
      }
    });
    
    return matchedWords / patternWords.length * 0.8; // Partial match penalty
  }

  mapFieldNameToDataPath(fieldName) {
    const mappings = {
      firstName: 'personal.firstName',
      lastName: 'personal.lastName',
      fullName: 'personal.fullName',
      email: 'personal.email',
      phone: 'personal.phone',
      address: 'address.street',
      city: 'address.city',
      state: 'address.state',
      zipCode: 'address.zipCode',
      country: 'address.country',
      company: 'professional.company',
      website: 'professional.website'
    };
    
    return mappings[fieldName] || null;
  }

  analyzeFieldContext(fieldDescriptor) {
    const { element, type, subtype } = fieldDescriptor;
    
    // Analyze the context around the field
    const context = this.getFieldContext(element);
    
    // Look for clues in surrounding elements
    const contextMapping = this.matchFieldPattern(context, type);
    if (contextMapping) {
      return contextMapping;
    }

    // Handle specific input types
    switch (subtype) {
      case 'email':
        return 'personal.email';
      case 'tel':
        return 'personal.phone';
      case 'url':
        return 'professional.website';
      case 'date':
        if (context.includes('birth')) {
          return 'personal.dateOfBirth';
        }
        break;
    }

    // Handle select fields with specific options
    if (type.startsWith('select')) {
      return this.analyzeSelectOptions(element);
    }

    return null;
  }

  getFieldContext(element) {
    const contextElements = [];
    
    // Get text from nearby elements
    const parent = element.parentElement;
    if (parent) {
      // Check siblings
      Array.from(parent.children).forEach(sibling => {
        if (sibling !== element && sibling.textContent) {
          contextElements.push(sibling.textContent.trim());
        }
      });
      
      // Check parent's text content
      const parentText = parent.textContent.replace(element.textContent || '', '').trim();
      if (parentText) {
        contextElements.push(parentText);
      }
    }
    
    // Look for fieldset legend
    const fieldset = element.closest('fieldset');
    if (fieldset) {
      const legend = fieldset.querySelector('legend');
      if (legend) {
        contextElements.push(legend.textContent.trim());
      }
    }
    
    // Look for nearby headers
    const headers = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    headers.forEach(tag => {
      const header = element.closest('form, section, div').querySelector(tag);
      if (header) {
        contextElements.push(header.textContent.trim());
      }
    });
    
    return contextElements
      .join(' ')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  analyzeSelectOptions(selectElement) {
    const options = Array.from(selectElement.options);
    const optionTexts = options.map(opt => opt.text.toLowerCase()).join(' ');
    
    // Check if options suggest country list
    const countryKeywords = ['united states', 'canada', 'mexico', 'france', 'germany'];
    if (countryKeywords.some(country => optionTexts.includes(country))) {
      return 'address.country';
    }
    
    // Check if options suggest state/province list
    const stateKeywords = ['california', 'texas', 'new york', 'ontario', 'quebec'];
    if (stateKeywords.some(state => optionTexts.includes(state))) {
      return 'address.state';
    }
    
    return null;
  }

  shouldFillPassword(fieldDescriptor) {
    // Check user preferences for password filling
    // This should be implemented based on user settings
    return false; // Default to not filling passwords for security
  }

  getValueFromPath(obj, path) {
    if (!path || !obj) {
      return null;
    }
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return null;
      }
    }
    
    return current;
  }

  generateCacheKey(fieldDescriptor) {
    const { name, id, label, type, subtype } = fieldDescriptor;
    return `${type}-${subtype}-${name}-${id}-${label}`.toLowerCase();
  }

  // Special handling for different field types
  mapSelectValue(fieldDescriptor, userData) {
    const value = this.mapValueToField(fieldDescriptor, userData);
    
    if (!value) {
      return null;
    }
    
    // For select fields, we might need to transform the value
    const selectElement = fieldDescriptor.element;
    const options = Array.from(selectElement.options);
    
    // Try to find matching option
    let matchingOption = options.find(opt => 
      opt.value.toLowerCase() === value.toLowerCase()
    );
    
    if (!matchingOption) {
      matchingOption = options.find(opt => 
        opt.text.toLowerCase() === value.toLowerCase()
      );
    }
    
    if (!matchingOption) {
      // Try partial matching for things like state abbreviations
      matchingOption = options.find(opt => 
        opt.text.toLowerCase().includes(value.toLowerCase()) ||
        opt.value.toLowerCase().includes(value.toLowerCase())
      );
    }
    
    return matchingOption ? matchingOption.value : null;
  }

  mapCheckboxValue(fieldDescriptor, userData) {
    const mapping = this.determineFieldMapping(fieldDescriptor);
    
    if (!mapping) {
      return false;
    }
    
    const value = this.getValueFromPath(userData, mapping);
    
    // Handle different checkbox scenarios
    if (typeof value === 'boolean') {
      return value;
    }
    
    // Check if this checkbox represents agreement/consent
    const label = fieldDescriptor.label.toLowerCase();
    if (label.includes('agree') || label.includes('accept') || label.includes('consent')) {
      // Default to false for legal/consent checkboxes
      return false;
    }
    
    return Boolean(value);
  }

  clearCache() {
    this.fieldCache.clear();
  }

  getCacheStats() {
    return {
      size: this.fieldCache.size,
      keys: Array.from(this.fieldCache.keys())
    };
  }
}