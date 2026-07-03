/**
 * LocationSDK — public type re-exports (barrel).
 */

export type {
  BranchId,
  LocationId,
  Geohash,
  GeohashPrecision,
  CountryCode,
  CoordinateSource,
  DistanceUnit,
  GeocodingProviderKind,
  BrowserLocationProviderKind,
  MapProviderKind,
  LocationProviderKind,
  DiscoverySortBy,
  GeoTimestamp,
} from '../types/branded';

export type {
  GeoPoint,
  GeoPointWithAccuracy,
  DistanceOptions,
  DistanceResult,
  GeolocationOptions,
  LocationGeoJson,
  GeohashEncodeInput,
  GeohashDecodeResult,
} from '../dto/geo';

export type {
  IndiaAddressInput,
  GeoCoordinates,
  IndiaAddress,
  ValidatedAddress,
  AddressSearchOptions,
  AddressSearchResult,
  ForwardGeocodeInput,
  GeocodedAddress,
} from '../dto/address';

export type {
  NearbyBranchFilter,
  BranchDiscoveryResult,
  NearbyRestaurantFilter,
  RestaurantDiscoveryResult,
} from '../dto/discovery';

export type {
  DeliveryConfigReadModel,
  ServiceabilityResult,
  EtaEstimate,
} from '../dto/delivery';

export type {
  StateReference,
  DistrictReference,
  CityReference,
  AreaReference,
  PincodeValidationResult,
} from '../dto/reference';

export type {
  LocationReadModel,
  BranchLocationReadModel,
  GeoIndexEntry,
} from '../dto/repository';

export type {
  MapViewport,
  MapPinOptions,
  MapPinValidationResult,
} from '../dto/map';

export type {
  GeocodingProvider,
  GeocodingProviderFactory,
} from '../providers/GeocodingProvider';

export type {
  BrowserLocationProvider,
  BrowserLocationProviderFactory,
} from '../providers/BrowserLocationProvider';

export type { MapProvider, MapProviderFactory } from '../providers/MapProvider';

export type {
  LocationProviderRegistry,
  LocationProviderSlot,
  CreateGeocodingProviderOptions,
  CreateBrowserLocationProviderOptions,
  CreateMapProviderOptions,
  CreateLocationProviderRegistryOptions,
  CreateLocationProviderFactoryOptions,
} from '../providers/types';

export type { LocationSDK, LocationSDKFactory } from '../contracts/LocationSDK';

export type {
  LocationProvider,
  LocationProviderFactory,
  CreateLocationProviderOptions,
} from '../providers/LocationProvider';

export type {
  ReferenceProvider,
  ReferenceProviderFactory,
} from '../providers/ReferenceProvider';

export type {
  LocationRepository,
  LocationRepositoryFactory,
  LocationRepositoryQuery,
} from '../repository/LocationRepository';

export type {
  LocationSdkFeatureFlag,
  LocationFeatureFlagReader,
  LocationFeatureFlagDefaults,
} from '../core/featureFlags';

export type { LocationSdkErrorCode, LocationSdkErrorDetails } from '../errors/locationErrors';

export type { LocationSDKOptions } from '../shared/options';

export {
  LOCATION_SDK_VERSION,
  LOCATION_SDK_FROZEN,
} from '../version';

export {
  LOCATION_SDK_FEATURE_FLAG_DEFAULTS,
  LOCATION_SDK_FEATURE_FLAG_ENV_KEYS,
} from '../core/featureFlags';

export { LOCATION_SDK_MODULE } from '../shared/constants';

export {
  createLocationSDK,
  createLocationSDKFromDeps,
  createLocationSDKWithReferenceBundle,
  locationSdkFactory,
  createLocationProvider,
  locationProviderFactory,
  DefaultLocationAdapter,
  createDefaultLocationAdapter,
  LocationRepositoryImpl,
  createLocationRepositoryImpl,
  ReferenceSdkReferenceProvider,
  createReferenceSdkReferenceProvider,
  createStubLocationProvider,
  createStubReferenceProvider,
  computeDistance,
  computeHaversineDistanceKm,
  encodeGeohashPoint,
  decodeGeohashPoint,
  locationNotConfigured,
  locationNotConfiguredAsync,
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
} from '../createLocationSDK';

export type {
  CreateOpenGeocodingProviderOptions,
  OpenGeocodingBackend,
  OpenGeocodingHttpPort,
  OpenGeocodingCachePort,
  OpenGeocodingRateLimiterPort,
  OpenGeocodingConfig,
} from '../createLocationSDK';

export type { LocationAdapterDeps, CreateLocationSDKDeps } from '../adapters/LocationPorts';
export type { CreateLocationSDKOptions } from '../createLocationSDK';
