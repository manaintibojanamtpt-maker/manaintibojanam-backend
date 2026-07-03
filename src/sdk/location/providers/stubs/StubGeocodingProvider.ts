/**
 * LocationSDK — stub geocoding provider (M2 PR-7).
 */

import { locationNotConfiguredAsync } from '../../adapters/notConfigured';
import type { GeocodingProvider } from '../GeocodingProvider';

export function createStubGeocodingProvider(): GeocodingProvider {
  return {
    kind: 'stub',
    searchAddress: (query) =>
      locationNotConfiguredAsync('searchAddress', `StubGeocodingProvider (${query})`),
    forwardGeocode: () => locationNotConfiguredAsync('forwardGeocode', 'StubGeocodingProvider'),
    reverseGeocode: () => locationNotConfiguredAsync('reverseGeocode', 'StubGeocodingProvider'),
  };
}
