import {
  computeServiceability,
  kitchenConfigFromDeliveryConfig,
  type KitchenDeliveryConfig,
} from '../../packages/location-core/src/serviceability.js';
import type { Serviceability } from '../../packages/location-core/src/types.js';

export type ServiceabilityInput = {
  lat: number;
  lng: number;
  kitchenId?: string;
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

export function checkLocationServiceability(input: ServiceabilityInput): Serviceability {
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng) || (input.lat === 0 && input.lng === 0)) {
    return {
      isServiceable: false,
      distanceKm: 0,
      deliveryFee: 0,
      currency: 'INR',
      reason: 'NO_KITCHEN_COORDS',
    };
  }

  const kitchenId = input.kitchenId || 'default';
  const kitchenLat = input.kitchenLat;
  const kitchenLng = input.kitchenLng;

  if (!Number.isFinite(kitchenLat) || !Number.isFinite(kitchenLng)) {
    return {
      isServiceable: false,
      distanceKm: 0,
      deliveryFee: 0,
      currency: 'INR',
      kitchenId,
      reason: 'NO_KITCHEN_COORDS',
    };
  }

  const config: KitchenDeliveryConfig = kitchenConfigFromDeliveryConfig(
    kitchenId,
    kitchenLat!,
    kitchenLng!,
    input.deliveryConfig,
  );

  return computeServiceability(config, input.lat, input.lng);
}

export function toMarketplaceServiceabilityResult(serviceability: Serviceability) {
  return {
    delivery: serviceability.isServiceable,
    pickup: true,
    message: serviceability.isServiceable
      ? 'Delivery available in your area'
      : serviceability.reason === 'OUT_OF_RADIUS'
        ? 'Outside delivery area for this restaurant'
        : 'Location required',
    distanceKm: serviceability.distanceKm,
    deliveryFee: serviceability.deliveryFee,
    etaMinutes: serviceability.isServiceable ? { min: 25, max: 35 } : undefined,
  };
}
