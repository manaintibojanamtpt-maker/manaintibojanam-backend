/**
 * M2 PR-10 — Customer location detection facade (BrowserLocationProvider + LocationSDK).
 * Presentation must use this module — not direct SDK or navigator imports (ADR-011).
 */

import { createLocationSDK } from '../../sdk/location/createLocationSDK';
import type { LocationSDK } from '../../sdk/location/contracts/LocationSDK';
import type { SdkAsyncResult } from '../../sdk/core/result';
import { sdkError, sdkFail, sdkOk } from '../../sdk/core/resultHelpers';
import type { GeolocationOptions } from '../../sdk/location/dto/geo';
import type { CustomerCanonicalLocation } from './types';
import { mapGeocodedToCustomerCanonical } from './mapGeocodedToCustomerCanonical';
import {
  clearCustomerLocationSession,
  readCustomerLocationSession,
  writeCustomerLocationSession,
} from './sessionStore';

export interface CustomerLocationServices {
  readonly location: LocationSDK;
}

export function createCustomerLocationServices(): CustomerLocationServices {
  return {
    location: createLocationSDK({
      geocoding: 'nominatim',
      browser: 'browser',
    }),
  };
}

export async function detectCustomerLocation(
  options?: GeolocationOptions,
  services: CustomerLocationServices = createCustomerLocationServices()
): SdkAsyncResult<CustomerCanonicalLocation> {
  const detected = await services.location.detectCurrentLocation(options);
  if (detected.ok === false) {
    return detected;
  }

  const geocoded = await services.location.reverseGeocode({
    lat: detected.value.lat,
    lng: detected.value.lng,
  });

  if (geocoded.ok === false) {
    return geocoded;
  }

  if (!geocoded.value.geohash?.trim()) {
    return sdkFail(sdkError('VALIDATION', 'Could not compute geohash for detected location'));
  }

  const canonical = mapGeocodedToCustomerCanonical(detected.value, geocoded.value);
  writeCustomerLocationSession(canonical);
  return sdkOk(canonical);
}

export {
  readCustomerLocationSession,
  writeCustomerLocationSession,
  clearCustomerLocationSession,
};

export type { CustomerCanonicalLocation };
