import { useQuery } from '@tanstack/react-query';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { useAuth } from '@/shared/providers/AuthProvider';
import { trackingQueryKeys } from './trackingQueryKeys';
import { normalizeTrackingStatus } from '../utils/trackingSteps';

const TERMINAL_TRACKING_STATUSES = new Set(['DELIVERED', 'CANCELLED', 'REJECTED']);

function isTerminalTrackingStatus(status?: string): boolean {
  if (!status) return false;
  const normalized = normalizeTrackingStatus(status);
  return TERMINAL_TRACKING_STATUSES.has(normalized);
}

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
    refetchInterval: (query) =>
      isTerminalTrackingStatus(query.state.data?.status) ? false : 5_000,
    staleTime: 2_000,
  });
}
