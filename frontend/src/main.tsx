import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, extendTheme, ColorModeScript } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './i18n';
import './theme/antigravity.css';

// Расширяем Chakra тему для dark mode
const chakraTheme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: true,
  },
  fonts: {
    body: "'Inter', system-ui, sans-serif",
    heading: "'Space Grotesk', 'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  styles: {
    global: {
      body: {
        bg: 'var(--ag-bg)',
        color: 'var(--ag-text)',
      },
    },
  },
  colors: {
    // Планетарные цвета как Chakra palette
    planet: {
      sun: { 500: '#FFD700', dark: '#FFA500', light: '#E8950A' },
      moon: { 500: '#C0C0C0', dark: '#A8B8D0', light: '#6B7E9C' },
      mercury: { 500: '#00D4FF', dark: '#00C4EF', light: '#0086CC' },
      venus: { 500: '#FF69B4', dark: '#FF1493', light: '#C2185B' },
      mars: { 500: '#FF4500', dark: '#E03000', light: '#B71C1C' },
      jupiter: { 500: '#9B59B6', dark: '#8E44AD', light: '#5E2D91' },
      saturn: { 500: '#5B6EAE', dark: '#4B5A9C', light: '#2C3E80' },
      uranus: { 500: '#00E5E5', dark: '#00FFFF', light: '#006CAA' },
      neptune: { 500: '#3A5FC8', dark: '#4169E1', light: '#1A237E' },
      pluto: { 500: '#8B008B', dark: '#9C00B0', light: '#4A004A' },
    },
  },
  components: {
    Card: {
      baseStyle: (_props: any) => ({
        container: {
          bg: 'var(--ag-surface)',
          borderColor: 'var(--ag-border)',
        },
      }),
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ColorModeScript initialColorMode={chakraTheme.config.initialColorMode} />
    <ChakraProvider theme={chakraTheme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ChakraProvider>
  </React.StrictMode>
);
