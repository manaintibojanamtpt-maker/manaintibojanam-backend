/** Matches backend MIN_DISPLAY_DISTANCE_KM — hide misleading sub-100 m badges from coord bugs. */
export const MIN_DISPLAY_DISTANCE_KM = 0.1;

export function isDisplayableDistanceKm(km: number | undefined | null): km is number {
  if (km == null || !Number.isFinite(km)) return false;
  if (km === 0) return true;
  return km >= MIN_DISPLAY_DISTANCE_KM;
}

export function formatDistanceKmLabel(km: number | undefined | null): string | undefined {
  if (!isDisplayableDistanceKm(km)) return undefined;
  return `${km.toFixed(1)} km`;
}
