import React, { useEffect, Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { m, LazyMotion, domAnimation, AnimatePresence } from 'framer-motion';
import { EnvironmentConfig } from './config/environment';
import { waitForOwnerTenantIds } from './lib/ownerAccess';

import { useAuth } from './context/AuthContext';
import { useFirestoreConnection } from './lib/firebase-db';
import { useTenant } from './context/TenantContext';
import Header from './components/Header';
import { Store } from 'lucide-react';
import BottomNav from './components/BottomNav';
import FloatingMiniCart from './components/FloatingMiniCart';
import InstallPrompt from './components/InstallPrompt';
import { Toaster, toast } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import StorefrontDesktopHeader from './components/StorefrontDesktopHeader';
import DesktopFloatingCart from './components/DesktopFloatingCart';
import NotchNotification from './components/NotchNotification';
import FlyToCartAnimation from './components/FlyToCartAnimation';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';
import { useFCMInitialization } from './hooks/useFCMInitialization';
import NetworkAwareness from './components/NetworkAwareness';
import { useBiometrics } from './hooks/useBiometrics';
import BiometricModal from './components/BiometricModal';
import AIAssistant from './components/AIAssistant';
import { TelemetryService } from './core/reliability/TelemetryService';
import { dismissSplash, scheduleSplashSafetyTimeout, isMarketingPath } from './lib/splashScreen';
import { activateCustomerPreviewFromUrl, isCustomerPreviewMode, exitCustomerPreviewMode } from './lib/storefrontPreview';
import CustomerPreviewBanner from './components/CustomerPreviewBanner';
import OwnerLayout from './components/owner/OwnerLayout';
const OwnerDashboard = lazy(() => import('./pages/owner/OwnerDashboard'));
const DataImporter = lazy(() => import('./pages/DataImporter'));
const ForecastDashboard = lazy(() => import('./pages/owner/ForecastDashboard'));
const OwnerRecipes = lazy(() => import('./pages/owner/OwnerRecipes'));
const OwnerMarketing = lazy(() => import('./pages/owner/OwnerMarketing'));
const OwnerMenu = lazy(() => import('./pages/owner/OwnerMenu'));
const OwnerCustomers = lazy(() => import('./pages/owner/OwnerCustomers'));
const OwnerReferrals = lazy(() => import('./pages/owner/OwnerReferrals'));
const DeliveryIntelligence = lazy(() => import('./pages/owner/DeliveryIntelligence').then(module => ({ default: module.DeliveryIntelligence })));
const OwnerKYC = lazy(() => import('./pages/owner/OwnerKYC').then(module => ({ default: module.OwnerKYC })));
import { EntitlementGate } from './components/owner/EntitlementGate';
const OwnerFeedback = lazy(() => import('./pages/owner/OwnerFeedback'));
const NotificationCenter = lazy(() => import('./modules/notifications/NotificationCenter'));

// Dev-only DB helpers — lazy so marketing pages don't pull Firestore seed logic up front
(window as any).populateSampleData = async () => (await import('./populateData')).populateSampleData();
(window as any).runEnterpriseMigration = async () => (await import('./scripts/migrateEnterprise')).runEnterpriseMigration();
(window as any).runDatabaseSeeder = async () => {
  console.log("Starting Database Seeder...");
  const { populateSampleData } = await import('./populateData');
  await populateSampleData();
  console.log("Seeding complete! Please refresh the page.");
};

import Home from './pages/Home';
import Menu from './pages/Menu';
const OnboardingWizard = lazy(() => import('./pages/owner/OnboardingWizard'));
const OwnerLogin = lazy(() => import('./pages/owner/OwnerLogin'));
const OwnerRegister = lazy(() => import('./pages/owner/OwnerRegister'));

// Lazy load pages for code splitting
const OnboardKitchen = lazy(() => import('./pages/OnboardKitchen'));
const Checkout = lazy(() => import('./pages/Checkout'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const BhojanOSSuperAdmin = lazy(() => import('./pages/BhojanOSSuperAdmin'));
const BhojanOSSuperAdminLogin = lazy(() => import('./pages/BhojanOSSuperAdminLogin'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const MyOrders = lazy(() => import('./pages/MyOrders'));
const Login = lazy(() => import('./pages/Login'));
const Account = lazy(() => import('./pages/Account'));
const Addresses = lazy(() => import('./pages/Addresses'));
const OrderTracking = lazy(() => import('./components/OrderTracking'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const RefundPolicy = lazy(() => import('./pages/RefundPolicy'));
const CancellationPolicy = lazy(() => import('./pages/CancellationPolicy'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const SystemHealth = lazy(() => import('./pages/SystemHealth'));
const OwnerOrders = lazy(() => import('./pages/owner/OwnerOrders'));
const OwnerSettings = lazy(() => import('./pages/owner/OwnerSettings'));
const OwnerSubscription = lazy(() => import('./pages/owner/OwnerSubscription'));

const AboutPage = lazy(() => import('./pages/marketing/AboutPage'));
const PlatformPage = lazy(() => import('./pages/marketing/PlatformPage'));
const SecurityPage = lazy(() => import('./pages/marketing/SecurityPage'));
const ContactPage = lazy(() => import('./pages/marketing/ContactPage'));
const BlogPage = lazy(() => import('./pages/marketing/BlogPage'));
const PricingPage = lazy(() => import('./pages/marketing/PricingPage'));

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean; superAdminOnly?: boolean }> = ({ children, adminOnly, superAdminOnly }) => {
  const { currentUser, userProfile, loading, profileLoading, refreshProfile, logout } = useAuth();
  const location = useLocation();
  const { tenantSlug } = useTenant();
  const previewGuest = isCustomerPreviewMode();

  useEffect(() => {
    if (superAdminOnly || adminOnly) {
      exitCustomerPreviewMode();
    }
  }, [superAdminOnly, adminOnly]);

  if (loading || (currentUser && profileLoading && !userProfile)) {
    return <div className="min-h-[100dvh] flex items-center justify-center bg-[#0c0c0c]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div></div>;
  }
  if (!currentUser) {
    if (adminOnly) return <Navigate to="/admin/login" replace />;
    if (superAdminOnly) return <Navigate to="/super-admin/login" replace />;
    const returnPath = `${location.pathname}${location.search}`;
    const loginPath = tenantSlug ? `/k/${tenantSlug}/login` : '/login';
    return <Navigate to={`${loginPath}?redirect=${encodeURIComponent(returnPath)}`} replace />;
  }
  // Customer preview is for storefront QA only — never block platform admin portals.
  if (previewGuest && !adminOnly && !superAdminOnly) {
    const returnPath = `${location.pathname}${location.search}`;
    const loginPath = tenantSlug ? `/k/${tenantSlug}/login` : '/login';
    return <Navigate to={`${loginPath}?redirect=${encodeURIComponent(returnPath)}`} replace />;
  }
  if (!userProfile) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#0c0c0c] gap-6 px-6 text-center">
        <h2 className="text-2xl font-bold text-white">Profile not loaded</h2>
        <p className="text-white/70 max-w-md">
          You are signed in, but your account profile could not be loaded. Retry or sign out and use your Super Admin account.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => void refreshProfile()}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (superAdminOnly) {
    if (userProfile.role !== 'superadmin') {
      return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#0c0c0c] gap-6 px-6 text-center">
          <h2 className="text-2xl font-bold text-white">Super Admin access required</h2>
          <p className="text-white/70 max-w-md">
            You are signed in as <span className="text-white font-semibold">{currentUser.email}</span> ({userProfile.role}).
            This portal is only for platform super admins.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => void logout()}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
            >
              Sign out &amp; use Super Admin account
            </button>
            {(userProfile.ownedTenantIds?.length ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => { window.location.href = `${EnvironmentConfig.getBaseUrl()}/owner/dashboard`; }}
                className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl transition-colors"
              >
                Go to My Kitchen Dashboard
              </button>
            )}
          </div>
        </div>
      );
    }
  } else if (adminOnly) {
    if (userProfile.role !== 'admin' && userProfile.role !== 'superadmin') return <Navigate to="/" />;
  }

  return <>{children}</>;
};

const OwnerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile, loading, profileLoading, refreshProfile } = useAuth();
  const [repairing, setRepairing] = React.useState(false);
  const [repairAttempted, setRepairAttempted] = React.useState(false);
  const [repairedTenantIds, setRepairedTenantIds] = React.useState<string[]>([]);

  const ownedTenants = userProfile?.ownedTenantIds ?? [];
  const effectiveOwnedTenants = ownedTenants.length > 0 ? ownedTenants : repairedTenantIds;

  React.useEffect(() => {
    if (!currentUser || loading || profileLoading || ownedTenants.length > 0 || repairAttempted) return;

    setRepairAttempted(true);
    setRepairing(true);
    void waitForOwnerTenantIds(currentUser.uid, refreshProfile, { email: currentUser.email, maxAttempts: 6 })
      .then((ids) => {
        if (ids.length > 0) setRepairedTenantIds(ids);
      })
      .finally(() => setRepairing(false));
  }, [currentUser, loading, profileLoading, ownedTenants.length, repairAttempted, refreshProfile]);

  if (loading || profileLoading || repairing) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-brand-bg dark:bg-dark-bg gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
        <p className="text-sm text-white/60">Loading your owner profile…</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/owner/login" replace />;
  }

  if (!userProfile) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-brand-bg dark:bg-dark-bg gap-6 px-6 text-center">
        <h2 className="text-2xl font-bold text-white">Profile not loaded</h2>
        <p className="text-white/70 max-w-md">
          You are signed in, but your owner profile could not be loaded. This usually clears after a retry.
        </p>
        <button
          type="button"
          onClick={() => void refreshProfile()}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-400 text-black font-bold rounded-xl transition-colors"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={() => { window.location.href = `${EnvironmentConfig.getBaseUrl()}/owner/login`; }}
          className="text-orange-500 underline text-sm"
        >
          Return to Owner Login
        </button>
      </div>
    );
  }

  // Owner portal is only for users who own a kitchen — never for platform admin impersonation.
  if (effectiveOwnedTenants.length === 0) {
    if (userProfile.role === 'superadmin') {
      return <Navigate to="/super-admin" replace />;
    }
    if (userProfile.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    if (userProfile.role === 'owner' && !repairAttempted) {
      return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-brand-bg dark:bg-dark-bg gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
          <p className="text-sm text-white/60">Linking your store…</p>
        </div>
      );
    }
    return <Navigate to="/owner/register" replace />;
  }

  return <>{children}</>;
};

