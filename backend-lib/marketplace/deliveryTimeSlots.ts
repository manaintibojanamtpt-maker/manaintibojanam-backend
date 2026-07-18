import {
  type ResolvedStoreTiming,
  isStoreOpenNow,
  formatLocalTimeHHmm,
  DEFAULT_STORE_TIMEZONE,
  parseStoreTimeOnDate,
  addCalendarDaysInZone,
  formatSlotTimeInZone,
} from './tenantProjectionHelpers.js';

export const ASAP_SLOT = 'Standard Delivery (ASAP)';
export const DEFAULT_SLOT_DURATION_MINUTES = 30;

const DEFAULT_OPEN = '09:00';
const DEFAULT_CLOSE = '22:00';

export function getStoreClosedReason(
  timing: ResolvedStoreTiming,
  now: Date = new Date(),
): 'manual' | 'hours' | null {
  if (!timing.isStoreOpen) return 'manual';
  if (timing.businessHoursEnabled) {
    const currentTimeStr = formatLocalTimeHHmm(now, timing.timezone);
    const { openTime, closeTime } = timing;
    const within =
      closeTime < openTime
        ? currentTimeStr >= openTime || currentTimeStr <= closeTime
        : currentTimeStr >= openTime && currentTimeStr <= closeTime;
    if (!within) return 'hours';
  }
  return null;
}

export function getStoreClosedMessage(timing: ResolvedStoreTiming, now: Date = new Date()): string {
  const reason = getStoreClosedReason(timing, now);
  if (!reason) return '';
  if (reason === 'manual') {
    return timing.offlineMessage || 'Kitchen is temporarily offline. Please check back soon.';
  }
  return `Kitchen closed for now • Reopens at ${timing.openTime}`;
}

function isSlotBookable(
  slotStartMs: number,
  slotEndMs: number,
  nowMs: number,
  earliestStartMs: number,
): boolean {
  return slotStartMs >= earliestStartMs && slotEndMs > nowMs;
}

