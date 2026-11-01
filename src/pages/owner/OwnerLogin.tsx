import React, { useState, useEffect, useRef, useCallback } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth, ensureAuthPersistence } from '../../firebase';
import { Link } from 'react-router-dom';
import { Store, Mail, Lock, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import SoftButton from '../../components/ui/SoftButton';
import BhojanOSLogo from '../../components/BhojanOSLogo';
import { logIncident } from '../../lib/monitoring';
import toast from 'react-hot-toast';
import { redirectToOwnerDashboard, cacheOwnerTenantIds } from '../../lib/ownerRedirect';
import { resolveOwnerTenantIds } from '../../lib/ownerAccess';
import { EnvironmentConfig } from '../../config/environment';
import { isProductionBhojanHost } from '../../lib/runtimeFirebaseConfig';
import { getFirebaseClientConfig, isFirebaseClientConfigReady } from '../../config/firebaseClientConfig';
import { formatOwnerAuthError, isBenignOwnerAuthDismiss, resolveOwnerLoginError } from '../../lib/ownerAuthErrors';
import {
  clearAuthNetworkRecoveryFlag,
  recoverAuthNetworkFailure,
} from '../../lib/recoverAuthNetworkFailure';
import { isFounderOwnerEmail, FOUNDER_TENANT_ID } from '../../config/founder';
import {
  clearGoogleRedirectAttempt,
  completeGoogleRedirectSignIn,
  isGoogleRedirectPending,
  signInWithGoogleAccount,
} from '../../lib/googleWebAuth';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
      <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
      <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
      <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
      <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
    </g>
  </svg>
);

const initialFirebaseConfig = getFirebaseClientConfig();
const initialConfigReady = isFirebaseClientConfigReady(initialFirebaseConfig);

const OwnerLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(() => {
    if (isProductionBhojanHost() && !initialConfigReady) {
      return 'Firebase is not configured for production. Hard-refresh (Ctrl+Shift+R). If this persists, contact hello@bhojanos.com.';
    }
    return null;
  });
  const redirectHandled = useRef(false);

  const marketingHome = EnvironmentConfig.getMarketingHomePath();

  const afterSignIn = useCallback(async () => {
    sessionStorage.setItem('bhojanos_owner_signed_in', '1');
    setRedirecting(true);
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const resolvePromise = resolveOwnerTenantIds(user.uid, user.email);
        const timeoutPromise = new Promise<string[]>((resolve) =>
          window.setTimeout(() => resolve([]), 4_000),
        );
        const ids = await Promise.race([resolvePromise, timeoutPromise]);
        if (ids.length > 0) {
          cacheOwnerTenantIds(ids);
        } else if (isFounderOwnerEmail(user.email)) {
          cacheOwnerTenantIds([FOUNDER_TENANT_ID]);
        }
      }
    } catch (err) {
      console.warn('Owner tenant sync before redirect failed:', err);
      const user = auth.currentUser;
      if (user && isFounderOwnerEmail(user.email)) {
        cacheOwnerTenantIds([FOUNDER_TENANT_ID]);
      }
    } finally {
      redirectToOwnerDashboard();
    }
  }, []);

  useEffect(() => {
    clearAuthNetworkRecoveryFlag();

    if (isProductionBhojanHost() && !isFirebaseClientConfigReady()) {
      setConfigError(
        'Firebase is not configured for production. Hard-refresh (Ctrl+Shift+R). If this persists, contact hello@bhojanos.com.',
      );
      return;
    }

    let cancelled = false;
    let authUnsub: (() => void) | undefined;

    void (async () => {
      try {
        await ensureAuthPersistence();
        if (cancelled || redirectHandled.current) return;

        const user = await completeGoogleRedirectSignIn(auth);
        if (cancelled || redirectHandled.current) return;

        const signedInUser = user ?? auth.currentUser;
        if (signedInUser) {
          redirectHandled.current = true;
          toast.success('Welcome back!');
          await afterSignIn();
          return;
        }

        if (isGoogleRedirectPending()) {
          // Stale flag from prior redirect attempts (Chrome bounce tracking). Clear and prefer popup.
          clearGoogleRedirectAttempt();
          setLoading(false);
          setRedirecting(false);
        }
      } catch (error: unknown) {
        if (cancelled || redirectHandled.current) return;
        clearGoogleRedirectAttempt();
        if (!isBenignOwnerAuthDismiss(error)) {
          const message = formatOwnerAuthError(error, { configReady: isFirebaseClientConfigReady() });
          setLoginError(message);
          toast.error(message);
        }
        setLoading(false);
        setRedirecting(false);
        return;
      }

      if (cancelled || redirectHandled.current) return;

      authUnsub = onAuthStateChanged(auth, (nextUser) => {
        if (cancelled || redirectHandled.current || !nextUser) return;
        redirectHandled.current = true;
        void afterSignIn();
      });
    })();

    return () => {
      cancelled = true;
      authUnsub?.();
    };
  }, [afterSignIn]);

  if (configError) {
    return (
      <div className="min-h-[100dvh] bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-red-400 font-bold">Configuration error</p>
        <p className="text-sm text-white/60 max-w-md">{configError}</p>
      </div>
    );
  }

  if (redirecting) {
    return (
      <div className="min-h-[100dvh] bg-[#0a0a0a] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-sm text-white/60">Taking you to your dashboard…</p>
        <button type="button" className="text-xs text-orange-400 underline" onClick={redirectToOwnerDashboard}>
          Open dashboard directly
        </button>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (!isFirebaseClientConfigReady()) {
      const message = formatOwnerAuthError(new Error('Firebase not configured'), { configReady: false });
      setConfigError(message);
      setLoginError(message);
      toast.error(message);
      return;
    }
    setLoginError(null);
    setLoading(true);
    let navStarted = false;

    try {
      const authPromise = signInWithEmailAndPassword(auth, email.trim(), password);
      const timeoutPromise = new Promise<never>((_, reject) => {
        window.setTimeout(() => {
          const err = new Error('Sign-in request timed out. Please check your internet connection.');
          (err as any).code = 'auth/network-request-failed';
          reject(err);
        }, 15_000);
      });

      await Promise.race([authPromise, timeoutPromise]);
      clearAuthNetworkRecoveryFlag();
      toast.success('Welcome back!');
      navStarted = true;
      await afterSignIn();
    } catch (error: unknown) {
      navStarted = false;
      if (await recoverAuthNetworkFailure(error)) {
        toast.error('Connection glitch — refreshing to clear a stale app cache…');
        return;
      }
      logIncident('security_events', {
        reason: 'Owner Login Failed',
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      const message = await resolveOwnerLoginError(error, email, { configReady: isFirebaseClientConfigReady() }, auth);
      setLoginError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      if (!navStarted) {
        setRedirecting(false);
        redirectHandled.current = false;
      }
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    if (!isFirebaseClientConfigReady()) {
      const message = formatOwnerAuthError(new Error('Firebase not configured'), { configReady: false });
      setConfigError(message);
      setLoginError(message);
      toast.error(message);
      return;
    }
    setLoginError(null);
    setLoading(true);
    setRedirecting(true);
    let navStarted = false;

    try {
      const user = await signInWithGoogleAccount(auth);
      if (!user) return;
      navStarted = true;
      clearAuthNetworkRecoveryFlag();
      toast.success('Welcome back!');
      await afterSignIn();
    } catch (error: unknown) {
      navStarted = false;
      if (!isBenignOwnerAuthDismiss(error)) {
        if (await recoverAuthNetworkFailure(error)) {
          toast.error('Connection glitch — refreshing to clear a stale app cache…');
          return;
        }
        logIncident('security_events', {
          reason: 'Google Login Failed',
          error: error instanceof Error ? error.message : String(error),
        });
        const message = formatOwnerAuthError(error, { configReady: isFirebaseClientConfigReady() });
        setLoginError(message);
        toast.error(message);
      }
    } finally {
      setLoading(false);
      if (!navStarted && !isGoogleRedirectPending()) {
        setRedirecting(false);
        redirectHandled.current = false;
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#121212] relative overflow-hidden w-full px-4 py-8">
      {/* Ambient background glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-[#D97706]/10 blur-[130px] pointer-events-none -z-0" 
        aria-hidden="true" 
      />

      <div className="relative z-10 w-full max-w-sm mb-4">
        <a
          href={marketingHome}
          className="inline-flex items-center gap-2 text-white/50 hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to BhojanOS
        </a>
      </div>

      {/* Centered glass card */}
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-gradient-to-r from-[#ffffff10] to-[#121212] backdrop-blur-md shadow-2xl p-8 flex flex-col items-center border border-white/10">
        {/* Logo */}
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-5 shadow-lg border border-white/15 p-2 transition-transform duration-300 hover:scale-105">
          <BhojanOSLogo size={36} />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-1 text-center tracking-tight">
          Bhojan<span className="bg-gradient-to-r from-[#D97706] to-[#F59E0B] bg-clip-text text-transparent">OS</span>
        </h2>
        <p className="text-xs text-zinc-400 mb-6 text-center">Restaurant Owner Operations Portal</p>

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col w-full gap-4">
          <div className="w-full flex flex-col gap-3">
            <input
              placeholder="Owner email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (loginError) setLoginError(null);
              }}
              className="w-full px-5 py-3 rounded-xl bg-white/10 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#D97706] border border-white/10 transition-all font-medium"
            />
            <input
              placeholder="Password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (loginError) setLoginError(null);
              }}
              className="w-full px-5 py-3 rounded-xl bg-white/10 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#D97706] border border-white/10 transition-all font-medium"
            />
            {loginError && (
              <div role="alert" className="text-xs text-red-400 text-left bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
                {loginError}
              </div>
            )}
          </div>

          <hr className="opacity-10 border-white" />

          <div>
            <button
              type="submit"
              disabled={loading || redirecting}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-medium px-5 py-3 rounded-full shadow hover:shadow-lg transition mb-3 text-sm cursor-pointer border border-white/15 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading || redirecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>

            {/* Google Sign In */}
            <button
              type="button"
              disabled={loading || redirecting}
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-b from-[#232526] to-[#2d2e30] hover:brightness-125 rounded-full px-5 py-3 font-medium text-white shadow transition mb-2 text-sm cursor-pointer border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <img
                src="https://cdn.21st.dev/assets/mirror/38/38146bfd9eff6dbf0d74771f2e625c70d87d3770e0d080dbb6e50db1d5403f46.svg"
                alt="Google"
                className="w-5 h-5 shrink-0"
              />
              <span>Continue with Google</span>
            </button>

            <div className="w-full text-center mt-3">
              <span className="text-xs text-gray-400">
                Don't have an account?{' '}
                <Link
                  to="/owner/register"
                  className="underline text-white/80 hover:text-white cursor-pointer ml-1"
                >
                  Sign up, it's free!
                </Link>
              </span>
            </div>
          </div>
        </form>
      </div>

      {/* User count and avatars */}
      <div className="relative z-10 mt-10 flex flex-col items-center text-center max-w-sm">
        <p className="text-gray-400 text-sm mb-3">
          Join over <span className="font-semibold text-white">1,200+</span> restaurant owners &amp; cloud kitchens scaling with Bhojan<span className="text-[#F59E0B] font-bold">OS</span>.
        </p>
        <div className="flex -space-x-2 overflow-hidden items-center justify-center py-1">
          <img
            src="https://cdn.21st.dev/assets/mirror/a6/a634d4f02fe5b77804943c1d74b8d70e35ffe26454e0e9af9717432a2c72bfde.jpg"
            alt="Restaurant owner"
            className="w-8 h-8 rounded-full border-2 border-[#181824] object-cover ring-1 ring-white/10"
          />
          <img
            src="https://cdn.21st.dev/assets/mirror/d8/d8dab29a5736d5c2b0084d720d3db02c785560071609be501541922928fdf831.jpg"
            alt="Restaurant owner"
            className="w-8 h-8 rounded-full border-2 border-[#181824] object-cover ring-1 ring-white/10"
          />
          <img
            src="https://cdn.21st.dev/assets/mirror/d1/d1a3e08d4e37d6ee2b7de1db8df87c1dc7acd8ffb004caaf980917de518a60c9.jpg"
            alt="Restaurant owner"
            className="w-8 h-8 rounded-full border-2 border-[#181824] object-cover ring-1 ring-white/10"
          />
          <img
            src="https://cdn.21st.dev/assets/mirror/f0/f07b84f12ef125cbb837a7bd64da401992f5f62bd55fee10d01cd3dcc8abae80.jpg"
            alt="Restaurant owner"
            className="w-8 h-8 rounded-full border-2 border-[#181824] object-cover ring-1 ring-white/10"
          />
        </div>
      </div>
    </div>
  );
};

export default OwnerLogin;