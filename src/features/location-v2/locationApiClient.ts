const DEFAULT_API_BASE = 'https://manaintibojanam-backend.onrender.com';

export function getLocationApiBaseUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return String(import.meta.env.VITE_API_URL).replace(/\/$/, '');
  }
  return DEFAULT_API_BASE;
}

export async function fetchReverseGeocodeLabel(lat: number, lng: number): Promise<string> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  const response = await fetch(`${getLocationApiBaseUrl()}/api/location/reverse?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Reverse geocode failed: ${response.status}`);
  }

  const body = (await response.json()) as {
    ok: boolean;
    value?: { displayLabel?: string; text?: { shortLabel?: string; formatted?: string } };
  };

  return body.value?.displayLabel || body.value?.text?.shortLabel || body.value?.text?.formatted || 'Location Selected';
}

export type LocationSearchResult = {
  lat: number;
  lng: number;
  displayName: string;
};

export async function fetchLocationSearch(query: string, limit = 5): Promise<LocationSearchResult[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit), countryCodes: 'in' });
  const response = await fetch(`${getLocationApiBaseUrl()}/api/location/search?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Location search failed: ${response.status}`);
  }

  const body = (await response.json()) as { ok: boolean; value?: LocationSearchResult[] };
  return body.value ?? [];
}
