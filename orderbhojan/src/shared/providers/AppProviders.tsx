import { QueryClientProvider } from '@tanstack/react-query';
import { LazyMotion, domAnimation } from 'framer-motion';
import React, { useEffect } from 'react';
import { DiscoveryProvider } from '@/features/discovery';
import { SearchProvider } from '@/features/search';
import { RestaurantProvider } from '@/features/restaurant';
import { FoodProvider } from '@/features/food/ui/FoodProvider';
import { LocationProvider } from '@/features/location';
import { AuthProvider } from './AuthProvider';
import { BdsToastProvider, registerToastHandler, useBdsToast } from './BdsToastProvider';
import { FeatureFlagProvider } from '@/featureFlags';
import { MarketplaceRevisionSync } from '@/features/marketplace/MarketplaceRevisionSync';
import { FavoritesSyncBootstrap } from '@/features/favorites/hooks/FavoritesSyncBootstrap';
import { TelemetryProvider } from '@/telemetry';
import { sanitizeLiveRestaurantContext } from '@/lib/sanitizeLiveRestaurantContext';
import { queryClient } from '@/shared/queryClient';

function ToastRegistration({ children }: { children: React.ReactNode }) {
  const { showToast } = useBdsToast();
  useEffect(() => {
    registerToastHandler(showToast);
  }, [showToast]);
  return <>{children}</>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    sanitizeLiveRestaurantContext();
  }, []);

  return (
    <LazyMotion features={domAnimation} strict>
    <div className="min-h-[100dvh] bg-[#070504] text-white">
      <TelemetryProvider>
        <FeatureFlagProvider>
            <AuthProvider>
            <LocationProvider>
              <QueryClientProvider client={queryClient}>
                <MarketplaceRevisionSync />
                <FavoritesSyncBootstrap />
                <DiscoveryProvider>
                  <SearchProvider>
                    <RestaurantProvider>
                      <FoodProvider>
                        <BdsToastProvider>
                          <ToastRegistration>{children}</ToastRegistration>
                        </BdsToastProvider>
                      </FoodProvider>
                    </RestaurantProvider>
                  </SearchProvider>
                </DiscoveryProvider>
              </QueryClientProvider>
            </LocationProvider>
            </AuthProvider>
        </FeatureFlagProvider>
      </TelemetryProvider>
    </div>
    </LazyMotion>
  );
}

export { queryClient } from '@/shared/queryClient';
