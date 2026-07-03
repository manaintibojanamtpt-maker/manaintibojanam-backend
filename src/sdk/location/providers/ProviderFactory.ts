/**
 * LocationSDK — provider factory and registry bootstrap (M2 PR-7 / PR-8).
 */

import type { BrowserLocationProvider } from './BrowserLocationProvider';
import type { GeocodingProvider } from './GeocodingProvider';
import type { MapProvider } from './MapProvider';
import type { LocationProvider } from './LocationProvider';
import type {
  BrowserLocationProviderKind,
  GeocodingProviderKind,
  MapProviderKind,
} from '../types/branded';
import { createCompositeLocationProvider } from './CompositeLocationProvider';
import { createOpenGeocodingProvider } from './open-geocoding/OpenGeocodingProvider';
import { createLocationProviderRegistry } from './ProviderRegistry';
import { createBrowserLocationProviderImpl } from './browser/BrowserLocationProviderImpl';
import { createStubBrowserLocationProvider } from './stubs/StubBrowserLocationProvider';
import { createStubGeocodingProvider } from './stubs/StubGeocodingProvider';
import { createStubMapProvider } from './stubs/StubMapProvider';
import type {
  CreateBrowserLocationProviderOptions,
  CreateGeocodingProviderOptions,
  CreateLocationProviderFactoryOptions,
  CreateLocationProviderRegistryOptions,
  CreateMapProviderOptions,
  LocationProviderRegistry,
} from './types';

export const DEFAULT_GEOCODING_PROVIDER_KIND: GeocodingProviderKind = 'stub';
export const DEFAULT_BROWSER_LOCATION_PROVIDER_KIND: BrowserLocationProviderKind = 'stub';
export const DEFAULT_MAP_PROVIDER_KIND: MapProviderKind = 'stub';

const unsupportedGeocodingKind = (kind: GeocodingProviderKind): never => {
  throw new Error(
    `Geocoding provider "${kind}" is not implemented. Use "${DEFAULT_GEOCODING_PROVIDER_KIND}" or "nominatim" (PR-8).`
  );
};

const unsupportedBrowserKind = (kind: BrowserLocationProviderKind): never => {
  throw new Error(
    `Browser location provider "${kind}" is not implemented. Use "${DEFAULT_BROWSER_LOCATION_PROVIDER_KIND}" (PR-7).`
  );
};

const unsupportedMapKind = (kind: MapProviderKind): never => {
  throw new Error(
    `Map provider "${kind}" is not implemented. Use "${DEFAULT_MAP_PROVIDER_KIND}" (PR-7).`
  );
};

export function createGeocodingProvider(
  options: CreateGeocodingProviderOptions = {}
): GeocodingProvider {
  const kind = options.kind ?? DEFAULT_GEOCODING_PROVIDER_KIND;

  switch (kind) {
    case 'stub':
      return createStubGeocodingProvider();
    case 'nominatim':
      return createOpenGeocodingProvider(options.openGeocoding);
    case 'local':
    case 'cache':
      return unsupportedGeocodingKind(kind);
    default: {
      const exhaustive: never = kind;
      return unsupportedGeocodingKind(exhaustive);
    }
  }
}

export function createBrowserLocationProvider(
  options: CreateBrowserLocationProviderOptions = {}
): BrowserLocationProvider {
  const kind = options.kind ?? DEFAULT_BROWSER_LOCATION_PROVIDER_KIND;

  switch (kind) {
    case 'stub':
      return createStubBrowserLocationProvider();
    case 'browser':
      return createBrowserLocationProviderImpl(options.browserImpl);
    default: {
      const exhaustive: never = kind;
      return unsupportedBrowserKind(exhaustive);
    }
  }
}

export function createMapProvider(options: CreateMapProviderOptions = {}): MapProvider {
  const kind = options.kind ?? DEFAULT_MAP_PROVIDER_KIND;

  switch (kind) {
    case 'stub':
      return createStubMapProvider();
    case 'maplibre':
      return unsupportedMapKind(kind);
    default: {
      const exhaustive: never = kind;
      return unsupportedMapKind(exhaustive);
    }
  }
}

function resolveProviderSlot<TKind extends string, TProvider>(
  value: TKind | TProvider | undefined,
  defaultKind: TKind,
  factory: (kind: TKind) => TProvider
): TProvider {
  if (value === undefined) {
    return factory(defaultKind);
  }
  if (typeof value === 'string') {
    return factory(value as TKind);
  }
  return value;
}

export function createDefaultLocationProviderRegistry(
  options: CreateLocationProviderRegistryOptions = {}
): LocationProviderRegistry {
  const geocoding = resolveProviderSlot(
    options.geocoding,
    DEFAULT_GEOCODING_PROVIDER_KIND,
    (kind) => createGeocodingProvider({ kind })
  );
  const browser = resolveProviderSlot(
    options.browser,
    DEFAULT_BROWSER_LOCATION_PROVIDER_KIND,
    (kind) => createBrowserLocationProvider({ kind })
  );
  const map = resolveProviderSlot(options.map, DEFAULT_MAP_PROVIDER_KIND, (kind) =>
    createMapProvider({ kind })
  );

  return createLocationProviderRegistry(geocoding, browser, map);
}

export function createLocationProviderFromRegistry(
  registry: LocationProviderRegistry
): LocationProvider {
  return createCompositeLocationProvider(registry);
}

/** Primary factory entry — builds registry + composite LocationProvider. */
export function createLocationProviderFramework(
  options: CreateLocationProviderFactoryOptions = {}
): { registry: LocationProviderRegistry; locationProvider: LocationProvider } {
  const registry = options.registry ?? createDefaultLocationProviderRegistry(options);
  return {
    registry,
    locationProvider: createCompositeLocationProvider(registry),
  };
}

export type {
  LocationProviderRegistry,
  LocationProviderSlot,
  CreateGeocodingProviderOptions,
  CreateBrowserLocationProviderOptions,
  CreateMapProviderOptions,
  CreateLocationProviderRegistryOptions,
  CreateLocationProviderFactoryOptions,
} from './types';

export {
  DefaultLocationProviderRegistry,
  createLocationProviderRegistry,
} from './ProviderRegistry';

export { createCompositeLocationProvider } from './CompositeLocationProvider';

export { createStubGeocodingProvider } from './stubs/StubGeocodingProvider';
export { createStubBrowserLocationProvider } from './stubs/StubBrowserLocationProvider';
export { createStubMapProvider } from './stubs/StubMapProvider';

export { createOpenGeocodingProvider, OpenGeocodingProvider } from './open-geocoding/OpenGeocodingProvider';
export type { CreateOpenGeocodingProviderOptions } from './open-geocoding/OpenGeocodingPorts';
