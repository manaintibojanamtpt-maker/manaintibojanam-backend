import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import type { MessagingPort } from '@/firebase/messaging';
import { isNativePlatform } from '@/lib/nativePlatform';

const TOKEN_TIMEOUT_MS = 15_000;
const ANDROID_CHANNEL_ID = 'order_updates';

let cachedNativePushToken: string | null = null;
let lastRegistrationError: string | null = null;
let bootstrapPromise: Promise<void> | null = null;

function mapPushPermission(receive: string | undefined): NotificationPermission {
  if (receive === 'granted') return 'granted';
  if (receive === 'denied') return 'denied';
  return 'default';
}

async function readNativePushPermission(): Promise<NotificationPermission> {
  const check = await PushNotifications.checkPermissions();
  return mapPushPermission(check.receive);
}

export async function readNativeNotificationPermission(): Promise<NotificationPermission> {
  if (!isNativePlatform()) {
    if (typeof Notification === 'undefined') return 'denied';
    return Notification.permission;
  }
  return readNativePushPermission();
}

export function getLastNativePushRegistrationError(): string | null {
  return lastRegistrationError;
}

export async function requestNativePushPermission(): Promise<NotificationPermission> {
  if (!isNativePlatform()) {
    if (typeof Notification === 'undefined') return 'denied';
    return Notification.requestPermission();
  }

  await ensureNativePushBootstrap();
  const request = await PushNotifications.requestPermissions();
  return mapPushPermission(request.receive);
}

async function ensureNativePushBootstrap(): Promise<void> {
  if (!isNativePlatform()) return;
  bootstrapPromise ??= bootstrapNativePushListeners();
  await bootstrapPromise;
}

async function obtainNativePushToken(): Promise<string | null> {
  await ensureNativePushBootstrap();

  if (cachedNativePushToken) {
    return cachedNativePushToken;
  }

  lastRegistrationError = null;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (token: string | null) => {
      if (settled) return;
      settled = true;
      resolve(token);
    };

    void (async () => {
      try {
        const registration = await PushNotifications.addListener('registration', (event) => {
          cachedNativePushToken = event.value?.trim() || null;
          finish(cachedNativePushToken);
          void registration.remove();
        });
        const registrationError = await PushNotifications.addListener('registrationError', (error) => {
          lastRegistrationError = error.error?.trim() || 'registration failed';
          finish(null);
          void registrationError.remove();
        });
        await PushNotifications.register();
        window.setTimeout(() => finish(cachedNativePushToken), TOKEN_TIMEOUT_MS);
      } catch (error) {
        lastRegistrationError = error instanceof Error ? error.message : 'register failed';
        finish(null);
      }
    })();
  });
}

export function createNativeMessagingPort(): MessagingPort {
  return {
    requestPermission: requestNativePushPermission,
    getToken: obtainNativePushToken,
  };
}

export function nativeNotificationPlatform(): 'android' | 'ios' {
  return Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
}

export async function bootstrapNativePushListeners(): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    await PushNotifications.addListener('registration', (event) => {
      cachedNativePushToken = event.value?.trim() || null;
      lastRegistrationError = null;
    });
    await PushNotifications.addListener('registrationError', (error) => {
      lastRegistrationError = error.error?.trim() || 'registration failed';
      if (import.meta.env.DEV) {
        console.warn('[OrderBhojan] push registration error', lastRegistrationError);
      }
    });

    if (Capacitor.getPlatform() === 'android') {
      await PushNotifications.createChannel({
        id: ANDROID_CHANNEL_ID,
        name: 'Order updates',
        description: 'Order confirmations, cooking, and delivery alerts',
        importance: 4,
        visibility: 1,
        vibration: true,
      });
    }

    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      if (import.meta.env.DEV) {
        console.info('[OrderBhojan] push received', notification.title);
      }
    });
    await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      const data = notification.data as { path?: string; url?: string } | undefined;
      const target = data?.path ?? data?.url;
      if (!target || typeof window === 'undefined') return;
      void (async () => {
        try {
          const { tryOpenNativeTrackFromPath } = await import('@/features/nativeTrack/nativeTrackBridge');
          const { trackEvent } = await import('@/telemetry/analytics');
          const native = await tryOpenNativeTrackFromPath(target, { source: 'push' });
          if (native.opened) {
            trackEvent({
              name: 'push_open_track',
              properties: {
                orderId: native.orderId,
                impl: 'native',
                client: Capacitor.getPlatform(),
              },
            });
            return;
          }
          if (native.orderId) {
            trackEvent({
              name: 'push_open_track',
              properties: {
                orderId: native.orderId,
                impl: 'hybrid',
                client: Capacitor.getPlatform(),
              },
            });
          }
        } catch {
          // Fall through to hybrid routing.
        }
        window.history.pushState({}, '', target);
        window.dispatchEvent(new PopStateEvent('popstate'));
      })();
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[OrderBhojan] native push listeners skipped', error);
    }
  }
}
