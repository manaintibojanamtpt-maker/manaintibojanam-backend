import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isLiveStorefrontSyncEnabled } from '@/config/marketplaceQueryPolicy';
import { clearFoodSessionCacheForSlug } from '@/features/food/engine/foodSessionCache';
import { fetchTenantSyncRevision } from '../infrastructure/marketplaceSyncClient';
import { restaurantKeys } from '@/features/restaurant/hooks/restaurantQueryKeys';
import { foodKeys } from '@/features/food/hooks/foodQueryKeys';
import { isNativePlatform } from '@/lib/nativePlatform';

const TENANT_REVISION_POLL_MS = 15_000;

function queryKeyIncludesSlug(queryKey: readonly unknown[], slug: string): boolean {
  return queryKey.includes(slug);
}

export function useTenantRevisionSync(slug: string | undefined, enabled = isLiveStorefrontSyncEnabled()): void {
  const queryClient = useQueryClient();
  const lastRevision = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !slug) return;

    let cancelled = false;
    let removeAppListener: (() => void) | undefined;
    const native = isNativePlatform();
    lastRevision.current = null;

    const poll = async () => {
      if (cancelled) return;
      if (!native && document.hidden) return;
      try {
        const payload = await fetchTenantSyncRevision(slug);
        const revision = payload.tenantSyncRevision;
        if (!revision || cancelled) return;
        if (lastRevision.current && lastRevision.current !== revision) {
          clearFoodSessionCacheForSlug(slug);
          await queryClient.invalidateQueries({
            predicate: (query) => queryKeyIncludesSlug(query.queryKey, slug),
          });
          await queryClient.invalidateQueries({ queryKey: restaurantKeys.all });
          await queryClient.invalidateQueries({ queryKey: foodKeys.all });
        }
        lastRevision.current = revision;
      } catch {
        // Restaurant page still refetches on focus/resume and pool revision sync.
      }
    };

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, TENANT_REVISION_POLL_MS);

    if (native) {
      void (async () => {
        const { App } = await import('@capacitor/app');
        const handle = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) void poll();
        });
        removeAppListener = () => void handle.remove();
      })();
    }

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      removeAppListener?.();
    };
  }, [enabled, slug, queryClient]);
}
