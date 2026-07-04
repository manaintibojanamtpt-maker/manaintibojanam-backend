import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Loader,
  SegmentedControl,
  Text,
  Toast,
} from '@bhojan/design-system';
import { useAuth } from '@/shared/providers/AuthProvider';
import { PhoneOtpForm } from './PhoneOtpForm';

type AuthTab = 'google' | 'phone' | 'guest';

export function AuthShellPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, sessionUser, isAuthenticated, signInWithGoogle, continueAsGuest, signOut } = useAuth();
  const [tab, setTab] = useState<AuthTab>('google');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';

  const handleGoogle = async () => {
    setPending(true);
    setError(null);
    try {
      await signInWithGoogle();
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setPending(false);
    }
  };

  const handleGuest = async () => {
    setPending(true);
    setError(null);
    try {
      await continueAsGuest();
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to continue as guest.');
    } finally {
      setPending(false);
    }
  };

  if (status === 'loading') {
    return (
      <Card>
        <Loader label="Loading authentication" />
      </Card>
    );
  }

  if (status === 'unconfigured') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign in to OrderBhojan</CardTitle>
          <CardDescription>Firebase is not configured. Guest browsing is available.</CardDescription>
        </CardHeader>
        <Button fullWidth variant="secondary" onClick={handleGuest} loading={pending} aria-label="Continue as guest">
          Continue as Guest
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in to OrderBhojan</CardTitle>
        <CardDescription>
          Google, phone OTP, or guest. Your session persists across visits.
        </CardDescription>
      </CardHeader>

      {isAuthenticated ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bds-space-3)' }}>
          <Text variant="body">
            Signed in as {sessionUser?.displayName ?? sessionUser?.phoneNumber ?? sessionUser?.email ?? sessionUser?.uid}
          </Text>
          <Button variant="secondary" onClick={() => navigate(redirectTo, { replace: true })}>
            Continue
          </Button>
          <Button variant="ghost" onClick={() => signOut()} aria-label="Sign out">
            Sign out
          </Button>
        </div>
      ) : (
        <>
          <SegmentedControl
            items={[
              { id: 'google', label: 'Google' },
              { id: 'phone', label: 'Phone' },
              { id: 'guest', label: 'Guest' },
            ]}
            activeId={tab}
            onChange={(id) => { setTab(id as AuthTab); setError(null); }}
            ariaLabel="Authentication method"
          />

          <div style={{ marginTop: 'var(--bds-space-4)' }}>
            {tab === 'google' ? (
              <Button fullWidth onClick={handleGoogle} loading={pending} aria-label="Continue with Google">
                Continue with Google
              </Button>
            ) : null}
            {tab === 'phone' ? <PhoneOtpForm /> : null}
            {tab === 'guest' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bds-space-3)' }}>
                <Text variant="bodySm" style={{ color: 'var(--bds-color-text-secondary)' }}>
                  Browse without a full account. Sign in later to save favorites and view orders.
                </Text>
                <Button fullWidth variant="secondary" onClick={handleGuest} loading={pending} aria-label="Continue as guest">
                  Continue as Guest
                </Button>
              </div>
            ) : null}
          </div>
        </>
      )}

      {error ? <Toast message={error} variant="danger" onDismiss={() => setError(null)} /> : null}
    </Card>
  );
}
