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

export interface EnsureScheduledDeliverySlotsOptions {
  readonly allowFallback?: boolean;
  readonly storeTiming?: {
    openTime?: string;
    closeTime?: string;
  };
  readonly now?: Date;
  readonly prepMinutes?: number;
}

export function generateFallbackDeliverySlots(options?: {
  openTime?: string;
  closeTime?: string;
  now?: Date;
  slotDurationMinutes?: number;
  prepMinutes?: number;
}): string[] {
  const {
    openTime = '09:00',
    closeTime = '22:00',
    now = new Date(),
    slotDurationMinutes = 30,
    prepMinutes = 20,
  } = options ?? {};

  const ist = getISTDateParts(now);
  const nowMinuteOfDay = ist.hour * 60 + ist.minute;
  const earliestMinuteOfDay = nowMinuteOfDay + prepMinutes;

  const [openHour, openMin] = (openTime || '09:00').split(':').map(Number);
  const rawCloseParts = (closeTime || '22:00').split(':').map(Number);
  // If closeTime is 00:00 or 24:00, treat as midnight (24:00 = 1440 minutes)
  const closeHour =
    (rawCloseParts[0] === 0 && rawCloseParts[1] === 0) || rawCloseParts[0] === 24
      ? 24
      : rawCloseParts[0] || 22;
  const closeMin = rawCloseParts[1] || 0;

  const openMinuteOfDay = openHour * 60 + (openMin || 0);
  const closeMinuteOfDay = closeHour * 60 + closeMin;

  const formatSlotTime = (totalMinutes: number): string => {
    const mins = totalMinutes % (24 * 60);
    let h = Math.floor(mins / 60);
    const m = mins % 60;
    const ampm = totalMinutes >= 12 * 60 && totalMinutes < 24 * 60 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const todaySlots: string[] = [];
  const tomorrowSlots: string[] = [];

  // Generate today slots if current time is within service hours
  let currentStart = openMinuteOfDay;
  while (currentStart + slotDurationMinutes <= closeMinuteOfDay) {
    const currentEnd = currentStart + slotDurationMinutes;
    if (currentStart >= earliestMinuteOfDay) {
      todaySlots.push(`Today, ${formatSlotTime(currentStart)} - ${formatSlotTime(currentEnd)}`);
    }
    currentStart += slotDurationMinutes;
  }

  // Generate tomorrow slots
  let tomStart = openMinuteOfDay;
  while (tomStart + slotDurationMinutes <= closeMinuteOfDay) {
    const tomEnd = tomStart + slotDurationMinutes;
    tomorrowSlots.push(`Tomorrow, ${formatSlotTime(tomStart)} - ${formatSlotTime(tomEnd)}`);
    tomStart += slotDurationMinutes;
  }

  return [...todaySlots, ...tomorrowSlots];
}

/**
 * Normalizes delivery slots from the backend.
 * - If backend provides real scheduled slots, returns them as-is (authoritative).
 * - If backend returns only ASAP or empty array and allowFallback is enabled,
 *   generates fallback scheduled slots so schedule delivery is never missing.
 */
export function ensureScheduledDeliverySlots(
  slots: readonly string[] = [],
  options?: EnsureScheduledDeliverySlotsOptions,
): string[] {
  const existing = Array.isArray(slots) ? [...slots] : [];
  const hasScheduled = existing.some((s) => !isAsapSlot(s));

  // If backend provides real scheduled slots, return them (authoritative)
  if (hasScheduled) return existing;

  // When allowFallback is enabled and backend provided no scheduled slots,
  // generate standard delivery slots so the customer can schedule an order.
  if (options?.allowFallback) {
    const fallback = generateFallbackDeliverySlots({
      openTime: options.storeTiming?.openTime,
      closeTime: options.storeTiming?.closeTime,
      now: options.now,
      prepMinutes: options.prepMinutes,
    });
    return existing.length > 0 ? [...existing, ...fallback] : [ASAP_SLOT, ...fallback];
  }

  return existing;
}