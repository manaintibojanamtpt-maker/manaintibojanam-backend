/**
 * @bhojanos/sdk — public entry (M1 PR-3: OrderSDK read adapter available, UI not wired).
 *
 * Presentation must import from here in future PRs — never from infrastructure.
 * Not wired into the app yet; zero customer-visible impact until PR-4+.
 */

export type {
  EntityId,
  TenantId,
  OrderId,
  UserId,
  IsoDateTime,
  PaginationParams,
  PaginatedResult,
  SdkMetadata,
} from './core/types';

export type { SdkError, SdkErrorCode, SdkErrorFactory } from './core/errors';

export type { SdkResult, SdkSuccess, SdkFailure, SdkAsyncResult } from './core/result';

export { sdkOk, sdkFail, sdkError, sdkFromError, isSdkSuccess } from './core/resultHelpers';

export type {
  SdkFeatureFlag,
  FeatureFlagReader,
  FeatureFlagDefaults,
} from './core/featureFlags';

export { SDK_FEATURE_FLAG_DEFAULTS } from './core/featureFlags';

export type {
  HttpMethod,
  HttpRequestOptions,
  HttpResponse,
  HttpAdapter,
} from './adapters/HttpAdapter';

export type {
  RepositoryQuery,
  RepositoryAdapter,
  RepositoryAdapterFactory,
} from './adapters/RepositoryAdapter';

export type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  OrderLineItemReadModel,
  OrderReadModel,
  OrderAccessContext,
  OrderListFilter,
  GuestViewTokenInput,
  GuestViewTokenResult,
  OrderTenantListFilter,
} from './orders/types';

export type { OrderSDK, OrderSDKFactory } from './orders/OrderSDK';

export { createOrderSDK, orderSdkFactory } from './orders/createOrderSDK';
export type { RealtimeProvider } from './orders/realtime/RealtimeProvider';
export type {
  RealtimeProviderKind,
  RealtimeUnsubscribe,
  RealtimeOrderListOptions,
  RealtimeWatchOrderOptions,
  RealtimeProviderConfig,
  CreateRealtimeProviderOptions,
} from './orders/realtime/types';
export {
  createOrderRealtimeProvider,
  DEFAULT_REALTIME_PROVIDER_KIND,
} from './orders/realtime/ProviderFactory';
export { createDefaultOrderRealtimeProvider } from './orders/realtime/createDefaultOrderRealtimeProvider';
export { PollingProvider, createPollingProvider } from './orders/realtime/PollingProvider';
export { OrderApiAdapter, createOrderApiAdapter } from './orders/adapters/OrderApiAdapter';
export type { OrderApiPort, ApiGuestViewTokenResult } from './orders/adapters/OrderApiPort';
export { defaultOrderApiPort } from './orders/adapters/defaultOrderApiPort';
export {
  mapOrderToReadModel,
  mapOrdersToReadModels,
  toIsoDateTime,
  normalizeOrderStatus,
} from './orders/mappers/mapOrderToReadModel';
export type { ApiOrderRecord } from './orders/mappers/mapOrderToReadModel';

export type { SdkModuleId } from './shared/constants';

export { SDK_VERSION, SDK_MODULE } from './shared/constants';

export {
  ORDER_SDK_READ_API_VERSION,
  ORDER_SDK_READ_API_FROZEN,
} from './orders/version';

export {
  createOrderReadAdapterInfrastructure,
  createOrderReadAdapter,
  createLegacyOrderAdapter,
  createProjectionOrderAdapter,
} from './order/adapter/OrderAdapterFactory';
export type {
  OrderReadAdapterInfrastructure,
  CreateOrderReadAdapterInfrastructureOptions,
} from './order/adapter/OrderAdapterFactory';
export type {
  OrderReadAdapterPort,
  LegacyOrderRepositoryPort,
  ProjectionOrderRepositoryPort,
  OrderAdapterReadinessPort,
} from './order/adapter/orderAdapterPorts';
export {
  ORDER_ADAPTER_FEATURE_FLAG_DEFAULTS,
  ORDER_ADAPTER_FEATURE_FLAG_ENV_KEYS,
  readOrderAdapterFlagDefault,
} from './order/adapter/orderAdapterFeatureFlags';
export type {
  OrderAdapterFeatureFlag,
  OrderAdapterFeatureFlagReader,
} from './order/adapter/orderAdapterFeatureFlags';
export type {
  OrderAdapterTelemetryHook,
  OrderAdapterTelemetryEvent,
} from './order/adapter/OrderAdapterTelemetry';
export { mapProjectionToOrderReadModel } from './order/adapter/mapProjectionToOrderReadModel';

