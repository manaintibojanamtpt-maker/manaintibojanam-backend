import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { OrderBhojanAuthShellView } from './OrderBhojanAuthShellView';
import { OrderBhojanOnboardingView } from './OrderBhojanOnboardingView';
import { useAuth } from '@/shared/providers/AuthProvider';
import { needsCheckoutPhoneVerification } from '@/features/auth/domain/checkoutAuth';
import { readGoogleRedirectAttempt } from '@/features/auth/infrastructure/firebaseAuth';
import { formatAuthError } from '@/lib/authErrors';
import { OrderBhojanPhoneOtpForm } from './OrderBhojanPhoneOtpForm';
import { resolveAuthRedirect } from './resolveAuthRedirect';
import { persistAuthReturnTo, clearAuthReturnTo } from '@/features/auth/domain/authReturnTo';

function sessionLabel(displayName?: string | null, phone?: string | null, email?: string | null) {
  return displayName ?? phone ?? email ?? 'your account';
}

function isRedirectResumePending(): boolean {
  return sessionStorage.getItem('auth_redirecting') === 'true';
}

export function OrderBhojanAuthShellPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, sessionUser, isAuthenticated, signInWithGoogle, continueAsGuest, signOut, redirectError } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = resolveAuthRedirect(location);
  const phoneVerificationRequired = needsCheckoutPhoneVerification({ status, sessionUser });
  const showPhoneVerification = phoneVerificationRequired && redirectTo === '/checkout';
  const redirectResumePending = isRedirectResumePending();
  const authLoading = status === 'loading' || redirectResumePending;

  useEffect(() => {
    if (authLoading || !isAuthenticated || showPhoneVerification) {
      return;
    }
    clearAuthReturnTo();
    navigate(redirectTo, { replace: true });
  }, [authLoading, isAuthenticated, showPhoneVerification, navigate, redirectTo]);

  useEffect(() => {
    if (status === 'loading' || isAuthenticated) {
      return;
    }
    if (redirectError) {
      setError(redirectError);
      return;
    }
    if (readGoogleRedirectAttempt()) {
      setError('Google sign-in did not complete. Allow cookies for this site and try again.');
    }
  }, [isAuthenticated, redirectError, status]);

  const handleGoogle = async () => {
    setPending(true);
    setError(null);
    try {
      persistAuthReturnTo(redirectTo);
      await signInWithGoogle();
      if (sessionStorage.getItem('auth_redirecting') === 'true') {
        return;
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      if (sessionStorage.getItem('auth_redirecting') !== 'true') {
        setPending(false);
      }
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

  if (authLoading) {
    return (
      <OrderBhojanOnboardingView
        loading
        title="Log in or sign up"
        subtitle="Finishing Google sign-in…"
      />
    );
  }

  if (status === 'unconfigured') {
    return (
      <OrderBhojanOnboardingView
        title="Welcome to OrderBhojan"
        subtitle="Firebase is not configured in this environment."
        errorMessage={error ?? undefined}
        onDismissError={() => setError(null)}
      >
        <SoftButton type="button" tone="secondary" fullWidth disabled={pending} onClick={() => void handleGuest()}>
          Continue as Guest
        </SoftButton>
      </OrderBhojanOnboardingView>
    );
  }

  if (isAuthenticated && showPhoneVerification) {
    return (
      <OrderBhojanAuthShellView
        title="Verify your number"
        subtitle="Add a mobile number to place orders securely."
        errorMessage={error ?? undefined}
        onDismissError={() => setError(null)}
      >
        <p className="text-sm text-white/70">
          Signed in as {sessionLabel(sessionUser?.displayName, sessionUser?.phoneNumber, sessionUser?.email)}.
          Verify your mobile number to place orders.
        </p>
        <OrderBhojanPhoneOtpForm />
        <SoftButton type="button" tone="ghost" fullWidth onClick={() => signOut()}>
          Sign out
        </SoftButton>
      </OrderBhojanAuthShellView>
    );
  }

  if (isAuthenticated) {
    return (
      <OrderBhojanAuthShellView title="You're signed in" subtitle="Continue to OrderBhojan.">
        <p className="text-white/80">
          Signed in as {sessionLabel(sessionUser?.displayName, sessionUser?.phoneNumber, sessionUser?.email)}
        </p>
        <SoftButton type="button" fullWidth onClick={() => navigate(redirectTo, { replace: true })}>
          Continue
        </SoftButton>
        <SoftButton type="button" tone="ghost" fullWidth onClick={() => signOut()}>
          Sign out
        </SoftButton>
      </OrderBhojanAuthShellView>
    );
  }

  let onboardingBody: ReactNode = <OrderBhojanPhoneOtpForm />;

  return (
    <OrderBhojanOnboardingView
      title="Log in or sign up"
      subtitle="Discover home kitchens near you — Pan-India flavours, delivered hot and fresh."
      googlePending={pending}
      onGoogleSignIn={() => void handleGoogle()}
      errorMessage={error ?? undefined}
      onDismissError={() => setError(null)}
    >
      {onboardingBody}
    </OrderBhojanOnboardingView>
  );
}
