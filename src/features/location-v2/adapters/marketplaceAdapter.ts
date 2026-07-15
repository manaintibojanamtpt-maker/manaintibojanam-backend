import type { DeliveryAddressV2 } from '@bhojan/location-core';
import {
  getLocationStoreAddress,
  hydrateLocationStore,
  migrateActiveLocationFromObState,
  setLocationStoreAddress,
} from '@bhojan/location-core';
import { deliveryLocationOrchestrator } from '../DeliveryLocationOrchestrator';

type MarketplaceCustomerLocation = {
  kind?: string;
  displayLabel?: string;
  coordinates?: {
    lat?: number;
    lng?: number;
    accuracyM?: number;
    capturedAt?: string | number;
    source?: string;
  };
  serviceability?: DeliveryAddressV2['serviceability'] | {
    status?: 'unknown' | 'serviceable' | 'unserviceable' | 'pending';
    message?: string;
    checkedAt?: string;
    distanceKm?: number;
  };
};

export function marketplaceLocationToV2(location: MarketplaceCustomerLocation): DeliveryAddressV2 | null {
  return migrateActiveLocationFromObState(location);
}

export function v2ToMarketplaceLocation(address: DeliveryAddressV2): {
  kind: 'session' | 'saved';
  coordinates: {
    lat: number;
    lng: number;
    accuracyM?: number;
    source: 'gps' | 'map_pin' | 'geocode' | 'manual';
    capturedAt: string;
  };
  displayLabel: string;
  serviceability?: {
    status: 'unknown' | 'serviceable' | 'unserviceable' | 'pending';
    message?: string;
    checkedAt?: string;
    distanceKm?: number;
  };
} {
  return {
    kind: 'session',
    coordinates: {
      lat: address.coordinates.lat,
      lng: address.coordinates.lng,
      accuracyM: address.coordinates.accuracyM,
      source: address.coordinates.source === 'saved' ? 'manual' : 'gps',
      capturedAt: new Date(address.coordinates.capturedAt).toISOString(),
    },
    displayLabel: address.text.shortLabel,
    serviceability: address.serviceability
      ? {
          status: address.serviceability.isServiceable ? 'serviceable' : 'unserviceable',
          distanceKm: address.serviceability.distanceKm,
          message:
            address.serviceability.reason === 'OUT_OF_RADIUS'
              ? 'Outside delivery area'
              : undefined,
          checkedAt: new Date().toISOString(),
        }
      : undefined,
  };
}

export function hydrateMarketplaceFromUnifiedStore(): DeliveryAddressV2 | null {
  return hydrateLocationStore() ?? getLocationStoreAddress();
}

export function persistMarketplaceAddress(address: DeliveryAddressV2) {
  setLocationStoreAddress(address);
  return v2ToMarketplaceLocation(address);
}

export function configureMarketplaceLocationContext(input?: {
  kitchenId?: string;
  kitchenLat?: number;
  kitchenLng?: number;
  deliveryConfig?: {
    freeRadius?: number;
    paidRadius?: number;
    maxRadius?: number;
    baseFee?: number;
    perKmCharge?: number;
  } | null;
}): void {
  if (!input?.kitchenLat || !input?.kitchenLng) {
    deliveryLocationOrchestrator.setContext(null);
    return;
  }

  deliveryLocationOrchestrator.setContext({
    kitchenId: input.kitchenId || 'marketplace',
    kitchenLat: input.kitchenLat,
    kitchenLng: input.kitchenLng,
    deliveryConfig: input.deliveryConfig,
  });
}

export function getMarketplaceApiBaseUrl(): string {
  return (import.meta.env.VITE_API_URL || 'https://manaintibojanam-backend.onrender.com').replace(/\/$/, '');
}
