/**
 * LocationSDK — injectable browser geolocation port (M2 PR-10).
 * Runtime default uses navigator.geolocation; tests inject mocks.
 */

import type { GeolocationOptions } from '../../dto/geo';

export type BrowserGeolocationErrorCode =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNSUPPORTED';

export interface BrowserGeolocationError {
  readonly code: BrowserGeolocationErrorCode;
  readonly message: string;
}

export interface BrowserGeolocationPosition {
  readonly lat: number;
  readonly lng: number;
  readonly accuracyM: number;
  readonly timestamp: number;
}

export interface BrowserGeolocationPort {
  isAvailable(): boolean;
  getCurrentPosition(options: GeolocationOptions): Promise<BrowserGeolocationPosition>;
}

export interface CreateBrowserGeolocationPortOptions {
  readonly geolocation?: Pick<Geolocation, 'getCurrentPosition'>;
}

export function createDefaultBrowserGeolocationPort(
  options: CreateBrowserGeolocationPortOptions = {}
): BrowserGeolocationPort {
  const geolocation = options.geolocation ?? (typeof navigator !== 'undefined' ? navigator.geolocation : undefined);

  return {
    isAvailable: () => Boolean(geolocation?.getCurrentPosition),
    getCurrentPosition: (options) =>
      new Promise((resolve, reject) => {
        if (!geolocation?.getCurrentPosition) {
          reject({
            code: 'UNSUPPORTED',
            message: 'Browser geolocation is not available',
          } satisfies BrowserGeolocationError);
          return;
        }

        geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracyM: position.coords.accuracy,
              timestamp: position.timestamp,
            });
          },
          (error) => {
            const code: BrowserGeolocationErrorCode =
              error.code === error.PERMISSION_DENIED
                ? 'PERMISSION_DENIED'
                : error.code === error.TIMEOUT
                  ? 'TIMEOUT'
                  : 'POSITION_UNAVAILABLE';
            reject({
              code,
              message: error.message || 'Could not read device location',
            } satisfies BrowserGeolocationError);
          },
          {
            enableHighAccuracy: options.enableHighAccuracy ?? true,
            timeout: options.timeoutMs ?? 10_000,
            maximumAge: options.maximumAgeMs ?? 0,
          }
        );
      }),
  };
}
