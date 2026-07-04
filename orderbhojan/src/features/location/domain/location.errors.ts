export const LOCATION_ERROR_CODES = {
  PERMISSION_DENIED: 'LOCATION_PERMISSION_DENIED',
  UNAVAILABLE: 'LOCATION_UNAVAILABLE',
  TIMEOUT: 'LOCATION_TIMEOUT',
  VALIDATION_FAILED: 'ADDRESS_VALIDATION_FAILED',
  GEOCODE_FAILED: 'GEOCODE_FAILED',
  PINCODE_INVALID: 'PINCODE_INVALID',
  FIRESTORE_UNAVAILABLE: 'FIRESTORE_UNAVAILABLE',
} as const;

export type LocationErrorCode = (typeof LOCATION_ERROR_CODES)[keyof typeof LOCATION_ERROR_CODES];

export class LocationError extends Error {
  readonly code: LocationErrorCode;
  readonly retryable: boolean;

  constructor(code: LocationErrorCode, message: string, retryable = false) {
    super(message);
    this.name = 'LocationError';
    this.code = code;
    this.retryable = retryable;
  }
}

export function mapGeolocationError(error: GeolocationPositionError): LocationError {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return new LocationError(LOCATION_ERROR_CODES.PERMISSION_DENIED, 'Location permission denied', true);
    case error.POSITION_UNAVAILABLE:
      return new LocationError(LOCATION_ERROR_CODES.UNAVAILABLE, 'Location unavailable', true);
    case error.TIMEOUT:
      return new LocationError(LOCATION_ERROR_CODES.TIMEOUT, 'Location request timed out', true);
    default:
      return new LocationError(LOCATION_ERROR_CODES.UNAVAILABLE, error.message || 'Location failed', true);
  }
}
