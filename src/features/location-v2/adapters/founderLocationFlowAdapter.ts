import {
  getLocationStoreAddress,
  resolveDeliveryLocationGate,
  type DeliveryLocationGateState,
} from '@bhojan/location-core';
import type { DeliveryState } from '../../../lib/useDeliveryState';

export function resolveFounderDeliveryLocationGate(
  _deliveryState?: DeliveryState | null,
): DeliveryLocationGateState {
  return resolveDeliveryLocationGate(getLocationStoreAddress());
}

export function canFounderProceedToCheckout(_deliveryState?: DeliveryState | null): boolean {
  return resolveFounderDeliveryLocationGate(_deliveryState) === 'ready';
}
