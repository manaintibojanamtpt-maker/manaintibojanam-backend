import { getDistance } from 'geolib';
import type { Serviceability } from './types.js';

export type KitchenDeliveryConfig = {
  kitchenId: string;
  kitchenLat: number;
  kitchenLng: number;
  freeRadiusKm: number;
  baseRadiusKm: number;
  maxRadiusKm: number;
  baseFee: number;
  perKmExtraCharge: number;
};

export function computeDistanceKm(
  kitchenLat: number,
  kitchenLng: number,
  lat: number,
  lng: number,
): number {
  const meters = getDistance(
    { latitude: kitchenLat, longitude: kitchenLng },
    { latitude: lat, longitude: lng },
  );
  return Number((meters / 1000).toFixed(2));
}

export function computeServiceability(
  config: KitchenDeliveryConfig,
  lat: number,
  lng: number,
): Serviceability {
  if (!Number.isFinite(config.kitchenLat) || !Number.isFinite(config.kitchenLng)) {
    return {
      isServiceable: false,
      distanceKm: 0,
      deliveryFee: 0,
      currency: 'INR',
      kitchenId: config.kitchenId,
      reason: 'NO_KITCHEN_COORDS',
    };
  }

  const distanceKm = computeDistanceKm(config.kitchenLat, config.kitchenLng, lat, lng);

  if (distanceKm > config.maxRadiusKm) {
    return {
      isServiceable: false,
      distanceKm,
      deliveryFee: 0,
      currency: 'INR',
      kitchenId: config.kitchenId,
      reason: 'OUT_OF_RADIUS',
    };
  }

  let deliveryFee = 0;
  if (distanceKm <= config.freeRadiusKm) {
    deliveryFee = 0;
  } else if (distanceKm <= config.baseRadiusKm) {
    deliveryFee = config.baseFee;
  } else {
    const extraKm = Math.ceil(distanceKm - config.baseRadiusKm);
    deliveryFee = config.baseFee + extraKm * config.perKmExtraCharge;
  }

  return {
    isServiceable: true,
    distanceKm,
    deliveryFee,
    currency: 'INR',
    kitchenId: config.kitchenId,
    reason: 'OK',
  };
}

export function kitchenConfigFromDeliveryConfig(
  kitchenId: string,
  kitchenLat: number,
  kitchenLng: number,
  deliveryConfig?: {
    freeRadius?: number;
    paidRadius?: number;
    maxRadius?: number;
    baseFee?: number;
    perKmCharge?: number;
  } | null,
): KitchenDeliveryConfig {
  const freeRadiusKm = Number(deliveryConfig?.freeRadius ?? 0);
  const baseRadiusKm = Number(deliveryConfig?.paidRadius ?? deliveryConfig?.maxRadius ?? 10);
  const maxRadiusKm = Number(deliveryConfig?.maxRadius ?? baseRadiusKm);
  const baseFee = Number(deliveryConfig?.baseFee ?? 0);
  const perKmExtraCharge = Number(deliveryConfig?.perKmCharge ?? 0);

  return {
    kitchenId,
    kitchenLat,
    kitchenLng,
    freeRadiusKm,
    baseRadiusKm,
    maxRadiusKm,
    baseFee,
    perKmExtraCharge,
  };
}
