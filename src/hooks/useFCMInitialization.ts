import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/NotificationService';

/**
 * Hook to manage Firebase Cloud Messaging initialization
 * Ensures FCM is only initialized after auth state is determined
 */
export function useFCMInitialization() {
  const { currentUser, loading: authLoading } = useAuth();
  const [fcmInitialized, setFcmInitialized] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [hasAttemptedInit, setHasAttemptedInit] = useState(false);

  useEffect(() => {
    // Set auth ready state in NotificationService
    notificationService.setAuthReady(!authLoading);

    // Initialize FCM only when:
    // 1. Auth is not loading (auth state is determined)
    // 2. We haven't already initialized FCM
    // 3. We haven't already attempted initialization
    // 4. User is authenticated
    const initializeFCM = async () => {
      if (authLoading || fcmInitialized || hasAttemptedInit || initializing) return;

      // Only initialize for authenticated users
      if (!currentUser) {
        console.log('useFCMInitialization: No authenticated user, skipping FCM init');
        return;
      }

      setInitializing(true);
      setHasAttemptedInit(true); // Mark as attempted immediately
      console.log('useFCMInitialization: Starting FCM initialization...');

      try {
        const success = await notificationService.initializeFCM();
        if (success) {
          setFcmInitialized(true);
          if (typeof window !== 'undefined' && Notification.permission === 'granted') {
            await notificationService.registerDeviceToken(currentUser.uid);
          }
          console.log('useFCMInitialization: FCM initialized successfully');
        } else {
          console.log('useFCMInitialization: FCM initialization skipped or unavailable (expected in Dev mode).');
        }
      } catch (error) {
        console.error('useFCMInitialization: FCM initialization error:', error);
      } finally {
        setInitializing(false);
      }
    };

    // Only run initialization if auth is ready and we haven't attempted before
    if (!authLoading && !hasAttemptedInit) {
      initializeFCM();
    }
  }, [currentUser, authLoading, hasAttemptedInit, initializing, fcmInitialized]);

  return {
    fcmInitialized,
    initializing,
    authReady: !authLoading
  };
}
