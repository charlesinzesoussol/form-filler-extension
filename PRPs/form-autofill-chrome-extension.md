name: "Form Auto-Fill Chrome Extension - Complete Implementation PRP"
description: |

## Purpose
Build a Chrome extension that automatically fills all form fields on any webpage with a single button click, handling various form types and edge cases gracefully while maintaining security and performance.

## Core Principles
1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance
5. **Global rules**: Be sure to follow all rules in CLAUDE.md

---

## Goal
Create a production-ready Chrome extension that can detect and automatically fill all form fields on any webpage with a single button click. The extension must handle input, textarea, select, checkbox, radio button fields, provide visual feedback, manage data securely, and handle edge cases gracefully.

## Why
- **User Productivity**: Eliminate repetitive form filling tasks across websites
- **Universal Compatibility**: Work on 95%+ of standard web forms without breaking webpage functionality
- **Security-First**: Maintain user privacy and data security while providing convenience
- **Modern Architecture**: Use Chrome Extension Manifest V3 for future-proof implementation

## What
A Chrome extension with popup interface, content script injection, service worker background processing, and local data storage that can:
- Detect all form field types automatically
- Fill forms intelligently with stored user data
- Provide clear visual feedback during operations
- Handle protected fields and validation gracefully
- Maintain security and privacy standards

### Success Criteria
- [ ] Fills 95%+ of standard web forms successfully
- [ ] Handles edge cases without breaking webpage functionality
- [ ] Provides clear feedback for all user interactions
- [ ] Maintains security and privacy standards
- [ ] Performs efficiently across all supported browsers
- [ ] Passes all Chrome Web Store security requirements

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers
  why: Service worker migration patterns and best practices for Manifest V3
  
- url: https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy
  why: CSP requirements for Manifest V3 security compliance
  
- url: https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts
  why: Content script injection and DOM manipulation patterns
  
- url: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/basics
  section: Extension service worker lifecycle and communication
  critical: Service workers go offline when idle - no global state persistence
  
- url: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input
  why: Comprehensive form field types and attributes for detection
  
- url: https://developer.chrome.com/docs/extensions/develop/migrate/improve-security
  section: Security best practices for form data handling
  critical: No remote code execution, strict CSP, input sanitization required
```

### Current Codebase tree
```bash
/Users/charles/Documents/projets_sulside/fill-a-forms/
├── .claude/
│   ├── agents/
│   ├── commands/
│   ├── hooks/
│   └── settings.local.json
├── examples/
├── PRPs/
│   └── templates/
│       └── prp_base.md
├── CLAUDE.md
├── INITIAL.md
├── LICENSE
└── README.md
```

### Desired Codebase tree with files to be added and responsibility of file
```bash
/Users/charles/Documents/projets_sulside/fill-a-forms/
├── manifest.json                    # Chrome extension configuration
├── src/
│   ├── popup/
│   │   ├── popup.html              # Extension popup interface
│   │   ├── popup.css               # Popup styling
│   │   └── popup.js                # Popup logic and UI interactions
│   ├── content/
│   │   ├── content.js              # Form detection and filling logic
│   │   ├── form-detector.js        # Robust form field detection
│   │   ├── form-filler.js          # Intelligent form filling algorithms
│   │   └── content.css             # Visual feedback styling
│   ├── background/
│   │   └── service-worker.js       # Background processing and storage
│   ├── storage/
│   │   ├── storage-manager.js      # Local storage abstraction
│   │   └── data-templates.js       # Form data template management
│   └── utils/
│       ├── field-mapper.js         # Smart field type recognition
│       ├── security.js             # Input sanitization and validation
│       └── constants.js            # Extension constants and configurations
├── tests/
│   ├── unit/
│   │   ├── form-detector.test.js   # Form detection unit tests
│   │   ├── form-filler.test.js     # Form filling unit tests
│   │   └── storage-manager.test.js # Storage management tests
│   ├── integration/
│   │   └── extension.test.js       # End-to-end extension tests
│   └── fixtures/
│       └── test-forms.html         # Test form samples
├── assets/
│   ├── icons/
│   │   ├── icon16.png              # Extension icon 16x16
│   │   ├── icon48.png              # Extension icon 48x48
│   │   └── icon128.png             # Extension icon 128x128
│   └── images/
└── docs/
    ├── privacy-policy.md           # Privacy policy documentation
    └── user-guide.md               # User manual and troubleshooting
