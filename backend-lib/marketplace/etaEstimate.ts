export const DEFAULT_PREP_TIME_MINUTES = 25;
export const MAX_ETA_MINUTES = 120;

/** prepTime + ~3 min/km travel, capped for display. */
export function estimateDeliveryEtaMinutes(
  prepTimeMinutes: number = DEFAULT_PREP_TIME_MINUTES,
  distanceKm?: number,
): { min: number; max: number } {
  const prep =
    Number.isFinite(prepTimeMinutes) && prepTimeMinutes > 0
      ? prepTimeMinutes
      : DEFAULT_PREP_TIME_MINUTES;
  const travel =
    distanceKm != null && Number.isFinite(distanceKm) && distanceKm > 0
      ? Math.round(distanceKm * 3)
      : 0;
  const min = Math.min(prep + travel, MAX_ETA_MINUTES);
  const max = Math.min(Math.max(min + 5, min + 10), MAX_ETA_MINUTES);
  return { min, max };
}
