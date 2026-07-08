import { useQuery } from '@tanstack/react-query';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { useAuth } from '@/shared/providers/AuthProvider';
import { trackingQueryKeys } from './trackingQueryKeys';

export function useOrderTracking(orderId: string, guestPhone?: string) {
  const { isAuthenticated } = useAuth();
  const guestMode = Boolean(guestPhone && guestPhone.replace(/\D/g, '').length >= 4);

  return useQuery({
    queryKey: trackingQueryKeys.order(orderId, guestMode ? 'guest' : 'auth', guestPhone),
    enabled: Boolean(orderId) && (isAuthenticated || guestMode),
    queryFn: () =>
      guestMode
        ? getMarketplaceApiClient().getGuestTracking(orderId, guestPhone!)
        : getMarketplaceApiClient().getTracking(orderId),
    refetchInterval: 5_000,
    staleTime: 2_000,
  });
}
