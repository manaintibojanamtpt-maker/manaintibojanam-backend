/**
 * LocationSDK — browser geolocation provider (M2 PR-10).
 */

import { sdkFail, sdkOk } from '../../../core/resultHelpers';
import type { SdkAsyncResult, SdkResult } from '../../../core/result';
import type { GeolocationOptions } from '../../dto/geo';
import type { GeoTimestamp } from '../../types/branded';
import type { BrowserLocationProvider } from '../BrowserLocationProvider';
import {
  createDefaultBrowserGeolocationPort,
  type BrowserGeolocationError,
  type BrowserGeolocationPort,
} from './BrowserGeolocationPort';
import { mapBrowserGeolocationError } from './mapBrowserGeolocationErrors';

export interface CreateBrowserLocationProviderImplOptions {
  readonly geolocationPort?: BrowserGeolocationPort;
}

export function createBrowserLocationProviderImpl(
  options: CreateBrowserLocationProviderImplOptions = {}
): BrowserLocationProvider {
  const port = options.geolocationPort ?? createDefaultBrowserGeolocationPort();

  return {
    kind: 'browser',
    isSupported: (): SdkResult<boolean> => sdkOk(port.isAvailable()),
    detectCurrentLocation: (geoOptions?: GeolocationOptions): SdkAsyncResult<import('../../dto/geo').GeoPointWithAccuracy> =>
      detectCurrentLocationWithPort(port, geoOptions),
  };
}

async function detectCurrentLocationWithPort(
  port: BrowserGeolocationPort,
  geoOptions?: GeolocationOptions
): SdkAsyncResult<import('../../dto/geo').GeoPointWithAccuracy> {
  if (!port.isAvailable()) {
    return sdkFail(
      mapBrowserGeolocationError({
        code: 'UNSUPPORTED',
        message: 'Browser geolocation is not supported',
      })
    );
  }

  try {
    const position = await port.getCurrentPosition(geoOptions ?? {});
    if (!Number.isFinite(position.lat) || !Number.isFinite(position.lng)) {
      return sdkFail(
        mapBrowserGeolocationError({
          code: 'POSITION_UNAVAILABLE',
          message: 'Invalid coordinates from device',
        })
      );
    }

    return sdkOk({
      lat: position.lat,
      lng: position.lng,
      accuracyM: position.accuracyM,
      timestamp: position.timestamp as GeoTimestamp,
    });
  } catch (error) {
    const mapped = mapBrowserGeolocationError(normalizeBrowserGeolocationError(error));
    return sdkFail(mapped);
  }
}

function normalizeBrowserGeolocationError(error: unknown): BrowserGeolocationError {
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    return error as BrowserGeolocationError;
  }
  return {
    code: 'POSITION_UNAVAILABLE',
    message: error instanceof Error ? error.message : 'Could not read device location',
  };
}
