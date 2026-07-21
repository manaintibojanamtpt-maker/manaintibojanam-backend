import type { CustomerLocation } from './location.types';
import {
  getLocationStoreAddress,
  hasValidDeliveryCoordinates,
  resolveDeliveryLocationGate,
  type DeliveryLocationGateState,
} from '@bhojan/location-core';
import { marketplaceLocationToV2 } from '@bhojan/location-v2/adapters/marketplaceAdapter';
import { resolveActiveDeliveryLocation } from './activeDeliveryLocation';

export function hasActiveDeliveryLocation(
  activeLocation: CustomerLocation | null | undefined,
): boolean {
  return resolveActiveDeliveryLocation(activeLocation) != null;
}
function resolveGateFromActiveLocation(
  activeLocation: CustomerLocation | null | undefined,
): DeliveryLocationGateState {
  if (!activeLocation) {
    return 'no_coords';
  }

  const v2FromStore = getLocationStoreAddress();
  if (v2FromStore) {
    const latMatch =
      Math.abs(v2FromStore.coordinates.lat - activeLocation.coordinates.lat) < 0.0001;
    const lngMatch =
      Math.abs(v2FromStore.coordinates.lng - activeLocation.coordinates.lng) < 0.0001;
    if (latMatch && lngMatch) {
      return resolveDeliveryLocationGate(v2FromStore);
    }
  }

  const v2 = marketplaceLocationToV2(activeLocation);
  return resolveDeliveryLocationGate(v2);
}

export function resolveObDeliveryLocationGate(
  activeLocation: CustomerLocation | null | undefined,
): DeliveryLocationGateState {
  return resolveGateFromActiveLocation(activeLocation);
}

export function hasReadyDeliveryLocation(
  activeLocation: CustomerLocation | null | undefined,
): boolean {
  return resolveGateFromActiveLocation(activeLocation) === 'ready';
}

export function needsFlatConfirmation(
  activeLocation: CustomerLocation | null | undefined,
): boolean {
  return resolveGateFromActiveLocation(activeLocation) === 'needs_flat';
}

export function hasV2ReadyDeliveryLocation(
  address: Parameters<typeof hasValidDeliveryCoordinates>[0],
): boolean {
  return resolveDeliveryLocationGate(address) === 'ready';
}

export { resolveDeliveryLocationGate, type DeliveryLocationGateState };
