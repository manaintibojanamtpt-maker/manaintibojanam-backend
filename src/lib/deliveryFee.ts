import type { Tenant } from '../types';
import type { TenantInfo } from '../context/TenantContext';

type DeliveryConfigLike = TenantInfo['deliveryConfig'] | Tenant['deliveryConfig'];

/** Used only when delivery zones exist but owner has not configured fees (legacy incomplete setup). */
export const DEFAULT_BASE_DELIVERY_FEE = 30;
export const DEFAULT_PER_KM_BEYOND_PAID = 10;

export function calculateDeliveryDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1.2;
}

export function isDeliveryFeeEnabled(config?: DeliveryConfigLike | null): boolean {
  if (!config) return false;
  if (config.enabled === false) return false;
  return Number(config.maxRadius ?? 0) > 0;
}

/**
 * Tiered delivery fee:
 * - Within free radius → ₹0
 * - Within base/paid radius → base fee (or per-km beyond free if only per-km set)
 * - Beyond base radius → base fee + per-km for extra distance
 * - Beyond max radius → -1 (unserviceable)
 */
export function computeDeliveryFee(distanceKm: number, config?: DeliveryConfigLike | null): number {
  if (!config) {
    if (distanceKm <= 2) return 0;
    if (distanceKm <= 7) return 40;
    if (distanceKm <= 10) return 70;
    return -1;
  }

  const maxRadius = Number(config.maxRadius ?? config.maxServiceDistanceKm ?? 10);
  if (maxRadius > 0 && distanceKm > maxRadius) return -1;

  // Legacy incomplete zone setup
  if (
    config.feesConfigured === false &&
    Number(config.baseFee ?? 0) === 0 &&
    Number(config.perKmCharge ?? 0) === 0 &&
    Number(config.freeRadius ?? 0) === 0
  ) {
    const paidRadius = Number(config.paidRadius ?? maxRadius ?? 5);
    if (distanceKm <= paidRadius) return DEFAULT_BASE_DELIVERY_FEE;
    const extraKm = Math.ceil(distanceKm - paidRadius);
    return DEFAULT_BASE_DELIVERY_FEE + extraKm * DEFAULT_PER_KM_BEYOND_PAID;
  }

  const freeRadius = Number(config.freeRadius ?? (config.baseFee !== undefined ? 0 : 2));
  const paidRadius = Number(config.paidRadius ?? maxRadius ?? 7);
  const baseFee = Number(config.baseFee ?? 40);
  const perKmCharge = Number(config.perKmCharge ?? 10);

  if (distanceKm <= freeRadius) return 0;
  if (distanceKm <= paidRadius) return Math.round(baseFee);

  const extraKm = Math.ceil(distanceKm - paidRadius);
  return Math.round(baseFee + extraKm * perKmCharge);
}

export function getDeliveryFee(
  distanceKm: number,
  tenant?: { deliveryConfig?: DeliveryConfigLike } | null,
): number {
  return computeDeliveryFee(distanceKm, tenant?.deliveryConfig);
}
