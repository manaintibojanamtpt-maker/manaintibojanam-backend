import { fingerprintPushToken } from '../domain/devicePushStatus';

const STORAGE_KEY = 'ob-device-push-registration-v1';

export type DevicePushPlatform = 'web' | 'android' | 'ios';

export interface DevicePushRegistrationRecord {
  readonly version: 1;
  readonly platform: DevicePushPlatform;
  readonly registeredAt: string;
  readonly tokenFingerprint: string;
}

function canUseStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

export function readDevicePushRegistration(): DevicePushRegistrationRecord | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DevicePushRegistrationRecord>;
    if (
      parsed.version !== 1 ||
      (parsed.platform !== 'web' && parsed.platform !== 'android' && parsed.platform !== 'ios') ||
      typeof parsed.registeredAt !== 'string' ||
      typeof parsed.tokenFingerprint !== 'string'
    ) {
      return null;
    }
    return {
      version: 1,
      platform: parsed.platform,
      registeredAt: parsed.registeredAt,
      tokenFingerprint: parsed.tokenFingerprint,
    };
  } catch {
    return null;
  }
}

export function isDevicePushRegisteredForPlatform(platform: DevicePushPlatform): boolean {
  const record = readDevicePushRegistration();
  return record?.platform === platform;
}

export function markDevicePushRegistered(input: {
  readonly platform: DevicePushPlatform;
  readonly token: string;
}): DevicePushRegistrationRecord {
  const record: DevicePushRegistrationRecord = {
    version: 1,
    platform: input.platform,
    registeredAt: new Date().toISOString(),
    tokenFingerprint: fingerprintPushToken(input.token),
  };
  if (canUseStorage()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  }
  return record;
}

export function clearDevicePushRegistration(): void {
  if (!canUseStorage()) return;
  localStorage.removeItem(STORAGE_KEY);
}
