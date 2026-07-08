import { useQuery } from '@tanstack/react-query';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { useAuth } from '@/shared/providers/AuthProvider';
import { ordersQueryKeys } from './ordersQueryKeys';

export function useOrdersList() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ordersQueryKeys.list(),
    enabled: isAuthenticated,
    queryFn: () => getMarketplaceApiClient().listOrders(),
    refetchInterval: 15_000,
    staleTime: 5_000,
  });
}
