/**
 * LocationSDK — Open Geocoding HTTP errors → SdkError (M2 PR-8).
 */

import type { SdkErrorCode } from '../../../core/errors';
import { sdkError, sdkFail } from '../../../core/resultHelpers';
import type { SdkFailure, SdkResult } from '../../../core/result';

export function mapOpenGeocodingHttpStatus(status: number, body?: string): SdkFailure {
  if (status === 429) {
    return sdkFail(
      sdkError('RATE_LIMITED', 'Open geocoding rate limit exceeded', {
        locationCode: 'GEOCODING_FAILED',
        provider: 'nominatim',
        status,
      })
    );
  }
  if (status === 404) {
    return sdkFail(
      sdkError('NOT_FOUND', 'No geocoding results found', {
        locationCode: 'GEOCODING_FAILED',
        provider: 'nominatim',
        status,
      })
    );
  }
  if (status >= 400 && status < 500) {
    return sdkFail(
      sdkError('VALIDATION', 'Open geocoding request rejected', {
        locationCode: 'GEOCODING_FAILED',
        provider: 'nominatim',
        status,
        body,
      })
    );
  }
  return sdkFail(
    sdkError('UNAVAILABLE', 'Open geocoding service unavailable', {
      locationCode: 'GEOCODING_FAILED',
      provider: 'nominatim',
      status,
      body,
    })
  );
}

export const isRetryableOpenGeocodingError = (code: SdkErrorCode): boolean =>
  code === 'UNAVAILABLE' || code === 'RATE_LIMITED';

export const propagateOpenGeocodingFailure = <T>(result: SdkResult<unknown>): SdkResult<T> => {
  if (result.ok === false) {
    return sdkFail(result.error);
  }
  return sdkFail(sdkError('INTERNAL', 'Expected failure while propagating SdkResult'));
};
