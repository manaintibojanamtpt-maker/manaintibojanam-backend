import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { DesignSystemProvider } from '@bhojan/design-system';
import { DiscoveryProvider } from '@/features/discovery';
import { SearchProvider } from '@/features/search';
import { RestaurantProvider } from '@/features/restaurant';
import { FoodProvider } from '@/features/food/ui/FoodProvider';
import { LocationProvider } from '@/features/location';
import { AuthProvider } from './AuthProvider';
import { BdsToastProvider, registerToastHandler, useBdsToast } from './BdsToastProvider';
import { PremiumMotionRoot } from '@/features/experience/motion/premiumMotion';
import { FeatureFlagProvider } from '@/featureFlags';
import { TelemetryProvider } from '@/telemetry';

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
  return (
    <DesignSystemProvider theme="system">
      <TelemetryProvider>
        <FeatureFlagProvider>
          <PremiumMotionRoot>
            <AuthProvider>
            <LocationProvider>
              <QueryClientProvider client={queryClient}>
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
          </PremiumMotionRoot>
        </FeatureFlagProvider>
      </TelemetryProvider>
    </DesignSystemProvider>
  );
}

export { queryClient };
