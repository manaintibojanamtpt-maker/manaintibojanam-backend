import { mapGeolocationError } from '../domain/location.errors';
import type { GeoCoordinates } from '../domain/location.types';

export interface GeolocationResult {
  readonly coordinates: GeoCoordinates;
}

export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

export function getCurrentPosition(options?: PositionOptions): Promise<GeolocationResult> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyM: position.coords.accuracy,
            source: 'gps',
            capturedAt: new Date().toISOString(),
          },
        });
      },
      (error) => reject(mapGeolocationError(error)),
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 60_000,
        ...options,
      },
    );
  });
}
