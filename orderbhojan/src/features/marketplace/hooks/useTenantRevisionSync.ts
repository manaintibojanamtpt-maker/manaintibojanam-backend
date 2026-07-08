import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isLiveStorefrontSyncEnabled } from '@/config/marketplaceQueryPolicy';
import { fetchTenantSyncRevision } from '../infrastructure/marketplaceSyncClient';
import { restaurantKeys } from '@/features/restaurant/hooks/restaurantQueryKeys';
import { foodKeys } from '@/features/food/hooks/foodQueryKeys';

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
    lastRevision.current = null;

    const poll = async () => {
      try {
        const payload = await fetchTenantSyncRevision(slug);
        const revision = payload.tenantSyncRevision;
        if (!revision || cancelled) return;
        if (lastRevision.current && lastRevision.current !== revision) {
          await queryClient.invalidateQueries({
            predicate: (query) => queryKeyIncludesSlug(query.queryKey, slug),
          });
          await queryClient.invalidateQueries({ queryKey: restaurantKeys.all });
          await queryClient.invalidateQueries({ queryKey: foodKeys.all });
        }
        lastRevision.current = revision;
      } catch {
        // Restaurant page still refetches on focus and pool revision sync.
      }
    };

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, TENANT_REVISION_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled, slug, queryClient]);
}