const StorefrontRootRoute: React.FC = () => {
  const location = useLocation();

  if (EnvironmentConfig.isTenantStorefrontPath(location.pathname)) {
    return <Home />;
  }

  if (EnvironmentConfig.isBhojanOSRoot()) {
    return <OnboardKitchen />;
  }

  return <Home />;
};

const AppContent: React.FC = () => {
  const { currentUser, loading: authLoading, logout } = useAuth();
  const { connected, loading: firestoreLoading, retry } = useFirestoreConnection();
  useFCMInitialization();

  useEffect(() => {
    TelemetryService.initializeGlobalHandlers();

    const handleGlobalError = (event: ErrorEvent) => {
      // Handle chunk load errors silently by notifying the user to refresh, instead of a sudden crash reload
      if (
        event.message?.includes('Failed to fetch dynamically imported module') ||
        event.message?.includes('Importing a module script failed') ||
        event.error?.name === 'ChunkLoadError' ||
        event.message?.includes('Failed to load module script') ||
        event.message?.includes('Unable to preload CSS') ||
        event.message?.includes('Unexpected token') ||
        event.message?.includes('Unexpected token \'<\'')
      ) {
        toast('A new version is available! Please refresh to update.', { 
          icon: '🔄',
          duration: 10000 
        });
      }
    };

    window.addEventListener('error', handleGlobalError);
    return () => {
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  useEffect(() => {
    dismissSplash();
    scheduleSplashSafetyTimeout();
  }, []);

  useEffect(() => {
    if (!authLoading) {
      dismissSplash();
    }
  }, [authLoading]);

  useEffect(() => {
    if (!authLoading && connected && !isMarketingPath() && import.meta.env.DEV) {
      if (typeof window !== 'undefined' && window.localStorage.getItem('menuSeeded') !== 'true') {
        import('./populateData').then(({ seedMenuItems }) => {
          seedMenuItems().catch((error) => {
            console.error('Seed menu items failed:', error);
          });
        });
      }
    }
  }, [authLoading, connected]);

  const { isEnabled: biometricsEnabled, authenticate: bioAuth, biometryType } = useBiometrics();
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [hasCheckedLock, setHasCheckedLock] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    const isAdminPortal =
      path.startsWith('/super-admin') ||
      path.startsWith('/admin') ||
      path.startsWith('/owner');

    if (!authLoading && currentUser && biometricsEnabled && !hasCheckedLock && !isCustomerPreviewMode() && !isAdminPortal) {
      setIsAppLocked(true);
      setHasCheckedLock(true);
    }
  }, [authLoading, currentUser, biometricsEnabled, hasCheckedLock]);

  const handleUnlock = async () => {
    const success = await bioAuth();
    if (success) {
      setIsAppLocked(false);
    }
  };

  const handleFallback = async () => {
    setIsAppLocked(false);
    await logout();
  };

  const GlobalLoading = () => (
    <div className="min-h-screen bg-brand-bg dark:bg-dark-bg pb-32">
      <div className="sticky top-0 z-40 border-b border-white/5 bg-dark-bg/95 px-4 py-6 backdrop-blur-xl">
        <div className="h-10 w-32 rounded-2xl bg-white/10 shimmer" />
      </div>
      <div className="w-full max-w-3xl mx-auto px-4 py-6">
        <div className="mb-6 h-8 w-48 rounded-full bg-white/10 shimmer" />
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-3 rounded-[1.6rem] p-3 border border-white/5 bg-white/[0.02]">
              <div className="h-32 w-32 flex-shrink-0 rounded-[1.25rem] bg-white/10 shimmer" />
              <div className="flex flex-1 flex-col py-2 space-y-4">
                <div className="h-4 w-3/4 rounded-full bg-white/10 shimmer" />
                <div className="h-3 w-1/2 rounded-full bg-white/10 shimmer" />
                <div className="mt-auto flex justify-between items-end">
                  <div className="h-5 w-16 rounded-full bg-white/10 shimmer" />
                  <div className="h-8 w-20 rounded-full bg-white/10 shimmer" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const MarketingPageFallback = () => (
    <div className="min-h-screen bg-[#030303] flex flex-col">
      <div className="h-16 border-b border-white/5 bg-[#030303]/95" />
      <div className="flex-1 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-[#FF7A00]/30 border-t-[#FF7A00] animate-spin" />
      </div>
    </div>
  );

  const AdminPageFallback = () => (
    <div className="min-h-[100dvh] bg-[#0c0c0c] flex flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
      <p className="text-sm text-white/50 font-medium">Loading admin portal…</p>
    </div>
  );

  const routeFallback = (() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/super-admin') || path.startsWith('/admin')) {
        return <AdminPageFallback />;
      }
    }
    return isMarketingPath() ? <MarketingPageFallback /> : <GlobalLoading />;
  })();

  const mainRoutes = (
    <Routes>
      <Route path="/" element={<StorefrontRootRoute />} />
      <Route path="/menu" element={<Menu />} />
      <Route path="/orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
      <Route path="/subscription" element={<SubscriptionPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/refund-policy" element={<RefundPolicy />} />
      <Route path="/cancellation-policy" element={<CancellationPolicy />} />
      <Route path="/account" element={<Account />} />
      <Route path="/addresses" element={<Addresses />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/order-success" element={<OrderSuccess />} />
      <Route 
        path="/order/:orderId" 
        element={
          <ProtectedRoute>
            <OrderTracking />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/my-orders" 
        element={
          <ProtectedRoute>
            <MyOrders />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );

  return (
    <LazyMotion features={domAnimation}>
      <Router>
        <div className="flex-1 flex flex-col w-full min-h-screen bg-brand-bg dark:bg-dark-bg transition-colors duration-300">
          <NetworkAwareness connected={connected} loading={firestoreLoading} retry={retry} />
          
          <Suspense fallback={routeFallback}>
            <Routes>
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/super-admin/login" element={<BhojanOSSuperAdminLogin />} />
              <Route path="/owner/login" element={<OwnerLogin />} />
              <Route path="/owner/register" element={<OwnerRegister />} />
              <Route path="/onboard" element={<OnboardKitchen />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/platform" element={<PlatformPage />} />
              <Route path="/security" element={<SecurityPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>} />
              <Route path="/super-admin" element={<ProtectedRoute superAdminOnly><BhojanOSSuperAdmin /></ProtectedRoute>} />
              <Route path="/admin/system-health" element={<ProtectedRoute adminOnly><SystemHealth /></ProtectedRoute>} />
              <Route path="/owner/dashboard" element={<OwnerRoute><OwnerLayout><OwnerDashboard /></OwnerLayout></OwnerRoute>} />
              <Route path="/owner/import-data" element={<OwnerRoute><OwnerLayout><DataImporter /></OwnerLayout></OwnerRoute>} />
              <Route path="/owner/operations" element={<OwnerRoute><OwnerLayout><ForecastDashboard /></OwnerLayout></OwnerRoute>} />
              <Route path="/owner/kyc" element={<OwnerRoute><OwnerLayout><OwnerKYC /></OwnerLayout></OwnerRoute>} />
              <Route path="/owner/setup" element={<OwnerRoute><OnboardingWizard /></OwnerRoute>} />
              <Route path="/owner/recipes" element={<OwnerRoute><OwnerLayout><EntitlementGate feature="predictiveSupply"><OwnerRecipes /></EntitlementGate></OwnerLayout></OwnerRoute>} />
              <Route path="/owner/marketing" element={<OwnerRoute><OwnerLayout><EntitlementGate feature="marketing"><OwnerMarketing /></EntitlementGate></OwnerLayout></OwnerRoute>} />
              <Route path="/owner/delivery" element={<OwnerRoute><OwnerLayout><EntitlementGate feature="deliveryIntelligence"><DeliveryIntelligence /></EntitlementGate></OwnerLayout></OwnerRoute>} />
              <Route path="/owner/menu" element={<OwnerRoute><OwnerLayout><OwnerMenu /></OwnerLayout></OwnerRoute>} />
              <Route path="/owner/settings" element={<OwnerRoute><OwnerLayout><OwnerSettings /></OwnerLayout></OwnerRoute>} />
              <Route path="/owner/subscription" element={<OwnerRoute><OwnerLayout><OwnerSubscription /></OwnerLayout></OwnerRoute>} />
              <Route path="/owner/orders" element={<OwnerRoute><OwnerLayout><OwnerOrders /></OwnerLayout></OwnerRoute>} />
              <Route path="/owner/customers" element={<OwnerRoute><OwnerLayout><EntitlementGate feature="customerInsights"><OwnerCustomers /></EntitlementGate></OwnerLayout></OwnerRoute>} />
              <Route path="/owner/referrals" element={<OwnerRoute><OwnerLayout><OwnerReferrals /></OwnerLayout></OwnerRoute>} />
              <Route path="/owner/feedback" element={<OwnerRoute><OwnerLayout><OwnerFeedback /></OwnerLayout></OwnerRoute>} />
              <Route path="/owner/notifications" element={<OwnerRoute><OwnerLayout><NotificationCenter /></OwnerLayout></OwnerRoute>} />
              
              <Route path="/k/:tenantSlug/*" element={<LayoutWrapper>{mainRoutes}</LayoutWrapper>} />
              <Route path="/*" element={<LayoutWrapper>{mainRoutes}</LayoutWrapper>} />
            </Routes>
          </Suspense>
          
          <InstallPrompt />
          <NotchNotification />
          <FlyToCartAnimation />
          <PwaUpdatePrompt />
          <Toaster position="bottom-center" containerStyle={{ zIndex: 9000 }} />

          <BiometricModal
            isOpen={isAppLocked}
            onClose={() => {}} 
            onConfirm={handleUnlock}
            onFallback={handleFallback}
            type="unlock"
            biometryType={biometryType}
          />
        </div>
      </Router>
    </LazyMotion>
  );
};

const PageWrapper: React.FC<{ children: React.ReactNode, locationKey: string }> = ({ children, locationKey }) => {
  return (
    <m.div
      key={locationKey}
      initial={{ x: 10, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -10, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="w-full h-full"
    >
      {children}
    </m.div>
  );
};

const StoreNotFound = () => (
  <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[100dvh] bg-brand-bg dark:bg-dark-bg p-6 text-center relative overflow-hidden">
    <div className="absolute inset-0 mib-hero-grain opacity-50" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange-500/20 blur-[100px] rounded-full pointer-events-none" />
    
    <m.div 
      initial={{ scale: 0.9, opacity: 0, y: 20 }} 
      animate={{ scale: 1, opacity: 1, y: 0 }} 
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 max-w-sm w-full mib-glass p-10 rounded-[2.5rem] flex flex-col items-center border border-white/10"
    >
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-dark-surface to-black border border-white/5 flex items-center justify-center mb-8 shadow-2xl relative premium-card-hover">
        <div className="absolute inset-0 bg-orange-500/10 blur-2xl rounded-full" />
        <Store size={40} className="text-orange-400 relative z-10" />
      </div>
      
      <h1 className="text-3xl font-black text-white mb-4 tracking-tighter">Unavailable</h1>
      <p className="text-white/50 mb-10 text-sm leading-relaxed max-w-[260px]">
        The curated culinary experience you're looking for doesn't exist or has concluded its service.
      </p>
      
      <a href="/" className="btn-orange w-full group relative overflow-hidden">
        <span className="relative z-10">Return to Main Store</span>
        <div className="absolute inset-0 mib-cta-sheen" />
      </a>
    </m.div>
  </div>
);

const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  activateCustomerPreviewFromUrl();
  const location = useLocation();
  const { tenantNotFound } = useTenant();
  const path = location.pathname;
  const customerPreview = isCustomerPreviewMode();
  
  const isRoute = (targetPath: string) => {
    if (path === targetPath) return true;
    const match = path.match(/^\/k\/[^/]+(.*)$/);
    if (match) {
      const p = match[1] || '/';
      return p === targetPath;
    }
    return false;
  };

  const isCheckout = isRoute('/checkout');
  const isSubscription = isRoute('/subscription');
  const isBhojanOSRoot = EnvironmentConfig.isBhojanOSRoot() && path === '/';
  const isFullScreen = isCheckout || isSubscription || isBhojanOSRoot;
  
  const isMenu = isRoute('/menu');
  const isLogin = isRoute('/login') || path === '/owner/login' || path === '/owner/register';
  const isAdmin = path.startsWith('/admin') || path.startsWith('/super-admin');
  const isOwnerRoute = path.startsWith('/owner') && path !== '/owner/login';
  const isMarketing = path === '/onboard' || path === '/pricing' || path === '/about' || path === '/platform' || path === '/security' || path === '/contact' || path === '/blog' || (path === '/' && EnvironmentConfig.isBhojanOSRoot());
  const isMyOrders = isRoute('/orders'); // also fixing my-orders path since route is /orders
  const isOrderTracking = path.startsWith('/order/') || !!path.match(/^\/k\/[^/]+\/order\//);
  
  if (isLogin || isAdmin || isOwnerRoute || isMarketing) {
    return <>{children}</>;
  }

  if (tenantNotFound) {
    return <StoreNotFound />;
  }

  const isHome = isRoute('/');
  const isAccount = isRoute('/account');
  const isAddresses = isRoute('/addresses');
  const isOrderSuccess = isRoute('/order-success');
  const isPaymentSuccess = isRoute('/payment-success');
  
  const hideHeader = isFullScreen || isMenu || isHome || isMyOrders || isOrderTracking || isAccount || isAddresses || isOrderSuccess || isPaymentSuccess;
  const isEdgeToEdge = isFullScreen || isAccount || isOrderSuccess || isPaymentSuccess || isAddresses;

  return (
      <div className="flex-1 flex w-full min-h-screen bg-brand-bg dark:bg-dark-bg">
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {customerPreview && <CustomerPreviewBanner />}
        {!isFullScreen && !isHome && <StorefrontDesktopHeader />}
        {!hideHeader && <Header />}
        <main id="main-scroll-container" className="flex-1 relative" style={{ paddingTop: isEdgeToEdge ? '0' : 'env(safe-area-inset-top)', paddingBottom: isFullScreen ? 'env(safe-area-inset-bottom)' : 'calc(140px + env(safe-area-inset-bottom))', WebkitOverflowScrolling: 'touch' }}>
          {isEdgeToEdge ? (
            <AnimatePresence mode="wait">
              <PageWrapper locationKey={location.pathname}>
                {children}
              </PageWrapper>
            </AnimatePresence>
          ) : (
            <div
              className="w-full max-w-full xl:max-w-7xl mx-auto px-2 sm:px-3 lg:px-6 relative"
              style={{
                paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
                paddingRight: 'max(0.5rem, env(safe-area-inset-right))'
              }}
            >
              <AnimatePresence mode="wait">
                <PageWrapper locationKey={location.pathname}>
                  {children}
                </PageWrapper>
              </AnimatePresence>
            </div>
          )}
        </main>
        {!isFullScreen && (
          <div className="xl:hidden">
            <FloatingMiniCart />
          </div>
        )}
        {!isFullScreen && <DesktopFloatingCart />}
        <div className="lg:hidden">
          {!isFullScreen && <BottomNav />}
        </div>
        {!isFullScreen && <AIAssistant />}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

export default App;
