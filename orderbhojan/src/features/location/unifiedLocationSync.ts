import {
  getLocationStoreAddress,
  hydrateLocationStore,
  setLocationStoreAddress,
  type DeliveryAddressV2,
} from '@bhojan/location-core';
import {
  marketplaceLocationToV2,
  persistMarketplaceAddress,
  v2ToMarketplaceLocation,
} from '@bhojan/location-v2/adapters/marketplaceAdapter';
import type { CustomerLocation } from './domain/location.types';

export function hydrateObLocationFromV2(): CustomerLocation | null {
  const address = hydrateLocationStore() ?? getLocationStoreAddress();
  if (!address) {
    return null;
  }
  return v2ToMarketplaceLocation(address);
}

export function syncObActiveLocationToV2(location: CustomerLocation | null): DeliveryAddressV2 | null {
  if (!location) {
    return null;
  }
  const migrated = marketplaceLocationToV2(location);
  if (migrated) {
    setLocationStoreAddress(migrated);
  }
  return migrated;
}

export function persistObLocation(location: CustomerLocation): CustomerLocation {
  const address = marketplaceLocationToV2(location);
  if (!address) {
    return location;
  }
  return persistMarketplaceAddress(address);
}
