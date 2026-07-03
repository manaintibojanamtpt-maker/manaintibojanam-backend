/**
 * LocationSDK factory — adapter layer (M2 PR-6 / PR-7 provider framework).
 */

import type { LocationSDK, LocationSDKFactory } from './contracts/LocationSDK';
import type { LocationProvider, LocationProviderFactory } from './providers/LocationProvider';
import type { LocationProviderKind } from './types/branded';
import { createDefaultLocationAdapter } from './adapters/DefaultLocationAdapter';
import { createLocationRepositoryImpl } from './adapters/LocationRepositoryImpl';
import type { CreateLocationSDKDeps } from './adapters/LocationPorts';
import { createReferenceSdkReferenceProvider } from './adapters/ReferenceSdkReferenceProvider';
import { createStubReferenceProvider } from './adapters/StubReferenceProvider';
import { createReferenceSDK } from '../reference/createReferenceSDK';
import {
  createDefaultLocationProviderRegistry,
  createLocationProviderFramework,
  createLocationProviderFromRegistry,
  DEFAULT_BROWSER_LOCATION_PROVIDER_KIND,
  DEFAULT_GEOCODING_PROVIDER_KIND,
  DEFAULT_MAP_PROVIDER_KIND,
} from './providers/ProviderFactory';
import type { LocationSDKOptions } from './shared/options';

export type CreateLocationSDKOptions = LocationSDKOptions & CreateLocationSDKDeps;

function resolveReferenceProvider(options?: CreateLocationSDKOptions) {
  if (options?.referenceProvider) {
    return options.referenceProvider;
  }
  if (options?.referenceSdk) {
    return createReferenceSdkReferenceProvider(options.referenceSdk);
  }
  return createStubReferenceProvider();
}

function resolveProviderWiring(options?: CreateLocationSDKOptions) {
  if (options?.locationProvider) {
    return {
      locationProvider: options.locationProvider,
      providerRegistry: options.providerRegistry,
    };
  }

  const framework = createLocationProviderFramework({
    registry: options?.providerRegistry,
    geocoding: options?.geocoding,
    browser: options?.browser,
    map: options?.map,
  });

  return {
    locationProvider: framework.locationProvider,
    providerRegistry: framework.registry,
  };
}

export function createLocationSDK(options?: CreateLocationSDKOptions): LocationSDK {
  const { locationProvider, providerRegistry } = resolveProviderWiring(options);
  const repository = options?.repository ?? createLocationRepositoryImpl();
  const referenceProvider = resolveReferenceProvider(options);

  return createDefaultLocationAdapter({
    locationProvider,
    repository,
    referenceProvider,
    providerRegistry,
  });
}

/** Test / advanced wiring when reusing adapter dependencies. */
export function createLocationSDKFromDeps(options: CreateLocationSDKOptions): LocationSDK {
  return createLocationSDK(options);
}

export function createLocationSDKWithReferenceBundle(): LocationSDK {
  return createLocationSDK({
    referenceSdk: createReferenceSDK(),
  });
}

export const locationSdkFactory: LocationSDKFactory = {
  create: (options?: LocationSDKOptions) => createLocationSDK(options),
};

export function createLocationProvider(kind: LocationProviderKind = 'stub'): LocationProvider {
  void kind;
  return createLocationProviderFromRegistry(createDefaultLocationProviderRegistry());
}

export const locationProviderFactory: LocationProviderFactory = {
  create: (kind: LocationProviderKind) => createLocationProvider(kind),
};

export {
  DefaultLocationAdapter,
  createDefaultLocationAdapter,
} from './adapters/DefaultLocationAdapter';

export {
  LocationRepositoryImpl,
  createLocationRepositoryImpl,
} from './adapters/LocationRepositoryImpl';

export {
  ReferenceSdkReferenceProvider,
  createReferenceSdkReferenceProvider,
} from './adapters/ReferenceSdkReferenceProvider';

export { createStubLocationProvider } from './providers/StubLocationProvider';

export { createStubReferenceProvider } from './adapters/StubReferenceProvider';

export type { LocationAdapterDeps, CreateLocationSDKDeps } from './adapters/LocationPorts';

export {
  computeDistance,
  computeHaversineDistanceKm,
  encodeGeohashPoint,
  decodeGeohashPoint,
} from './adapters/localGeoComputation';

export { locationNotConfigured, locationNotConfiguredAsync } from './adapters/notConfigured';

export {
  createGeocodingProvider,
  createBrowserLocationProvider,
  createMapProvider,
  createDefaultLocationProviderRegistry,
  createLocationProviderFramework,
  createLocationProviderFromRegistry,
  createCompositeLocationProvider,
  createLocationProviderRegistry,
  DefaultLocationProviderRegistry,
  createStubGeocodingProvider,
  createStubBrowserLocationProvider,
  createStubMapProvider,
  DEFAULT_GEOCODING_PROVIDER_KIND,
  DEFAULT_BROWSER_LOCATION_PROVIDER_KIND,
  DEFAULT_MAP_PROVIDER_KIND,
  createOpenGeocodingProvider,
  OpenGeocodingProvider,
} from './providers/ProviderFactory';

export type { CreateOpenGeocodingProviderOptions } from './providers/open-geocoding/OpenGeocodingPorts';

export {
  createNominatimProvider,
  NominatimProvider,
  createFetchOpenGeocodingHttpPort,
  createInMemoryOpenGeocodingCache,
  createNoOpOpenGeocodingCache,
  createIntervalOpenGeocodingRateLimiter,
  createNoOpOpenGeocodingRateLimiter,
  DEFAULT_OPEN_GEOCODING_USER_AGENT,
  DEFAULT_NOMINATIM_BASE_URL,
  DEFAULT_OPEN_GEOCODING_CACHE_TTL_MS,
} from './providers/open-geocoding/index';

export type {
  OpenGeocodingBackend,
  OpenGeocodingHttpPort,
  OpenGeocodingCachePort,
  OpenGeocodingRateLimiterPort,
  OpenGeocodingConfig,
} from './providers/open-geocoding/index';

export type {
  GeocodingProvider,
  GeocodingProviderFactory,
} from './providers/GeocodingProvider';

export type {
  BrowserLocationProvider,
  BrowserLocationProviderFactory,
} from './providers/BrowserLocationProvider';

export type { MapProvider, MapProviderFactory } from './providers/MapProvider';

export type {
  LocationProviderRegistry,
  LocationProviderSlot,
  CreateGeocodingProviderOptions,
  CreateBrowserLocationProviderOptions,
  CreateMapProviderOptions,
  CreateLocationProviderRegistryOptions,
  CreateLocationProviderFactoryOptions,
} from './providers/types';

export type { MapViewport, MapPinOptions, MapPinValidationResult } from './dto/map';
