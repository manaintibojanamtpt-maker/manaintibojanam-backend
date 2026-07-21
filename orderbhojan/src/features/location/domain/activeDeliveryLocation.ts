import { getLocationStoreAddress } from '@bhojan/location-core';
import type { CustomerLocation } from './location.types';
import { hydrateObLocationFromV2 } from '../unifiedLocationSync';

const LOCATION_SESSION_STORAGE_KEY = 'ob-location-session-v1';

export type ActiveDeliveryLocationMode = 'current' | 'selected';

export type ActiveDeliveryCoordinateSource = 'gps' | 'saved' | 'search' | 'manual';

export type ActiveDeliveryLocation = {
  mode: ActiveDeliveryLocationMode;
  coordinates: {
    lat: number;
    lng: number;
    accuracyM?: number;
    capturedAt: number;
    source: ActiveDeliveryCoordinateSource;
  };
  text: {
    shortLabel: string;
    formatted?: string;
  };
  isConfirmed: boolean;
};

function isUsableCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

function parseCapturedAt(value: string | number | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
}

function mapCoordinateSource(
  source: CustomerLocation['coordinates']['source'],
  kind: CustomerLocation['kind'],
): ActiveDeliveryCoordinateSource {
  if (source === 'gps') return 'gps';
  if (kind === 'saved') return 'saved';
  if (source === 'geocode') return 'search';
  return 'manual';
}

function resolveMode(location: CustomerLocation): ActiveDeliveryLocationMode {
  if (location.kind === 'saved') return 'selected';
  if (location.coordinates.source === 'gps') return 'current';
  return 'selected';
}

function readPersistedActiveLocation(): CustomerLocation | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCATION_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      state?: { activeLocation?: CustomerLocation | null };
    };
    return parsed.state?.activeLocation ?? null;
  } catch {
    return null;
  }
}

/** Sync read before zustand persist rehydrates — matches bootstrap warm-start coords. */
export function readPersistedActiveLocationCoords(): { lat: number; lng: number } | null {
  const location = readPersistedActiveLocation();
  if (!location?.coordinates) return null;
  const { lat, lng } = location.coordinates;
  if (!isUsableCoord(lat, lng)) return null;
  return { lat, lng };
}

/** Minimal input accepted by legacy coord resolvers. */
export type ActiveDeliveryLocationInput =
  | CustomerLocation
  | {
      coordinates: { lat: number; lng: number };
    }
  | null
  | undefined;

function asCustomerLocation(input: ActiveDeliveryLocationInput): CustomerLocation | null {
  if (!input) return null;
  if ('kind' in input && 'displayLabel' in input) return input;
  const { lat, lng } = input.coordinates;
  if (!isUsableCoord(lat, lng)) return null;
  return {
    kind: 'session',
    displayLabel: 'Delivery location',
    coordinates: {
      lat,
      lng,
      source: 'manual',
      capturedAt: new Date().toISOString(),
    },
  };
}
function fromCustomerLocation(location: CustomerLocation): ActiveDeliveryLocation | null {
  const { lat, lng } = location.coordinates;
  if (!isUsableCoord(lat, lng)) return null;

  const v2 = getLocationStoreAddress();
  const latMatch =
    v2 != null && Math.abs(v2.coordinates.lat - lat) < 0.0001 && Math.abs(v2.coordinates.lng - lng) < 0.0001;
  const shortLabel =
    (latMatch ? v2?.text?.shortLabel?.trim() : undefined) ||
    location.displayLabel?.trim() ||
    'Delivery location';
  const formatted = latMatch ? v2?.text?.formatted?.trim() || undefined : undefined;

  return {
    mode: resolveMode(location),
    coordinates: {
      lat,
      lng,
      accuracyM: location.coordinates.accuracyM,
      capturedAt: parseCapturedAt(location.coordinates.capturedAt),
      source: mapCoordinateSource(location.coordinates.source, location.kind),
    },
    text: { shortLabel, formatted },
    isConfirmed: true,
  };
}

/** Single source of truth for marketplace delivery location — no city fallbacks. */
export function resolveActiveDeliveryLocation(
  activeLocation?: ActiveDeliveryLocationInput,
): ActiveDeliveryLocation | null {
  const direct = asCustomerLocation(activeLocation ?? null);
  if (direct) {
    return fromCustomerLocation(direct);
  }

  const persisted = readPersistedActiveLocation();
  if (persisted) {
    return fromCustomerLocation(persisted);
  }

  const fromV2 = hydrateObLocationFromV2();
  if (fromV2) {
    return fromCustomerLocation(fromV2);
  }

  return null;
}

export function resolveActiveDeliveryCoords(
  activeLocation?: ActiveDeliveryLocationInput,
): { lat: number; lng: number } | null {
  const location = resolveActiveDeliveryLocation(activeLocation);
  if (!location?.isConfirmed) return null;
  return { lat: location.coordinates.lat, lng: location.coordinates.lng };
}

export function activeDeliveryLocationLabel(location: ActiveDeliveryLocation): string {
  if (location.mode === 'current') {
    return `Current location · ${location.text.shortLabel}`;
  }
  return location.text.shortLabel;
}
