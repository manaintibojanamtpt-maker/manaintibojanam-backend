import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveLocation } from '@/features/location';
import { withSearchClientTimeout } from '../engine/searchClientTimeout';
import { executeMenuItemSearch, resolveSearchCoords } from '../engine/searchPlatform';
import { mergeMenuItemsIntoSearchCache } from '../store/searchMenuCacheStore';
import { searchKeys } from './searchQueryKeys';
import { useSearchFeatureEnabled } from './useSearchFeature';

/**
 * Best-effort warm cache after browse has loaded search context on the server.
 * Uses a short prefix query so autocomplete can filter instantly on first keystroke.
 */
export function useSearchMenuCacheBootstrap() {
  const enabled = useSearchFeatureEnabled();
  const activeLocation = useActiveLocation();
  const coords = resolveSearchCoords(activeLocation);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !coords) return;
    if (queryClient.getQueryData(searchKeys.browse(coords.lat, coords.lng)) == null) return;

    let cancelled = false;

    void withSearchClientTimeout(
      executeMenuItemSearch({
        q: 'a',
        lat: coords.lat,
        lng: coords.lng,
        limit: 40,
      }),
    )
      .then((response) => {
        if (!cancelled) mergeMenuItemsIntoSearchCache(response.items);
      })
      .catch(() => {
        // Browse chips + live search still work without warm cache.
      });

    return () => {
      cancelled = true;
    };
  }, [coords?.lat, coords?.lng, enabled, queryClient]);
}
