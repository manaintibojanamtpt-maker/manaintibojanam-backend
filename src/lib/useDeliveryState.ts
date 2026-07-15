import { useEffect, useState } from 'react';
import {
  hydrateLocationStore,
  subscribeLocationStore,
  type DeliveryAddressV2,
} from '@bhojan/location-core';

export interface DeliveryAddress {
  id: string;
  label: string;
  address: string; // The full display address string
  addressText?: string; // The area/short text
  fullAddress?: string; // Similar to address
  houseNumber?: string;
  buildingName?: string;
  landmark?: string;
  city?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  deliveryFee?: number;
  isDefault?: boolean;
}

export interface DeliveryState {
  selectedAddress: DeliveryAddress | null;
  deliverySlot: string;
}

const STORAGE_KEY = 'mana-delivery-state';

function v2ToLegacyAddress(address: DeliveryAddressV2): DeliveryAddress {
  return {
    id: `v2-${address.coordinates.capturedAt}`,
    label: address.text.shortLabel,
    address: address.text.formatted,
    addressText: address.text.shortLabel,
    fullAddress: address.text.formatted,
    houseNumber: address.text.flat,
    buildingName: address.text.building,
    landmark: address.text.landmark,
    city: address.text.city,
    pincode: address.text.pincode,
    lat: address.coordinates.lat,
    lng: address.coordinates.lng,
    distanceKm: address.serviceability?.distanceKm,
    deliveryFee: address.serviceability?.deliveryFee,
    isDefault: true,
  };
}

function hydrateFromUnifiedV2(): DeliveryState | null {
  const address = hydrateLocationStore();
  if (!address) {
    return null;
  }
  return {
    selectedAddress: v2ToLegacyAddress(address),
    deliverySlot: 'ASAP',
  };
}

const defaultState: DeliveryState = {
  selectedAddress: null,
  deliverySlot: 'ASAP'
};

// Global Store State
let globalDeliveryState: DeliveryState = defaultState;
const listeners = new Set<(state: DeliveryState) => void>();

// Initialize from unified V2 storage, then legacy localStorage
if (typeof window !== 'undefined') {
  try {
    const fromV2 = hydrateFromUnifiedV2();
    if (fromV2) {
      globalDeliveryState = fromV2;
    } else {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure coordinates exist and are usable, otherwise discard invalid saved state
        if (
          parsed.selectedAddress &&
          (parsed.selectedAddress.lat === undefined ||
            parsed.selectedAddress.lng === undefined ||
            (parsed.selectedAddress.lat === 0 && parsed.selectedAddress.lng === 0))
        ) {
          parsed.selectedAddress = null;
        }
        globalDeliveryState = parsed;
      }
    }
  } catch (err) {
    console.error('Unable to load delivery state', err);
  }
}

export const setGlobalDeliveryState = (newStateOrUpdater: DeliveryState | ((prev: DeliveryState) => DeliveryState)) => {
  const newState = typeof newStateOrUpdater === 'function' ? newStateOrUpdater(globalDeliveryState) : newStateOrUpdater;
  globalDeliveryState = newState;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(globalDeliveryState));
  } catch (err) {
    console.error('Unable to save delivery state', err);
  }
  
  // Notify all components
  listeners.forEach((listener) => listener(globalDeliveryState));
};

export function useDeliveryState() {
  const [state, setState] = useState<DeliveryState>(globalDeliveryState);

  useEffect(() => {
    listeners.add(setState);
    const unsubscribeV2 = subscribeLocationStore((address) => {
      if (!address) {
        return;
      }
      setGlobalDeliveryState((prev) => ({
        ...prev,
        selectedAddress: v2ToLegacyAddress(address),
      }));
    });
    // Return cleanup function to remove listener on unmount
    return () => {
      listeners.delete(setState);
      unsubscribeV2();
    };
  }, []);

  return [state, setGlobalDeliveryState] as const;
}
