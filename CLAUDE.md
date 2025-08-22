# Form Auto-Fill Chrome Extension - Development Guidelines

## Project Purpose
Chrome extension that automatically fills all form fields on any webpage with a single button click, handling various form types and edge cases gracefully.

## Core Development Rules

### Extension Architecture
- Use Chrome Extension Manifest V3 exclusively
- Implement proper content script isolation
- Use service worker for background processing
- Follow Chrome Web Store policies strictly
- Implement proper permissions model (minimal required)
- Use declarative approach where possible

### Code Quality Standards
- Use TypeScript throughout the entire codebase
- Follow strict ESLint and Prettier configurations
- Implement proper error boundaries and error handling
- Write self-documenting code with clear variable names
- Keep functions small and focused (max 20 lines)
- Use TypeScript strict mode
- Handle all edge cases explicitly

### Security Guidelines
- Never inject malicious code into webpages
- Implement proper content security policy (CSP)
- Sanitize all user inputs and form data
- Use secure communication between components
- Implement proper data validation
- Follow OWASP security guidelines for extensions
- Regular security audits of dependencies
- Never store sensitive data in extension storage

### Form Detection and Handling
- Detect all form types: input, textarea, select, checkbox, radio
- Handle dynamic forms and SPA form updates
- Support shadow DOM form elements
- Implement robust selectors that work across sites
- Handle password fields with special consideration
- Support file inputs appropriately
- Detect and handle CAPTCHAs gracefully

### Performance Requirements
- Minimize content script execution time
- Implement efficient DOM querying strategies
- Use lazy loading for heavy operations
- Optimize memory usage in service worker
- Implement proper cleanup on page navigation
- Monitor and optimize execution performance
- Use requestIdleCallback for non-critical operations

### User Experience (UX) Rules
- Provide clear visual feedback during form filling
- Implement intuitive extension popup interface
- Show progress indicators for long operations
- Handle failures gracefully with user feedback
- Implement undo functionality where possible
- Provide clear success/failure notifications
- Respect user privacy and data preferences

### User Interface (UI) Standards
- Design consistent with Chrome extension guidelines
- Use Chrome's native styling patterns
- Implement proper contrast ratios for accessibility
- Keep interface minimal and focused
- Use clear, actionable button labels
- Implement proper loading states
- Follow Material Design principles

### Error Handling and Edge Cases
- Handle inaccessible or hidden form fields
- Manage forms with validation requirements
- Deal with dynamically loaded content
- Handle iframe and cross-origin forms appropriately
- Manage rate-limited or protected forms
- Implement fallback strategies for failed operations
- Provide meaningful error messages to users

### Data Management
- Implement secure local storage strategies
- Handle form data types appropriately
- Implement data export/import functionality
- Manage user preferences and settings
- Handle form field mapping intelligently
- Implement data backup and recovery

### Cross-Browser Compatibility
- Test across Chromium-based browsers
- Handle browser-specific form behaviors
- Implement graceful degradation
- Test with different browser versions
- Handle extension API differences

### Content and Communication Guidelines
- Never use emojis in code, comments, or user interface
- Write clear, concise copy without unnecessary embellishment
- Use plain language for all user-facing text
- Implement proper error messages that guide user action
- Keep microcopy focused and helpful
- Use consistent terminology throughout the extension

### Testing Requirements
- Unit tests for all utility functions
- Integration tests for form detection logic
- End-to-end tests on various websites
- Performance testing for large forms
- Security testing for data handling
- Cross-browser compatibility testing
- User acceptance testing for UX flows

### Development Workflow
- Use version control with meaningful commits
- Implement proper code review process
- Test on multiple websites before release
- Follow semantic versioning
- Document all breaking changes
- Implement automated testing pipeline
- Monitor extension performance post-deployment

### Privacy and Compliance
- Implement privacy-by-design principles
- Provide clear privacy policy
- Handle user data transparently
- Implement data deletion capabilities
- Comply with GDPR and similar regulations
- Regular privacy impact assessments
- Clear user consent mechanisms

### Maintenance and Monitoring
- Monitor extension performance metrics
- Track error rates and user feedback
- Keep dependencies updated regularly
- Implement proper logging without PII
- Set up alerts for critical failures
- Document troubleshooting procedures
- Plan for Chrome API changes

## Implementation Priorities
1. Core form detection and filling functionality
2. Security and privacy implementation
3. Error handling and edge case management
4. User interface and experience optimization
5. Performance optimization
6. Testing coverage completion
7. Cross-browser compatibility
8. Monitoring and analytics implementation