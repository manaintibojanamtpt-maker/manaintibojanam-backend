/**
 * LocationSDK — browser geolocation errors → SdkError (M2 PR-10).
 */

import type { SdkError } from '../../../core/errors';
import { sdkError } from '../../../core/resultHelpers';
import type { BrowserGeolocationError } from './BrowserGeolocationPort';

export function mapBrowserGeolocationError(error: BrowserGeolocationError): SdkError {
  switch (error.code) {
    case 'PERMISSION_DENIED':
      return sdkError('FORBIDDEN', 'Location permission denied', {
        reason: error.code,
        retryable: false,
      });
    case 'TIMEOUT':
      return sdkError('UNAVAILABLE', 'Location request timed out', {
        reason: error.code,
        retryable: true,
      });
    case 'POSITION_UNAVAILABLE':
      return sdkError('UNAVAILABLE', 'GPS location is unavailable', {
        reason: error.code,
        retryable: true,
      });
    case 'UNSUPPORTED':
    default:
      return sdkError('UNAVAILABLE', error.message || 'Browser geolocation is not supported', {
        reason: error.code ?? 'UNSUPPORTED',
        retryable: false,
      });
  }
}
