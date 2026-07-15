export type GeolocationErrorCode =
  | 'UNSUPPORTED'
  | 'PERMISSION_DENIED'
  | 'TIMEOUT'
  | 'UNAVAILABLE'
  | 'UNKNOWN';

export type GeolocationSuccess = {
  ok: true;
  coords: {
    lat: number;
    lng: number;
    accuracyM?: number;
    source: 'gps';
    capturedAt: number;
  };
};

export type GeolocationFailure = {
  ok: false;
  code: GeolocationErrorCode;
  message: string;
};

export type GeolocationResult = GeolocationSuccess | GeolocationFailure;

export function mapGeolocationErrorCode(code: number): GeolocationErrorCode {
  switch (code) {
    case 1:
      return 'PERMISSION_DENIED';
    case 2:
      return 'UNAVAILABLE';
    case 3:
      return 'TIMEOUT';
    default:
      return 'UNKNOWN';
  }
}

export function geolocationErrorMessage(code: GeolocationErrorCode): string {
  switch (code) {
    case 'UNSUPPORTED':
      return 'Geolocation is not supported on this device';
    case 'PERMISSION_DENIED':
      return 'Location permission was denied';
    case 'TIMEOUT':
      return 'Location request timed out';
    case 'UNAVAILABLE':
      return 'Location is unavailable';
    default:
      return 'Unable to detect location';
  }
}
