import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthShellView, type AuthTabId } from '@bhojan/storefront-design-system/auth';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { useAuth } from '@/shared/providers/AuthProvider';
import { formatAuthError } from '@/lib/authErrors';
import { OrderBhojanPhoneOtpForm } from './OrderBhojanPhoneOtpForm';
import { resolveAuthRedirect } from './resolveAuthRedirect';

function sessionLabel(displayName?: string | null, phone?: string | null, email?: string | null) {
  return displayName ?? phone ?? email ?? 'your account';
}

export function OrderBhojanAuthShellPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, sessionUser, isAuthenticated, signInWithGoogle, continueAsGuest, signOut } = useAuth();
  const [tab, setTab] = useState<AuthTabId>('google');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = resolveAuthRedirect(location);

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
    return <AuthShellView loading title="Welcome back" subtitle="Checking your session…" />;
  }

  let body: ReactNode;

  if (status === 'unconfigured') {
    body = (
      <>
        <p className="text-sm text-white/60">Firebase is not configured in this environment. Guest browsing is available.</p>
        <SoftButton type="button" tone="secondary" fullWidth disabled={pending} onClick={() => void handleGuest()}>
          Continue as Guest
        </SoftButton>
      </>
    );
  } else if (isAuthenticated) {
    body = (
      <>
        <p className="text-white/80">
          Signed in as {sessionLabel(sessionUser?.displayName, sessionUser?.phoneNumber, sessionUser?.email)}
        </p>
        <SoftButton type="button" fullWidth onClick={() => navigate(redirectTo, { replace: true })}>
          Continue
        </SoftButton>
        <SoftButton type="button" tone="ghost" fullWidth onClick={() => signOut()}>
          Sign out
        </SoftButton>
      </>
    );
  } else {
    body = (
      <>
        {tab === 'google' ? (
          <SoftButton type="button" fullWidth disabled={pending} onClick={() => void handleGoogle()}>
            {pending ? 'Signing in…' : 'Continue with Google'}
          </SoftButton>
        ) : null}
        {tab === 'phone' ? <OrderBhojanPhoneOtpForm /> : null}
        {tab === 'guest' ? (
          <>
            <p className="text-sm text-white/60">
              Browse restaurants and menus without signing in. You can create an account anytime.
            </p>
            <SoftButton type="button" tone="secondary" fullWidth disabled={pending} onClick={() => void handleGuest()}>
              Continue as Guest
            </SoftButton>
          </>
        ) : null}
      </>
    );
  }

  return (
    <AuthShellView
      title="Welcome back"
      subtitle="Sign in to save favorites, track orders, and reorder in one tap."
      tabs={
        status !== 'unconfigured' && !isAuthenticated
          ? [
              { id: 'google', label: 'Google' },
              { id: 'phone', label: 'Phone' },
              { id: 'guest', label: 'Guest' },
            ]
          : undefined
      }
      activeTab={tab}
      onTabChange={(id) => {
        setTab(id);
        setError(null);
      }}
      errorMessage={error ?? undefined}
      onDismissError={() => setError(null)}
    >
      {body}
    </AuthShellView>
  );
}
