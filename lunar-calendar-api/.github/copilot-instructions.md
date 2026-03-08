# Copilot Instructions for Lunar Calendar Firefox Extension

## Project Overview
This is a Firefox browser extension that displays daily lunar calendar color palettes by integrating with our astronomically accurate lunar calendar API.

## Key Components
- **Lunar Calendar API**: Located in `/app/` - provides accurate lunar day calculations and color palettes
- **Firefox Extension**: Browser extension for displaying lunar colors and information
- **Astronomical Accuracy**: Uses Skyfield library for precise moon phase calculations

## Development Guidelines
1. The extension should connect to the local lunar calendar API running on localhost
2. Use modern Firefox extension APIs (manifest v2/v3)
3. Display daily color palette prominently in popup UI
4. Show current lunar day, phase, and illumination percentage
5. Keep UI minimal and aesthetically pleasing

## Code Standards
- Use modern JavaScript (ES6+)
- Follow Firefox extension best practices
- Maintain connection to existing accurate lunar calculations
- Ensure responsive design for different screen sizes