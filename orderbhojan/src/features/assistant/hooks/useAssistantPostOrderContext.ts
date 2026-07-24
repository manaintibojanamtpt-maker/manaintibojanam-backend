import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { buildPostOrderContext, type PostOrderContext } from '../domain/postOrderAssistContract';
import { usePublishedPostOrderBootstrap } from '../ui/postOrderBootstrapStore';
import { useAiPostOrderFeature } from './useAiPostOrderFeature';

/**
 * Resolve post-order context from published tracking bootstrap + track-route params.
 * Never fetches tracking/orders — bootstrap must be caller-supplied.
 */
export function useAssistantPostOrderContext(): PostOrderContext | undefined {
  const postOrderEnabled = useAiPostOrderFeature();
  const bootstrap = usePublishedPostOrderBootstrap();
  const { orderId: routeOrderId } = useParams<{ orderId?: string }>();
  const [searchParams] = useSearchParams();
  const phoneFromQuery = searchParams.get('phone') ?? undefined;

  return useMemo(() => {
    if (!postOrderEnabled) return undefined;

    if (bootstrap) {
      return buildPostOrderContext({
        orderId: bootstrap.orderId ?? routeOrderId,
        guestPhone: bootstrap.guestPhone ?? phoneFromQuery,
        snapshot: bootstrap.snapshot,
      });
    }

    // On track routes without bootstrap yet (loading / guest gate), still pass orderId.
    if (routeOrderId?.trim()) {
      return buildPostOrderContext({
        orderId: routeOrderId,
        guestPhone: phoneFromQuery,
      });
    }

    return undefined;
  }, [bootstrap, phoneFromQuery, postOrderEnabled, routeOrderId]);
}
