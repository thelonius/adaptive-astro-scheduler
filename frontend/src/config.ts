/**
 * Central configuration file for the frontend application
 */

// API Base URL
// Validates VITE_API_URL from environment or falls back to default localhost
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
