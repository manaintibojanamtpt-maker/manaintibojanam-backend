import type { DeliveryAddressV2 } from '@bhojan/location-core';
import {
  computeServiceability,
  kitchenConfigFromDeliveryConfig,
  setLocationStoreAddress,
  getLocationStoreAddress,
} from '@bhojan/location-core';

export type DeliveryLocationContext = {
  kitchenId: string;
  kitchenLat?: number;
  kitchenLng?: number;
  deliveryConfig?: {
    freeRadius?: number;
    paidRadius?: number;
    maxRadius?: number;
    baseFee?: number;
    perKmCharge?: number;
  } | null;
};

export class DeliveryLocationOrchestrator {
  private context: DeliveryLocationContext | null = null;

  setContext(context: DeliveryLocationContext | null): void {
    this.context = context;
    const current = getLocationStoreAddress();
    if (current && context) {
      this.recomputeServiceability(current.coordinates.lat, current.coordinates.lng);
    }
  }

  getAddress(): DeliveryAddressV2 | null {
    return getLocationStoreAddress();
  }

  async reverseGeocodeViaApi(
    lat: number,
    lng: number,
    apiBaseUrl: string,
    language = 'en',
  ): Promise<{ text: DeliveryAddressV2['text']; meta: DeliveryAddressV2['meta'] }> {
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng), language });
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/location/reverse?${params}`);
    if (!response.ok) {
      throw new Error(`Reverse geocode failed: ${response.status}`);
    }
    const body = (await response.json()) as {
      ok: boolean;
      value?: { text: DeliveryAddressV2['text']; meta: DeliveryAddressV2['meta'] };
      error?: { message: string };
    };
    if (!body.ok || !body.value) {
      throw new Error(body.error?.message || 'Reverse geocode failed');
    }
    return body.value;
  }

  computeServiceabilityForCoords(lat: number, lng: number): DeliveryAddressV2['serviceability'] | undefined {
    if (!this.context?.kitchenLat || !this.context?.kitchenLng) {
      return undefined;
    }

    const config = kitchenConfigFromDeliveryConfig(
      this.context.kitchenId,
      this.context.kitchenLat,
      this.context.kitchenLng,
      this.context.deliveryConfig,
    );

    return computeServiceability(config, lat, lng);
  }

  recomputeServiceability(lat: number, lng: number): DeliveryAddressV2 | null {
    const current = getLocationStoreAddress();
    if (!current) {
      return null;
    }

    const serviceability = this.computeServiceabilityForCoords(lat, lng);
    const updated: DeliveryAddressV2 = { ...current, serviceability };
    setLocationStoreAddress(updated);
    return updated;
  }

  persist(address: DeliveryAddressV2): void {
    setLocationStoreAddress(address);
  }
}

export const deliveryLocationOrchestrator = new DeliveryLocationOrchestrator();
