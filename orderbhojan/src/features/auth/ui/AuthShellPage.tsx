import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Button,
  GlassSurface,
  Loader,
  SegmentedControl,
  Text,
  Toast,
} from '@bhojan/design-system';
import { useAuth } from '@/shared/providers/AuthProvider';
import { formatAuthError } from '@/lib/authErrors';
import { PhoneOtpForm } from './PhoneOtpForm';

type AuthTab = 'google' | 'phone' | 'guest';

function sessionLabel(displayName?: string | null, phone?: string | null, email?: string | null) {
  return displayName ?? phone ?? email ?? 'your account';
}

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
      setError(formatAuthError(err));
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
      <GlassSurface className="ob-auth-px2__panel">
        <Loader label="Loading authentication" />
      </GlassSurface>
    );
  }

  return (
    <div className="ob-auth-px2">
      <GlassSurface className="ob-auth-px2__panel">
        <div className="ob-auth-px2__brand">
          <Text variant="microLabel" style={{ color: 'var(--bds-color-primary)' }}>ORDERBHOJAN</Text>
          <Text variant="display" as="h1" style={{ letterSpacing: '-0.03em', marginTop: 'var(--bds-space-2)' }}>
            Welcome back
          </Text>
          <Text variant="body" style={{ color: 'var(--bds-color-text-secondary)', marginTop: 'var(--bds-space-2)' }}>
            Sign in to save favorites, track orders, and reorder in one tap.
          </Text>
        </div>

        {status === 'unconfigured' ? (
          <div className="ob-auth-px2__body">
            <Text variant="bodySm" style={{ color: 'var(--bds-color-text-secondary)' }}>
              Firebase is not configured in this environment. Guest browsing is available.
            </Text>
            <Button fullWidth variant="secondary" onClick={handleGuest} loading={pending} aria-label="Continue as guest">
              Continue as Guest
            </Button>
          </div>
        ) : isAuthenticated ? (
          <div className="ob-auth-px2__body">
            <Text variant="body">
              Signed in as {sessionLabel(sessionUser?.displayName, sessionUser?.phoneNumber, sessionUser?.email)}
            </Text>
            <Button variant="primary" fullWidth onClick={() => navigate(redirectTo, { replace: true })}>
              Continue
            </Button>
            <Button variant="ghost" fullWidth onClick={() => signOut()} aria-label="Sign out">
              Sign out
            </Button>
          </div>
        ) : (
          <div className="ob-auth-px2__body">
            <SegmentedControl
              fullWidth
              items={[
                { id: 'google', label: 'Google' },
                { id: 'phone', label: 'Phone' },
                { id: 'guest', label: 'Guest' },
              ]}
              activeId={tab}
              onChange={(id) => {
                setTab(id as AuthTab);
                setError(null);
              }}
              ariaLabel="Authentication method"
            />

            <div className="ob-auth-px2__tab-panel">
              {tab === 'google' ? (
                <Button fullWidth onClick={handleGoogle} loading={pending} aria-label="Continue with Google">
                  Continue with Google
                </Button>
              ) : null}
              {tab === 'phone' ? <PhoneOtpForm /> : null}
              {tab === 'guest' ? (
                <>
                  <Text variant="bodySm" style={{ color: 'var(--bds-color-text-secondary)' }}>
                    Browse restaurants and menus without signing in. You can create an account anytime.
                  </Text>
                  <Button fullWidth variant="secondary" onClick={handleGuest} loading={pending} aria-label="Continue as guest">
                    Continue as Guest
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        )}

        {error ? <Toast message={error} variant="danger" onDismiss={() => setError(null)} /> : null}
      </GlassSurface>
    </div>
  );
}