```

### Known Gotchas of our codebase & Library Quirks
```javascript
// CRITICAL: Manifest V3 requires "service_worker" not "background.scripts"
// Example: Service workers cannot maintain global state - use chrome.storage
// Example: Content scripts must be declared in manifest, no dynamic injection
// Example: CSP in V3 forbids eval(), new Function(), remote code execution
// Example: Use chrome.tabs.sendMessage for service worker -> content script communication
// Example: MutationObserver required for SPA and dynamic form detection
// Example: File input fields cannot be programmatically filled for security
// Example: Password fields may be protected by browser security policies
// Example: Shadow DOM requires different selectors and detection strategies
```

## Implementation Blueprint

### Data models and structure

Create the core data models to ensure type safety and consistency.
```javascript
// Form field detection model
const FormField = {
  element: HTMLElement,        // DOM element reference
  type: string,               // input, textarea, select, checkbox, radio
  subtype: string,            // text, email, password, number, etc.
  name: string,               // field name attribute
  id: string,                 // field id attribute
  label: string,              // associated label text
  placeholder: string,        // placeholder text
  required: boolean,          // required field indicator
  value: any,                 // current field value
  fillable: boolean,          // can be programmatically filled
  reason: string              // why field cannot be filled (if applicable)
};

// User data template model
const UserDataTemplate = {
  personal: {
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    // ... other personal fields
  },
  address: {
    street: string,
    city: string,
    state: string,
    zipCode: string,
    country: string
  },
  preferences: {
    fillPasswords: boolean,
    skipProtectedFields: boolean,
    showVisualFeedback: boolean
  }
};

// Extension state model
const ExtensionState = {
  isActive: boolean,
  currentTab: number,
  lastFillStatus: string,
  formFieldsCount: number,
  filledFieldsCount: number,
  errors: Array<string>
};
```

### List of tasks to be completed to fulfill the PRP in the order they should be completed

```yaml
Task 1: Project Setup and Manifest Configuration
CREATE manifest.json:
  - USE Manifest V3 structure with service_worker
  - SET content_security_policy with strict CSP
  - DECLARE content_scripts for form detection
  - CONFIGURE permissions (activeTab, storage)
  - ADD host_permissions for universal access

Task 2: Core Form Detection Engine
CREATE src/content/form-detector.js:
  - IMPLEMENT universal form field detection using CSS selectors
  - HANDLE input[type="text|email|password|number|tel|url"]
  - DETECT textarea, select, checkbox, radio elements
  - SUPPORT shadow DOM and iframe detection
  - USE MutationObserver for dynamic content

Task 3: Intelligent Form Filling Logic
CREATE src/content/form-filler.js:
  - IMPLEMENT field type recognition and mapping
  - HANDLE different input types with appropriate values
  - RESPECT readonly, disabled, and protected fields
  - PROVIDE visual feedback during filling process
  - IMPLEMENT error handling for validation failures

Task 4: Service Worker Background Processing
CREATE src/background/service-worker.js:
  - SETUP chrome.runtime.onMessage listeners
  - IMPLEMENT tab communication management
  - HANDLE extension state persistence
  - MANAGE user data storage operations
  - PROVIDE error logging and analytics

Task 5: Storage Management System
CREATE src/storage/storage-manager.js:
  - IMPLEMENT chrome.storage.local abstraction
  - CREATE user data template management
  - HANDLE data encryption for sensitive fields
  - PROVIDE data import/export functionality
  - IMPLEMENT data migration and versioning

Task 6: User Interface and Popup
CREATE src/popup/popup.html, popup.css, popup.js:
  - DESIGN minimal, accessible popup interface
  - IMPLEMENT fill button with loading states
  - SHOW form detection status and progress
  - PROVIDE settings and data management access
  - HANDLE error display and user feedback

Task 7: Content Script Integration
CREATE src/content/content.js:
  - SETUP message listeners from service worker
  - COORDINATE form detection and filling operations
  - IMPLEMENT visual feedback overlays
  - HANDLE page navigation and cleanup
  - PROVIDE real-time status updates

Task 8: Security and Privacy Implementation
CREATE src/utils/security.js:
  - IMPLEMENT input sanitization for all user data
  - ADD XSS protection for injected content
  - CREATE secure field detection (avoid password logging)
  - IMPLEMENT data validation and type checking
  - ADD privacy-preserving error reporting

