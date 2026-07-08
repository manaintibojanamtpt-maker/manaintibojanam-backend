import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  MotionPage,
  PremiumEmpty,
  Text,
} from '@bhojan/design-system';
import { createMessagingPort } from '@/firebase/messaging';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { useAuth } from '@/shared/providers/AuthProvider';

export function NotificationsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isAuthenticated) {
    return (
      <MotionPage>
        <PremiumEmpty
          title="Sign in for notifications"
          description="Get order updates and offers on this device."
          actionLabel="Sign in"
          onAction={() => navigate('/auth')}
        />
      </MotionPage>
    );
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
    <MotionPage className="ob-notifications-px2">
      <Text variant="heading" as="h1" style={{ letterSpacing: '-0.03em' }}>Notifications</Text>
      <Text variant="body" style={{ color: 'var(--bds-color-text-secondary)', marginTop: 'var(--bds-space-2)' }}>
        Receive live order status and delivery updates.
      </Text>
      <Button
        variant="primary"
        style={{ marginTop: 'var(--bds-space-4)' }}
        disabled={busy}
        onClick={() => void enableNotifications()}
      >
        {busy ? 'Enabling…' : 'Enable push notifications'}
      </Button>
      {status ? (
        <Text variant="body" style={{ marginTop: 'var(--bds-space-3)' }}>{status}</Text>
      ) : null}
    </MotionPage>
  );
}
