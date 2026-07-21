import {
  readPersistedActiveLocationCoords,
  resolveActiveDeliveryCoords,
} from '@/features/location/domain/activeDeliveryLocation';

/** @deprecated Use resolveActiveDeliveryCoords from activeDeliveryLocation */
export { readPersistedActiveLocationCoords };

/** @deprecated Use DEFAULT_MARKETPLACE_COORDS from @/lib/marketplaceDefaults for UI copy only — not API calls */
export { DEFAULT_MARKETPLACE_COORDS as DEFAULT_DISCOVERY_COORDS } from '@/lib/marketplaceDefaults';

/**
 * Returns confirmed delivery coordinates or null — never falls back to Pune/Hyderabad.
 * @deprecated Prefer resolveActiveDeliveryLocation / resolveActiveDeliveryCoords.
 */
export function resolveDeliveryCoords(activeLocation?: import('./domain/activeDeliveryLocation').ActiveDeliveryLocationInput): { lat: number; lng: number } | null {
  return resolveActiveDeliveryCoords(activeLocation);
}

/** @deprecated Use resolveActiveDeliveryCoords */
export const resolveDiscoveryCoords = resolveDeliveryCoords;

/** @deprecated Use resolveActiveDeliveryCoords */
export const resolveRestaurantCoords = resolveDeliveryCoords;
