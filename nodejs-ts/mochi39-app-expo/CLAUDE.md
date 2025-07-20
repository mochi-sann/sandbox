# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm start` or `npx expo start`
- **Run on specific platforms**:
  - Android: `npm run android`
  - iOS: `npm run ios` 
  - Web: `npm run web`
- **Linting**: `npm run lint`
- **Reset project**: `npm run reset-project` (moves starter code to app-example directory)

## Architecture Overview

This is an Expo React Native application using:

- **Expo Router**: File-based routing with the app directory structure
- **Navigation**: Stack navigator with tab-based navigation for main screens
- **TypeScript**: Strict mode enabled with path aliases (`@/*` maps to root)
- **Theming**: Built-in dark/light theme support via `@react-navigation/native`
- **Component Structure**:
  - `app/`: File-based routing structure
    - `_layout.tsx`: Root layout with theme provider
    - `(tabs)/`: Tab navigation group with dedicated layout
  - `components/`: Reusable UI components with themed variants
  - `constants/`: App-wide constants like Colors
  - `hooks/`: Custom hooks for color scheme and theming

## Key Technical Details

- Uses Expo Router v5+ for navigation
- Custom haptic feedback integration for tab interactions
- Platform-specific styling (iOS blur effects, etc.)
- SpaceMono font loaded asynchronously
- ESLint configured with Expo's flat config
- Path aliases configured for clean imports (`@/components`, etc.)

## Dependencies

The project uses modern React Native 0.79+ with React 19, Expo SDK ~53, and includes common Expo modules for blur effects, haptics, image handling, and web browser integration.