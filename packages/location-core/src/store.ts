import {
  clearDeliveryAddressV2,
  readDeliveryAddressV2,
  readDeliverySessionV2,
  writeDeliveryAddressV2,
  writeDeliverySessionV2,
} from './storage.js';
import type { DeliveryAddressV2 } from './types.js';

type Listener = (address: DeliveryAddressV2 | null) => void;

let currentAddress: DeliveryAddressV2 | null = null;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) {
    listener(currentAddress);
  }
}

export function hydrateLocationStore(): DeliveryAddressV2 | null {
  currentAddress = readDeliveryAddressV2() ?? readDeliverySessionV2();
  notify();
  return currentAddress;
}

export function getLocationStoreAddress(): DeliveryAddressV2 | null {
  if (!currentAddress) {
    return hydrateLocationStore();
  }
  return currentAddress;
}

export function setLocationStoreAddress(address: DeliveryAddressV2 | null, options?: { sessionOnly?: boolean }): void {
  currentAddress = address;

  if (!address) {
    clearDeliveryAddressV2();
    notify();
    return;
  }

  if (options?.sessionOnly) {
    writeDeliverySessionV2(address);
  } else {
    writeDeliveryAddressV2(address);
  }

  notify();
}

export function subscribeLocationStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLocationShortLabel(address: DeliveryAddressV2 | null = getLocationStoreAddress()): string {
  return address?.text?.shortLabel || 'Select location';
}
