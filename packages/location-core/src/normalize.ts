import type { AddressText, Coordinates, DeliveryAddressV2 } from './types.js';
import { DELIVERY_ADDRESS_VERSION } from './types.js';

const WGS84_LAT_MIN = -90;
const WGS84_LAT_MAX = 90;
const WGS84_LNG_MIN = -180;
const WGS84_LNG_MAX = 180;

export function isValidCoordinatePair(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= WGS84_LAT_MIN &&
    lat <= WGS84_LAT_MAX &&
    lng >= WGS84_LNG_MIN &&
    lng <= WGS84_LNG_MAX &&
    !(lat === 0 && lng === 0)
  );
}

export function normalizeCoordinates(input: Partial<Coordinates> | null | undefined): Coordinates | null {
  if (!input) {
    return null;
  }

  const { lat, lng } = input;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !isValidCoordinatePair(lat, lng)) {
    return null;
  }

  return {
    lat,
    lng,
    accuracyM: typeof input.accuracyM === 'number' ? input.accuracyM : undefined,
    source: input.source ?? 'manual',
    capturedAt: typeof input.capturedAt === 'number' ? input.capturedAt : Date.now(),
  };
}

export function buildDeliveryAddressLine(text: Partial<AddressText> | null | undefined): string {
  if (!text) return '';

  const flat = text.flat?.trim();
  const building = text.building?.trim();
  const landmark = text.landmark?.trim();
  const area = text.area?.trim() || text.suburb?.trim();
  const city = text.city?.trim();
  const detailParts = [flat, building, landmark].filter(Boolean);
  const areaParts = [area, city].filter(Boolean);

  if (detailParts.length > 0) {
    const line = detailParts.join(', ');
    return areaParts.length > 0 ? `${line}, ${areaParts.join(', ')}` : line;
  }

  return text.formatted?.trim() || text.shortLabel?.trim() || areaParts.join(', ') || '';
}

export function normalizeAddressText(input: Partial<AddressText> | null | undefined): AddressText {
  const area = input?.area?.trim() || input?.suburb?.trim() || undefined;
  const city = input?.city?.trim() || undefined;
  const formatted = String(input?.formatted ?? '').trim();
  const shortLabel = String(input?.shortLabel ?? '').trim();
  const derivedShortLabel = [area, city].filter(Boolean).join(', ');
  const builtLine = buildDeliveryAddressLine(input);
  const hasFlat = Boolean(input?.flat?.trim());

  return {
    flat: input?.flat?.trim() || undefined,
    building: input?.building?.trim() || undefined,
    landmark: input?.landmark?.trim() || undefined,
    road: input?.road?.trim() || undefined,
    suburb: input?.suburb?.trim() || undefined,
    area,
    city,
    district: input?.district?.trim() || undefined,
    state: input?.state?.trim() || undefined,
    pincode: input?.pincode?.trim() || undefined,
    country: input?.country?.trim() || undefined,
    formatted:
      hasFlat && builtLine
        ? builtLine
        : formatted || derivedShortLabel || shortLabel || 'Current location',
    shortLabel:
      hasFlat && builtLine
        ? builtLine
        : shortLabel || derivedShortLabel || formatted || 'Current location',
  };
}

export function parseDeliveryAddressV2(raw: unknown): DeliveryAddressV2 | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Partial<DeliveryAddressV2>;
  if (record.version !== DELIVERY_ADDRESS_VERSION) {
    return null;
  }

  const coordinates = normalizeCoordinates(record.coordinates);
  if (!coordinates) {
    return null;
  }

  if (!record.meta || record.meta.provider !== 'nominatim') {
    return null;
  }

  return {
    version: DELIVERY_ADDRESS_VERSION,
    coordinates,
    text: normalizeAddressText(record.text),
    serviceability: record.serviceability,
    meta: {
      provider: 'nominatim',
      precision: record.meta.precision ?? 'approx',
      cacheKey: record.meta.cacheKey,
      geohash: record.meta.geohash,
      placeId: record.meta.placeId,
      osmType: record.meta.osmType,
      osmId: record.meta.osmId,
      capturedAt: record.meta.capturedAt ?? Date.now(),
    },
  };
}

export function toRoundedCacheKey(lat: number, lng: number): string {
  return `rev:${lat.toFixed(5)}:${lng.toFixed(5)}`;
}

export function hasConfirmedFlat(address: DeliveryAddressV2 | null | undefined): boolean {
  return Boolean(address?.text?.flat?.trim());
}

export function hasValidDeliveryCoordinates(address: DeliveryAddressV2 | null | undefined): boolean {
  return Boolean(address && normalizeCoordinates(address.coordinates));
}
