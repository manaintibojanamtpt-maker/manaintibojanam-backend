import { useEffect, useState } from 'react';

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
  lat: number;
  lng: number;
  distanceKm?: number;
  deliveryFee?: number;
  isDefault?: boolean;
}

export interface DeliveryState {
  selectedAddress: DeliveryAddress | null;
  deliverySlot: string;
}

const STORAGE_KEY = 'mana-delivery-state';

const defaultState: DeliveryState = {
  selectedAddress: null,
  deliverySlot: 'ASAP'
};

// Global Store State
let globalDeliveryState: DeliveryState = defaultState;
const listeners = new Set<(state: DeliveryState) => void>();

// Initialize from localStorage
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure coordinates exist, otherwise discard invalid saved state
      if (parsed.selectedAddress && (parsed.selectedAddress.lat === undefined || parsed.selectedAddress.lng === undefined)) {
        parsed.selectedAddress = null;
      }
      globalDeliveryState = parsed;
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
    // Return cleanup function to remove listener on unmount
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return [state, setGlobalDeliveryState] as const;
}
