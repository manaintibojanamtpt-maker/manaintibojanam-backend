import { useEffect, useState } from 'react';

export interface DeliveryAddress {
  id: string;
  label: string;
  address: string;
  addressText?: string;
  fullAddress?: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  deliveryFee?: number;
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

export function useDeliveryState() {
  const [deliveryState, setDeliveryState] = useState<DeliveryState>(() => {
    if (typeof window === 'undefined') return defaultState;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultState;
    } catch (err) {
      console.error('Unable to load delivery state', err);
      return defaultState;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deliveryState));
    } catch (err) {
      console.error('Unable to save delivery state', err);
    }
  }, [deliveryState]);

  return [deliveryState, setDeliveryState] as const;
}
