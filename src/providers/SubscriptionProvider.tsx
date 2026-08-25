import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface SubscriptionProviderProps {
  children: React.ReactNode;
}

const SubscriptionContext = createContext<{
  queryClient: QueryClient;
} | null>(null);

export const useSubscriptionContext = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10000, // 10 seconds
            gcTime: 1000 * 60 * 60 * 24, // 24 hours
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      queryClient.clear();
    };
  }, [queryClient]);

  const value = useMemo(() => ({ queryClient }), [queryClient]);

  return (
    <SubscriptionContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SubscriptionContext.Provider>
  );
};

// Hook to get the query client anywhere in the app
export const useQueryClientFromProvider = () => {
  const { queryClient } = useSubscriptionContext();
  return queryClient;
};