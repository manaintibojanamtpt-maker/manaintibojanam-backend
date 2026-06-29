import React, { useState, useEffect, useRef } from 'react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { Store, Mail, Lock, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import SoftButton from '../../components/ui/SoftButton';
import { logIncident } from '../../lib/monitoring';
import toast from 'react-hot-toast';
import { m } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { waitForOwnerTenantIds } from '../../lib/ownerAccess';
import { resolveOwnerDestination } from '../../lib/ownerRouting';
import { EnvironmentConfig } from '../../config/environment';

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

const OwnerLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const redirectChecked = useRef(false);
  const navigate = useNavigate();
  const { currentUser, userProfile, loading: authLoading, profileLoading, refreshProfile } = useAuth();

  const marketingHome = EnvironmentConfig.getMarketingHomePath();
  const ownedIds = userProfile?.ownedTenantIds?.filter(Boolean) ?? [];
  const hasOwnedStore = ownedIds.length > 0;

  useEffect(() => {
    if (authLoading || loading || redirectChecked.current) return;
    if (!currentUser || !hasOwnedStore) return;
    if (profileLoading && !hasOwnedStore) return;

    redirectChecked.current = true;
    setRedirecting(true);
    void resolveOwnerDestination(currentUser.uid, currentUser.email, ownedIds)
      .then((path) => {
        window.location.href = `${EnvironmentConfig.getBaseUrl()}${path}`;
      })
      .catch(() => {
        window.location.href = `${EnvironmentConfig.getBaseUrl()}/owner/dashboard`;
      });
  }, [authLoading, profileLoading, loading, currentUser, hasOwnedStore, ownedIds, navigate]);

  if (authLoading || redirecting || (profileLoading && !hasOwnedStore)) {
    return (
      <div className="min-h-[100dvh] bg-[#0a0a0a] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        {redirecting && <p className="text-sm text-white/60">Taking you to your dashboard…</p>}
      </div>
    );
  }

  const completeOwnerLogin = async (uid: string, ownerEmail: string | null) => {
    setRedirecting(true);
    try {
      let ids = userProfile?.ownedTenantIds?.filter(Boolean) ?? [];
      if (ids.length === 0) {
        ids = await waitForOwnerTenantIds(uid, refreshProfile, { email: ownerEmail, maxAttempts: 6 });
      }
      if (ids.length === 0) {
        toast.error('No store found for this account. Use the same sign-in method you used when registering.');
        setRedirecting(false);
        return;
      }
      toast.success('Welcome back!');
      const path = await resolveOwnerDestination(uid, ownerEmail, ids);
      window.location.href = `${EnvironmentConfig.getBaseUrl()}${path}`;
    } catch (error) {
      console.error('Owner login redirect failed:', error);
      setRedirecting(false);
      toast.error('Signed in, but redirect failed. Tap Sign In again or open your dashboard.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await completeOwnerLogin(credential.user.uid, credential.user.email);
    } catch (error: any) {
      console.error('Owner Login Error:', error);
      logIncident('security_events', { reason: 'Owner Login Failed', email, error: error.message });
      toast.error('Invalid email or password. Did you sign up with Google?');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      await completeOwnerLogin(result.user.uid, result.user.email);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        logIncident('security_events', { reason: 'Google Login Failed', error: error.message });
        toast.error(error.message || 'Google login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] flex flex-col px-4 py-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-[420px] mx-auto flex-1 flex flex-col justify-center">
        <Link
          to={marketingHome}
          className="inline-flex items-center gap-2 text-white/40 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors mb-4 self-start"
        >
          <ArrowLeft size={14} /> Back to BhojanOS
        </Link>

        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-[#111] border border-white/10 rounded-3xl p-5 sm:p-8 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center mb-6 sm:mb-8">
            <div className="flex items-center justify-center gap-2.5 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20 shrink-0">
                <Store size={20} className="text-white" />
              </div>
              <div className="text-xl sm:text-2xl font-black tracking-tight text-white whitespace-nowrap">
                BhojanOS<span className="text-red-500">Owner</span>
              </div>
            </div>
            <h1 className="text-2xl font-black text-white mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-white/50 text-sm font-medium max-w-xs">Log in to manage your kitchen operations</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 relative z-10">
            <div>
              <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={18} className="text-white/20" />
                </div>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@example.com"
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-base text-white placeholder:text-white/20 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-white/20" />
                </div>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-base text-white placeholder:text-white/20 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-medium"
                />
              </div>
            </div>

            <SoftButton type="submit" tone="primary" fullWidth disabled={loading || redirecting} className="mt-2">
              {loading || redirecting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </SoftButton>
          </form>

          <div className="mt-6 flex items-center gap-3 relative z-10">
            <div className="h-px bg-white/10 flex-1" />
            <span className="text-white/40 text-xs font-bold uppercase tracking-wider">or</span>
            <div className="h-px bg-white/10 flex-1" />
          </div>

          <SoftButton
            type="button"
            tone="secondary"
            fullWidth
            disabled={loading || redirecting}
            onClick={handleGoogleLogin}
            className="mt-6 relative z-10"
          >
            <GoogleIcon />
            <span>Continue with Google</span>
          </SoftButton>

          <div className="mt-8 pt-6 border-t border-white/5 text-center relative z-10">
            <p className="text-white/40 text-sm">
              Don't have a store yet?{' '}
              <Link to="/owner/register" className="text-red-500 hover:text-red-400 font-bold">
                Create one
              </Link>
            </p>
          </div>
        </m.div>
      </div>
    </div>
  );
};

export default OwnerLogin;