export function buildDeliveryTimeSlots(options: {
  storeTiming: ResolvedStoreTiming;
  now?: Date;
  prepMinutes?: number;
  slotDurationMinutes?: number;
}): string[] {
  const {
    storeTiming,
    now = new Date(),
    prepMinutes = 20,
    slotDurationMinutes = DEFAULT_SLOT_DURATION_MINUTES,
  } = options;

  const timeZone = storeTiming.timezone || DEFAULT_STORE_TIMEZONE;
  const openTime = storeTiming.openTime || DEFAULT_OPEN;
  const closeTime = storeTiming.closeTime || DEFAULT_CLOSE;
  const slotMs = slotDurationMinutes * 60 * 1000;
  const prepMs = prepMinutes * 60 * 1000;

  const todayOpen = parseStoreTimeOnDate(openTime, now, timeZone);
  const todayClose = parseStoreTimeOnDate(closeTime, now, timeZone);
  const tomorrowBase = addCalendarDaysInZone(now, 1, timeZone);
  const tomorrowOpen = parseStoreTimeOnDate(openTime, tomorrowBase, timeZone);
  const tomorrowClose = parseStoreTimeOnDate(closeTime, tomorrowBase, timeZone);

  const todaySlots: string[] = [];
  const tomorrowSlots: string[] = [];

  const addSlot = (start: Date, target: string[], prefix: string) => {
    const end = new Date(start.getTime() + slotMs);
    target.push(
      `${prefix}, ${formatSlotTimeInZone(start, timeZone)} - ${formatSlotTimeInZone(end, timeZone)}`,
    );
  };

  const nowMs = now.getTime();
  const openMs = todayOpen.getTime();
  const closeMs = todayClose.getTime();
  const storeOpenNow = isStoreOpenNow(storeTiming, now);
  const closedReason = getStoreClosedReason(storeTiming, now);
  const earliestStartMs = nowMs + prepMs;

  const canAsap =
    storeOpenNow &&
    nowMs >= openMs &&
    nowMs < closeMs &&
    earliestStartMs <= closeMs;

  if (canAsap) {
    todaySlots.push(ASAP_SLOT);
  }

  const allowTodayScheduled = closedReason !== 'manual' && nowMs < closeMs;

  if (allowTodayScheduled) {
    let slotStartMs = openMs;
    while (slotStartMs + slotMs <= closeMs) {
      const slotEndMs = slotStartMs + slotMs;
      if (isSlotBookable(slotStartMs, slotEndMs, nowMs, earliestStartMs)) {
        addSlot(new Date(slotStartMs), todaySlots, 'Today');
      }
      slotStartMs += slotMs;
    }
  }

  let tomorrowStartMs = tomorrowOpen.getTime();
  const tomorrowCloseMs = tomorrowClose.getTime();
  while (tomorrowStartMs + slotMs <= tomorrowCloseMs) {
    addSlot(new Date(tomorrowStartMs), tomorrowSlots, 'Tomorrow');
    tomorrowStartMs += slotMs;
  }

  return [...todaySlots, ...tomorrowSlots];
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

export function validateMarketplaceSchedule(
  request: {
    deliveryType?: string;
    scheduledFor?: string;
    deliveryTimeSlot?: string;
  },
  storeTiming: ResolvedStoreTiming,
  prepMinutes: number,
  now: Date = new Date(),
): { deliveryType: 'asap' | 'scheduled'; scheduledFor: string | null; deliveryTimeSlot: string } {
  const deliveryType =
    String(request.deliveryType || '').toLowerCase() === 'scheduled' ? 'scheduled' : 'asap';

  const slotOptions = {
    storeTiming,
    now,
    prepMinutes,
    slotDurationMinutes: DEFAULT_SLOT_DURATION_MINUTES,
  };

  if (deliveryType === 'asap') {
    const slots = buildDeliveryTimeSlots(slotOptions);
    const storeOpenNow = isStoreOpenNow(storeTiming, now);
    if (!storeOpenNow && slots.length > 0 && !isAsapSlot(slots[0])) {
      throw Object.assign(
        new Error('Kitchen is closed — please schedule your order for a later slot.'),
        { statusCode: 400 },
      );
    }
    return { deliveryType: 'asap', scheduledFor: null, deliveryTimeSlot: 'ASAP' };
  }

  if (!request.scheduledFor?.trim()) {
    throw Object.assign(new Error('Scheduled orders require a scheduledFor timestamp.'), {
      statusCode: 400,
    });
  }

  const scheduledDate = new Date(request.scheduledFor);
  if (Number.isNaN(scheduledDate.getTime())) {
    throw Object.assign(new Error('Invalid scheduledFor timestamp.'), { statusCode: 400 });
  }

  const minScheduledMs = now.getTime() + prepMinutes * 60_000;
  if (scheduledDate.getTime() <= now.getTime()) {
    throw Object.assign(new Error('Scheduled time must be in the future.'), { statusCode: 400 });
  }
  if (scheduledDate.getTime() < minScheduledMs) {
    throw Object.assign(
      new Error('Scheduled time must allow enough lead time for kitchen prep.'),
      { statusCode: 400 },
    );
  }

  const availableSlots = buildDeliveryTimeSlots(slotOptions).filter((slot) => !isAsapSlot(slot));

  if (availableSlots.length === 0) {
    throw Object.assign(new Error('No delivery slots are available for scheduling.'), {
      statusCode: 400,
    });
  }

  const slotLabel = request.deliveryTimeSlot?.trim();
  const matchedByLabel = slotLabel ? availableSlots.find((slot) => slot === slotLabel) : undefined;

  let matchedSlot = matchedByLabel;
  if (!matchedSlot) {
    matchedSlot = availableSlots.find((slot) => {
      const slotTs = getScheduledForTimestamp(slot, now);
      if (!slotTs) return false;
      return Math.abs(new Date(slotTs).getTime() - scheduledDate.getTime()) < 60_000;
    });
  }

  if (!matchedSlot) {
    throw Object.assign(
      new Error('Scheduled time must fall within an available Today or Tomorrow delivery slot.'),
      { statusCode: 400 },
    );
  }

  const normalizedScheduledFor = getScheduledForTimestamp(matchedSlot, now);
  if (!normalizedScheduledFor) {
    throw Object.assign(new Error('Unable to resolve scheduled delivery time.'), { statusCode: 400 });
  }

  if (new Date(normalizedScheduledFor).getTime() <= now.getTime()) {
    throw Object.assign(new Error('Scheduled time must be in the future.'), { statusCode: 400 });
  }

  return {
    deliveryType: 'scheduled',
    scheduledFor: normalizedScheduledFor,
    deliveryTimeSlot: matchedSlot,
  };
}
