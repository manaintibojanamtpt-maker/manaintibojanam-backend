/**
 * BhojanOS SDK — error contracts (no throw helpers, no logging).
 */

export type SdkErrorCode =
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'UNAVAILABLE'
  | 'INTERNAL'
  | 'NOT_CONFIGURED';

export interface SdkError {
  readonly code: SdkErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface SdkErrorFactory {
  create(code: SdkErrorCode, message: string, details?: Record<string, unknown>): SdkError;
}
