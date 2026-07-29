import {
  geolocationErrorMessage,
  mapGeolocationErrorCode,
  type GeolocationResult,
} from './errors.js';

export const DEFAULT_GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  /** Native GPS + reverse-geocode handoff regularly exceeds 8s indoors. */
  timeout: 15_000,
  maximumAge: 120_000,
};

export async function detectLiveLocation(
  options: PositionOptions = DEFAULT_GEOLOCATION_OPTIONS,
): Promise<GeolocationResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return {
      ok: false,
      code: 'UNSUPPORTED',
      message: geolocationErrorMessage('UNSUPPORTED'),
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          ok: true,
          coords: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracyM: pos.coords.accuracy,
            source: 'gps',
            capturedAt: Date.now(),
          },
        });
      },
      (err) => {
        const code = mapGeolocationErrorCode(err.code);
        resolve({
          ok: false,
          code,
          message: err.message || geolocationErrorMessage(code),
        });
      },
      options,
    );
  });
}
