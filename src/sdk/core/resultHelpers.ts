/**
 * BhojanOS SDK — result constructors (pure helpers).
 */

import type { SdkError, SdkErrorCode } from './errors';
import type { SdkFailure, SdkResult, SdkSuccess } from './result';

export const sdkOk = <T>(value: T): SdkSuccess<T> => ({
  ok: true,
  value,
});

export const sdkFail = (error: SdkError): SdkFailure => ({
  ok: false,
  error,
});

export const sdkError = (
  code: SdkErrorCode,
  message: string,
  details?: Record<string, unknown>
): SdkError => ({
  code,
  message,
  ...(details ? { details } : {}),
});

export const sdkFromError = (error: unknown, fallbackCode: SdkErrorCode = 'INTERNAL'): SdkFailure => {
  if (error instanceof Error) {
    return sdkFail(sdkError(fallbackCode, error.message));
  }
  return sdkFail(sdkError(fallbackCode, 'Unexpected error'));
};

export const isSdkSuccess = <T>(result: SdkResult<T>): result is SdkSuccess<T> => result.ok === true;
