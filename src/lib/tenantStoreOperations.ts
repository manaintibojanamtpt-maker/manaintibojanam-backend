export interface TenantStoreOperations {
  isStoreOpen?: boolean;
  businessHoursEnabled?: boolean;
  openTime?: string;
  closeTime?: string;
  offlineMessage?: string;
  timezone?: string;
}

export interface ResolvedStoreSettings {
  isStoreOpen: boolean;
  storeTiming: {
    openTime: string;
    closeTime: string;
    isManualOverride: boolean;
    businessHoursEnabled: boolean;
  };
  offlineMessage?: string;
  timezone: string;
}

const DEFAULT_OPEN = '09:00';
const DEFAULT_CLOSE = '22:00';
const DEFAULT_STORE_TIMEZONE = 'Asia/Kolkata';

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

function getCalendarDateInZone(date: Date, timeZone = DEFAULT_STORE_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
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

export const DEFAULT_STORE_OPERATIONS: Required<
  Pick<TenantStoreOperations, 'isStoreOpen' | 'businessHoursEnabled' | 'openTime' | 'closeTime'>
> = {
  isStoreOpen: true,
  businessHoursEnabled: false,
  openTime: DEFAULT_OPEN,
  closeTime: DEFAULT_CLOSE,
};

export function resolveStoreSettings(
  tenantData?: { storeOperations?: TenantStoreOperations } | null,
  legacyGlobal?: { isStoreOpen?: boolean; storeTiming?: { openTime?: string; closeTime?: string; isManualOverride?: boolean } } | null
): ResolvedStoreSettings {
  const ops = tenantData?.storeOperations;

  if (ops) {
    return {
      isStoreOpen: ops.isStoreOpen !== false,
      storeTiming: {
        openTime: ops.openTime || DEFAULT_OPEN,
        closeTime: ops.closeTime || DEFAULT_CLOSE,
        isManualOverride: !ops.businessHoursEnabled,
        businessHoursEnabled: ops.businessHoursEnabled === true,
      },
      offlineMessage: ops.offlineMessage,
      timezone:
        typeof ops.timezone === 'string' && ops.timezone.trim()
          ? ops.timezone.trim()
          : DEFAULT_STORE_TIMEZONE,
    };
  }

  if (legacyGlobal) {
    return {
      isStoreOpen: legacyGlobal.isStoreOpen !== false,
      storeTiming: {
        openTime: legacyGlobal.storeTiming?.openTime || DEFAULT_OPEN,
        closeTime: legacyGlobal.storeTiming?.closeTime || DEFAULT_CLOSE,
        isManualOverride: legacyGlobal.storeTiming?.isManualOverride ?? true,
        businessHoursEnabled: legacyGlobal.storeTiming?.isManualOverride === false,
      },
      timezone: DEFAULT_STORE_TIMEZONE,
    };
  }

  return {
    isStoreOpen: true,
    storeTiming: {
      openTime: DEFAULT_OPEN,
      closeTime: DEFAULT_CLOSE,
      isManualOverride: true,
      businessHoursEnabled: false,
    },
    timezone: DEFAULT_STORE_TIMEZONE,
  };
}

function isWithinBusinessHours(
  openTime: string,
  closeTime: string,
  currentTime: Date,
  timeZone = DEFAULT_STORE_TIMEZONE,
): boolean {
  const currentTimeStr = formatLocalTimeHHmm(currentTime, timeZone);

  if (closeTime < openTime) {
    return currentTimeStr >= openTime || currentTimeStr <= closeTime;
  }

  return currentTimeStr >= openTime && currentTimeStr <= closeTime;
}

export function isTenantStoreOpenNow(
  settings: ResolvedStoreSettings | null | undefined,
  currentTime: Date = new Date(),
): boolean {
  if (!settings) return true;
  if (settings.isStoreOpen === false) return false;

  if (settings.storeTiming.businessHoursEnabled) {
    const { openTime, closeTime } = settings.storeTiming;
    if (openTime && closeTime) {
      return isWithinBusinessHours(openTime, closeTime, currentTime, settings.timezone);
    }
  }

  return true;
}

export function getStoreClosedReason(
  settings: ResolvedStoreSettings | null | undefined,
  currentTime: Date = new Date(),
): 'manual' | 'hours' | null {
  if (!settings) return null;
  if (settings.isStoreOpen === false) return 'manual';

  if (settings.storeTiming.businessHoursEnabled) {
    const { openTime, closeTime } = settings.storeTiming;
    if (
      openTime &&
      closeTime &&
      !isWithinBusinessHours(openTime, closeTime, currentTime, settings.timezone)
    ) {
      return 'hours';
    }
  }

  return null;
}

export function getStoreClosedMessage(
  settings: ResolvedStoreSettings | null | undefined,
  currentTime: Date = new Date()
): string {
  const reason = getStoreClosedReason(settings, currentTime);
  if (!reason) return '';

  if (reason === 'manual') {
    return settings?.offlineMessage || 'Kitchen is temporarily offline. Please check back soon.';
  }

  const openTime = settings?.storeTiming.openTime || DEFAULT_OPEN;
  return `Kitchen closed for now • Reopens at ${openTime}`;
}
