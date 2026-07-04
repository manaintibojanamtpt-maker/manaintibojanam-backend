import { getAppConfig } from '@/config';

export interface MessagingPort {
  requestPermission(): Promise<NotificationPermission>;
  getToken(): Promise<string | null>;
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
      // M12: wire Firebase Messaging SDK
      return null;
    },
  };
}
