import { useCallback, useEffect, useState } from 'react';
import { isNativePlatform } from '@/lib/nativePlatform';
import {
  nativeNotificationPlatform,
  readNativeNotificationPermission,
} from '@/lib/nativePushNotifications';
import {
  mapNotificationPermission,
  resolveDevicePushStatus,
  settingsPushStatusLabel,
  type DevicePushStatus,
  type PushPermissionState,
} from '../domain/devicePushStatus';
import {
  isDevicePushRegisteredForPlatform,
  markDevicePushRegistered,
  type DevicePushPlatform,
} from '../infrastructure/devicePushRegistrationStore';

function currentPlatform(): DevicePushPlatform {
  return isNativePlatform() ? nativeNotificationPlatform() : 'web';
}

export function useDevicePushStatus() {
  const [permission, setPermission] = useState<PushPermissionState>('unknown');
  const [deviceRegistered, setDeviceRegistered] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(async () => {
    const platform = currentPlatform();
    const nativePermission = await readNativeNotificationPermission();
    const nextPermission = mapNotificationPermission(nativePermission);
    // Keep local registration truth even when OS permission is revoked/prompt.
    // resolveDevicePushStatus decides ready vs blocked from both signals.
    const registered = isDevicePushRegisteredForPlatform(platform);
    setPermission(nextPermission);
    setDeviceRegistered(registered);
    setHydrated(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const status: DevicePushStatus = hydrated
    ? resolveDevicePushStatus({ permission, deviceRegistered })
    : 'loading';

  const markRegistered = useCallback((token: string) => {
    const platform = currentPlatform();
    markDevicePushRegistered({ platform, token });
    setPermission('granted');
    setDeviceRegistered(true);
  }, []);

  const setPermissionState = useCallback((next: PushPermissionState) => {
    setPermission(next);
    if (next !== 'granted') {
      setDeviceRegistered(false);
    }
  }, []);

  return {
    permission,
    deviceRegistered,
    status,
    hydrated,
    settingsLabel: settingsPushStatusLabel(status),
    refresh,
    markRegistered,
    setPermissionState,
  };
}
