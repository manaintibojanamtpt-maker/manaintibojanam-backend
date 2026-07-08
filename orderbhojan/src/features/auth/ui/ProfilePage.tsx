import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Button,
  GlassSurface,
  MotionPage,
  PremiumEmpty,
  Text,
} from '@bhojan/design-system';
import { useLocationActions, useLocationFeatureEnabled } from '@/features/location';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useCustomerProfile } from '../hooks/useCustomerProfile';

const SUPPORT_MAILTO = 'mailto:support@orderbhojan.com?subject=OrderBhojan%20Support';

export function ProfilePage() {
  const navigate = useNavigate();
  const { sessionUser, status, signOut } = useAuth();
  const profileQuery = useCustomerProfile();
  const locationEnabled = useLocationFeatureEnabled();
  const { openSelector } = useLocationActions();

  const handleQuickTile = (tile: 'Orders' | 'Addresses' | 'Favorites') => {
    if (tile === 'Orders') {
      navigate('/orders');
      return;
    }
    if (tile === 'Favorites') {
      navigate('/favorites');
      return;
    }
    if (locationEnabled) {
      openSelector();
    }
  };

  const displayName = profileQuery.data?.displayName ?? sessionUser?.displayName ?? 'Guest';
  const isGuest = !sessionUser || status === 'guest';

  if (isGuest) {
    return (
      <MotionPage className="ob-profile-px2">
        <GlassSurface className="ob-profile-px2__hero">
          <Avatar size="lg" initials="OB" />
          <Text variant="heading" as="h1" style={{ marginTop: 'var(--bds-space-4)' }}>Welcome</Text>
          <Text variant="body" style={{ color: 'var(--bds-color-text-secondary)', marginTop: 'var(--bds-space-2)' }}>
            Sign in for a personal experience
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bds-space-3)', marginTop: 'var(--bds-space-6)' }}>
            <Button fullWidth onClick={() => navigate('/auth')}>Sign In</Button>
            <Button variant="secondary" fullWidth onClick={() => navigate('/')}>Continue Browsing</Button>
          </div>
        </GlassSurface>
        <Text variant="microLabel" style={{ color: 'var(--bds-color-primary)', marginBottom: 'var(--bds-space-3)' }}>WHY SIGN IN</Text>
        <div className="ob-profile-px2__benefits">
          {['Save favorite restaurants', 'Saved addresses', 'Faster reorder'].map((item) => (
            <div key={item} className="ob-profile-px2__benefit-row bds-glass-surface">
              <Text variant="body">{item}</Text>
            </div>
          ))}
        </div>
      </MotionPage>
    );
  }

  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <MotionPage className="ob-profile-px2">
      <GlassSurface className="ob-profile-px2__hero">
        <Avatar src={sessionUser?.photoURL ?? undefined} initials={initials} size="lg" />
        <Text variant="title" as="h1" style={{ marginTop: 'var(--bds-space-4)' }}>{displayName}</Text>
        <Text variant="caption" style={{ color: 'var(--bds-color-text-secondary)' }}>
          {sessionUser?.email ?? sessionUser?.phoneNumber ?? 'Member'}
        </Text>
      </GlassSurface>
      <div className="ob-profile-px2__tiles">
        {(['Orders', 'Addresses', 'Favorites'] as const).map((tile) => (
          <button
            key={tile}
            type="button"
            className="ob-profile-px2__tile bds-glass-surface"
            onClick={() => handleQuickTile(tile)}
          >
            <Text variant="caption">{tile}</Text>
          </button>
        ))}
      </div>
      <div className="ob-profile-px2__menu">
        <Button
          variant="ghost"
          fullWidth
          className="ob-profile-px2__menu-item"
          onClick={() => navigate('/notifications')}
        >
          Notifications
        </Button>
        <Button
          variant="ghost"
          fullWidth
          className="ob-profile-px2__menu-item"
          onClick={() => {
            window.location.href = SUPPORT_MAILTO;
          }}
        >
          Help & Support
        </Button>
        <Button variant="ghost" fullWidth className="ob-profile-px2__menu-item" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
      {profileQuery.isError ? (
        <PremiumEmpty title="Could not refresh profile" actionLabel="Retry" onAction={() => profileQuery.refetch()} />
      ) : null}
    </MotionPage>
  );
}
