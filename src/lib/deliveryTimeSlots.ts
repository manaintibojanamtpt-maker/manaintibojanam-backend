import {
  getStoreClosedReason,
  isTenantStoreOpenNow,
  type ResolvedStoreSettings,
} from './tenantStoreOperations';

export const ASAP_SLOT = 'Standard Delivery (ASAP)';

const DEFAULT_OPEN = '09:00';
const DEFAULT_CLOSE = '22:00';

function parseTimeOnDate(time: string, base: Date): Date {
  const [hour, minute] = time.split(':').map(Number);
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function formatSlotTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

function roundUpTo30Minutes(d: Date): Date {
  const next = new Date(d);
  const remainder = next.getMinutes() % 30;
  if (remainder !== 0) next.setMinutes(next.getMinutes() + (30 - remainder));
  next.setSeconds(0, 0);
  return next;
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
    slotDurationMinutes = 60,
  } = options;

  const openTime = storeSettings.storeTiming.openTime || DEFAULT_OPEN;
  const closeTime = storeSettings.storeTiming.closeTime || DEFAULT_CLOSE;
  const slotMs = slotDurationMinutes * 60 * 1000;
  const prepMs = prepMinutes * 60 * 1000;

  const todayOpen = parseTimeOnDate(openTime, now);
  const todayClose = parseTimeOnDate(closeTime, now);
  const tomorrowOpen = parseTimeOnDate(openTime, new Date(now.getTime() + 86400000));
  const tomorrowClose = parseTimeOnDate(closeTime, new Date(now.getTime() + 86400000));

  const todaySlots: string[] = [];
  const tomorrowSlots: string[] = [];

  const addSlot = (start: Date, target: string[], prefix: string) => {
    const end = new Date(start.getTime() + slotMs);
    target.push(`${prefix}, ${formatSlotTime(start)} - ${formatSlotTime(end)}`);
  };

  const nowMs = now.getTime();
  const openMs = todayOpen.getTime();
  const closeMs = todayClose.getTime();
  const storeOpenNow = isTenantStoreOpenNow(storeSettings, now);
  const closedReason = getStoreClosedReason(storeSettings, now);

  const canAsap =
    storeOpenNow &&
    nowMs >= openMs &&
    nowMs < closeMs &&
    nowMs + prepMs <= closeMs;

  if (canAsap) {
    todaySlots.push(ASAP_SLOT);
  }

  const allowTodayScheduled = closedReason !== 'manual' && nowMs < closeMs;

  if (allowTodayScheduled) {
    let slotStart: Date;

    if (nowMs < openMs) {
      slotStart = new Date(todayOpen);
    } else if (storeOpenNow) {
      slotStart = roundUpTo30Minutes(new Date(Math.max(nowMs + prepMs, openMs)));
    } else {
      slotStart = new Date(todayOpen);
      while (slotStart.getTime() <= nowMs && slotStart.getTime() + slotMs <= closeMs) {
        slotStart = new Date(slotStart.getTime() + slotMs);
      }
    }

    while (slotStart.getTime() + slotMs <= closeMs) {
      addSlot(slotStart, todaySlots, 'Today');
      slotStart = new Date(slotStart.getTime() + slotMs);
    }
  }

  let tomorrowStart = new Date(tomorrowOpen);
  while (tomorrowStart.getTime() + slotMs <= tomorrowClose.getTime()) {
    addSlot(tomorrowStart, tomorrowSlots, 'Tomorrow');
    tomorrowStart = new Date(tomorrowStart.getTime() + slotMs);
  }

  return [...todaySlots, ...tomorrowSlots];
}

export function isAsapSlot(slot: string): boolean {
  return slot === ASAP_SLOT || slot === 'ASAP';
}
