import { withNominatimRateLimit } from './rateLimit.js';

export const NOMINATIM_USER_AGENT = 'BhojanOS/1.0 (location-service support@bhojanos.com)';

export type ForwardGeocodeInput = {
  query: string;
  limit?: number;
  countryCodes?: string;
};

export type ForwardGeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
};

export type NominatimFetchPort = (url: string, init: RequestInit) => Promise<Response>;

const defaultFetch: NominatimFetchPort = (url, init) => fetch(url, init);

export async function forwardGeocodeWithNominatim(
  input: ForwardGeocodeInput,
  fetchPort: NominatimFetchPort = defaultFetch,
): Promise<ForwardGeocodeResult[]> {
  const query = String(input.query ?? '').trim();
  if (!query) {
    throw Object.assign(new Error('query is required'), { statusCode: 400 });
  }

  const qs = new URLSearchParams({
    format: 'jsonv2',
    q: query,
    limit: String(Math.min(Math.max(input.limit ?? 5, 1), 10)),
    addressdetails: '1',
  });
  if (input.countryCodes) {
    qs.set('countrycodes', input.countryCodes);
  }

  const url = `https://nominatim.openstreetmap.org/search?${qs.toString()}`;
  const res = await withNominatimRateLimit(() =>
    fetchPort(url, {
      headers: {
        'User-Agent': NOMINATIM_USER_AGENT,
        Accept: 'application/json',
      },
    }),
  );

  if (!res.ok) {
    throw Object.assign(new Error(`Nominatim search failed: ${res.status}`), {
      statusCode: res.status >= 500 ? 502 : res.status,
      retryable: res.status >= 500,
    });
  }

  const parsed = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((entry) => ({
      lat: Number(entry.lat),
      lng: Number(entry.lon),
      displayName: entry.display_name,
    }))
    .filter((entry) => Number.isFinite(entry.lat) && Number.isFinite(entry.lng));
}
