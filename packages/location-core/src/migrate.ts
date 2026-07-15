import { normalizeAddressText, normalizeCoordinates } from './normalize.js';
import type { DeliveryAddressV2 } from './types.js';
import { DELIVERY_ADDRESS_VERSION } from './types.js';

export function migrateLegacyFounderState(raw: unknown): DeliveryAddressV2 | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as {
    selectedAddress?: {
      lat?: number;
      lng?: number;
      houseNumber?: string;
      house?: string;
      buildingName?: string;
      building?: string;
      landmark?: string;
      address?: string;
      addressText?: string;
      distanceKm?: number;
      deliveryFee?: number;
    };
  };

  const selected = record.selectedAddress;
  const coordinates = normalizeCoordinates({
    lat: selected?.lat,
    lng: selected?.lng,
    source: 'saved',
    capturedAt: Date.now(),
  });

  if (!coordinates) {
    return null;
  }

  const flat = selected?.houseNumber || selected?.house;
  const building = selected?.buildingName || selected?.building;
  const landmark = selected?.landmark;
  const formatted =
    [flat, building, landmark, selected?.addressText || selected?.address]
      .filter(Boolean)
      .join(', ') || 'Saved location';

  return {
    version: DELIVERY_ADDRESS_VERSION,
    coordinates,
    text: normalizeAddressText({
      flat,
      building,
      landmark,
      formatted,
      shortLabel: landmark || selected?.addressText || 'Saved location',
    }),
    serviceability: {
      isServiceable: true,
      distanceKm: selected?.distanceKm ?? 0,
      deliveryFee: selected?.deliveryFee ?? 0,
      currency: 'INR',
      reason: 'OK',
    },
    meta: {
      provider: 'nominatim',
      precision: 'approx',
      capturedAt: Date.now(),
    },
  };
}

export function migrateLegacyOrderBhojanState(raw: unknown): DeliveryAddressV2 | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as {
    kind?: string;
    displayLabel?: string;
    coordinates?: {
      lat?: number;
      lng?: number;
      capturedAt?: string | number;
      source?: string;
    };
    serviceability?: DeliveryAddressV2['serviceability'];
  };

  const capturedAt =
    typeof record.coordinates?.capturedAt === 'string'
      ? Date.parse(record.coordinates.capturedAt)
      : typeof record.coordinates?.capturedAt === 'number'
        ? record.coordinates.capturedAt
        : Date.now();

  const coordinates = normalizeCoordinates({
    lat: record.coordinates?.lat,
    lng: record.coordinates?.lng,
    source: record.kind === 'saved' ? 'saved' : 'gps',
    capturedAt: Number.isFinite(capturedAt) ? capturedAt : Date.now(),
  });

  if (!coordinates) {
    return null;
  }

  return {
    version: DELIVERY_ADDRESS_VERSION,
    coordinates,
    text: normalizeAddressText({
      formatted: record.displayLabel || 'Saved location',
      shortLabel: record.displayLabel || 'Saved location',
    }),
    serviceability: record.serviceability,
    meta: {
      provider: 'nominatim',
      precision: 'approx',
      capturedAt: Date.now(),
    },
  };
}

export function migrateLegacyObGuestState(raw: unknown): DeliveryAddressV2 | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as {
    coordinates?: { lat?: number; lng?: number; capturedAt?: string };
    displayLabel?: string;
  };

  const capturedAt = record.coordinates?.capturedAt
    ? Date.parse(record.coordinates.capturedAt)
    : Date.now();

  const coordinates = normalizeCoordinates({
    lat: record.coordinates?.lat,
    lng: record.coordinates?.lng,
    source: 'gps',
    capturedAt: Number.isFinite(capturedAt) ? capturedAt : Date.now(),
  });

  if (!coordinates) {
    return null;
  }

  return {
    version: DELIVERY_ADDRESS_VERSION,
    coordinates,
    text: normalizeAddressText({
      formatted: record.displayLabel || 'Saved location',
      shortLabel: record.displayLabel || 'Saved location',
    }),
    meta: {
      provider: 'nominatim',
      precision: 'approx',
      capturedAt: Date.now(),
    },
  };
}

export function migrateLegacyObSessionPersisted(raw: unknown): DeliveryAddressV2 | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as {
    state?: { activeLocation?: unknown };
  };

  if (record.state?.activeLocation) {
    return migrateLegacyOrderBhojanState(record.state.activeLocation);
  }

  return null;
}
