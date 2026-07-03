/**
 * Discovery domain — tiered fee estimate parity with deliveryFee.ts (M3 PR-4).
 * Uses maxRadiusKm as the only configured field on DiscoveryCandidate.
 */

const DEFAULT_BASE_DELIVERY_FEE = 30;
const DEFAULT_PER_KM_BEYOND_PAID = 10;

export function estimateDiscoveryDeliveryFee(
  distanceKm: number,
  maxRadiusKm: number | undefined
): number {
  if (!Number.isFinite(maxRadiusKm) || (maxRadiusKm as number) <= 0) {
    return -1;
  }

  const config = {
    freeRadius: 0,
    paidRadius: maxRadiusKm,
    maxRadius: maxRadiusKm,
    baseFee: 0,
    perKmCharge: 0,
  };

  const freeRadius = Number(config.freeRadius ?? 0);
  const paidRadius = Number(config.paidRadius ?? config.maxRadius ?? 10);
  const maxRadius = Number(config.maxRadius ?? paidRadius);

  if (distanceKm > maxRadius) return -1;
  if (distanceKm <= freeRadius) return 0;

  if (distanceKm <= paidRadius) {
    return DEFAULT_BASE_DELIVERY_FEE;
  }

  const extraKm = Math.ceil(distanceKm - paidRadius);
  return DEFAULT_BASE_DELIVERY_FEE + extraKm * DEFAULT_PER_KM_BEYOND_PAID;
}
