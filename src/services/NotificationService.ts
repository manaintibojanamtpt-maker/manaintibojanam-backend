import toast from 'react-hot-toast';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '../firebase';
import { getDb } from '../lib/firebase-db';
import { doc, setDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { emitNotchNotification } from '../components/NotchNotification';

interface NotificationPayload {
  orderId: string;
  status: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

class NotificationService {
  private permission: NotificationPermission = 'default';
  private messaging: any = null;
  private currentToken: string | null = null;
  private fcmInitialized = false;
  private authReady = false;

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  /**
   * Set auth readiness state - called by AuthContext when auth state is determined
   */
  setAuthReady(ready: boolean) {
    this.authReady = ready;
    console.log('NotificationService: Auth ready state set to:', ready);
  }

  /**
   * Initialize Firebase Cloud Messaging
   * Only called after auth state is confirmed ready
   */
  async initializeFCM(): Promise<boolean> {
    if (!this.fcmInitialized && typeof window !== 'undefined') {
      try {
        // CRITICAL: Wait for auth to be ready before proceeding
        if (!this.authReady) {
          console.warn('NotificationService: Auth not ready, delaying FCM initialization');
          return false;
        }

        // Check browser support
        if (!('serviceWorker' in navigator)) {
          console.warn('Service Workers not supported in this browser');
          return false;
        }

        console.log('NotificationService: Initializing FCM...');

        // Initialize messaging using the app already initialized in firebase.ts
        this.messaging = getMessaging(app);

        // Service worker is already registered at app startup in main.tsx
        // Just get the existing registration for FCM setup, but with a timeout
        // because in Dev mode, SW might be disabled causing .ready to hang forever.
        const registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Service Worker ready timeout')), 3000))
        ]).catch(e => {
          console.warn('NotificationService: Service Worker not ready (expected in Dev mode):', e.message);
          return null;
        });

        if (!registration) {
          return false;
        }

        console.log('Service Worker ready for FCM:', registration);

        // Set up foreground message listener
        this.setupForegroundNotifications();

        this.fcmInitialized = true;
        console.log('NotificationService: FCM initialization complete');
        return true;
      } catch (error) {
        console.error('FCM initialization error:', error);
        return false;
      }
    }
    return this.fcmInitialized;
  }

  /**
   * Request notification permission from user.
   * Must be called from a click/tap handler — browsers block unprompted requests.
   * Returns true when the browser permission is granted (even if FCM is unavailable in dev).
   */
  async requestPermission(userId?: string): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notification');
      return false;
    }

    this.permission = Notification.permission;

    if (Notification.permission === 'granted') {
      await this.trySetupPush(userId);
      return true;
    }

    if (Notification.permission === 'denied') {
      console.log('User denied notification permission');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;

      if (permission === 'granted') {
        await this.trySetupPush(userId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  private async trySetupPush(userId?: string): Promise<void> {
    if (!this.authReady) {
      console.warn('NotificationService: Auth not ready yet — browser permission saved, FCM deferred');
      return;
    }

    try {
      await this.initializeFCM();
      await this.retrieveFCMToken();
      if (userId && this.currentToken) {
        await this.registerDeviceToken(userId);
      }
    } catch (error) {
      console.warn('NotificationService: Push setup skipped (in-app updates still work):', error);
    }
  }

  getBrowserPermission(): NotificationPermission {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
    return this.permission;
  }

  /**
   * Retrieve and store FCM registration token
   * This token is sent to backend to send push messages to this device
   */
  private async retrieveFCMToken(): Promise<string | null> {
    if (!this.messaging) {
      console.error('FCM not initialized');
      return null;
    }

    try {
      const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      
      let tokenOptions = {};
      if (VAPID_KEY && !VAPID_KEY.includes('YOUR_FIREBASE')) {
        tokenOptions = { vapidKey: VAPID_KEY };
      }

      const token = await getToken(this.messaging, tokenOptions);

      if (token) {
        this.currentToken = token;
        console.log('FCM Token retrieved:', token);

        // Token will be registered to user via registerDeviceToken() method
        return token;
      }
    } catch (error) {
      console.error('Error retrieving FCM token:', error);
    }

    return null;
  }

  /**
   * Register device token for a user (admin or customer)
   * Stores token in Firestore so backend can send push notifications
   * @param userId User ID to register token for
   * @returns true if registration successful
   */
  async registerDeviceToken(userId: string): Promise<boolean> {
    try {
      // Ensure FCM is initialized
      if (!this.fcmInitialized) {
        await this.initializeFCM();
      }

      // Ensure we have a token
      if (!this.currentToken) {
        await this.retrieveFCMToken();
      }

      if (!this.currentToken) {
        console.warn('No FCM token available for registration');
        return false;
      }

      // Get reference to user's notification tokens
      const userRef = doc(getDb(), 'users', userId);
      
      // Add token to array of device tokens
      await setDoc(
        userRef,
        {
          deviceTokens: arrayUnion(this.currentToken),
          lastTokenUpdate: new Date(),
          notifications: {
            enabled: true,
            orders: true,
            status_updates: true
          }
        },
        { merge: true }
      );

      console.log(`✅ Device token registered for user ${userId}`);
      return true;
    } catch (error: any) {
      console.error('Error registering device token:', error);
      return false;
    }
  }

  /**
   * Unregister device token (call on logout)
   * Removes token from user's device list
   * @param userId User ID to unregister from
   */
  async unregisterDeviceToken(userId: string): Promise<void> {
    try {
      if (!this.currentToken) {
        console.warn('No token to unregister');
        return;
      }

      const userRef = doc(getDb(), 'users', userId);
      await setDoc(
        userRef,
        {
          deviceTokens: arrayRemove(this.currentToken)
        },
        { merge: true }
      );

      console.log(`Unregistered device token for user ${userId}`);
    } catch (error: any) {
      console.error('Error unregistering device token:', error);
    }
  }

  /**
   * Set up listener for foreground notifications
   * Handles notifications received while app is open in browser
   */
  private setupForegroundNotifications(): void {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log('Foreground notification received:', payload);

      const { notification, data } = payload;

      // Show notification while app is in foreground
      if (notification) {
        this.displayNotification(
          notification.title || 'BhojanOS',
          {
            body: notification.body || '',
            icon: notification.icon || '/logo192.png',
            badge: '/logo192.png',
            tag: data?.orderId || 'order-update',
            data: data
          }
        );

        emitNotchNotification({
          title: notification.title || 'BhojanOS',
          body: notification.body || '',
          type: 'order',
          status: data?.status,
          orderId: data?.orderId
        });

        // Also show toast for immediate visibility
        toast(notification.body || notification.title || 'Order Update', {
          icon: '🔔',
          duration: 5000
        });
      }
    });
  }

  /**
   * Display notification using Web Notification API
   */
  private displayNotification(title: string, options?: NotificationOptions): void {
    if (this.permission === 'granted' && 'Notification' in window) {
      new Notification(title, {
        icon: '/logo192.png',
        badge: '/logo192.png',
        ...options
      });
    }
  }

  /**
   * Send toast notification (always visible to user)
   * Fallback when notifications not enabled
   */
  private showToast(message: string, icon: string = '🔔'): void {
    toast(message, {
      icon,
      duration: 5000
    });
  }

  /**
   * Public method to send notification
   * Used for testing or when notification content is generated on client
   */
  sendNotification(title: string, options?: NotificationOptions): void {
    this.displayNotification(title, {
      icon: '/logo192.png',
      badge: '/logo192.png',
      ...options
    });

    // Always show toast as fallback
    emitNotchNotification({
      title,
      body: options?.body,
      type: 'order',
      status: String(options?.data?.status || ''),
      orderId: String(options?.data?.orderId || '')
    });

    this.showToast(options?.body || title, '🔔');
  }

  /**
   * Simulate Push Notification from Backend
   * Used when testing order status updates
   * In production, backend sends via FCM or Cloud Functions
   */
  async simulatePushNotification(orderId: string, status: string): Promise<void> {
    const statusMessages: Record<string, { title: string; body: string; icon: string }> = {
      accepted: {
        title: '✅ Order Accepted',
        body: 'Restaurant has accepted your order!',
        icon: '✅'
      },
      preparing: {
        title: '👨‍🍳 Preparing Your Order',
        body: 'Our chef is now preparing your delicious meal!',
        icon: '👨‍🍳'
      },
      ready: {
        title: '📦 Order Ready',
        body: 'Your order is ready! Waiting for pickup.',
        icon: '📦'
      },
      out_for_delivery: {
        title: '🛵 Out for Delivery',
        body: 'Your food is out for delivery! Get ready!',
        icon: '🛵'
      },
      delivered: {
        title: '🍛 Order Delivered',
        body: 'Your meal has been delivered! Enjoy your food!',
        icon: '🍛'
      },
      cancelled: {
        title: '❌ Order Cancelled',
        body: 'Your order has been cancelled.',
        icon: '❌'
      }
    };

    const notif = statusMessages[status] || {
      title: '📢 Order Update',
      body: `Order status updated to ${status}`,
      icon: '📢'
    };

    // Show both notification and toast
    this.displayNotification(notif.title, {
      body: notif.body,
      tag: orderId,
      renotify: true,
      icon: '/logo192.png'
    } as any);

    this.showToast(notif.body, notif.icon);
    emitNotchNotification({
      title: notif.title,
      body: notif.body,
      type: status === 'cancelled' ? 'error' : 'order',
      status,
      orderId
    });
  }

  /**
   * Get current FCM token for debugging
   */
  getToken(): string | null {
    return this.currentToken;
  }

  /**
   * Check if FCM is available
   */
  isFCMAvailable(): boolean {
    return typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window;
  }

  /**
   * Check if notification permission is granted
   */
  isNotificationEnabled(): boolean {
    return this.permission === 'granted';
  }

  /**
   * Get current FCM initialization status for debugging
   */
  getStatus() {
    return {
      permission: this.permission,
      fcmInitialized: this.fcmInitialized,
      authReady: this.authReady,
      hasToken: !!this.currentToken,
      messagingReady: !!this.messaging,
      serviceWorkerReady: typeof navigator !== 'undefined' && 'serviceWorker' in navigator
    };
  }
}

// Lazy singleton instance
let notificationServiceInstance: NotificationService | null = null;

export const getNotificationService = (): NotificationService => {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
};

// For backward compatibility - but this will be lazy now
export const notificationService = new Proxy({} as NotificationService, {
  get: (target, prop) => {
    const instance = getNotificationService();
    const value = (instance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
  set: (target, prop, value) => {
    const instance = getNotificationService();
    (instance as any)[prop] = value;
    return true;
  }
});
