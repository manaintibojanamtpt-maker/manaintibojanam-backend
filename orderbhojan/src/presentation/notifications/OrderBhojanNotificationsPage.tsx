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

export function OrderBhojanNotificationsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const native = isNativePlatform();

  useEffect(() => {
    void readNativeNotificationPermission().then((perm) => {
      if (perm === 'granted') {
        setStatus((current) =>
          current ?? 'Notifications are allowed on this device. Tap Enable to register this phone.',
        );
      }
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
        setStatus('Notification permission was not granted.');
        return;
      }
      const token = await messaging.getToken();
      if (!token) {
        const registrationError = native ? getLastNativePushRegistrationError() : null;
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
      setStatus('Notifications enabled for this device.');
    } catch {
      setStatus('Could not enable notifications. Try again later.');
    } finally {
      setBusy(false);
    }
  };

  const deniedHint = native
    ? 'Open Android Settings → Apps → OrderBhojan → Notifications and allow alerts, then return and tap Enable again.'
    : 'Open your browser site settings for OrderBhojan and allow notifications, then try again.';

  const enableLabel = 'Enable push notifications';

  return (
    <NotificationsPageView
      title="Notifications"
      description="Stay in the loop from order to doorstep."
      enableLabel={enableLabel}
      busyLabel="Enabling…"
      busy={busy}
      status={status}
      onEnable={() => void enableNotifications()}
      viewOrdersLabel="View orders"
      onViewOrders={() => navigate('/orders')}
      deniedHint={deniedHint}
    />
  );
}
