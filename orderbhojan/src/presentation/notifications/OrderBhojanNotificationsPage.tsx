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
  requestNativePushPermission,
} from '@/lib/nativePushNotifications';
import { updateCustomerPreferences } from '@/features/auth/infrastructure/customerRepository';
import {
  notificationsEnableLabel,
  notificationsStatusCopy,
} from '@/features/notifications/domain/devicePushStatus';
import { useDevicePushStatus } from '@/features/notifications/hooks/useDevicePushStatus';

export function OrderBhojanNotificationsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, sessionUser } = useAuth();
  const push = useDevicePushStatus();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const native = isNativePlatform();

  useEffect(() => {
    if (!push.hydrated) return;
    // Always refresh status copy when composite status changes (e.g. OS revoke → blocked).
    setStatus(notificationsStatusCopy(push.status));
  }, [push.hydrated, push.status]);

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
        push.setPermissionState('denied');
        setStatus('Notification permission was not granted.');
        return;
      }
      push.setPermissionState('granted');
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
      push.markRegistered(token);
      if (sessionUser?.uid) {
        try {
          await updateCustomerPreferences(sessionUser.uid, { notifications: true });
        } catch {
          // Preference sync is best-effort; device registration is already persisted locally.
        }
      }
      setStatus('Notifications enabled for this device.');
    } catch {
      setStatus('Could not enable notifications. Try again later.');
    } finally {
      setBusy(false);
      void push.refresh();
    }
  };

  const deniedHint = native
    ? 'Open Android Settings → Apps → OrderBhojan → Notifications and allow alerts, then return and tap Register again.'
    : 'Open your browser site settings for OrderBhojan and allow notifications, then try again.';

  const enableLabel = notificationsEnableLabel(push.status);
  const deviceReady = push.status === 'ready';

  return (
    <NotificationsPageView
      title="Notifications"
      description="Stay in the loop from order to doorstep."
      enableLabel={enableLabel}
      busyLabel={deviceReady || push.permission === 'granted' ? 'Registering…' : 'Enabling…'}
      busy={busy || !push.hydrated}
      status={status}
      onEnable={() => void enableNotifications()}
      viewOrdersLabel="View orders"
      onViewOrders={() => navigate('/orders')}
      deniedHint={deniedHint}
      deviceReady={deviceReady}
    />
  );
}