export {
  createProjectionRolloutInfrastructure,
  createProjectionRolloutPolicy,
  createProjectionRolloutMetrics,
  createProjectionRolloutEvaluator,
  createProjectionRolloutStrategy,
} from './order/rollout/ProjectionRolloutFactory';
export type {
  ProjectionRolloutInfrastructure,
  CreateProjectionRolloutInfrastructureOptions,
} from './order/rollout/ProjectionRolloutFactory';
export type {
  ProjectionRolloutPolicyPort,
  ProjectionRolloutMetricsPort,
  ProjectionRolloutDecisionPort,
  ProjectionRolloutMetricsSnapshot,
  ProjectionRolloutConfigurationState,
} from './order/rollout/projectionRolloutPorts';
export {
  PROJECTION_ROLLOUT_FEATURE_FLAG_DEFAULTS,
  PROJECTION_ROLLOUT_FEATURE_FLAG_ENV_KEYS,
  readProjectionRolloutFlagDefault,
} from './order/rollout/rolloutFeatureFlags';
export type {
  ProjectionRolloutFeatureFlag,
  ProjectionRolloutFeatureFlagReader,
} from './order/rollout/rolloutFeatureFlags';
export type {
  ProjectionRolloutTelemetryHook,
  ProjectionRolloutTelemetryEvent,
  ProjectionRolloutTelemetryEventType,
} from './order/rollout/ProjectionRolloutTelemetry';

export {
  createProjectionCertificationInfrastructure,
  createProjectionCertificationEvidenceCollector,
  createHealthyCertificationEvidence,
  createProjectionCertificationReportGenerator,
  createInMemoryProjectionCertificationRepository,
  createProjectionCertificationEvaluator,
  createProjectionSwitchCertification,
} from './order/certification/ProjectionCertificationFactory';
export type {
  ProjectionCertificationInfrastructure,
  CreateProjectionCertificationInfrastructureOptions,
} from './order/certification/ProjectionCertificationFactory';
export type {
  ProjectionCertificationRepositoryPort,
  ProjectionCertificationEvidencePort,
  ProjectionCertificationReportPort,
  ProjectionCertificationRecord,
} from './order/certification/projectionCertificationPorts';
export {
  PROJECTION_CERTIFICATION_FEATURE_FLAG_DEFAULTS,
  PROJECTION_CERTIFICATION_FEATURE_FLAG_ENV_KEYS,
  readProjectionCertificationFlagDefault,
} from './order/certification/certificationFeatureFlags';
export type {
  ProjectionCertificationFeatureFlag,
  ProjectionCertificationFeatureFlagReader,
} from './order/certification/certificationFeatureFlags';
export type {
  ProjectionCertificationTelemetryHook,
  ProjectionCertificationTelemetryEvent,
  ProjectionCertificationTelemetryEventType,
} from './order/certification/ProjectionCertificationTelemetry';