Task 9: Testing Framework Setup
CREATE tests/ structure:
  - SETUP Jest or similar testing framework
  - IMPLEMENT unit tests for core functions
  - CREATE integration tests for extension lifecycle
  - ADD performance tests for large forms
  - INCLUDE security tests for data handling

Task 10: Extension Optimization and Polish
OPTIMIZE performance and user experience:
  - IMPLEMENT lazy loading for heavy operations
  - ADD requestIdleCallback for non-critical tasks
  - OPTIMIZE memory usage and cleanup
  - ENHANCE error messages and user guidance
  - PREPARE Chrome Web Store assets and documentation
```

### Per task pseudocode as needed added to each task

```javascript
// Task 2: Form Detection Engine Pseudocode
class FormDetector {
  detectFormFields(document) {
    // PATTERN: Use comprehensive CSS selectors for all field types
    const selectors = [
      'input[type="text"]', 'input[type="email"]', 'input[type="password"]',
      'input[type="number"]', 'input[type="tel"]', 'input[type="url"]',
      'input[type="search"]', 'input[type="date"]', 'input[type="time"]',
      'textarea', 'select', 'input[type="checkbox"]', 'input[type="radio"]'
    ];
    
    // GOTCHA: Shadow DOM requires different detection approach
    const fields = document.querySelectorAll(selectors.join(','));
    const shadowFields = this.detectShadowDOMFields(document);
    
    // PATTERN: Filter fillable fields (not readonly, disabled, or hidden)
    return [...fields, ...shadowFields].filter(field => {
      return !field.disabled && 
             !field.readOnly && 
             field.offsetParent !== null && // visible check
             !this.isProtectedField(field); // CAPTCHA, etc.
    });
  }
  
  // CRITICAL: Handle dynamic content with MutationObserver
  setupDynamicDetection() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          this.redetectForms();
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

// Task 3: Form Filling Logic Pseudocode
class FormFiller {
  async fillField(field, userData) {
    // PATTERN: Type-specific filling strategies
    switch (field.type.toLowerCase()) {
      case 'text':
      case 'email':
        field.value = this.mapTextValue(field, userData);
        field.dispatchEvent(new Event('input', { bubbles: true }));
        break;
        
      case 'select-one':
        // GOTCHA: Select options need value matching not text matching
        const option = this.findMatchingOption(field, userData);
        if (option) field.value = option.value;
        field.dispatchEvent(new Event('change', { bubbles: true }));
        break;
        
      case 'checkbox':
        // PATTERN: Intelligent checkbox selection based on labels
        field.checked = this.shouldCheckBox(field, userData);
        field.dispatchEvent(new Event('change', { bubbles: true }));
        break;
        
      default:
        // CRITICAL: File inputs cannot be filled for security
        if (field.type === 'file') {
          console.warn('File inputs cannot be programmatically filled');
          return false;
        }
    }
    
    // PATTERN: Visual feedback for filled fields
    this.addVisualFeedback(field, 'filled');
    return true;
  }
}

// Task 4: Service Worker Communication Pseudocode
// service-worker.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // PATTERN: Message-based communication for all operations
  switch (message.type) {
    case 'DETECT_FORMS':
      // GOTCHA: Service worker cannot access DOM directly
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'START_DETECTION'
      });
      break;
      
    case 'FILL_FORMS':
      // PATTERN: Validate permissions before proceeding
      if (await this.hasPermission(sender.tab.url)) {
        chrome.tabs.sendMessage(sender.tab.id, {
          type: 'START_FILLING',
          userData: await this.getUserData()
        });
      }
      break;
      
    default:
      console.warn('Unknown message type:', message.type);
  }
  
  // CRITICAL: Always respond to prevent hanging
  sendResponse({ success: true });
});
```

### Integration Points
```yaml
MANIFEST:
  - permissions: ["activeTab", "storage"]
  - host_permissions: ["<all_urls>"]
  - content_security_policy: strict CSP for V3 compliance
  
CHROME APIS:
  - chrome.storage.local: User data and settings persistence
  - chrome.tabs.sendMessage: Service worker to content script communication
  - chrome.runtime.onMessage: Inter-component message handling
  
DOM EVENTS:
  - input: Trigger form validation after filling
  - change: Notify frameworks of value changes
  - focus/blur: Respect field interaction patterns
  
SECURITY:
  - Content Security Policy: No eval, no remote code
  - Input sanitization: Prevent XSS in all user data
  - Permission model: Minimal required permissions
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# No dedicated linting for vanilla JS, but basic syntax checking
node -c src/content/content.js        # Syntax check
node -c src/background/service-worker.js
node -c src/popup/popup.js

