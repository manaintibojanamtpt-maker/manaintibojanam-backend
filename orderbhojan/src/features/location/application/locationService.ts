import type { CustomerLocation, GeoCoordinates, SavedAddress } from '../domain/location.types';
import type { SavedAddressInput } from '../domain/location.schema';
import { getCurrentPosition, isGeolocationSupported } from './geolocationService';
import {
  deleteSavedAddress,
  listSavedAddresses,
  saveAddress,
  setDefaultAddress,
} from '../infrastructure/firestoreAddressRepo';
import {
  clearGuestLocation,
  pushRecentLocation,
  readGuestLocation,
  readRecentLocations,
  writeGuestLocation,
} from '../infrastructure/localSessionLocation';
import {
  checkServiceability,
  reverseGeocode,
} from '../infrastructure/marketplaceLocationClient';
import { LOCATION_ERROR_CODES, LocationError } from '../domain/location.errors';

export async function detectCurrentCoordinates(): Promise<GeoCoordinates> {
  if (!isGeolocationSupported()) {
    throw new LocationError(LOCATION_ERROR_CODES.UNAVAILABLE, 'Geolocation is not supported on this device');
  }
  const result = await getCurrentPosition();
  return result.coordinates;
}

export async function resolveLocationLabel(coordinates: GeoCoordinates, geocodeEnabled: boolean): Promise<string> {
  if (!geocodeEnabled) {
    return `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`;
  }
  try {
    const result = await reverseGeocode({ lat: coordinates.lat, lng: coordinates.lng });
    return result.displayLabel;
  } catch {
    return `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`;
  }
}

export async function applySessionLocation(
  coordinates: GeoCoordinates,
  displayLabel: string,
  options?: { savedAddressId?: string; geocodeEnabled?: boolean },
): Promise<CustomerLocation> {
  let label = displayLabel;
  if (!label && options?.geocodeEnabled) {
    label = await resolveLocationLabel(coordinates, true);
  }

  const location: CustomerLocation = {
    kind: options?.savedAddressId ? 'saved' : 'session',
    coordinates,
    displayLabel: label || 'Current location',
    savedAddressId: options?.savedAddressId,
  };

  pushRecentLocation(location.displayLabel, coordinates);
  writeGuestLocation({
    version: 1,
    coordinates,
    displayLabel: location.displayLabel,
  });

  return location;
}

export function hydrateGuestSessionLocation(): CustomerLocation | null {
  const guest = readGuestLocation();
  if (!guest) return null;
  return {
    kind: 'session',
    coordinates: guest.coordinates,
    displayLabel: guest.displayLabel,
  };
}

export function loadRecentLocationEntries() {
  return readRecentLocations().map((entry) => ({
    id: entry.id,
    displayLabel: entry.displayLabel,
    coordinates: entry.coordinates,
    usedAt: entry.usedAt,
  }));
}

export async function fetchSavedAddresses(uid: string): Promise<SavedAddress[]> {
  return listSavedAddresses(uid);
}

export async function createSavedAddress(uid: string, input: SavedAddressInput): Promise<SavedAddress> {
  return saveAddress(uid, input);
}

export async function removeSavedAddress(uid: string, addressId: string): Promise<void> {
  return deleteSavedAddress(uid, addressId);
}

export async function markDefaultAddress(uid: string, addressId: string): Promise<SavedAddress> {
  return setDefaultAddress(uid, addressId);
}

export async function previewServiceability(
  coordinates: GeoCoordinates,
  geocodeEnabled: boolean,
): Promise<CustomerLocation> {
  const displayLabel = await resolveLocationLabel(coordinates, geocodeEnabled);
  let serviceability: CustomerLocation['serviceability'];

  if (geocodeEnabled) {
    try {
      const result = await checkServiceability({ lat: coordinates.lat, lng: coordinates.lng });
      serviceability = {
        status: result.delivery ? 'serviceable' : 'unserviceable',
        message: result.message,
        distanceKm: result.distanceKm,
        checkedAt: new Date().toISOString(),
      };
    } catch {
      serviceability = { status: 'unknown' };
    }
  }

  return {
    kind: 'session',
    coordinates,
    displayLabel,
    serviceability,
  };
}

export function clearSessionLocationStorage(): void {
  clearGuestLocation();
}
