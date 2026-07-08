export type KitchenFormat = 'cloud_kitchen' | 'restaurant' | 'chef_kitchen' | 'home_kitchen';

export const KITCHEN_FORMAT_OPTIONS: readonly { readonly id: KitchenFormat; readonly label: string }[] = [
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'cloud_kitchen', label: 'Cloud kitchen' },
  { id: 'chef_kitchen', label: 'Chef kitchen' },
  { id: 'home_kitchen', label: 'Home kitchen' },
] as const;

/** Maximum distance (km) a consumer can discover a kitchen from their live location. */
export const MARKETPLACE_CONSUMER_MAX_DISTANCE_KM = 18;

export function resolveKitchenFormat(businessType?: string): KitchenFormat {
  const normalized = (businessType ?? '').toLowerCase().replace(/-/g, '_').trim();
  if (!normalized || normalized === 'unknown') return 'restaurant';
  if (normalized.includes('cloud')) return 'cloud_kitchen';
  if (normalized === 'home_kitchen' || normalized === 'homemade' || normalized === 'home') {
    return 'home_kitchen';
  }
  if (normalized === 'chef_kitchen' || normalized === 'chef' || normalized === 'personal_chef') {
    return 'chef_kitchen';
  }
  return 'restaurant';
}

export function kitchenFormatLabel(format: KitchenFormat): string {
  return KITCHEN_FORMAT_OPTIONS.find((o) => o.id === format)?.label ?? 'Restaurant';
}

export function isWithinConsumerDiscoveryRadius(distanceKm: number | undefined): boolean {
  if (distanceKm == null || !Number.isFinite(distanceKm)) return false;
  return distanceKm <= MARKETPLACE_CONSUMER_MAX_DISTANCE_KM;
}
