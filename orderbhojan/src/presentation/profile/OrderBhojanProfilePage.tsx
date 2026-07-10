import { useNavigate } from 'react-router-dom';
import { ProfileGuestView, ProfileMemberView } from '@bhojan/storefront-design-system/profile';
import { useLocationActions, useLocationFeatureEnabled } from '@/features/location';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useCustomerProfile } from '@/features/auth/hooks/useCustomerProfile';

const SUPPORT_MAILTO = 'mailto:support@orderbhojan.com?subject=OrderBhojan%20Support';

const PREFERENCE_ROWS = [
  { icon: '🌶', label: 'Spice level', value: 'Medium' },
  { icon: '🥬', label: 'Dietary', value: 'Veg' },
  { icon: '🔔', label: 'Notifications', value: 'On' },
] as const;

export function OrderBhojanProfilePage() {
  const navigate = useNavigate();
  const { sessionUser, status, signOut } = useAuth();
  const profileQuery = useCustomerProfile();
  const locationEnabled = useLocationFeatureEnabled();
  const { openSelector } = useLocationActions();

  const handleQuickTile = (tile: string) => {
    if (tile === 'orders') {
      navigate('/orders');
      return;
    }
    if (tile === 'favorites') {
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
        preferences: PREFERENCE_ROWS.map((row) => ({ ...row })),
        showProfileError: profileQuery.isError,
      }}
      onQuickTile={handleQuickTile}
      onSupport={() => {
        window.location.href = SUPPORT_MAILTO;
      }}
      onAbout={() => navigate('/foundation')}
      onSignOut={() => signOut()}
      onRetryProfile={() => void profileQuery.refetch()}
    />
  );
}
