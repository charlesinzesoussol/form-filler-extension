class SecurityUtils {
  constructor() {
    this.protectedPatterns = EXTENSION_CONSTANTS.PROTECTED_PATTERNS;
    this.sanitizationRules = this.initializeSanitizationRules();
  }

  initializeSanitizationRules() {
    return {
      // Text input sanitization
      text: {
        maxLength: 1000,
        allowedChars: /^[a-zA-Z0-9\s\-_.,!?@#$%&*()+={}\[\]:;"'<>\/\\|`~^]*$/,
        blockedPatterns: [
          /<script[^>]*>.*?<\/script>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi,
          /data:text\/html/gi
        ]
      },
      
      // Email sanitization
      email: {
        maxLength: 254,
        pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      },
      
      // Phone number sanitization
      phone: {
        maxLength: 20,
        allowedChars: /^[0-9\s\-\+\(\).]*$/
      },
      
      // URL sanitization
      url: {
        maxLength: 2048,
        allowedProtocols: ['http:', 'https:', 'ftp:']
      },
      
      // Number sanitization
      number: {
        pattern: /^-?\d*\.?\d*$/
      }
    };
  }

  sanitizeInput(value, type = 'text') {
    if (value === null || value === undefined) {
      return '';
    }
    
    // Convert to string if not already
    let sanitized = String(value);
    
    // Apply type-specific sanitization
    switch (type.toLowerCase()) {
      case 'email':
        return this.sanitizeEmail(sanitized);
      case 'phone':
      case 'tel':
        return this.sanitizePhone(sanitized);
      case 'url':
        return this.sanitizeUrl(sanitized);
      case 'number':
        return this.sanitizeNumber(sanitized);
      default:
        return this.sanitizeText(sanitized);
    }
  }

  sanitizeText(text) {
    if (!text) return '';
    
    const rules = this.sanitizationRules.text;
    
    // Enforce length limit
    if (text.length > rules.maxLength) {
      text = text.substring(0, rules.maxLength);
    }
    
    // Remove blocked patterns
    rules.blockedPatterns.forEach(pattern => {
      text = text.replace(pattern, '');
    });
    
    // Remove potentially dangerous characters
    text = text.replace(/[<>]/g, '');
    
    // Encode HTML entities for safety
    text = this.escapeHtml(text);
    
    return text.trim();
  }

  sanitizeEmail(email) {
    if (!email) return '';
    
    const rules = this.sanitizationRules.email;
    
    // Basic length check
    if (email.length > rules.maxLength) {
      return '';
    }
    
    // Remove whitespace
    email = email.trim().toLowerCase();
    
    // Validate email pattern
    if (!rules.pattern.test(email)) {
      return '';
    }
    
    return email;
  }

  sanitizePhone(phone) {
    if (!phone) return '';
    
    const rules = this.sanitizationRules.phone;
    
    // Length check
    if (phone.length > rules.maxLength) {
      phone = phone.substring(0, rules.maxLength);
    }
    
    // Remove disallowed characters
    phone = phone.replace(/[^0-9\s\-\+\(\).]/g, '');
    
    return phone.trim();
  }

  sanitizeUrl(url) {
    if (!url) return '';
    
    const rules = this.sanitizationRules.url;
    
    // Length check
    if (url.length > rules.maxLength) {
      return '';
    }
    
    try {
      const urlObj = new URL(url);
      
      // Check allowed protocols
      if (!rules.allowedProtocols.includes(urlObj.protocol)) {
        return '';
      }
      
      return urlObj.toString();
    } catch (error) {
      // Invalid URL format
      return '';
    }
  }

  sanitizeNumber(number) {
    if (!number) return '';
    
    const rules = this.sanitizationRules.number;
    
    // Remove non-numeric characters except decimal point and minus sign
    const cleaned = String(number).replace(/[^0-9\-\.]/g, '');
    
    // Validate number pattern
    if (!rules.pattern.test(cleaned)) {
      return '';
    }
    
    return cleaned;
  }

  escapeHtml(text) {
    const entityMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };
    
    return String(text).replace(/[&<>"'`=\/]/g, (s) => entityMap[s]);
  }

  validateUserData(userData) {
    const errors = [];
    
    if (!userData || typeof userData !== 'object') {
      errors.push('Invalid user data format');
      return { isValid: false, errors };
    }
    
    // Validate personal data
    if (userData.personal) {
      if (userData.personal.email && !this.isValidEmail(userData.personal.email)) {
        errors.push('Invalid email format');
      }
      
      if (userData.personal.phone && !this.isValidPhone(userData.personal.phone)) {
        errors.push('Invalid phone format');
      }
    }
    
    // Validate professional data
    if (userData.professional) {
      if (userData.professional.website && !this.isValidUrl(userData.professional.website)) {
        errors.push('Invalid website URL');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  isValidEmail(email) {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email);
  }

  isValidPhone(phone) {
    // Remove formatting characters
    const cleaned = phone.replace(/[^0-9]/g, '');
    // Most phone numbers are between 7 and 15 digits
    return cleaned.length >= 7 && cleaned.length <= 15;
  }

  isValidUrl(url) {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  isProtectedField(element) {
    if (!element) return true;
    
    // Check element classes and IDs for protected patterns
    const elementClasses = Array.from(element.classList || []);
    const elementId = element.id || '';
    const elementName = element.name || '';
    
    // Check for CAPTCHA patterns
    const allPatterns = [
      ...this.protectedPatterns.CAPTCHA,
      ...this.protectedPatterns.HONEYPOT,
      ...this.protectedPatterns.SECURITY
    ];
    
    const searchText = [
      ...elementClasses,
      elementId,
      elementName
    ].join(' ').toLowerCase();
    
    // Check if any protected pattern matches
    return allPatterns.some(pattern => 
      searchText.includes(pattern.toLowerCase())
    );
  }

  isHoneypotField(element) {
    if (!element) return false;
    
    // Check for common honeypot indicators
    const honeypotIndicators = [
      // Hidden with CSS
      element.style.display === 'none',
      element.style.visibility === 'hidden',
      element.style.opacity === '0',
      element.offsetHeight === 0,
      element.offsetWidth === 0,
      
      // Hidden with attributes
      element.type === 'hidden',
      element.hasAttribute('aria-hidden') && element.getAttribute('aria-hidden') === 'true',
      
      // Positioned off-screen
      element.style.position === 'absolute' && (
        parseInt(element.style.left) < -1000 ||
        parseInt(element.style.top) < -1000
      )
    ];
    
    return honeypotIndicators.some(indicator => indicator === true);
  }

  checkContentSecurityPolicy() {
    // Verify that the extension's CSP is properly configured
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    
    if (meta) {
      const csp = meta.getAttribute('content');
      console.log('Page CSP:', csp);
      
      // Check for restrictions that might affect the extension
      if (csp.includes("'unsafe-inline'") || csp.includes("'unsafe-eval'")) {
        console.warn('Page has relaxed CSP that could be exploited');
      }
    }
    
    return true;
  }

  logSecurityEvent(eventType, details) {
    // Log security-related events for monitoring
    const event = {
      timestamp: new Date().toISOString(),
      type: eventType,
      details: details,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    // In a real implementation, this would send to a secure logging service
    console.log('Security Event:', event);
  }

  generateSecureId() {
    // Generate a secure random ID for tracking purposes
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  hashString(str) {
    // Simple hash function for generating consistent IDs
    let hash = 0;
    if (str.length === 0) return hash;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  rateLimit(key, maxCalls = 10, timeWindow = 60000) {
    // Simple rate limiting to prevent abuse
    if (!this.rateLimitCache) {
      this.rateLimitCache = new Map();
    }
    
    const now = Date.now();
    const windowStart = now - timeWindow;
    
    if (!this.rateLimitCache.has(key)) {
      this.rateLimitCache.set(key, []);
    }
    
    const calls = this.rateLimitCache.get(key);
    
    // Remove old calls outside the time window
    const recentCalls = calls.filter(timestamp => timestamp > windowStart);
    
    if (recentCalls.length >= maxCalls) {
      return false; // Rate limit exceeded
    }
    
    // Add current call
    recentCalls.push(now);
    this.rateLimitCache.set(key, recentCalls);
    
    return true; // Within rate limit
  }

  clearSensitiveData(obj) {
    // Remove sensitive data from objects before logging or storage
    const sensitiveKeys = [
      'password', 'passwd', 'pwd', 'secret', 'token', 'key',
      'authorization', 'auth', 'credential', 'ssn', 'social'
    ];
    
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    
    const cleaned = { ...obj };
    
    Object.keys(cleaned).forEach(key => {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        cleaned[key] = '[REDACTED]';
      } else if (typeof cleaned[key] === 'object') {
        cleaned[key] = this.clearSensitiveData(cleaned[key]);
      }
    });
    
    return cleaned;
  }
}