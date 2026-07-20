/**
 * Default Pune coordinates when M2 location is unavailable.
 * Production kitchens are clustered in Pune.
 */
export const DEFAULT_MARKETPLACE_COORDS = {
  lat: 18.49959440695956,
  lng: 73.97858993491619,
} as const;

export const DEFAULT_MARKETPLACE_CITY_LABEL = 'Pune';

/** Discovery copy when no user-set delivery location (Pan-India — not Pune-specific). */
export const DEFAULT_LOCATION_DISCOVERY_HINT =
  'Featured kitchens shown until you set your location';

/** Primary CTA when location is required for accurate nearby results. */
export const DEFAULT_LOCATION_DISCOVERY_CTA = 'Set your location to see kitchens near you';
