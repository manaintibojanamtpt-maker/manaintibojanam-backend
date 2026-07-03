/**
 * Menu domain — availability models (M7 PR-2).
 */

export type AvailabilityState =
  | 'available'
  | 'unavailable'
  | 'temporarily_unavailable'
  | 'out_of_stock'
  | 'hidden';

export interface MenuAvailability {
  readonly state: AvailabilityState;
  readonly reason?: string;
}

export const AVAILABILITY_STATES: readonly AvailabilityState[] = [
  'available',
  'unavailable',
  'temporarily_unavailable',
  'out_of_stock',
  'hidden',
] as const;

export const isSellableAvailability = (availability: MenuAvailability): boolean =>
  availability.state === 'available';

export const isVisibleAvailability = (availability: MenuAvailability): boolean =>
  availability.state !== 'hidden';
