/**
 * Ephemeris Error Types
 */
export type EphemerisErrorCode =
  | 'INVALID_DATE'
  | 'OUT_OF_RANGE'
  | 'CALCULATION_FAILED'
  | 'DATA_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'API_ERROR';

/**
 * Custom Error for Ephemeris Calculations
 */
export class EphemerisError extends Error {
  public readonly code: EphemerisErrorCode;
  public readonly details?: any;

  constructor(code: EphemerisErrorCode, message: string, details?: any) {
    super(message);
    this.name = 'EphemerisError';
    this.code = code;
    this.details = details;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EphemerisError);
    }
  }
}
