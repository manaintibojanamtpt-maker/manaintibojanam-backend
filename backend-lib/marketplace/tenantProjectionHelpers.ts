import type { FirestoreTenantRecord } from './projectFoodMenuV1.js';

export type KitchenDietaryProfile = 'pure_veg' | 'veg_friendly' | 'non_veg' | 'unknown';

export interface TenantLocation {
  readonly lat: number;
  readonly lng: number;
  readonly city?: string;
  readonly state?: string;
}

export interface TenantDeliveryConfig {
  readonly enabled?: boolean;
  readonly freeRadius?: number;
  readonly paidRadius?: number;
  readonly maxRadius?: number;
  readonly perKmCharge?: number;
  readonly baseFee?: number;
  readonly prepTime?: number;
  readonly feesConfigured?: boolean;
  readonly freeDeliveryMinOrder?: number;
}

export interface ResolvedStoreTiming {
  readonly isStoreOpen: boolean;
  readonly openTime: string;
  readonly closeTime: string;
  readonly businessHoursEnabled: boolean;
  readonly offlineMessage?: string;
  readonly timezone: string;
}

const DEFAULT_OPEN = '09:00';
const DEFAULT_CLOSE = '22:00';
export const DEFAULT_STORE_TIMEZONE = 'Asia/Kolkata';

