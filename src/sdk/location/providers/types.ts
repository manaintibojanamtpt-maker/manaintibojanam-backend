/**
 * LocationSDK — provider framework types (M2 PR-7).
 */

import type { BrowserLocationProvider } from './BrowserLocationProvider';
import type { GeocodingProvider } from './GeocodingProvider';
import type { MapProvider } from './MapProvider';
import type {
  BrowserLocationProviderKind,
  GeocodingProviderKind,
  MapProviderKind,
} from '../types/branded';

export type LocationProviderSlot = 'geocoding' | 'browser' | 'map';

/** Injectable provider bundle resolved by ProviderFactory. */
export interface LocationProviderRegistry {
  getGeocoding(): GeocodingProvider;
  getBrowser(): BrowserLocationProvider;
  getMap(): MapProvider;
  /** Replace a slot — returns registry for chaining. */
  register(slot: 'geocoding', provider: GeocodingProvider): LocationProviderRegistry;
  register(slot: 'browser', provider: BrowserLocationProvider): LocationProviderRegistry;
  register(slot: 'map', provider: MapProvider): LocationProviderRegistry;
}

export interface CreateGeocodingProviderOptions {
  readonly kind?: GeocodingProviderKind;
  readonly openGeocoding?: import('./open-geocoding/OpenGeocodingPorts').CreateOpenGeocodingProviderOptions;
}

export interface CreateBrowserLocationProviderOptions {
  readonly kind?: BrowserLocationProviderKind;
  readonly browserImpl?: import('./browser/BrowserLocationProviderImpl').CreateBrowserLocationProviderImplOptions;
}

export interface CreateMapProviderOptions {
  readonly kind?: MapProviderKind;
}

export interface CreateLocationProviderRegistryOptions {
  readonly geocoding?: GeocodingProviderKind | GeocodingProvider;
  readonly browser?: BrowserLocationProviderKind | BrowserLocationProvider;
  readonly map?: MapProviderKind | MapProvider;
}

export interface CreateLocationProviderFactoryOptions extends CreateLocationProviderRegistryOptions {
  readonly registry?: LocationProviderRegistry;
}
