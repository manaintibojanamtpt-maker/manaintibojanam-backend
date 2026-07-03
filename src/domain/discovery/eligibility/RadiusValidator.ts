/**
 * Discovery domain — delivery radius validation (M3 PR-4).
 */

export function isDeliveryConfigValid(maxRadiusKm: number | undefined): boolean {
  return Number.isFinite(maxRadiusKm) && (maxRadiusKm as number) > 0;
}

export function isWithinDeliveryRadius(
  distanceKm: number,
  maxRadiusKm: number | undefined
): boolean {
  if (!isDeliveryConfigValid(maxRadiusKm)) {
    return false;
  }
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return false;
  }
  return distanceKm <= (maxRadiusKm as number);
}
