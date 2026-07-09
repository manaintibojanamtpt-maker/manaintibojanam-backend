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

const PREFERENCE_ROWS = [
  { icon: '🌶', label: 'Spice level', value: 'Medium' },
  { icon: '🥬', label: 'Dietary', value: 'Veg' },
  { icon: '🔔', label: 'Notifications', value: 'On' },
] as const;

function ProfilePreferenceRows() {
  return (
    <section className="ob-profile-v3__prefs" aria-label="Preferences">
      <Text variant="titleSm" as="h2" className="ob-profile-v3__prefs-title">
        Preferences
      </Text>
      <div className="ob-profile-v3__pref-list">
        {PREFERENCE_ROWS.map((row) => (
          <button
            key={row.label}
            type="button"
            className="ob-profile-v3__pref-row"
            aria-label={`${row.label}: ${row.value}`}
          >
            <span className="ob-profile-v3__pref-left">
              <span className="ob-profile-v3__pref-icon" aria-hidden>
                {row.icon}
              </span>
              <span className="ob-profile-v3__pref-label">{row.label}</span>
            </span>
            <span className="ob-profile-v3__pref-value">
              {row.value}
              <span className="ob-profile-v3__pref-chevron" aria-hidden>
                ›
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

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
      <MotionPage className="ob-profile-px2 ob-profile-v3">
        <section className="ob-profile-v3__hero-band ob-stove-glow-frame">
          <GlassSurface className="ob-profile-v3__hero">
            <Avatar size="lg" initials="OB" />
            <Text variant="heading" as="h1" className="ob-profile-v3__welcome-title">
              Welcome
            </Text>
            <Text variant="body" className="ob-profile-v3__welcome-copy">
              Sign in for your table at home — saved kitchens, addresses, and faster reorder.
            </Text>
            <div className="ob-profile-v3__cta-stack">
              <Button fullWidth className="ob-profile-v3__cta-primary" onClick={() => navigate('/auth')}>
                Sign in
              </Button>
              <Button variant="secondary" fullWidth onClick={() => navigate('/')}>
                Continue browsing
              </Button>
            </div>
          </GlassSurface>
        </section>
        <Text variant="microLabel" className="ob-profile-v3__section-label">
          Why sign in
        </Text>
        <div className="ob-profile-v3__benefits">
          {['Save favorite restaurants', 'Saved addresses', 'Faster reorder'].map((item) => (
            <div key={item} className="ob-profile-v3__benefit-row">
              <Text variant="body">{item}</Text>
            </div>
          ))}
        </div>
      </MotionPage>
    );
  }

  const initials = displayName.slice(0, 2).toUpperCase();
  const contactLine =
    [sessionUser?.email, sessionUser?.phoneNumber].filter(Boolean).join(' · ') || 'Member';

  return (
    <MotionPage className="ob-profile-px2 ob-profile-v3">
      <section className="ob-profile-v3__hero-band ob-stove-glow-frame">
        <GlassSurface className="ob-profile-v3__hero">
          <Avatar src={sessionUser?.photoURL ?? undefined} initials={initials} size="lg" />
          <Text variant="title" as="h1" className="ob-profile-v3__name">
            {displayName}
          </Text>
          <Text variant="caption" className="ob-profile-v3__contact">
            {contactLine}
          </Text>
          <Button variant="ghost" className="ob-profile-v3__edit-btn" disabled>
            Edit profile
          </Button>
        </GlassSurface>
      </section>

      <Text variant="microLabel" className="ob-profile-v3__section-label">
        Your table at home
      </Text>
      <div className="ob-profile-v3__tiles">
        {(['Orders', 'Addresses', 'Favorites'] as const).map((tile) => (
          <button
            key={tile}
            type="button"
            className="ob-profile-v3__tile"
            onClick={() => handleQuickTile(tile)}
          >
            <span className="ob-profile-v3__tile-label">{tile}</span>
          </button>
        ))}
      </div>

      <ProfilePreferenceRows />

      <div className="ob-profile-v3__menu">
        <Button
          variant="ghost"
          fullWidth
          className="ob-profile-v3__menu-item"
          onClick={() => {
            window.location.href = SUPPORT_MAILTO;
          }}
        >
          Help &amp; support
        </Button>
        <Button
          variant="ghost"
          fullWidth
          className="ob-profile-v3__menu-item"
          onClick={() => navigate('/foundation')}
        >
          About OrderBhojan
        </Button>
        <Button
          variant="ghost"
          fullWidth
          className="ob-profile-v3__menu-item ob-profile-v3__menu-item--signout"
          onClick={() => signOut()}
        >
          Sign out
        </Button>
      </div>

      {profileQuery.isError ? (
        <PremiumEmpty title="Could not refresh profile" actionLabel="Retry" onAction={() => profileQuery.refetch()} />
      ) : null}
    </MotionPage>
  );
}
