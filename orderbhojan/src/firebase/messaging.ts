import { getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, type Messaging } from 'firebase/messaging';
import { initializeFirebase } from './init';
import { getAppConfig } from '@/config';

export interface MessagingPort {
  requestPermission(): Promise<NotificationPermission>;
  getToken(): Promise<string | null>;
}

let messagingInstance: Messaging | null = null;

async function resolveMessaging(app: FirebaseApp): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  if (!(await isSupported())) return null;
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

export function createMessagingPort(): MessagingPort {
  return {
    async requestPermission() {
      if (typeof Notification === 'undefined') {
        return 'denied';
      }
      return Notification.requestPermission();
    },
    async getToken() {
      const config = getAppConfig();
      if (!config.firebase.messagingSenderId) {
        return null;
      }

      initializeFirebase();
      const app = getApps()[0] ?? getApp();
      const messaging = await resolveMessaging(app);
      if (!messaging || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
        return null;
      }

      const registration =
        (await navigator.serviceWorker.getRegistration()) ??
        (await navigator.serviceWorker.register('/firebase-messaging-sw.js'));

      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
      const token = await getToken(messaging, {
        vapidKey: vapidKey && !vapidKey.includes('YOUR_FIREBASE') ? vapidKey : undefined,
        serviceWorkerRegistration: registration,
      });

      return token || null;
    },
  };
}
