/**
 * LocationSDK — Open Geocoding ports (M2 PR-8).
 * Backend is swappable; default vendor is Nominatim.
 */

import type { SdkAsyncResult } from '../../../core/result';

export type OpenGeocodingVendor = 'nominatim';

export interface OpenGeocodingAddressParts {
  readonly postcode?: string;
  readonly state?: string;
  readonly state_district?: string;
  readonly city?: string;
  readonly town?: string;
  readonly village?: string;
  readonly suburb?: string;
  readonly neighbourhood?: string;
  readonly road?: string;
  readonly country?: string;
  readonly country_code?: string;
}

export interface OpenGeocodingBackendResult {
  readonly lat: number;
  readonly lng: number;
  readonly displayName: string;
  readonly importance?: number;
  readonly address?: OpenGeocodingAddressParts;
}

export interface OpenGeocodingSearchParams {
  readonly query: string;
  readonly countryCodes?: string;
  readonly limit?: number;
}

export interface OpenGeocodingReverseParams {
  readonly lat: number;
  readonly lng: number;
}

/** Vendor-neutral geocoding backend (NominatimProvider implements this). */
export interface OpenGeocodingBackend {
  readonly vendor: OpenGeocodingVendor;
  search(params: OpenGeocodingSearchParams): SdkAsyncResult<OpenGeocodingBackendResult[]>;
  reverse(params: OpenGeocodingReverseParams): SdkAsyncResult<OpenGeocodingBackendResult>;
}

export interface OpenGeocodingHttpResponse {
  readonly status: number;
  readonly body: string;
}

/** HTTP transport — inject mock in tests; no real network in unit tests. */
export interface OpenGeocodingHttpPort {
  get(
    url: string,
    headers: Readonly<Record<string, string>>,
    timeoutMs: number
  ): SdkAsyncResult<OpenGeocodingHttpResponse>;
}

export interface OpenGeocodingCacheEntry<T> {
  readonly value: T;
  readonly expiresAtMs: number;
}

/** Cache hook — default in-memory; replace with Redis in future PRs. */
export interface OpenGeocodingCachePort {
  get<T>(key: string): SdkAsyncResult<T | null>;
  set<T>(key: string, value: T, ttlMs: number): SdkAsyncResult<void>;
}

/** Rate limit hook — default enforces Nominatim 1 req/s policy. */
export interface OpenGeocodingRateLimiterPort {
  acquire(): SdkAsyncResult<void>;
}

export interface CreateOpenGeocodingProviderOptions {
  readonly config?: Partial<import('./OpenGeocodingConfig').OpenGeocodingConfig>;
  readonly backend?: OpenGeocodingBackend;
  readonly http?: OpenGeocodingHttpPort;
  readonly cache?: OpenGeocodingCachePort;
  readonly rateLimiter?: OpenGeocodingRateLimiterPort;
}
