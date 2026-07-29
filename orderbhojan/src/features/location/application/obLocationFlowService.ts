import {
  detectLiveLocation,
  getLocationStoreAddress,
  hasConfirmedFlat,
  normalizeAddressText,
  setLocationStoreAddress,
  trackGeolocationFailure,
  trackOutOfRadius,
  trackReverseGeocodeFailure,
  type DeliveryAddressV2,
} from '@bhojan/location-core';
import { deliveryLocationOrchestrator } from '@bhojan/location-v2/DeliveryLocationOrchestrator';
import {
  getMarketplaceApiBaseUrl,
  persistMarketplaceAddress,
} from '@bhojan/location-v2/adapters/marketplaceAdapter';
import { checkServiceability } from '../infrastructure/marketplaceLocationClient';
import { useLocationSessionStore } from '../store/locationSessionStore';
import type { CustomerLocation, GeoCoordinates, SavedAddress } from '../domain/location.types';
import { LOCATION_ERROR_CODES, LocationError } from '../domain/location.errors';
import { applySessionLocation, loadRecentLocationEntries } from '../application/locationService';
import { useRestaurantContextStore } from '@/features/restaurant/store/restaurantContextStore';
import type { SavedAddressInput } from '../domain/location.schema';
import {
  DEFAULT_ADDRESS_CASCADE,
  ensureValidCascade,
  inferCascadeFromDisplayLabel,
  listAreas,
  listCities,
  listDistricts,
  listStates,
} from '../data/india/reference';

function locationStore() {
  return useLocationSessionStore.getState();
}

async function mapApiServiceability(
  lat: number,
  lng: number,
): Promise<DeliveryAddressV2['serviceability'] | undefined> {
  const restaurantId = useRestaurantContextStore.getState().restaurantId ?? undefined;
  try {
    const result = await checkServiceability({ lat, lng, restaurantId });
    return {
      isServiceable: result.delivery,
      distanceKm: result.distanceKm ?? 0,
      deliveryFee: 0,
      currency: 'INR',
      reason: result.delivery ? 'OK' : 'OUT_OF_RADIUS',
    };
  } catch {
    return undefined;
  }
}

async function reverseGeocodeCoords(
  lat: number,
  lng: number,
  geocodeEnabled: boolean,
): Promise<{ text: DeliveryAddressV2['text']; meta: DeliveryAddressV2['meta'] }> {
  if (!geocodeEnabled) {
    const label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    return {
      text: { formatted: label, shortLabel: label },
      meta: { provider: 'nominatim', precision: 'approx', capturedAt: Date.now() },
    };
  }
  return deliveryLocationOrchestrator.reverseGeocodeViaApi(lat, lng, getMarketplaceApiBaseUrl());
}

async function resolveServiceability(
  lat: number,
  lng: number,
): Promise<DeliveryAddressV2['serviceability'] | undefined> {
  const local = deliveryLocationOrchestrator.computeServiceabilityForCoords(lat, lng);
  if (local) {
    return local;
  }
  return mapApiServiceability(lat, lng);
}

function syncObStoreFromV2(address: DeliveryAddressV2, options?: { openConfirmation?: boolean }): CustomerLocation {
  const obLocation = persistMarketplaceAddress(address);
  const store = locationStore();
  store.setActiveLocation(obLocation);
  if (options?.openConfirmation) {
    store.setConfirmationOpen(!hasConfirmedFlat(address));
  } else {
    store.setConfirmationOpen(false);
  }
  return obLocation;
}

function toGeoCoordinates(coords: DeliveryAddressV2['coordinates']): GeoCoordinates {
  return {
    lat: coords.lat,
    lng: coords.lng,
    accuracyM: coords.accuracyM,
    source: coords.source === 'saved' ? 'manual' : 'gps',
    capturedAt: new Date(coords.capturedAt).toISOString(),
  };
}

export async function captureObGpsLocationDraft(geocodeEnabled: boolean): Promise<DeliveryAddressV2> {
  const gps = await detectLiveLocation();
  if (!gps.ok) {
    trackGeolocationFailure(gps.code, gps.message, 'marketplace');
    if (gps.code === 'PERMISSION_DENIED') {
      throw new LocationError(LOCATION_ERROR_CODES.PERMISSION_DENIED, gps.message, true);
    }
    if (gps.code === 'TIMEOUT') {
      throw new LocationError(
        LOCATION_ERROR_CODES.TIMEOUT,
        'Location request timed out. Enter your address manually or try again.',
        true,
      );
    }
    throw new LocationError(LOCATION_ERROR_CODES.UNAVAILABLE, gps.message, true);
  }

  try {
    const [geo, serviceability] = await Promise.all([
      reverseGeocodeCoords(gps.coords.lat, gps.coords.lng, geocodeEnabled),
      resolveServiceability(gps.coords.lat, gps.coords.lng),
    ]);

    if (serviceability && !serviceability.isServiceable) {
      trackOutOfRadius(
        serviceability.kitchenId || 'marketplace',
        serviceability.distanceKm,
        gps.coords.lat,
        gps.coords.lng,
        'marketplace',
      );
    }

    const draft: DeliveryAddressV2 = {
      version: 2,
      coordinates: gps.coords,
      text: geo.text,
      serviceability,
      meta: geo.meta,
    };

    setLocationStoreAddress(draft, { sessionOnly: true });
    syncObStoreFromV2(draft, { openConfirmation: true });
    return draft;
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Reverse geocode failed';
    const message =
      raw === 'Failed to fetch' || /networkerror/i.test(raw)
        ? 'Could not reach the location service. Check your connection and try again.'
        : raw;
    trackReverseGeocodeFailure(raw, 'marketplace');
    throw new LocationError(LOCATION_ERROR_CODES.UNAVAILABLE, message, true);
  }
}

