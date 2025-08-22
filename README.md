# Form Auto-Fill Chrome Extension

A Chrome extension that automatically fills all form fields on any webpage with a single button click, handling various form types and edge cases gracefully while maintaining security and performance.

## Features

- **Universal Form Detection**: Automatically detects all form field types (input, textarea, select, checkbox, radio)
- **One-Click Filling**: Fill entire forms with a single button click
- **Smart Field Mapping**: Intelligently maps stored data to appropriate form fields
- **Security-First**: Protects against CAPTCHA, honeypot, and protected fields
- **Visual Feedback**: Clear indication of filling progress and completion status
- **Manifest V3**: Modern Chrome extension architecture for future compatibility
- **Privacy-Focused**: Local data storage with optional encryption

## Installation

### From Chrome Web Store
1. Visit the Chrome Web Store (link coming soon)
2. Click "Add to Chrome"
3. Confirm the installation

### For Development
1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory
5. The extension icon will appear in your browser toolbar

## Usage

1. **Setup**: Click the extension icon and configure your personal data
2. **Detect Forms**: Navigate to any webpage with forms and click "Detect Forms"
3. **Fill Forms**: Once forms are detected, click "Fill Forms" to automatically populate all fields
4. **Customize**: Access settings to configure filling behavior and data templates

### Keyboard Shortcuts
- `Ctrl/Cmd + D`: Detect forms on current page
- `Ctrl/Cmd + F`: Fill detected forms

## Development

### Prerequisites
- Node.js 16+ and npm
- Chrome browser

### Setup
```bash
# Install dependencies
npm install

# Run tests
npm test

# Run linting
npm run lint

# Build for production
npm run build

# Package for Chrome Web Store
npm run package
```

### Testing
```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Browser Compatibility

- Chrome 88+
- Microsoft Edge 88+
- Other Chromium-based browsers

## Security & Privacy

- **Local Storage**: All data is stored locally in your browser
- **No Remote Servers**: Extension doesn't send data to external servers
- **Protected Field Detection**: Automatically skips CAPTCHAs and honeypot fields
- **Input Sanitization**: Prevents XSS and injection attacks
- **Encrypted Storage**: Sensitive data is encrypted before storage

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.