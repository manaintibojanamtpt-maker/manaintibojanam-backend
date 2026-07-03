/**
 * LocationSDK — supplementary error codes (extends core SdkErrorCode at adapter layer).
 */

import type { SdkErrorCode } from '../../core/errors';

/** Location-specific error codes used in SdkError.details.locationCode */
export type LocationSdkErrorCode =
  | SdkErrorCode
  | 'OUT_OF_SERVICE_AREA'
  | 'INVALID_COORDINATES'
  | 'INVALID_ADDRESS'
  | 'GEOCODING_FAILED'
  | 'REFERENCE_DATA_UNAVAILABLE';

export interface LocationSdkErrorDetails {
  readonly locationCode?: LocationSdkErrorCode;
  readonly field?: string;
  readonly geohash?: string;
  readonly provider?: string;
}
