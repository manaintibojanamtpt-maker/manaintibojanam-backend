import React, { useEffect, Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import logo from './assets/logo.webp';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useFirestoreConnection, forceOnline } from './lib/firebase-db';
import { WifiOff, RefreshCw } from 'lucide-react';
import { CartProvider } from './context/CartContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import FloatingMiniCart from './components/FloatingMiniCart';
import InstallPrompt from './components/InstallPrompt';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import DesktopSidebar from './components/DesktopSidebar';
import NotchNotification from './components/NotchNotification';
import FlyToCartAnimation from './components/FlyToCartAnimation';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';
import { useFCMInitialization } from './hooks/useFCMInitialization';
import { seedMenuItems } from './populateData';
import NetworkAwareness from './components/NetworkAwareness';
import { useBiometrics } from './hooks/useBiometrics';
import BiometricModal from './components/BiometricModal';

import Home from './pages/Home';
import Menu from './pages/Menu';
import Checkout from './pages/Checkout';
import { useCart } from './context/CartContext';

// Lazy load pages for code splitting
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
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

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) return <div className="min-h-[100dvh] flex items-center justify-center bg-brand-bg dark:bg-dark-bg"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div></div>;
  if (!currentUser) return <Navigate to="/login" />;
  if (adminOnly) {
    if (!userProfile) {
      return <div className="min-h-[100dvh] flex items-center justify-center bg-brand-bg dark:bg-dark-bg"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div></div>;
    }
    if (userProfile.role !== 'admin') return <Navigate to="/" />;
  }

  return <>{children}</>;
};

// Native HTML splash screen is used instead of React-based one to prevent double splash

