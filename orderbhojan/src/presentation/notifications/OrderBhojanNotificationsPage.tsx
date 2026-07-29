import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  NotificationsGuestView,
  NotificationsPageView,
} from '@bhojan/storefront-design-system/notifications';
import { createMessagingPort } from '@/firebase/messaging';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { useAuth } from '@/shared/providers/AuthProvider';
import { isNativePlatform } from '@/lib/nativePlatform';
import {
  getLastNativePushRegistrationError,
  nativeNotificationPlatform,
  readNativeNotificationPermission,
  requestNativePushPermission,
} from '@/lib/nativePushNotifications';

type PermissionState = 'unknown' | 'granted' | 'denied' | 'prompt';

export function OrderBhojanNotificationsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<PermissionState>('unknown');
  const [registered, setRegistered] = useState(false);
  const native = isNativePlatform();

  useEffect(() => {
    void readNativeNotificationPermission().then((perm) => {
      if (perm === 'granted') {
        setPermission('granted');
        setStatus((current) =>
          current ??
            'Notifications are allowed on this device. Tap Register to finish setup for order alerts.',
        );
        return;
      }
      if (perm === 'denied') {
        setPermission('denied');
        setStatus('Notification permission is blocked for this app.');
        return;
      }
      setPermission('prompt');
    });
  }, []);

  if (!isAuthenticated) {
    return <NotificationsGuestView onSignIn={() => navigate('/auth')} />;
  }

  const enableNotifications = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const messaging = createMessagingPort();
      const nextPermission = native
        ? await requestNativePushPermission()
        : await messaging.requestPermission();
      if (nextPermission !== 'granted') {
        setPermission('denied');
        setRegistered(false);
        setStatus('Notification permission was not granted.');
        return;
      }
      setPermission('granted');
      const token = await messaging.getToken();
      if (!token) {
        const registrationError = native ? getLastNativePushRegistrationError() : null;
        setRegistered(false);
        setStatus(
          native
            ? registrationError
              ? `Push token unavailable: ${registrationError}. Confirm Cloud Messaging is enabled for com.bhojanos.orderbhojan in bhojanos-prod, then rebuild the Android app.`
              : 'Push token unavailable. Confirm Firebase Cloud Messaging is enabled for the Android app in bhojanos-prod, then rebuild.'
            : 'Push is not configured on this build yet. Order tracking still works in-app.',
        );
        return;
      }
      await getMarketplaceApiClient().registerNotificationToken({
        token,
        platform: native ? nativeNotificationPlatform() : 'web',
      });
      setRegistered(true);
      setStatus('Notifications enabled for this device.');
    } catch {
      setRegistered(false);
      setStatus('Could not enable notifications. Try again later.');
    } finally {
      setBusy(false);
    }
  };

  const deniedHint = native
    ? 'Open Android Settings → Apps → OrderBhojan → Notifications and allow alerts, then return and tap Register again.'
    : 'Open your browser site settings for OrderBhojan and allow notifications, then try again.';

  const enableLabel = registered
    ? 'Re-register this device'
    : permission === 'granted'
      ? 'Register this device'
      : 'Enable push notifications';

  return (
    <NotificationsPageView
      title="Notifications"
      description="Stay in the loop from order to doorstep."
      enableLabel={enableLabel}
      busyLabel={registered || permission === 'granted' ? 'Registering…' : 'Enabling…'}
      busy={busy}
      status={status}
      onEnable={() => void enableNotifications()}
      viewOrdersLabel="View orders"
      onViewOrders={() => navigate('/orders')}
      deniedHint={deniedHint}
      deviceReady={registered}
    />
  );
}