# Manual code quality checks
grep -r "eval\|new Function" src/    # Should return no results
grep -r "innerHTML.*=" src/          # Should be minimal, prefer textContent
```

### Level 2: Unit Tests
```javascript
// CREATE test files with these test cases:
// tests/unit/form-detector.test.js
describe('FormDetector', () => {
  test('detects all standard input types', () => {
    const detector = new FormDetector();
    const mockDOM = createMockForm(); // fixture
    const fields = detector.detectFormFields(mockDOM);
    expect(fields.length).toBeGreaterThan(0);
    expect(fields.every(f => f.type)).toBe(true);
  });
  
  test('excludes protected fields', () => {
    const detector = new FormDetector();
    const mockForm = createFormWithCAPTCHA();
    const fields = detector.detectFormFields(mockForm);
    expect(fields.some(f => f.classList.contains('g-recaptcha'))).toBe(false);
  });
  
  test('handles shadow DOM elements', () => {
    const detector = new FormDetector();
    const shadowRoot = createShadowDOMForm();
    const fields = detector.detectShadowDOMFields(shadowRoot);
    expect(fields.length).toBeGreaterThan(0);
  });
});

// tests/unit/form-filler.test.js
describe('FormFiller', () => {
  test('fills text inputs correctly', async () => {
    const filler = new FormFiller();
    const input = createElement('input', { type: 'text', name: 'firstName' });
    const userData = { personal: { firstName: 'John' } };
    
    const result = await filler.fillField(input, userData);
    expect(result).toBe(true);
    expect(input.value).toBe('John');
  });
  
  test('skips readonly fields', async () => {
    const filler = new FormFiller();
    const input = createElement('input', { readonly: true });
    const result = await filler.fillField(input, {});
    expect(result).toBe(false);
  });
});
```

```bash
# Run tests with a simple test runner
# For simple vanilla JS, you might use a browser-based test runner
# or Node.js with jsdom for DOM testing
npm test  # If package.json is set up
# OR manual testing in browser console on test pages
```

### Level 3: Integration Test
```bash
# Load extension in Chrome developer mode
echo "1. Open Chrome -> Extensions -> Developer mode"
echo "2. Load unpacked extension from project root"
echo "3. Navigate to test form pages"

# Test the complete flow
echo "4. Click extension icon"
echo "5. Click 'Fill Forms' button"
echo "6. Verify fields are filled correctly"

# Test edge cases
echo "7. Test on dynamically loaded forms (SPAs)"
echo "8. Test on forms with validation"
echo "9. Test on protected fields (passwords, CAPTCHAs)"

# Expected results:
# - Forms filled successfully on 95%+ of test sites
# - No console errors during operation
# - Visual feedback shows during filling
# - Protected fields are appropriately skipped
```

## Final validation Checklist
- [ ] Extension loads without errors in Chrome
- [ ] All permissions are minimal and justified
- [ ] Content Security Policy passes Chrome Web Store review
- [ ] Form detection works on major websites (Google, Facebook, GitHub)
- [ ] Form filling respects field validation and constraints
- [ ] Visual feedback is clear and non-intrusive
- [ ] Error handling provides useful feedback to users
- [ ] No sensitive data is logged or exposed
- [ ] Extension works in incognito mode
- [ ] Performance is acceptable on large forms (>100 fields)

---

## Anti-Patterns to Avoid
- ❌ Don't use eval() or new Function() - violates Manifest V3 CSP
- ❌ Don't inject remote scripts - security violation
- ❌ Don't fill password fields without explicit user consent
- ❌ Don't ignore form validation - respect website constraints
- ❌ Don't use global variables in service worker - no state persistence
- ❌ Don't manipulate forms during page load - wait for DOM ready
- ❌ Don't hardcode field mappings - use intelligent detection
- ❌ Don't ignore accessibility - ensure screen reader compatibility

## Confidence Score: 9/10

This PRP provides comprehensive context for one-pass implementation including:
- Complete Chrome Extension Manifest V3 documentation
- Modern form detection and filling techniques
- Security best practices and CSP requirements
- Detailed implementation blueprint with pseudocode
- Executable validation gates for testing
- Real-world edge cases and gotchas
- Progressive implementation approach

The only uncertainty is specific website compatibility edge cases that may require iterative refinement during testing.