/**
 * LocationSDK — vendor-neutral Open Geocoding provider (M2 PR-8).
 * Default backend: NominatimProvider.
 */

import type { SdkAsyncResult, SdkResult } from '../../../core/result';
import { sdkError, sdkFail, sdkOk } from '../../../core/resultHelpers';
import type { GeocodingProvider } from '../GeocodingProvider';
import type {
  AddressSearchOptions,
  AddressSearchResult,
  ForwardGeocodeInput,
  GeocodedAddress,
} from '../../dto/address';
import type { GeoPoint } from '../../dto/geo';
import {
  DEFAULT_OPEN_GEOCODING_CACHE_TTL_MS,
  createInMemoryOpenGeocodingCache,
} from './OpenGeocodingCache';
import {
  DEFAULT_OPEN_GEOCODING_CONFIG,
  resolveOpenGeocodingConfig,
  type OpenGeocodingConfig,
} from './OpenGeocodingConfig';
import {
  isRetryableOpenGeocodingError,
  propagateOpenGeocodingFailure,
} from './mapOpenGeocodingErrors';
import {
  buildForwardGeocodeQuery,
  buildOpenGeocodingCacheKey,
  mapBackendToGeocodedAddress,
  mapBackendToSearchResults,
} from './mapOpenGeocodingResults';
import { createNominatimProvider } from './NominatimProvider';
import type {
  OpenGeocodingBackend,
  OpenGeocodingCachePort,
  OpenGeocodingRateLimiterPort,
} from './OpenGeocodingPorts';
import { createIntervalOpenGeocodingRateLimiter } from './OpenGeocodingRateLimiter';
import { createFetchOpenGeocodingHttpPort } from './defaultOpenGeocodingHttpPort';
import type { CreateOpenGeocodingProviderOptions } from './OpenGeocodingPorts';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class OpenGeocodingProvider implements GeocodingProvider {
  readonly kind = 'nominatim' as const;

  private readonly config: OpenGeocodingConfig;
  private readonly backend: OpenGeocodingBackend;
  private readonly cache: OpenGeocodingCachePort;
  private readonly rateLimiter: OpenGeocodingRateLimiterPort;

  constructor(options: CreateOpenGeocodingProviderOptions = {}) {
    this.config = resolveOpenGeocodingConfig(options.config);
    const http = options.http ?? createFetchOpenGeocodingHttpPort();
    this.backend = options.backend ?? createNominatimProvider(http, this.config);
    this.cache = options.cache ?? createInMemoryOpenGeocodingCache();
    this.rateLimiter =
      options.rateLimiter ??
      createIntervalOpenGeocodingRateLimiter(this.config.minRequestIntervalMs);
  }

  searchAddress(
    query: string,
    options?: AddressSearchOptions
  ): SdkAsyncResult<AddressSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return Promise.resolve(sdkFail(sdkError('VALIDATION', 'Search query is required')));
    }

    const cacheKey = buildOpenGeocodingCacheKey(
      'search',
      `${trimmed}|${options?.countryCode ?? this.config.defaultCountryCode}|${options?.limit ?? 5}`
    );

    return this.withCache<AddressSearchResult[]>(cacheKey, () =>
      this.withRetry<AddressSearchResult[]>(async () => {
        const result = await this.backend.search({
          query: trimmed,
          countryCodes: (options?.countryCode ?? this.config.defaultCountryCode).toLowerCase(),
          limit: options?.limit,
        });
        if (!result.ok) {
          return propagateOpenGeocodingFailure(result);
        }
        return sdkOk(mapBackendToSearchResults(result.value));
      })
    );
  }

  forwardGeocode(input: ForwardGeocodeInput): SdkAsyncResult<GeocodedAddress> {
    const queryResult = buildForwardGeocodeQuery(input);
    if (!queryResult.ok) {
      return Promise.resolve(propagateOpenGeocodingFailure<GeocodedAddress>(queryResult));
    }

    const cacheKey = buildOpenGeocodingCacheKey('forward', queryResult.value);

    return this.withCache<GeocodedAddress>(cacheKey, () =>
      this.withRetry<GeocodedAddress>(async () => {
        const search = await this.backend.search({
          query: queryResult.value,
          countryCodes: this.config.defaultCountryCode.toLowerCase(),
          limit: 1,
        });
        if (!search.ok) {
          return propagateOpenGeocodingFailure(search);
        }
        const top = search.value[0];
        if (!top) {
          return sdkFail(sdkError('NOT_FOUND', 'Forward geocode returned no results'));
        }
        return mapBackendToGeocodedAddress(top, this.config);
      })
    );
  }

  reverseGeocode(point: GeoPoint): SdkAsyncResult<GeocodedAddress> {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
      return Promise.resolve(sdkFail(sdkError('VALIDATION', 'Invalid coordinates for reverse geocode')));
    }

    const cacheKey = buildOpenGeocodingCacheKey('reverse', `${point.lat},${point.lng}`);

    return this.withCache<GeocodedAddress>(cacheKey, () =>
      this.withRetry<GeocodedAddress>(async () => {
        const result = await this.backend.reverse({ lat: point.lat, lng: point.lng });
        if (!result.ok) {
          return propagateOpenGeocodingFailure(result);
        }
        return mapBackendToGeocodedAddress(result.value, this.config, point);
      })
    );
  }

  private async withCache<T>(
    key: string,
    operation: () => SdkAsyncResult<T>
  ): SdkAsyncResult<T> {
    const cached = await this.cache.get<T>(key);
    if (!cached.ok) {
      return propagateOpenGeocodingFailure<T>(cached);
    }
    if (cached.value !== null) {
      return sdkOk(cached.value);
    }

    const result = await operation();
    if (result.ok) {
      await this.cache.set(key, result.value, DEFAULT_OPEN_GEOCODING_CACHE_TTL_MS);
    }
    return result;
  }

  private async withRetry<T>(operation: () => SdkAsyncResult<T>): SdkAsyncResult<T> {
    let attempt = 0;
    let lastFailure = sdkFail(sdkError('UNAVAILABLE', 'Open geocoding request failed')) as SdkResult<T>;

    while (attempt <= this.config.maxRetries) {
      const rate = await this.rateLimiter.acquire();
      if (!rate.ok) {
        return propagateOpenGeocodingFailure<T>(rate);
      }

      const result = await operation();
      if (result.ok) {
        return result;
      }

      lastFailure = result;
      if (result.ok === false) {
        if (!isRetryableOpenGeocodingError(result.error.code) || attempt >= this.config.maxRetries) {
          return result;
        }
      }

      attempt += 1;
      await sleep(this.config.retryDelayMs * attempt);
    }

    return lastFailure;
  }
}

export function createOpenGeocodingProvider(
  options?: CreateOpenGeocodingProviderOptions
): OpenGeocodingProvider {
  return new OpenGeocodingProvider(options);
}

export { DEFAULT_OPEN_GEOCODING_CONFIG };
