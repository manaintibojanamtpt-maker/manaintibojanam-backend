import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

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
  );
}

export { queryClient };
