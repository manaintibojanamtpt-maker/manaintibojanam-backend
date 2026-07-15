import { useNavigate } from 'react-router-dom';
import { ProfileGuestView, ProfileMemberView } from '@bhojan/storefront-design-system/profile';
import { useLocationActions, useLocationFeatureEnabled } from '@/features/location';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useCustomerProfile } from '@/features/auth/hooks/useCustomerProfile';
import { useCustomerSettingsActions } from '@/presentation/settings';

const SUPPORT_MAILTO = 'mailto:support@orderbhojan.com?subject=OrderBhojan%20Support';

export function OrderBhojanProfilePage() {
  const navigate = useNavigate();
  const { sessionUser, status, signOut } = useAuth();
  const profileQuery = useCustomerProfile();
  const locationEnabled = useLocationFeatureEnabled();
  const { openSelector } = useLocationActions();
  const { preferenceRows, handlePreferenceRow } = useCustomerSettingsActions();

  const handleQuickTile = (tile: string) => {
    if (tile === 'orders') {
      navigate('/orders');
      return;
    }
    if (tile === 'favorites') {
      navigate('/favorites');
      return;
    }
    if (tile === 'addresses') {
      if (locationEnabled) {
        openSelector();
        return;
      }
      navigate('/?openLocation=1');
      return;
    }
  };

  const displayName = profileQuery.data?.displayName ?? sessionUser?.displayName ?? 'Guest';
  const isGuest = !sessionUser || status === 'guest';

  if (isGuest) {
    return (
      <ProfileGuestView
        title="Welcome"
        description="Sign in for your table at home — saved kitchens, addresses, and faster reorder."
        signInLabel="Sign in"
        browseLabel="Continue browsing"
        benefits={['Save favorite restaurants', 'Saved addresses', 'Faster reorder']}
        onSignIn={() => navigate('/auth')}
        onBrowse={() => navigate('/')}
      />
    );
  }

  const contactLine =
    [sessionUser?.email, sessionUser?.phoneNumber].filter(Boolean).join(' · ') || 'Member';

  return (
    <ProfileMemberView
      profile={{
        displayName,
        contactLine,
        initials: displayName.slice(0, 2).toUpperCase(),
        photoUrl: sessionUser?.photoURL ?? undefined,
        quickTiles: [
          { id: 'orders', label: 'Orders' },
          { id: 'addresses', label: 'Addresses' },
          { id: 'favorites', label: 'Favorites' },
        ],
        preferences: preferenceRows.map((row) => ({ ...row })),
        showProfileError: profileQuery.isError,
      }}
      onQuickTile={handleQuickTile}
      onPreferenceClick={handlePreferenceRow}
      onSupport={() => {
        window.location.href = SUPPORT_MAILTO;
      }}
      onAbout={() => {
        window.open('https://www.bhojanos.com/about', '_blank', 'noopener,noreferrer');
      }}
      onSignOut={() => signOut()}
      onRetryProfile={() => void profileQuery.refetch()}
    />
  );
}
