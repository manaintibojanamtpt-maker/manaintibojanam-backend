/**
 * LocationSDK — Open Geocoding configuration (M2 PR-8).
 * Vendor-neutral settings; Nominatim is the default backend.
 */

import type { CountryCode, GeohashPrecision } from '../../types/branded';

export const DEFAULT_NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org' as const;

/** Nominatim usage policy requires a valid identifying User-Agent. */
export const DEFAULT_OPEN_GEOCODING_USER_AGENT =
  'BhojanOS-LocationSDK/1.0.0-open-geocoding (https://bhojanos.com; location-sdk@bhojanos.com)' as const;

export const DEFAULT_OPEN_GEOCODING_TIMEOUT_MS = 8_000;
export const DEFAULT_OPEN_GEOCODING_MAX_RETRIES = 2;
export const DEFAULT_OPEN_GEOCODING_RETRY_DELAY_MS = 1_100;
/** Nominatim public instance: max 1 request per second. */
export const DEFAULT_OPEN_GEOCODING_MIN_INTERVAL_MS = 1_100;
export const DEFAULT_OPEN_GEOCODING_GEOHASH_PRECISION = 7 as GeohashPrecision;
export const DEFAULT_OPEN_GEOCODING_COUNTRY: CountryCode = 'IN';

export interface OpenGeocodingConfig {
  readonly userAgent: string;
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly retryDelayMs: number;
  readonly minRequestIntervalMs: number;
  readonly defaultCountryCode: CountryCode;
  readonly geohashPrecision: GeohashPrecision;
}

export const DEFAULT_OPEN_GEOCODING_CONFIG: OpenGeocodingConfig = {
  userAgent: DEFAULT_OPEN_GEOCODING_USER_AGENT,
  baseUrl: DEFAULT_NOMINATIM_BASE_URL,
  timeoutMs: DEFAULT_OPEN_GEOCODING_TIMEOUT_MS,
  maxRetries: DEFAULT_OPEN_GEOCODING_MAX_RETRIES,
  retryDelayMs: DEFAULT_OPEN_GEOCODING_RETRY_DELAY_MS,
  minRequestIntervalMs: DEFAULT_OPEN_GEOCODING_MIN_INTERVAL_MS,
  defaultCountryCode: DEFAULT_OPEN_GEOCODING_COUNTRY,
  geohashPrecision: DEFAULT_OPEN_GEOCODING_GEOHASH_PRECISION,
};

export function resolveOpenGeocodingConfig(
  partial?: Partial<OpenGeocodingConfig>
): OpenGeocodingConfig {
  return {
    ...DEFAULT_OPEN_GEOCODING_CONFIG,
    ...partial,
  };
}
