import {
  getStoreClosedReason,
  isTenantStoreOpenNow,
  type ResolvedStoreSettings,
} from './tenantStoreOperations';

export const ASAP_SLOT = 'Standard Delivery (ASAP)';
export const DEFAULT_SLOT_DURATION_MINUTES = 30;

const DEFAULT_OPEN = '09:00';
const DEFAULT_CLOSE = '22:00';
const DEFAULT_STORE_TIMEZONE = 'Asia/Kolkata';

function getCalendarDateInZone(date: Date, timeZone = DEFAULT_STORE_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatLocalTimeHHmm(now: Date, timeZone = DEFAULT_STORE_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}`;
}

function zonedDateTimeToUtc(ymd: string, hour: number, minute: number, timeZone: string): Date {
  const [year, month, day] = ymd.split('-').map(Number);
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  for (let attempt = 0; attempt < 6; attempt++) {
    const currentYmd = getCalendarDateInZone(new Date(utcMs), timeZone);
    const currentTime = formatLocalTimeHHmm(new Date(utcMs), timeZone);
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    if (currentYmd === ymd && currentHour === hour && currentMinute === minute) {
      return new Date(utcMs);
    }

    const desiredMinutes = hour * 60 + minute;
    let currentMinutes = currentHour * 60 + currentMinute;
    if (currentYmd < ymd) currentMinutes -= 24 * 60;
    if (currentYmd > ymd) currentMinutes += 24 * 60;
    utcMs += (desiredMinutes - currentMinutes) * 60_000;
  }

  return new Date(utcMs);
}

function parseStoreTimeOnDate(time: string, base: Date, timeZone = DEFAULT_STORE_TIMEZONE): Date {
  const [hour, minute] = time.split(':').map(Number);
  const ymd = getCalendarDateInZone(base, timeZone);
  return zonedDateTimeToUtc(ymd, hour, minute, timeZone);
}

function addCalendarDaysInZone(base: Date, days: number, timeZone = DEFAULT_STORE_TIMEZONE): Date {
  const ymd = getCalendarDateInZone(base, timeZone);
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0, 0));
}

function formatSlotTimeInZone(date: Date, timeZone = DEFAULT_STORE_TIMEZONE): string {
  return date.toLocaleTimeString('en-IN', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
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
  storeSettings: ResolvedStoreSettings;
  now?: Date;
  prepMinutes?: number;
  slotDurationMinutes?: number;
}): string[] {
  const {
    storeSettings,
    now = new Date(),
    prepMinutes = 20,
    slotDurationMinutes = DEFAULT_SLOT_DURATION_MINUTES,
  } = options;

  const timeZone = storeSettings.timezone || DEFAULT_STORE_TIMEZONE;
  const openTime = storeSettings.storeTiming.openTime || DEFAULT_OPEN;
  const closeTime = storeSettings.storeTiming.closeTime || DEFAULT_CLOSE;
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
  const storeOpenNow = isTenantStoreOpenNow(storeSettings, now);
  const closedReason = getStoreClosedReason(storeSettings, now);
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
