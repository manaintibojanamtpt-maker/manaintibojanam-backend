import type { Tenant } from '../types';
import type { TenantInfo } from '../context/TenantContext';

type DeliveryConfigLike = TenantInfo['deliveryConfig'] | Tenant['deliveryConfig'];

/** Used when owner enabled delivery zones but has not set Base Fee / Per KM yet. */
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
    if (distanceKm <= 2) return 30;
    if (distanceKm <= 5) return 50;
    if (distanceKm <= 8) return 80;
    return 100 + Math.ceil((distanceKm - 8) * 12);
  }

  const freeRadius = Number(config.freeRadius ?? 0);
  const paidRadius = Number(config.paidRadius ?? config.maxRadius ?? 10);
  const maxRadius = Number(config.maxRadius ?? paidRadius);
  const baseFee = Number(config.baseFee ?? 0);
  const perKmCharge = Number(config.perKmCharge ?? 0);

  if (distanceKm > maxRadius) return -1;
  if (distanceKm <= freeRadius) return 0;

  const ownerSetFees = baseFee > 0 || perKmCharge > 0;

  if (ownerSetFees) {
    if (perKmCharge > 0 && baseFee <= 0) {
      return Math.ceil((distanceKm - freeRadius) * perKmCharge);
    }

    if (distanceKm <= paidRadius) {
      return Math.round(baseFee);
    }

    const extraKm = Math.ceil(distanceKm - paidRadius);
    return Math.round(baseFee + extraKm * perKmCharge);
  }

  // Delivery zones configured but fees left at zero — apply platform defaults
  if (distanceKm <= paidRadius) {
    return DEFAULT_BASE_DELIVERY_FEE;
  }

  const extraKm = Math.ceil(distanceKm - paidRadius);
  return DEFAULT_BASE_DELIVERY_FEE + extraKm * DEFAULT_PER_KM_BEYOND_PAID;
}

export function getDeliveryFee(
  distanceKm: number,
  tenant?: { deliveryConfig?: DeliveryConfigLike } | null,
): number {
  return computeDeliveryFee(distanceKm, tenant?.deliveryConfig);
}
