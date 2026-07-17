export const ASAP_SLOT = 'Standard Delivery (ASAP)';

export interface CheckoutStoreTiming {
  readonly openTime: string;
  readonly closeTime: string;
  readonly businessHoursEnabled: boolean;
  readonly offlineMessage?: string;
}

export interface CheckoutSchedulingContext {
  readonly isStoreOpen: boolean;
  readonly storeTiming: CheckoutStoreTiming;
  readonly prepMinutes: number;
  readonly deliverySlots: readonly string[];
  readonly closedMessage?: string;
}

export function isAsapSlot(slot: string): boolean {
  return slot === ASAP_SLOT || slot === 'ASAP';
}

export function getScheduledForTimestamp(slot: string, now: Date = new Date()): string | null {
  if (isAsapSlot(slot)) return null;

  const parts = slot.split(', ');
  if (parts.length !== 2) return now.toISOString();

  const dayStr = parts[0];
  const timeRange = parts[1];
  const startTimeStr = timeRange.split(' - ')[0];

  const scheduled = new Date(now);
  if (dayStr === 'Tomorrow') {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  const timeMatch = startTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = parseInt(timeMatch[2], 10);
    const ampm = timeMatch[3].toUpperCase();
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    scheduled.setHours(hour, minute, 0, 0);
  }

  return scheduled.toISOString();
}

export function formatDeliverySlotLabel(slot: string): string {
  if (isAsapSlot(slot)) return 'ASAP';
  return slot.replace(/^(Today|Tomorrow), /, '');
}

export function resolveDefaultDeliverySlot(slots: readonly string[]): string {
  return slots[0] ?? ASAP_SLOT;
}

export function buildScheduleFields(deliveryTimeSlot: string): {
  deliveryType: 'asap' | 'scheduled';
  scheduledFor?: string;
  deliveryTimeSlot: string;
} {
  if (isAsapSlot(deliveryTimeSlot)) {
    return { deliveryType: 'asap', deliveryTimeSlot: 'ASAP' };
  }

  const scheduledFor = getScheduledForTimestamp(deliveryTimeSlot);
  if (!scheduledFor) {
    return { deliveryType: 'asap', deliveryTimeSlot: 'ASAP' };
  }

  return {
    deliveryType: 'scheduled',
    scheduledFor,
    deliveryTimeSlot,
  };
}

export function isKitchenClosedForOrdering(scheduling: CheckoutSchedulingContext | null | undefined): boolean {
  if (!scheduling) return false;
  return !scheduling.isStoreOpen && scheduling.deliverySlots.every((slot) => !isAsapSlot(slot));
}
