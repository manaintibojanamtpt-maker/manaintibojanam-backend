import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  NotificationsGuestView,
  NotificationsPageView,
} from '@bhojan/storefront-design-system/notifications';
import { createMessagingPort } from '@/firebase/messaging';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { useAuth } from '@/shared/providers/AuthProvider';

export function OrderBhojanNotificationsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isAuthenticated) {
    return <NotificationsGuestView onSignIn={() => navigate('/auth')} />;
  }

  const enableNotifications = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const messaging = createMessagingPort();
      const permission = await messaging.requestPermission();
      if (permission !== 'granted') {
        setStatus('Notification permission was not granted.');
        return;
      }
      const token = await messaging.getToken();
      if (!token) {
        setStatus('Push is not configured on this build yet. Order tracking still works in-app.');
        return;
      }
      await getMarketplaceApiClient().registerNotificationToken({ token, platform: 'web' });
      setStatus('Notifications enabled for this device.');
    } catch {
      setStatus('Could not enable notifications. Try again later.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <NotificationsPageView
      title="Notifications"
      description="Stay in the loop from order to doorstep."
      enableLabel="Enable push notifications"
      busyLabel="Enabling…"
      busy={busy}
      status={status}
      onEnable={() => void enableNotifications()}
      viewOrdersLabel="View orders"
      onViewOrders={() => navigate('/orders')}
      deniedHint="Open your browser site settings for OrderBhojan and allow notifications, then try again."
    />
  );
}
