import { Link } from 'react-router-dom';
import {
  Avatar,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
  Loader,
  Text,
} from '@bhojan/design-system';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useCustomerProfile } from '../hooks/useCustomerProfile';

export function ProfilePage() {
  const { sessionUser, status, signOut } = useAuth();
  const profileQuery = useCustomerProfile();

  const display = profileQuery.data ?? (sessionUser
    ? {
        uid: sessionUser.uid,
        displayName: sessionUser.displayName,
        email: sessionUser.email,
        phoneNumber: sessionUser.phoneNumber,
        authProviders: [sessionUser.provider],
      }
    : null);

  const initials =
    display?.displayName?.slice(0, 2).toUpperCase()
    ?? display?.email?.slice(0, 2).toUpperCase()
    ?? 'OB';

  return (
    <div className="ob-profile-page ob-page-enter">
      <Card glass className="ob-profile-hero">
        <div className="ob-profile-hero__row">
          <Avatar
            src={sessionUser?.photoURL ?? undefined}
            initials={initials}
            size="lg"
          />
          <div>
            <Text variant="title" as="h1">{display?.displayName ?? 'Guest'}</Text>
            <Text variant="bodySm" style={{ color: 'var(--bds-color-text-secondary)' }}>
              {display?.email ?? display?.phoneNumber ?? 'Browse as guest'}
            </Text>
            {status === 'guest' ? (
              <Text variant="caption" style={{ color: 'var(--bds-color-primary)', marginTop: 'var(--bds-space-1)' }}>
                Guest mode — sign in to save favorites and orders
              </Text>
            ) : null}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Firestore customer profile (M1). Marketplace sync deferred.</CardDescription>
        </CardHeader>
        {profileQuery.isLoading ? (
          <Loader label="Loading profile" />
        ) : profileQuery.isError ? (
          <ErrorState
            title="Profile unavailable"
            description="Could not load your Firestore customer profile."
            retryLabel="Retry"
            onRetry={() => profileQuery.refetch()}
          />
        ) : (
          <dl className="ob-profile-details">
            {[
              ['UID', display?.uid ?? '—'],
              ['Name', display?.displayName ?? '—'],
              ['Email', display?.email ?? '—'],
              ['Phone', display?.phoneNumber ?? '—'],
              ['Providers', display?.authProviders?.join(', ') ?? sessionUser?.provider ?? '—'],
            ].map(([label, value]) => (
              <div key={label} className="ob-profile-details__row">
                <Text variant="bodySm" as="dt">{label}</Text>
                <Text variant="bodySm" as="dd">{value}</Text>
              </div>
            ))}
          </dl>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Placeholders for upcoming milestones</CardDescription>
        </CardHeader>
        <div className="ob-profile-settings">
          {['Addresses', 'Notifications', 'Payments', 'Help & Support'].map((item) => (
            <Button key={item} variant="ghost" fullWidth aria-label={`${item} — coming soon`} disabled>
              {item}
            </Button>
          ))}
        </div>
      </Card>

      <div className="ob-profile-actions">
        {!sessionUser || status === 'guest' ? (
          <Link to="/auth" style={{ textDecoration: 'none' }}>
            <Button fullWidth>Sign In</Button>
          </Link>
        ) : null}
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Button variant="secondary" fullWidth>Continue Browsing</Button>
        </Link>
        {sessionUser && status !== 'guest' ? (
          <Button variant="ghost" fullWidth onClick={() => signOut()} aria-label="Sign out">
            Sign out
          </Button>
        ) : null}
      </div>
    </div>
  );
}
