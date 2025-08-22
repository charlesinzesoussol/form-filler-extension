# Extension Icons

This directory should contain the required icon files for the Chrome extension:

## Required Icons

- `icon16.png` - 16x16 pixels - Extension toolbar icon
- `icon48.png` - 48x48 pixels - Extension management page
- `icon128.png` - 128x128 pixels - Chrome Web Store and app launcher

## Icon Design Guidelines

### Visual Design
- Use a simple, recognizable symbol representing form filling
- Suggested icons: form with checkmark, document with pen, or data entry symbol
- Use consistent colors that work well on both light and dark backgrounds
- Ensure icons are readable at all sizes

### Technical Requirements
- Format: PNG with transparency
- Background: Transparent or solid color
- Style: Flat design with minimal detail for small sizes
- Colors: Use Chrome extension design guidelines

### Recommended Tools
- Adobe Illustrator or Inkscape for vector design
- Export to PNG at exact pixel dimensions
- Test icons in Chrome developer mode

### Color Scheme Suggestions
- Primary: #1a73e8 (Google Blue)
- Secondary: #34a853 (Google Green) 
- Accent: #fbbc04 (Google Yellow)
- Background: Transparent or white

## File Locations
```
assets/icons/
├── icon16.png   # 16x16 - Toolbar
├── icon48.png   # 48x48 - Management
└── icon128.png  # 128x128 - Store
```

## Creating Icons

1. Design a vector icon in your preferred tool
2. Export at each required size (16x16, 48x48, 128x128)
3. Ensure visual clarity at all sizes
4. Test in Chrome extension developer mode
5. Replace this README with actual icon files

## Note for Developers

These icon files are referenced in `manifest.json`:
- `default_icon` in the `action` section
- `icons` in the root manifest object

The extension will not load properly without these icon files.