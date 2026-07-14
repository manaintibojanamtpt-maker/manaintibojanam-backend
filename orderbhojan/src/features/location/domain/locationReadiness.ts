import type { CustomerLocation } from './location.types';

export function hasActiveDeliveryLocation(
  activeLocation: CustomerLocation | null | undefined,
): boolean {
  return Boolean(activeLocation?.coordinates);
}