export function confirmObLocationDraft(input: {
  flat?: string;
  building?: string;
  landmark?: string;
}): CustomerLocation | null {
  const address = getLocationStoreAddress();
  if (!address) {
    return null;
  }

  const finalAddress: DeliveryAddressV2 = {
    ...address,
    text: normalizeAddressText({
      ...address.text,
      flat: input.flat,
      building: input.building || address.text.building,
      landmark: input.landmark || address.text.landmark,
    }),
  };

  const obLocation = syncObStoreFromV2(finalAddress);
  locationStore().setRecentLocations(loadRecentLocationEntries());
  return obLocation;
}

export function v2ToSavedAddressInput(
  address: DeliveryAddressV2,
  label: SavedAddressInput['label'] = 'home',
): SavedAddressInput {
  const lookupLabel = [address.text.formatted, address.text.shortLabel, address.text.area, address.text.city]
    .filter(Boolean)
    .join(' ');
  const inferred = inferCascadeFromDisplayLabel(lookupLabel);
  const cascade = ensureValidCascade(inferred ?? DEFAULT_ADDRESS_CASCADE);

  const states = listStates();
  const districts = listDistricts(cascade.stateCode);
  const cities = listCities(cascade.districtCode);
  const areas = listAreas(cascade.cityCode);

  const state = states.find((entry) => entry.code === cascade.stateCode) ?? states[0]!;
  const district = districts.find((entry) => entry.code === cascade.districtCode) ?? districts[0]!;
  const city = cities.find((entry) => entry.code === cascade.cityCode) ?? cities[0]!;
  const area = areas.find((entry) => entry.code === cascade.areaCode) ?? areas[0]!;

  const pincode =
    address.text.pincode && /^[1-9][0-9]{5}$/.test(address.text.pincode)
      ? address.text.pincode
      : cascade.pincode;

  const streetParts = [address.text.flat, address.text.building].filter(Boolean).join(', ').trim();
  const formattedAddress = address.text.formatted || address.text.shortLabel || streetParts;
  const street = streetParts.length >= 3 ? streetParts : formattedAddress || streetParts || 'Delivery address';

  return {
    label,
    isDefault: false,
    address: {
      country: 'IN',
      stateCode: cascade.stateCode,
      stateName: state.name,
      districtCode: cascade.districtCode,
      districtName: district.name,
      cityCode: cascade.cityCode,
      cityName: city.name,
      areaCode: cascade.areaCode,
      areaName: area.name,
      pincode,
      street: street || formattedAddress,
      landmark: address.text.landmark,
      coordinates: toGeoCoordinates(address.coordinates),
      formattedAddress,
    },
  };
}

export function savedAddressToV2(saved: SavedAddress): DeliveryAddressV2 {
  const streetParts = saved.address.street.split(',').map((part) => part.trim());
  const flat = streetParts[0] || undefined;
  const building = streetParts.slice(1).join(', ').trim() || undefined;

  return {
    version: 2,
    coordinates: {
      lat: saved.address.coordinates.lat,
      lng: saved.address.coordinates.lng,
      accuracyM: saved.address.coordinates.accuracyM,
      source: 'saved',
      capturedAt: Date.parse(saved.address.coordinates.capturedAt) || Date.now(),
    },
    text: normalizeAddressText({
      flat,
      building,
      landmark: saved.address.landmark,
      formatted: saved.address.formattedAddress || saved.address.street,
      shortLabel: saved.customLabel ?? saved.label,
      city: saved.address.cityName,
      state: saved.address.stateName,
      pincode: saved.address.pincode,
    }),
    meta: {
      provider: 'nominatim',
      precision: 'exact',
      capturedAt: Date.now(),
    },
  };
}

export async function applyObRecentLocation(
  coordinates: GeoCoordinates,
  displayLabel: string,
  geocodeEnabled: boolean,
): Promise<CustomerLocation> {
  const geo = await reverseGeocodeCoords(coordinates.lat, coordinates.lng, geocodeEnabled);
  const serviceability = await resolveServiceability(coordinates.lat, coordinates.lng);

  const draft: DeliveryAddressV2 = {
    version: 2,
    coordinates: {
      lat: coordinates.lat,
      lng: coordinates.lng,
      accuracyM: coordinates.accuracyM,
      source: 'saved',
      capturedAt: Date.parse(coordinates.capturedAt) || Date.now(),
    },
    text: normalizeAddressText({
      ...geo.text,
      shortLabel: displayLabel || geo.text.shortLabel,
    }),
    serviceability,
    meta: geo.meta,
  };

  setLocationStoreAddress(draft, { sessionOnly: true });
  await applySessionLocation(coordinates, displayLabel, { geocodeEnabled });
  return syncObStoreFromV2(draft, { openConfirmation: true });
}

export async function applyObSavedAddress(
  saved: SavedAddress,
  geocodeEnabled: boolean,
): Promise<CustomerLocation> {
  const draft = savedAddressToV2(saved);
  const serviceability = await resolveServiceability(draft.coordinates.lat, draft.coordinates.lng);
  const withServiceability: DeliveryAddressV2 = { ...draft, serviceability };
  setLocationStoreAddress(withServiceability, { sessionOnly: true });

  const applied = await applySessionLocation(
    toGeoCoordinates(withServiceability.coordinates),
    saved.customLabel ?? saved.label,
    { savedAddressId: saved.id, geocodeEnabled },
  );

  const obLocation: CustomerLocation = {
    ...applied,
    kind: 'saved',
    savedAddressId: saved.id,
  };

  syncObStoreFromV2(withServiceability, { openConfirmation: true });
  locationStore().setActiveLocation(obLocation);
  return obLocation;
}
