export interface TenantStoreOperations {
  isStoreOpen?: boolean;
  businessHoursEnabled?: boolean;
  openTime?: string;
  closeTime?: string;
  offlineMessage?: string;
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
}

const DEFAULT_OPEN = '09:00';
const DEFAULT_CLOSE = '22:00';

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
  };
}

function isWithinBusinessHours(openTime: string, closeTime: string, currentTime: Date): boolean {
  const currentTimeStr = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;

  if (closeTime < openTime) {
    return currentTimeStr >= openTime || currentTimeStr <= closeTime;
  }

  return currentTimeStr >= openTime && currentTimeStr <= closeTime;
}

export function isTenantStoreOpenNow(
  settings: ResolvedStoreSettings | null | undefined,
  currentTime: Date = new Date()
): boolean {
  if (!settings) return true;
  if (settings.isStoreOpen === false) return false;

  if (settings.storeTiming.businessHoursEnabled) {
    const { openTime, closeTime } = settings.storeTiming;
    if (openTime && closeTime) {
      return isWithinBusinessHours(openTime, closeTime, currentTime);
    }
  }

  return true;
}

export function getStoreClosedReason(
  settings: ResolvedStoreSettings | null | undefined,
  currentTime: Date = new Date()
): 'manual' | 'hours' | null {
  if (!settings) return null;
  if (settings.isStoreOpen === false) return 'manual';

  if (settings.storeTiming.businessHoursEnabled) {
    const { openTime, closeTime } = settings.storeTiming;
    if (openTime && closeTime && !isWithinBusinessHours(openTime, closeTime, currentTime)) {
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
