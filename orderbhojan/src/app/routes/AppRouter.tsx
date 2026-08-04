import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { MarketplaceLayout, AuthLayout, FullScreenLayout } from '@/shared/layouts';
import { HomePage } from '@/app/pages/HomePage';
import { RequireAuth } from '@/features/auth';
import { RequireBrowseAuth } from '@/features/auth/ui/RequireBrowseAuth';
import { AuthReturnNavigator } from '@/presentation/auth/AuthReturnNavigator';
import { CartExperiencePage } from '@/features/experience';
import { CheckoutPage } from '@/features/checkout';
import { Skeleton } from '@bhojan/storefront-design-system/primitives/Skeleton';
import { useAndroidBackButton } from '@/hooks/useAndroidBackButton';
import { useEffect } from 'react';
import { isNativePlatform } from '@/lib/nativePlatform';

const FoundationPage = lazy(() =>
  import('@/app/pages/FoundationPage').then((m) => ({ default: m.FoundationPage })),
);

const SearchExperiencePage = lazy(() =>
  import('@/features/experience').then((m) => ({ default: m.SearchExperiencePage })),
);
const OrdersExperiencePage = lazy(() =>
  import('@/features/experience').then((m) => ({ default: m.OrdersExperiencePage })),
);
const TrackingPage = lazy(() =>
  import('@/features/tracking').then((m) => ({ default: m.TrackingPage })),
);
const FavoritesPage = lazy(() =>
  import('@/features/favorites').then((m) => ({ default: m.FavoritesPage })),
);
const NotificationsPage = lazy(() =>
  import('@/features/notifications').then((m) => ({ default: m.NotificationsPage })),
);
const ProfilePage = lazy(() =>
  import('@/features/auth').then((m) => ({ default: m.ProfilePage })),
);
const AuthShellPage = lazy(() =>
  import('@/features/auth').then((m) => ({ default: m.AuthShellPage })),
);
const RestaurantRoutePage = lazy(() =>
  import('@/features/restaurant').then((m) => ({ default: m.RestaurantRoutePage })),
);

const FoodRoutePage = lazy(() =>
  import('@/features/food/ui/FoodRoutePage').then((module) => ({
    default: module.FoodRoutePage,
  })),
);

const SubscriptionRoutePage = lazy(() =>
  import('@/presentation/restaurant/OrderBhojanRestaurantSubscriptionPage').then((module) => ({
    default: module.OrderBhojanRestaurantSubscriptionPage,
  })),
);

function RouteFallback() {
  return (
    <div className="space-y-4 p-4" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-12 w-full rounded-2xl ob-shimmer" />
      <Skeleton className="h-48 w-full rounded-2xl ob-shimmer" />
      <Skeleton className="h-32 w-full rounded-2xl ob-shimmer" />
    </div>
  );
}

function FoodRouteFallback() {
  return (
    <div className="min-h-screen bg-[#030303] p-4 text-white" aria-busy="true" aria-label="Loading menu">
      <Skeleton className="mb-4 h-12 w-full rounded-2xl ob-shimmer" />
      <div className="mb-6 flex gap-2 overflow-hidden">
        <Skeleton className="h-9 w-24 shrink-0 rounded-full ob-shimmer" />
        <Skeleton className="h-9 w-28 shrink-0 rounded-full ob-shimmer" />
        <Skeleton className="h-9 w-20 shrink-0 rounded-full ob-shimmer" />
      </div>
      <Skeleton className="mb-3 h-6 w-40 ob-shimmer" />
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-2xl ob-shimmer" />
        <Skeleton className="h-28 w-full rounded-2xl ob-shimmer" />
        <Skeleton className="h-28 w-full rounded-2xl ob-shimmer" />
      </div>
    </div>
  );
}

function LazyRoute({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return <Suspense fallback={fallback ?? <RouteFallback />}>{children}</Suspense>;
}

export function AppRouter() {
  useAndroidBackButton();

  useEffect(() => {
    if (isNativePlatform()) {
      import('@capacitor/splash-screen').then(({ SplashScreen }) => {
        // App shell is mounted and React has painted the initial DOM.
        SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {});
      });
    }
  }, []);

  return (
    <>
      <AuthReturnNavigator />
      <Routes>
      <Route element={<MarketplaceLayout />}>
        <Route index element={<RequireBrowseAuth><HomePage /></RequireBrowseAuth>} />

        {import.meta.env.DEV ? (
          <Route
            path="foundation"
            element={
              <LazyRoute>
                <FoundationPage />
              </LazyRoute>
            }
          />
        ) : (
          <Route path="foundation" element={<Navigate to="/" replace />} />
        )}

        <Route path="discovery" element={<Navigate to="/" replace />} />
        <Route path="menu" element={<Navigate to="/search" replace />} />

        <Route
          path="search"
          element={
            <LazyRoute>
              <SearchExperiencePage />
            </LazyRoute>
          }
        />
        <Route path="cart" element={<CartExperiencePage />} />
        <Route
          path="checkout"
          element={
            <RequireAuth>
              <CheckoutPage />
            </RequireAuth>
          }
        />
        <Route
          path="orders"
          element={
            <LazyRoute>
              <RequireAuth>
                <OrdersExperiencePage />
              </RequireAuth>
            </LazyRoute>
          }
        />
        <Route
          path="orders/:orderId/track"
          element={
            <LazyRoute>
              <TrackingPage />
            </LazyRoute>
          }
        />
        <Route
          path="favorites"
          element={
            <LazyRoute>
              <RequireAuth>
                <FavoritesPage />
              </RequireAuth>
            </LazyRoute>
          }
        />
        <Route
          path="notifications"
          element={
            <LazyRoute>
              <RequireAuth>
                <NotificationsPage />
              </RequireAuth>
            </LazyRoute>
          }
        />
        <Route
          path="profile"
          element={
            <LazyRoute>
              <ProfilePage />
            </LazyRoute>
          }
        />
      </Route>

      <Route element={<AuthLayout />}>
        <Route
          path="auth"
          element={
            <LazyRoute>
              <AuthShellPage />
            </LazyRoute>
          }
        />
      </Route>

      <Route element={<FullScreenLayout />}>
        <Route
          path="restaurant/:restaurantSlug"
          element={
            <LazyRoute>
              <RestaurantRoutePage />
            </LazyRoute>
          }
        />
        <Route
          path="restaurant/:restaurantSlug/menu"
          element={
            <LazyRoute fallback={<FoodRouteFallback />}>
              <FoodRoutePage />
            </LazyRoute>
          }
        />
        <Route
          path="restaurant/:restaurantSlug/subscription"
          element={
            <LazyRoute>
              <SubscriptionRoutePage />
            </LazyRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
