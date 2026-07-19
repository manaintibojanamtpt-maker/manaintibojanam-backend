import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isLiveStorefrontSyncEnabled } from '@/config/marketplaceQueryPolicy';
import { fetchMarketplacePoolRevision } from '../infrastructure/marketplaceSyncClient';
import { discoveryKeys } from '@/features/discovery/hooks/discoveryQueryKeys';
import { restaurantKeys } from '@/features/restaurant/hooks/restaurantQueryKeys';
import { foodKeys } from '@/features/food/hooks/foodQueryKeys';
import { searchKeys } from '@/features/search/hooks/searchQueryKeys';
import { isNativePlatform } from '@/lib/nativePlatform';

const REVISION_POLL_MS = 15_000;

export function useMarketplaceRevisionSync(enabled = isLiveStorefrontSyncEnabled()): void {
  const queryClient = useQueryClient();
  const lastRevision = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer: number | null = null;
    let removeAppListener: (() => void) | undefined;
    const native = isNativePlatform();

    const invalidateAll = async () => {
      await queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
      await queryClient.invalidateQueries({ queryKey: restaurantKeys.all });
      await queryClient.invalidateQueries({ queryKey: foodKeys.all });
      await queryClient.invalidateQueries({ queryKey: searchKeys.all });
    };

    const poll = async () => {
      if (cancelled) return;
      if (!native && document.hidden) return;
      try {
        const payload = await fetchMarketplacePoolRevision();
        const revision = payload.poolSyncRevision;
        if (!revision || cancelled) return;
        if (lastRevision.current && lastRevision.current !== revision) {
          await invalidateAll();
        }
        lastRevision.current = revision;
      } catch {
        // Keep last known revision; query hooks still refetch on focus/resume.
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
      if (native) return;
      if (document.hidden) {
        stopPolling();
        return;
      }
      void poll();
      startPolling();
    };

    if (native) {
      startPolling();
      void (async () => {
        const { App } = await import('@capacitor/app');
        const handle = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            void poll();
            startPolling();
            return;
          }
          stopPolling();
        });
        removeAppListener = () => void handle.remove();
      })();
    } else if (!document.hidden) {
      startPolling();
    }

    if (!native) {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    return () => {
      cancelled = true;
      stopPolling();
      removeAppListener?.();
      if (!native) {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
  }, [enabled, queryClient]);
}
