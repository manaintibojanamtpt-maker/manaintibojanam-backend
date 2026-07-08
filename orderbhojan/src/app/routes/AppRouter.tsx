import { lazy, Suspense } from 'react';

import { Navigate, Route, Routes } from 'react-router-dom';



import { MarketplaceLayout, AuthLayout, FullScreenLayout } from '@/shared/layouts';



import { FoundationPage } from '@/app/pages/FoundationPage';



import { HomePage } from '@/app/pages/HomePage';



import {

  AuthShellPage,

  ProfilePage,

  RequireAuth,

} from '@/features/auth';



import {

  SearchExperiencePage,

  CartExperiencePage,

  OrdersExperiencePage,

} from '@/features/experience';

import { CheckoutPage } from '@/features/checkout';

import { TrackingPage } from '@/features/tracking';

import { FavoritesPage } from '@/features/favorites';

import { NotificationsPage } from '@/features/notifications';



import { RestaurantRoutePage } from '@/features/restaurant';

import { Skeleton } from '@bhojan/design-system';



const FoodRoutePage = lazy(() =>

  import('@/features/food/ui/FoodRoutePage').then((module) => ({

    default: module.FoodRoutePage,

  })),

);



function FoodRouteFallback() {

  return (

    <div style={{ padding: 'var(--bds-space-4)' }} aria-busy="true">

      <Skeleton height="3rem" />

      <Skeleton height="12rem" style={{ marginTop: 'var(--bds-space-4)' }} />

    </div>

  );

}



export function AppRouter() {

  return (

    <Routes>

      <Route element={<MarketplaceLayout />}>

        <Route index element={<HomePage />} />

        <Route path="foundation" element={<FoundationPage />} />

        <Route path="discovery" element={<Navigate to="/" replace />} />

        <Route path="menu" element={<Navigate to="/search" replace />} />

        <Route path="search" element={<SearchExperiencePage />} />

        <Route path="cart" element={<CartExperiencePage />} />

        <Route path="checkout" element={<CheckoutPage />} />

        <Route

          path="orders"

          element={

            <RequireAuth>

              <OrdersExperiencePage />

            </RequireAuth>

          }

        />

        <Route path="orders/:orderId/track" element={<TrackingPage />} />

        <Route

          path="favorites"

          element={

            <RequireAuth>

              <FavoritesPage />

            </RequireAuth>

          }

        />

        <Route

          path="notifications"

          element={

            <RequireAuth>

              <NotificationsPage />

            </RequireAuth>

          }

        />

        <Route path="profile" element={<ProfilePage />} />

      </Route>



      <Route element={<AuthLayout />}>

        <Route path="auth" element={<AuthShellPage />} />

      </Route>



      <Route element={<FullScreenLayout />}>

        <Route path="restaurant/:restaurantSlug" element={<RestaurantRoutePage />} />

        <Route

          path="restaurant/:restaurantSlug/menu"

          element={

            <Suspense fallback={<FoodRouteFallback />}>

              <FoodRoutePage />

            </Suspense>

          }

        />

      </Route>



      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>

  );

}