export type {
  BranchId,
  LocationId,
  Geohash,
  GeohashPrecision,
  CountryCode,
  CoordinateSource,
  GeocodingProviderKind,
  BrowserLocationProviderKind,
  MapProviderKind,
  LocationProviderKind,
  DiscoverySortBy,
  GeoPoint,
  GeoPointWithAccuracy,
  DistanceOptions,
  DistanceResult,
  GeolocationOptions,
  LocationGeoJson,
  MapViewport,
  MapPinOptions,
  MapPinValidationResult,
  IndiaAddressInput,
  GeoCoordinates,
  IndiaAddress,
  ValidatedAddress,
  AddressSearchOptions,
  AddressSearchResult,
  ForwardGeocodeInput,
  GeocodedAddress,
  NearbyBranchFilter,
  BranchDiscoveryResult,
  NearbyRestaurantFilter,
  RestaurantDiscoveryResult,
  DeliveryConfigReadModel,
  ServiceabilityResult,
  EtaEstimate,
  StateReference,
  DistrictReference,
  CityReference,
  AreaReference,
  PincodeValidationResult,
  LocationReadModel,
  BranchLocationReadModel,
  GeoIndexEntry,
  LocationSDK,
  LocationSDKFactory,
  LocationSDKOptions,
  LocationProvider,
  LocationProviderFactory,
  CreateLocationProviderOptions,
  GeocodingProvider,
  GeocodingProviderFactory,
  BrowserLocationProvider,
  BrowserLocationProviderFactory,
  MapProvider,
  MapProviderFactory,
  LocationProviderRegistry,
  LocationProviderSlot,
  CreateGeocodingProviderOptions,
  CreateBrowserLocationProviderOptions,
  CreateMapProviderOptions,
  CreateLocationProviderRegistryOptions,
  CreateLocationProviderFactoryOptions,
  ReferenceProvider,
  ReferenceProviderFactory,
  LocationRepository,
  LocationRepositoryFactory,
  LocationRepositoryQuery,
  LocationSdkFeatureFlag,
  LocationFeatureFlagReader,
  LocationFeatureFlagDefaults,
  LocationSdkErrorCode,
  LocationSdkErrorDetails,
} from './location/types';

export {
  LOCATION_SDK_VERSION,
  LOCATION_SDK_FROZEN,
  LOCATION_SDK_FEATURE_FLAG_DEFAULTS,
  LOCATION_SDK_FEATURE_FLAG_ENV_KEYS,
  LOCATION_SDK_MODULE,
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
} from './location/types';

export type {
  CreateOpenGeocodingProviderOptions,
  OpenGeocodingBackend,
  OpenGeocodingHttpPort,
  OpenGeocodingCachePort,
  OpenGeocodingRateLimiterPort,
  OpenGeocodingConfig,
} from './location/types';

export type { LocationAdapterDeps, CreateLocationSDKDeps, CreateLocationSDKOptions } from './location/types';

export type {
  CountryId,
  StateId,
  DistrictId,
  CityId,
  LocalityId,
  PincodeId,
  IsoCountryCode,
  ReferenceDataProviderKind,
  StateAdministrationType,
  ReferenceEntityKind,
  ReferenceEntityBase,
  ReferenceCountry,
  ReferenceState,
  ReferenceDistrict,
  ReferenceCity,
  ReferenceLocality,
  ReferencePincode,
  ReferenceHierarchyPath,
  ReferenceListFilter,
  ReferenceCountryListFilter,
  ReferenceChildListFilter,
  ReferenceLookupByCodeInput,
  ReferenceSDK,
  ReferenceSDKFactory,
  ReferenceSDKOptions,
  ReferenceRepository,
  ReferenceRepositoryFactory,
  ReferenceDataProvider,
  ReferenceDataProviderFactory,
  CreateReferenceDataProviderOptions,
  ReferenceSdkErrorCode,
  ReferenceSdkErrorDetails,
} from './reference/types';

export {
  REFERENCE_SDK_VERSION,
  REFERENCE_SDK_FROZEN,
  REFERENCE_SDK_MODULE,
  createReferenceSDK,
  createReferenceSDKFromProvider,
  referenceSdkFactory,
  clearReferenceBundleCache,
  getCachedReferenceBundleVersion,
  resetStaticBundleProviderCache,
  getStaticBundleCacheVersion,
  defaultReferenceBundlePort,
  ReferenceBundleAdapter,
  createReferenceBundleAdapter,
  ReferenceBundleRepository,
  createReferenceBundleRepository,
  StaticBundleProvider,
  createStaticBundleProvider,
} from './reference/types';

export type { ReferenceBundlePort } from './reference/types';

export type { SdkContext, BhojanSdk, BhojanSdkFactory } from './shared/interfaces';
