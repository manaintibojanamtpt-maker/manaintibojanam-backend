/**
 * LocationSDK — in-memory provider registry with DI slots (M2 PR-7).
 */

import type { BrowserLocationProvider } from './BrowserLocationProvider';
import type { GeocodingProvider } from './GeocodingProvider';
import type { MapProvider } from './MapProvider';
import type { LocationProviderRegistry } from './types';

export class DefaultLocationProviderRegistry implements LocationProviderRegistry {
  constructor(
    private geocodingProvider: GeocodingProvider,
    private browserProvider: BrowserLocationProvider,
    private mapProvider: MapProvider
  ) {}

  getGeocoding(): GeocodingProvider {
    return this.geocodingProvider;
  }

  getBrowser(): BrowserLocationProvider {
    return this.browserProvider;
  }

  getMap(): MapProvider {
    return this.mapProvider;
  }

  register(slot: 'geocoding', provider: GeocodingProvider): LocationProviderRegistry;
  register(slot: 'browser', provider: BrowserLocationProvider): LocationProviderRegistry;
  register(slot: 'map', provider: MapProvider): LocationProviderRegistry;
  register(
    slot: 'geocoding' | 'browser' | 'map',
    provider: GeocodingProvider | BrowserLocationProvider | MapProvider
  ): LocationProviderRegistry {
    switch (slot) {
      case 'geocoding':
        this.geocodingProvider = provider as GeocodingProvider;
        break;
      case 'browser':
        this.browserProvider = provider as BrowserLocationProvider;
        break;
      case 'map':
        this.mapProvider = provider as MapProvider;
        break;
      default: {
        const exhaustive: never = slot;
        void exhaustive;
      }
    }
    return this;
  }
}

export function createLocationProviderRegistry(
  geocoding: GeocodingProvider,
  browser: BrowserLocationProvider,
  map: MapProvider
): LocationProviderRegistry {
  return new DefaultLocationProviderRegistry(geocoding, browser, map);
}
