import { useEffect } from 'react';
import type { SearchTermChip } from '@/types/marketplace-search';
import { mergeMenuItemsIntoSearchCache } from '../store/searchMenuCacheStore';
import { useSearchBrowse } from './useSearchBrowse';

function chipsToMenuCacheItems(chips: readonly SearchTermChip[]) {
  return chips.map((chip) => ({
    id: `browse_${chip.id}`,
    type: 'food' as const,
    label: chip.label,
  }));
}

/** Seed in-memory menu cache from browse trending/popular chips for instant autocomplete. */
export function useSearchMenuCacheFromBrowse() {
  const browse = useSearchBrowse();

  useEffect(() => {
    const trending = browse.data?.trending.trending ?? [];
    const popular = browse.data?.trending.popular ?? [];
    if (trending.length === 0 && popular.length === 0) return;
    mergeMenuItemsIntoSearchCache(chipsToMenuCacheItems([...trending, ...popular]));
  }, [browse.data?.trending.popular, browse.data?.trending.trending]);
}
