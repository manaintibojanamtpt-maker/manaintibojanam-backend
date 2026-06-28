import React, { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { Loader2, Lock, Mail, ArrowLeft, ArrowRight, AlertTriangle, Crown, Shield } from 'lucide-react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import bhojanOsLogo from '../assets/bhojan-os-logo.png';
import { useAuth } from '../context/AuthContext';
import { logIncident } from '../lib/monitoring';
import { EnvironmentConfig } from '../config/environment';
import SoftButton from '../components/ui/SoftButton';

const BhojanOSSuperAdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const navigate = useNavigate();
  const { currentUser, userProfile, loading: authLoading, profileLoading, logout } = useAuth();
  const marketingHome = EnvironmentConfig.getMarketingHomePath();

  useEffect(() => {
    if (authLoading || profileLoading) return;

    if (currentUser && userProfile) {
      if (userProfile.role === 'superadmin') {
        navigate('/super-admin');
      } else if (userProfile.role === 'admin') {
        toast.error('You are a store admin. Redirecting to the admin portal.');
        navigate('/admin');
      }
    }
  }, [currentUser, userProfile, authLoading, profileLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorDetails(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Super Admin logged in successfully!');
    } catch (error: any) {
      console.error('Super Admin login error:', error);
      logIncident('security_events', { reason: 'Super Admin Login Failed', email, error: error.message });

      if (error.code === 'auth/network-request-failed') {
        setErrorDetails(
          'Network connection failed. Check your internet or Firebase Auth domain allowlist.',
        );
        toast.error('Network error. Please check your connection.');
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        toast.error('Invalid super admin credentials.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Please enter a valid super admin email.');
      } else if (error.code === 'auth/too-many-requests') {
        toast.error('Too many attempts. Try again in a few minutes.');
      } else {
        toast.error(error.message || 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (currentUser && profileLoading && !userProfile)) {
    return (
      <div className="min-h-[100dvh] min-h-[100svh] bg-[#030303] flex items-center justify-center pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <Loader2 className="animate-spin text-red-500" size={40} />
      </div>
    );
  }

  return (
    <div
      className="h-[100dvh] h-[100svh] bg-[#030303] text-white relative overflow-x-hidden overflow-y-auto overscroll-y-contain
        pl-[max(1rem,env(safe-area-inset-left))]
        pr-[max(1rem,env(safe-area-inset-right))]
        pt-[max(0.75rem,env(safe-area-inset-top))]
        pb-[max(1.25rem,env(safe-area-inset-bottom))]"
    >
      <div
        className="pointer-events-none fixed inset-0 opacity-50 marketing-hero-grid-bg"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -top-24 left-1/2 -translate-x-1/2 w-[min(100%,560px)] h-[320px] rounded-full bg-red-600/[0.08] blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-[440px] mx-auto flex flex-col justify-start py-3 sm:py-6">
          <Link
            to={marketingHome}
            className="inline-flex items-center gap-2 min-h-[44px] text-white/40 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors mb-3 sm:mb-5 self-start touch-manipulation"
          >
            <ArrowLeft size={14} className="shrink-0" />
            <span>Back to BhojanOS</span>
          </Link>

          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-2xl sm:rounded-[1.75rem] border border-white/[0.08] bg-[#0a0a0a]/90 backdrop-blur-xl shadow-[0_32px_80px_-24px_rgba(0,0,0,0.85)] overflow-hidden"
          >
            <div className="h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />

            <div className="p-5 sm:p-8">
              <div className="text-center mb-6 sm:mb-8">
                <m.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.05 }}
                  className="flex items-center justify-center mb-4 sm:mb-5"
                >
                  <div className="relative shrink-0">
                    <div className="absolute -inset-2 rounded-2xl bg-red-500/20 blur-lg" />
                    <div className="relative w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl border border-white/10 bg-[#111] p-1.5 sm:p-2 shadow-xl">
                      <img
                        src={bhojanOsLogo}
                        alt="BhojanOS"
                        className="w-full h-full object-contain rounded-xl"
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center border border-[#0a0a0a] shadow-lg">
                      <Crown size={12} className="sm:hidden text-white" />
                      <Crown size={14} className="hidden sm:block text-white" />
                    </div>
                  </div>
                </m.div>

                <div className="inline-flex items-center justify-center gap-1.5 max-w-full px-3 py-1.5 rounded-full border border-red-500/25 bg-red-500/10 text-[10px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.18em] text-red-300 mb-3 sm:mb-4">
                  <Shield size={11} className="shrink-0" />
                  <span className="truncate">Platform control</span>
                </div>

                <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white mb-1.5 sm:mb-2">
                  Super Admin
                </h1>
                <p className="text-xs sm:text-sm text-white/45 font-medium leading-relaxed px-1 max-w-[280px] sm:max-w-none mx-auto">
                  Secure gateway for BhojanOS platform operations
                </p>
              </div>

              {currentUser && userProfile && userProfile.role !== 'superadmin' && (
                <div className="mb-5 p-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.06]">
                  <p className="text-xs text-amber-100/90 leading-relaxed mb-3">
                    Signed in as <strong>{currentUser.email}</strong> ({userProfile.role}). Sign out
                    first, then use your Super Admin account.
                  </p>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="text-xs font-bold uppercase tracking-wider text-amber-300 hover:text-amber-200"
                  >
                    Sign out current account
                  </button>
                </div>
              )}

              {errorDetails && (
                <div className="mb-5 p-4 rounded-xl border border-red-500/25 bg-red-500/[0.06] flex items-start gap-3">
                  <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={16} />
                  <p className="text-xs text-red-200/90 leading-relaxed">{errorDetails}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">
                    Super admin email
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25"
                      size={17}
                    />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      inputMode="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full min-h-[48px] bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-base sm:text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30 transition-all touch-manipulation"
                      placeholder="superadmin@bhojan.os"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25"
                      size={17}
                    />
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full min-h-[48px] bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-base sm:text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30 transition-all touch-manipulation"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <SoftButton type="submit" tone="danger" fullWidth disabled={loading} className="mt-2">
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      Enter dashboard
                      <ArrowRight size={17} />
                    </>
                  )}
                </SoftButton>
              </form>

              <div className="mt-6 sm:mt-7 pt-4 sm:pt-5 border-t border-white/[0.06] grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-center">
                <Link
                  to="/admin/login"
                  className="inline-flex items-center justify-center sm:justify-start gap-2 min-h-[44px] text-xs font-semibold text-white/40 hover:text-white transition-colors touch-manipulation"
                >
                  <ArrowLeft size={14} className="shrink-0" />
                  Store admin login
                </Link>
                <Link
                  to={marketingHome}
                  className="inline-flex items-center justify-center sm:justify-end min-h-[44px] text-xs font-semibold text-white/35 hover:text-orange-400 transition-colors text-center touch-manipulation"
                >
                  BhojanOS marketing site
                </Link>
              </div>
            </div>
          </m.div>

          <p className="text-center text-[10px] sm:text-[11px] text-white/25 mt-4 sm:mt-6 px-2">
            Authorized personnel only · BhojanOS Platform
          </p>
      </div>
    </div>
  );
};

export default BhojanOSSuperAdminLogin;
