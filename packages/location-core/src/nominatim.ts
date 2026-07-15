import type { AddressText, DeliveryAddressMeta } from './types.js';

export type NominatimAddressFields = {
  house_name?: string;
  building?: string;
  amenity?: string;
  suburb?: string;
  neighbourhood?: string;
  city_district?: string;
  quarter?: string;
  city?: string;
  town?: string;
  municipality?: string;
  village?: string;
  county?: string;
  state_district?: string;
  road?: string;
  pedestrian?: string;
  state?: string;
  postcode?: string;
  country?: string;
};

export type NominatimReverseResponse = {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  name?: string;
  display_name?: string;
  address?: NominatimAddressFields;
};

export function normalizeNominatimToAddressText(raw: NominatimReverseResponse): AddressText {
  const a = raw?.address ?? {};
  const building = a.house_name || a.building || a.amenity || undefined;
  const area = a.suburb || a.neighbourhood || a.city_district || a.quarter || undefined;
  const city = a.city || a.town || a.municipality || a.village || undefined;
  const district = a.county || a.state_district || undefined;
  const road = a.road || a.pedestrian || undefined;
  const state = a.state || undefined;
  const pincode = a.postcode || undefined;
  const country = a.country || undefined;
  const shortLabel = [area, city].filter(Boolean).join(', ') || raw?.name || 'Current location';
  const formatted = [building, road, area, city, state, pincode].filter(Boolean).join(', ');

  return {
    flat: undefined,
    building,
    landmark: raw?.name || building || road || area,
    road,
    suburb: a.suburb || undefined,
    area,
    city,
    district,
    state,
    pincode,
    country,
    formatted: formatted || raw?.display_name || shortLabel,
    shortLabel,
  };
}

export function nominatimMetaFromResponse(
  raw: NominatimReverseResponse,
  cacheKey?: string,
): DeliveryAddressMeta {
  const hasRoad = Boolean(raw?.address?.road || raw?.address?.pedestrian);
  const hasBuilding = Boolean(raw?.address?.building || raw?.address?.house_name);

  return {
    provider: 'nominatim',
    precision: hasBuilding ? 'exact' : hasRoad ? 'nearby' : 'approx',
    cacheKey,
    placeId: raw?.place_id,
    osmType: raw?.osm_type,
    osmId: raw?.osm_id,
    capturedAt: Date.now(),
  };
}

export type ReverseGeocodeApiResponse = {
  ok: boolean;
  value?: {
    text: AddressText;
    meta: DeliveryAddressMeta;
    displayLabel: string;
  };
  error?: { code: string; message: string; retryable?: boolean };
};

export interface ReverseGeocodeProvider {
  reverse(input: { lat: number; lng: number; language?: string }): Promise<{
    text: AddressText;
    meta: DeliveryAddressMeta;
    displayLabel: string;
  }>;
}

export class BackendReverseGeocodeProvider implements ReverseGeocodeProvider {
  constructor(private readonly apiBaseUrl: string) {}

  async reverse(input: { lat: number; lng: number; language?: string }): Promise<{
    text: AddressText;
    meta: DeliveryAddressMeta;
    displayLabel: string;
  }> {
    const params = new URLSearchParams({
      lat: String(input.lat),
      lng: String(input.lng),
    });
    if (input.language) {
      params.set('language', input.language);
    }

    const url = `${this.apiBaseUrl.replace(/\/$/, '')}/api/location/reverse?${params.toString()}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Reverse geocode failed: ${response.status}`);
    }

    const body = (await response.json()) as ReverseGeocodeApiResponse;
    if (!body.ok || !body.value) {
      throw new Error(body.error?.message || 'Reverse geocode failed');
    }

    return body.value;
  }
}
