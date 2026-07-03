/**
 * LocationSDK — Open Geocoding factory exports (M2 PR-8).
 */

export {
  OpenGeocodingProvider,
  createOpenGeocodingProvider,
  DEFAULT_OPEN_GEOCODING_CONFIG,
} from './OpenGeocodingProvider';

export {
  DEFAULT_NOMINATIM_BASE_URL,
  DEFAULT_OPEN_GEOCODING_USER_AGENT,
  DEFAULT_OPEN_GEOCODING_TIMEOUT_MS,
  DEFAULT_OPEN_GEOCODING_MAX_RETRIES,
  DEFAULT_OPEN_GEOCODING_RETRY_DELAY_MS,
  DEFAULT_OPEN_GEOCODING_MIN_INTERVAL_MS,
  resolveOpenGeocodingConfig,
} from './OpenGeocodingConfig';

export type { OpenGeocodingConfig } from './OpenGeocodingConfig';

export type {
  OpenGeocodingBackend,
  OpenGeocodingHttpPort,
  OpenGeocodingCachePort,
  OpenGeocodingRateLimiterPort,
  OpenGeocodingBackendResult,
  CreateOpenGeocodingProviderOptions,
} from './OpenGeocodingPorts';

export { NominatimProvider, createNominatimProvider } from './NominatimProvider';

export {
  InMemoryOpenGeocodingCache,
  NoOpOpenGeocodingCache,
  createInMemoryOpenGeocodingCache,
  createNoOpOpenGeocodingCache,
  DEFAULT_OPEN_GEOCODING_CACHE_TTL_MS,
} from './OpenGeocodingCache';

export {
  IntervalOpenGeocodingRateLimiter,
  NoOpOpenGeocodingRateLimiter,
  createIntervalOpenGeocodingRateLimiter,
  createNoOpOpenGeocodingRateLimiter,
} from './OpenGeocodingRateLimiter';

export { createFetchOpenGeocodingHttpPort } from './defaultOpenGeocodingHttpPort';

export {
  buildForwardGeocodeQuery,
  mapBackendToSearchResults,
  mapBackendToGeocodedAddress,
} from './mapOpenGeocodingResults';

export { mapOpenGeocodingHttpStatus, isRetryableOpenGeocodingError } from './mapOpenGeocodingErrors';