const AppContent: React.FC = () => {
  const { currentUser, loading: authLoading, logout } = useAuth();
  const { connected, loading: firestoreLoading, retry } = useFirestoreConnection();
  const { fcmInitialized, initializing: fcmInitializing } = useFCMInitialization();

  const [debugLogs, setDebugLogs] = React.useState<string[]>([]);
  const [debugStatus, setDebugStatus] = React.useState<string>("");

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      fetch('/api/client-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: event.message, info: event.error?.stack })
      }).catch(() => {});
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      fetch('/api/client-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unhandled Rejection', info: String(event.reason) })
      }).catch(() => {});
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    // Only remove the native splash screen once the app is fully authenticated/loaded
    if (!authLoading) {
      // Add a tiny delay to ensure the initial React render is painted
      setTimeout(() => {
        const loader = document.getElementById('initial-loader');
        if (loader) {
          loader.style.opacity = '0';
          setTimeout(() => loader.remove(), 500);
        }
      }, 300);
    }
  }, [authLoading]);

  useEffect(() => {
    if (!authLoading && connected) {
      if (typeof window !== 'undefined' && window.localStorage.getItem('menuSeeded') !== 'true') {
        seedMenuItems().catch((error) => {
          console.error('Seed menu items failed:', error);
        });
      } else {
        console.log('Skipping menu seed because seed marker is already present');
      }
    }
  }, [authLoading, connected]);

  // Biometric Lock Logic
  const { isEnabled: biometricsEnabled, authenticate: bioAuth, disable: bioDisable, isSupported: bioSupported, biometryType } = useBiometrics();
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [hasCheckedLock, setHasCheckedLock] = useState(false);

  useEffect(() => {
    if (!authLoading && currentUser && biometricsEnabled && !hasCheckedLock) {
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
    // If the user can't unlock with biometrics, clear the lock and force re-login
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

  // Removed authLoading blocking so the app renders instantly
  // if (authLoading) return <GlobalLoading />;

  const isAdminRoute = window.location.pathname === '/admin';

  const triggerVerification = async () => {
    setDebugStatus("Verifying...");
    try {
      const res = await fetch("/api/admin/verify-connection");
      const data = await res.json();
      setDebugLogs(data.logs || []);
      setDebugStatus(data.status === "ok" ? "SUCCESS" : "FAILED");
    } catch (err: any) {
      setDebugStatus(`ERROR: ${err.message}`);
    }
  };

  // Data is ready when Auth stops loading (Don't block on Firestore connection)
  const isDataReady = !authLoading;

  return (
    <Router>
      <div className="flex-1 flex flex-col w-full h-full bg-brand-bg dark:bg-dark-bg transition-colors duration-300 overflow-hidden">
        {/* Connectivity Status (Native Style) */}
        <NetworkAwareness connected={connected} loading={firestoreLoading} retry={retry} />
        
        <Suspense fallback={<GlobalLoading />}>
          <Routes>
            <Route 
              path="/admin/login" 
              element={<AdminLogin />} 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute adminOnly>
                  <AdminPanel />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="*" 
              element={
                <LayoutWrapper>
                  <Routes>
                    <Route path="/" element={<Home />} />
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
                </LayoutWrapper>
              } 
            />
          </Routes>
        </Suspense>
        
        <InstallPrompt />
        <NotchNotification />
        <FlyToCartAnimation />
        <PwaUpdatePrompt />
        <Toaster position="bottom-center" />

        <BiometricModal
          isOpen={isAppLocked}
          onClose={() => {}} // User must unlock
          onConfirm={handleUnlock}
          onFallback={handleFallback}
          type="unlock"
          biometryType={biometryType}
        />
      </div>
    </Router>
  );
};

const PageWrapper: React.FC<{ children: React.ReactNode, locationKey: string }> = ({ children, locationKey }) => {
  return (
    <motion.div
      key={locationKey}
      initial={{ x: 10, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -10, opacity: 0 }}
      transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.4 }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isCheckout = location.pathname === '/checkout';
  const isSubscription = location.pathname === '/subscription';
  const isFullScreen = isCheckout || isSubscription;
  
  const isMenu = location.pathname === '/menu';
  const isLogin = location.pathname === '/login';
  const isAdmin = location.pathname.startsWith('/admin');
  const isMyOrders = location.pathname === '/my-orders';
  const isOrderTracking = location.pathname.startsWith('/order/');
  
  if (isLogin || isAdmin) {
    return <>{children}</>;
  }

  const isHome = location.pathname === '/';
  const isAccount = location.pathname === '/account';
  const isAddresses = location.pathname === '/addresses';
  const isOrderSuccess = location.pathname === '/order-success';
  const isPaymentSuccess = location.pathname === '/payment-success';
  
  const hideHeader = isFullScreen || isMenu || isHome || isMyOrders || isOrderTracking || isAccount || isAddresses || isOrderSuccess || isPaymentSuccess;
  const isEdgeToEdge = isFullScreen || isAccount || isOrderSuccess || isPaymentSuccess || isAddresses;

  return (
      <div className="flex-1 flex w-full h-full bg-brand-bg dark:bg-dark-bg overflow-hidden">
      <DesktopSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {!hideHeader && <Header />}
        <main id="main-scroll-container" className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar relative" style={{ paddingTop: isEdgeToEdge ? '0' : 'env(safe-area-inset-top)', paddingBottom: isFullScreen ? 'env(safe-area-inset-bottom)' : 'calc(140px + env(safe-area-inset-bottom))', WebkitOverflowScrolling: 'touch' }}>
          {isEdgeToEdge ? (
            <AnimatePresence mode="wait">
              <PageWrapper locationKey={location.pathname}>
                {children}
              </PageWrapper>
            </AnimatePresence>
          ) : (
            <div
              className="w-full max-w-full lg:max-w-3xl mx-auto px-2 sm:px-3 lg:px-6 relative"
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
        {!isFullScreen && <FloatingMiniCart />}
        <div className="lg:hidden">
          {!isFullScreen && <BottomNav />}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    const nativeSplash = document.getElementById('mib-splash-screen');
    if (nativeSplash) {
      nativeSplash.classList.add('hide');
      setTimeout(() => nativeSplash.remove(), 1000);
    }
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
