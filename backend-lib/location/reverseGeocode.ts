import {
  nominatimMetaFromResponse,
  normalizeNominatimToAddressText,
  type NominatimReverseResponse,
} from '../../packages/location-core/src/nominatim.js';
import type { AddressText, DeliveryAddressMeta } from '../../packages/location-core/src/types.js';
import { getCachedReverseGeocode, setCachedReverseGeocode, toRoundedCacheKey } from './cache.js';
import { withNominatimRateLimit } from './rateLimit.js';

export const NOMINATIM_USER_AGENT = 'BhojanOS/1.0 (location-service support@bhojanos.com)';

export type ReverseGeocodeInput = {
  lat: number;
  lng: number;
  language?: string;
};

export type ReverseGeocodeResult = {
  text: AddressText;
  meta: DeliveryAddressMeta;
  displayLabel: string;
  cacheKey: string;
};

export type NominatimFetchPort = (url: string, init: RequestInit) => Promise<Response>;

const defaultFetch: NominatimFetchPort = (url, init) => fetch(url, init);

export async function reverseGeocodeWithNominatim(
  input: ReverseGeocodeInput,
  fetchPort: NominatimFetchPort = defaultFetch,
): Promise<NominatimReverseResponse> {
  const { lat, lng, language = 'en' } = input;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw Object.assign(new Error('lat and lng are required'), { statusCode: 400 });
  }

  const qs = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    lat: String(lat),
    lon: String(lng),
    'accept-language': language,
    zoom: '18',
  });

  const url = `https://nominatim.openstreetmap.org/reverse?${qs.toString()}`;

  const res = await withNominatimRateLimit(() =>
    fetchPort(url, {
      headers: {
        'User-Agent': NOMINATIM_USER_AGENT,
        Accept: 'application/json',
      },
    }),
  );

  if (!res.ok) {
    throw Object.assign(new Error(`Nominatim reverse failed: ${res.status}`), {
      statusCode: res.status >= 500 ? 502 : res.status,
      retryable: res.status >= 500,
    });
  }

  return (await res.json()) as NominatimReverseResponse;
}

export async function reverseGeocode(
  input: ReverseGeocodeInput,
  fetchPort?: NominatimFetchPort,
): Promise<ReverseGeocodeResult> {
  const cacheKey = toRoundedCacheKey(input.lat, input.lng);
  const cached = getCachedReverseGeocode<ReverseGeocodeResult>(cacheKey);
  if (cached) {
    return cached;
  }

  const raw = await reverseGeocodeWithNominatim(input, fetchPort);
  const text = normalizeNominatimToAddressText(raw);
  const meta = nominatimMetaFromResponse(raw, cacheKey);

  const result: ReverseGeocodeResult = {
    text,
    meta,
    displayLabel: text.shortLabel,
    cacheKey,
  };

  setCachedReverseGeocode(cacheKey, result);
  return result;
}
