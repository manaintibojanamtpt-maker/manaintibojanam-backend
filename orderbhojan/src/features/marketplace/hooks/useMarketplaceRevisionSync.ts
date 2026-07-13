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
    let timer: number | null = null;

    const poll = async () => {
      if (cancelled || document.hidden) return;
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

    const startPolling = () => {
      if (cancelled || timer != null) return;
      void poll();
      timer = window.setInterval(() => {
        void poll();
      }, REVISION_POLL_MS);
    };

    const stopPolling = () => {
      if (timer == null) return;
      window.clearInterval(timer);
      timer = null;
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
        return;
      }
      void poll();
      startPolling();
    };

    if (!document.hidden) {
      startPolling();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, queryClient]);
}
