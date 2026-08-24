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

/**
 * Extracts India-local calendar/time components from an absolute Date instant.
 * Does NOT modify the original Date's underlying timestamp.
 * Uses Intl.DateTimeFormat with Asia/Kolkata timezone.
 */
export function getISTDateParts(date: Date = new Date()): Readonly<{
  readonly year: number;
  readonly month: number; // 1-12
  readonly day: number;   // 1-31
  readonly hour: number;  // 0-23
  readonly minute: number; // 0-59
}> {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string): number => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

/**
 * Converts an India-local wall-clock scheduling slot into an absolute UTC instant (ISO string).
 * The slot format is expected to be: "Today, 9:00 AM - 9:30 AM" or "Tomorrow, 2:30 PM - 3:00 PM"
 * Returns null for ASAP slots (no scheduledFor needed).
 */
export function getScheduledForTimestamp(slot: string, now: Date = new Date()): string | null {
  if (isAsapSlot(slot)) return null;

  const parts = slot.split(', ');
  if (parts.length !== 2) return now.toISOString();

  const dayStr = parts[0];
  const timeRange = parts[1];
  const startTimeStr = timeRange.split(' - ')[0];

  // Get current IST date components for Today/Tomorrow resolution
  const istNow = getISTDateParts(now);

  // Parse the time component (e.g., "9:00 AM" or "2:30 PM")
  const timeMatch = startTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!timeMatch) return now.toISOString();

  let hour = parseInt(timeMatch[1], 10);
  const minute = parseInt(timeMatch[2], 10);
  const ampm = timeMatch[3].toUpperCase();

  if (ampm === 'PM' && hour < 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;

  // Build the scheduled date in IST
  let scheduledYear = istNow.year;
  let scheduledMonth = istNow.month - 1; // 0-indexed for Date.UTC
  let scheduledDay = istNow.day;

  if (dayStr === 'Tomorrow') {
    // Create a Date at midnight IST tomorrow to handle month/year rollover correctly
    const tomorrowBase = new Date(Date.UTC(istNow.year, istNow.month - 1, istNow.day + 1, 0, 0, 0));
    // Get IST components of tomorrow
    const istTomorrow = getISTDateParts(tomorrowBase);
    scheduledYear = istTomorrow.year;
    scheduledMonth = istTomorrow.month - 1;
    scheduledDay = istTomorrow.day;
  }

  // Construct absolute UTC instant: IST wall-clock → subtract 5h30m
  const scheduledUTC = Date.UTC(scheduledYear, scheduledMonth, scheduledDay, hour - 5, minute - 30, 0);

  return new Date(scheduledUTC).toISOString();
}

export function formatDeliverySlotLabel(slot: string): string {
  if (isAsapSlot(slot)) return 'ASAP';
  return slot.replace(/^(Today|Tomorrow), /, '');
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

/**
 * Normalizes delivery slots from the backend.
 * - If backend provides real scheduled slots, returns them as-is (authoritative).
 * - If backend returns only ASAP or empty array, does NOT fabricate scheduled slots.
 *   Returns only what the backend actually provides.
 * - This prevents customers from selecting slots the kitchen doesn't actually support.
 */
export function ensureScheduledDeliverySlots(
  slots: readonly string[] = [],
): string[] {
  const existing = Array.isArray(slots) ? [...slots] : [];
  const hasScheduled = existing.some((s) => !isAsapSlot(s));

  // If backend provides real scheduled slots, return them (authoritative)
  if (hasScheduled) return existing;

  // Backend returned only ASAP or empty - do NOT fabricate scheduled slots.
  // Return exactly what backend provided.
  return existing;
}