import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isLiveStorefrontSyncEnabled } from '@/config/marketplaceQueryPolicy';
import { fetchMarketplacePoolRevision } from '../infrastructure/marketplaceSyncClient';
import { discoveryKeys } from '@/features/discovery/hooks/discoveryQueryKeys';
import { restaurantKeys } from '@/features/restaurant/hooks/restaurantQueryKeys';
import { foodKeys } from '@/features/food/hooks/foodQueryKeys';
import { searchKeys } from '@/features/search/hooks/searchQueryKeys';

const REVISION_POLL_MS = 15_000;

export function useMarketplaceRevisionSync(enabled = isLiveStorefrontSyncEnabled()): void {
  const queryClient = useQueryClient();
  const lastRevision = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const payload = await fetchMarketplacePoolRevision();
        const revision = payload.poolSyncRevision;
        if (!revision || cancelled) return;
        if (lastRevision.current && lastRevision.current !== revision) {
          await queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
          await queryClient.invalidateQueries({ queryKey: restaurantKeys.all });
          await queryClient.invalidateQueries({ queryKey: foodKeys.all });
          await queryClient.invalidateQueries({ queryKey: searchKeys.all });
        }
        lastRevision.current = revision;
      } catch {
        // Keep last known revision; full query hooks still refetch on focus.
      }
    };

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, REVISION_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled, queryClient]);
}
