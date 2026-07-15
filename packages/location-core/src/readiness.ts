import { hasConfirmedFlat, hasValidDeliveryCoordinates } from './normalize.js';
import type { DeliveryAddressV2 } from './types.js';

export type DeliveryLocationGateState = 'no_coords' | 'needs_flat' | 'ready';

export function resolveDeliveryLocationGate(
  address: DeliveryAddressV2 | null | undefined,
): DeliveryLocationGateState {
  if (!hasValidDeliveryCoordinates(address)) {
    return 'no_coords';
  }
  if (!hasConfirmedFlat(address)) {
    return 'needs_flat';
  }
  return 'ready';
}

export function canProceedToCheckoutWithLocation(
  address: DeliveryAddressV2 | null | undefined,
): boolean {
  return resolveDeliveryLocationGate(address) === 'ready';
}

export function needsFlatConfirmationBeforeCheckout(
  address: DeliveryAddressV2 | null | undefined,
): boolean {
  return resolveDeliveryLocationGate(address) === 'needs_flat';
}