/** Normalize owner-entered hours (12h or 24h) to HH:mm for comparisons. */
export function normalizeStoreTimeToHHmm(value: string): string {
  const trimmed = value.trim();
  const match24 = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (match24) {
    const hour = Number(match24[1]);
    const minute = Number(match24[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
  }

  const match12 = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i.exec(trimmed);
  if (match12) {
    let hour = Number(match12[1]);
    const minute = Number(match12[2] ?? '0');
    const ampm = match12[3].toUpperCase();
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  return trimmed;
}

export function formatLocalTimeHHmm(now: Date, timeZone = DEFAULT_STORE_TIMEZONE): string {
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

export function readTenantLocation(
  raw: Record<string, unknown>,
): TenantLocation | null {
  const location = raw.location;
  if (!location || typeof location !== 'object') return null;
  const lat = (location as { lat?: unknown }).lat;
  const lng = (location as { lng?: unknown }).lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) {
    return null;
  }
  return {
    lat: Number(lat),
    lng: Number(lng),
    city: typeof (location as { city?: unknown }).city === 'string'
      ? String((location as { city: string }).city)
      : undefined,
    state: typeof (location as { state?: unknown }).state === 'string'
      ? String((location as { state: string }).state)
      : undefined,
  };
}

export function readTenantDeliveryConfig(
  raw: Record<string, unknown>,
): TenantDeliveryConfig | undefined {
  const deliveryConfig = raw.deliveryConfig;
  if (!deliveryConfig || typeof deliveryConfig !== 'object') return undefined;
  const body = deliveryConfig as Record<string, unknown>;
  return {
    enabled: body.enabled === true || body.enabled === undefined,
    freeRadius: asNumber(body.freeRadius),
    paidRadius: asNumber(body.paidRadius),
    maxRadius: asNumber(body.maxRadius),
    perKmCharge: asNumber(body.perKmCharge),
    baseFee: asNumber(body.baseFee),
    prepTime: asNumber(body.prepTime),
    feesConfigured: body.feesConfigured === true,
    freeDeliveryMinOrder: asNumber(body.freeDeliveryMinOrder),
  };
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function resolveStoreTiming(
  tenant: FirestoreTenantRecord,
  raw: Record<string, unknown>,
): ResolvedStoreTiming {
  const ops = tenant.storeOperations;
  const settings =
    raw.settings && typeof raw.settings === 'object'
      ? (raw.settings as Record<string, unknown>)
      : undefined;
  const legacyTiming =
    settings?.storeTiming && typeof settings.storeTiming === 'object'
      ? (settings.storeTiming as Record<string, unknown>)
      : undefined;

  if (ops) {
    const openTime = normalizeStoreTimeToHHmm(
      typeof ops.openTime === 'string' && ops.openTime.trim() ? ops.openTime : DEFAULT_OPEN,
    );
    const closeTime = normalizeStoreTimeToHHmm(
      typeof ops.closeTime === 'string' && ops.closeTime.trim() ? ops.closeTime : DEFAULT_CLOSE,
    );
    return {
      isStoreOpen: ops.isStoreOpen !== false,
      openTime,
      closeTime,
      businessHoursEnabled: ops.businessHoursEnabled === true,
      offlineMessage: ops.offlineMessage,
      timezone:
        typeof ops.timezone === 'string' && ops.timezone.trim()
          ? ops.timezone.trim()
          : DEFAULT_STORE_TIMEZONE,
    };
  }

  if (legacyTiming) {
    const manualOverride = legacyTiming.isManualOverride === true;
    const openTime = normalizeStoreTimeToHHmm(
      typeof legacyTiming.openTime === 'string' ? legacyTiming.openTime : DEFAULT_OPEN,
    );
    const closeTime = normalizeStoreTimeToHHmm(
      typeof legacyTiming.closeTime === 'string' ? legacyTiming.closeTime : DEFAULT_CLOSE,
    );
    return {
      isStoreOpen: true,
      openTime,
      closeTime,
      businessHoursEnabled: !manualOverride,
      timezone: DEFAULT_STORE_TIMEZONE,
    };
  }

  return {
    isStoreOpen: true,
    openTime: DEFAULT_OPEN,
    closeTime: DEFAULT_CLOSE,
    businessHoursEnabled: false,
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

export function isStoreOpenNow(timing: ResolvedStoreTiming, now = new Date()): boolean {
  if (!timing.isStoreOpen) return false;
  if (!timing.businessHoursEnabled) return true;
  return isWithinBusinessHours(timing.openTime, timing.closeTime, now, timing.timezone);
}

export function formatTime12h(hhmm: string): string {
  const [hourRaw, minuteRaw] = hhmm.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour)) return hhmm;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const displayMinute = Number.isFinite(minute) ? `:${String(minute).padStart(2, '0')}` : '';
  return `${displayHour}${displayMinute} ${ampm}`;
}

export function formatHoursLabel(openTime: string, closeTime: string): string {
  return `${formatTime12h(openTime)} – ${formatTime12h(closeTime)}`;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function roadDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return haversineKm(lat1, lng1, lat2, lng2) * 1.2;
}

export function computeTenantDeliveryFee(
  distanceKm: number,
  config?: TenantDeliveryConfig,
): number {
  if (!config) return -1;

  const maxRadius = Number(config.maxRadius ?? config.paidRadius ?? 0);
  const freeRadius = Number(config.freeRadius ?? 0);
  const paidRadius = Number(config.paidRadius ?? config.maxRadius ?? 0);
  const baseFee = Number(config.baseFee ?? 0);
  const perKmCharge = Number(config.perKmCharge ?? 0);

  if (maxRadius > 0 && distanceKm > maxRadius) return -1;
  if (distanceKm <= freeRadius) return 0;

  const ownerSetFees = config.feesConfigured === true || baseFee > 0 || perKmCharge > 0;
  if (!ownerSetFees) return -1;

  if (distanceKm <= paidRadius) return baseFee;
  return baseFee + Math.max(0, distanceKm - paidRadius) * perKmCharge;
}

export function resolveDeliveryFeeForDisplay(
  config: TenantDeliveryConfig | undefined,
  distanceKm?: number,
): number | null | undefined {
  if (!config || config.enabled === false) return undefined;
  if (config.feesConfigured !== true && (config.baseFee ?? 0) === 0 && (config.perKmCharge ?? 0) === 0) {
    return undefined;
  }
  if (distanceKm == null) {
    return config.feesConfigured ? config.baseFee ?? 0 : undefined;
  }
  const fee = computeTenantDeliveryFee(distanceKm, config);
  if (fee < 0) return null;
  return fee;
}

export function resolveKitchenDietaryFromMenuTypes(
  menuTypes: readonly ('veg' | 'non-veg')[],
): KitchenDietaryProfile {
  if (menuTypes.length === 0) return 'unknown';
  const vegCount = menuTypes.filter((type) => type === 'veg').length;
  const nonVegCount = menuTypes.length - vegCount;
  if (nonVegCount === 0) return 'pure_veg';
  if (vegCount === 0) return 'non_veg';
  return 'veg_friendly';
}

export function kitchenDietaryToBadges(profile: KitchenDietaryProfile): Array<'veg' | 'pure_veg'> {
  switch (profile) {
    case 'pure_veg':
      return ['pure_veg'];
    case 'veg_friendly':
      return ['veg'];
    case 'non_veg':
      return [];
    default:
      return [];
  }
}

export function isVegKitchen(profile: KitchenDietaryProfile): boolean {
  return profile === 'pure_veg' || profile === 'veg_friendly';
}

export function shouldShowKitchenDietaryBadge(profile: KitchenDietaryProfile): boolean {
  return profile === 'pure_veg' || profile === 'non_veg';
}

export function buildWeeklyHours(timing: ResolvedStoreTiming) {
  return [
    {
      day: 'Mon–Sun',
      open: formatTime12h(timing.openTime),
      close: formatTime12h(timing.closeTime),
      isToday: true,
    },
  ];
}

export function isImplausibleCustomerDistance(distanceKm: number): boolean {
  return distanceKm > 120;
}

export function normalizeSyncTimestamp(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  if (typeof value === 'object') {
    const ts = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
    const sec = ts.seconds ?? ts._seconds;
    if (typeof sec === 'number') return new Date(sec * 1000).toISOString();
  }
  return undefined;
}

/** Revision token for live storefront sync — bumps when owner edits tenant or store ops. */
export function extractTenantSyncRevision(raw: Record<string, unknown>): string | undefined {
  const explicit = raw.tenantSyncRevision;
  if (typeof explicit === 'string' && explicit.length > 0) return explicit;

  const ops = raw.storeOperations;
  if (ops && typeof ops === 'object') {
    const opsUpdated = normalizeSyncTimestamp((ops as Record<string, unknown>).updatedAt);
    if (opsUpdated) return opsUpdated;
  }
  return normalizeSyncTimestamp(raw.updatedAt);
}

export function mergeSyncRevisions(
  ...revisions: readonly (string | undefined)[]
): string | undefined {
  let max: string | undefined;
  for (const revision of revisions) {
    if (!revision) continue;
    if (!max || revision > max) max = revision;
  }
  return max;
}
