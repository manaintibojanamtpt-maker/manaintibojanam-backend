import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/NotificationService';
import toast from 'react-hot-toast';

/**
 * Hook to set up push notifications for admin users.
 * Requests permission from the admin device and stores its FCM token on the
 * matching Firestore user document so backend push can target this device.
 */
export function useAdminNotifications() {
  const { currentUser, userProfile } = useAuth();

  useEffect(() => {
    if (!currentUser || !userProfile || userProfile.role !== 'admin') {
      return;
    }

    const setupNotifications = async () => {
      try {
        if (!notificationService.isFCMAvailable()) {
          console.log('Push notifications not supported on this device');
          return;
        }

        const granted = await notificationService.requestPermission();
        if (!granted) {
          console.log('User declined notification permission');
          return;
        }

        const registered = await notificationService.registerDeviceToken(currentUser.uid);
        if (registered) {
          toast.success('Push notifications enabled', {
            duration: 2000,
            icon: '🔔'
          });
          console.log('Admin notifications enabled for:', currentUser.uid);
        } else {
          console.warn('Failed to register device token');
        }
      } catch (error) {
        console.error('Error setting up admin notifications:', error);
      }
    };

    setupNotifications();

    return () => {
      notificationService.unregisterDeviceToken(currentUser.uid).catch(err => {
        console.warn('Error unregistering token:', err);
      });
    };
  }, [currentUser, userProfile]);
}

/**
 * Hook for customers to enable order notifications.
 */
export function useCustomerNotifications() {
  const { currentUser, userProfile } = useAuth();

  useEffect(() => {
    if (!currentUser || !userProfile || userProfile.role !== 'user') {
      return;
    }

    const setupNotifications = async () => {
      try {
        if (!notificationService.isFCMAvailable()) {
          return;
        }

        const granted = await notificationService.requestPermission();
        if (!granted) return;

        const registered = await notificationService.registerDeviceToken(currentUser.uid);
        if (registered) {
          console.log('Customer notifications enabled for:', currentUser.uid);
        }
      } catch (error) {
        console.error('Error setting up customer notifications:', error);
      }
    };

    setupNotifications();

    return () => {
      notificationService.unregisterDeviceToken(currentUser.uid).catch(err => {
        console.warn('Error unregistering token:', err);
      });
    };
  }, [currentUser, userProfile]);
}

export default useAdminNotifications;
