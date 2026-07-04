import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { DesignSystemProvider } from '@bhojan/design-system';
import { LocationProvider } from '@/features/location';
import { AuthProvider } from './AuthProvider';
import { BdsToastProvider, registerToastHandler, useBdsToast } from './BdsToastProvider';
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
          <AuthProvider>
            <LocationProvider>
              <QueryClientProvider client={queryClient}>
                <BdsToastProvider>
                  <ToastRegistration>{children}</ToastRegistration>
                </BdsToastProvider>
              </QueryClientProvider>
            </LocationProvider>
          </AuthProvider>
        </FeatureFlagProvider>
      </TelemetryProvider>
    </DesignSystemProvider>
  );
}

export { queryClient };
