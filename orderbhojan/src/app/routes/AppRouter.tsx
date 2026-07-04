import { Navigate, Route, Routes } from 'react-router-dom';

import { MarketplaceLayout, AuthLayout, FullScreenLayout } from '@/shared/layouts';

import { FoundationPage } from '@/app/pages/FoundationPage';

import { HomePage } from '@/app/pages/HomePage';

import { FeaturePlaceholderPage } from '@/app/pages/FeaturePlaceholderPage';

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



const protectedFeatureRoutes = [

  { path: 'orders/:orderId/track', feature: 'Tracking', milestone: 'M11' },

  { path: 'favorites', feature: 'Favorites', milestone: 'M10' },

  { path: 'notifications', feature: 'Notifications', milestone: 'M12' },

] as const;



const deferredFeatureRoutes = [

  { path: 'discovery', feature: 'Discovery', milestone: 'M3' },

  { path: 'restaurant/:restaurantSlug', feature: 'Restaurant', milestone: 'M5' },

  { path: 'menu', feature: 'Menu', milestone: 'M6' },

  { path: 'checkout', feature: 'Checkout', milestone: 'M8' },

] as const;



export function AppRouter() {

  return (

    <Routes>

      <Route element={<MarketplaceLayout />}>

        <Route index element={<HomePage />} />

        <Route path="foundation" element={<FoundationPage />} />

        <Route path="search" element={<SearchExperiencePage />} />

        <Route path="cart" element={<CartExperiencePage />} />

        <Route

          path="orders"

          element={

            <RequireAuth>

              <OrdersExperiencePage />

            </RequireAuth>

          }

        />

        <Route path="profile" element={<ProfilePage />} />

        {deferredFeatureRoutes.map((route) => (

          <Route

            key={route.path}

            path={route.path}

            element={

              <FeaturePlaceholderPage feature={route.feature} milestone={route.milestone} />

            }

          />

        ))}

        {protectedFeatureRoutes.map((route) => (

          <Route

            key={route.path}

            path={route.path}

            element={

              <RequireAuth>

                <FeaturePlaceholderPage feature={route.feature} milestone={route.milestone} />

              </RequireAuth>

            }

          />

        ))}

      </Route>



      <Route element={<AuthLayout />}>

        <Route path="auth" element={<AuthShellPage />} />

      </Route>



      <Route element={<FullScreenLayout />}>

        <Route

          path="immersive-demo"

          element={

            <FeaturePlaceholderPage feature="Full Screen Shell" milestone="BDS-2" />

          }

        />

      </Route>



      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>

  );

}

