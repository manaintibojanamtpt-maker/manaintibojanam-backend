export type KitchenFormat = 'cloud_kitchen' | 'restaurant' | 'chef_kitchen' | 'home_kitchen';

export const KITCHEN_FORMAT_OPTIONS: readonly { readonly id: KitchenFormat; readonly label: string }[] = [
  { id: 'home_kitchen', label: 'Home kitchen' },
  { id: 'cloud_kitchen', label: 'Cloud kitchen' },
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'chef_kitchen', label: 'Chef kitchen' },
] as const;

export function resolveKitchenFormat(businessType?: string): KitchenFormat {
  const normalized = (businessType ?? '').toLowerCase().replace(/-/g, '_').trim();
  if (!normalized || normalized === 'unknown') return 'home_kitchen';
  if (normalized.includes('cloud')) return 'cloud_kitchen';
  if (normalized === 'home_kitchen' || normalized === 'homemade' || normalized === 'home') {
    return 'home_kitchen';
  }
  if (normalized === 'chef_kitchen' || normalized === 'chef' || normalized === 'personal_chef') {
    return 'chef_kitchen';
  }
  if (normalized === 'restaurant') return 'restaurant';
  return 'home_kitchen';
}

export function kitchenFormatLabel(format: KitchenFormat): string {
  return KITCHEN_FORMAT_OPTIONS.find((o) => o.id === format)?.label ?? 'Home kitchen';
}

export function kitchenFormatHeadline(businessType?: string): string {
  const format = resolveKitchenFormat(businessType);
  switch (format) {
    case 'cloud_kitchen':
      return 'Cloud Kitchen';
    case 'chef_kitchen':
      return 'Chef Kitchen';
    case 'restaurant':
      return 'Restaurant';
    default:
      return 'Home Kitchen';
  }
}
