import type { SearchResultItem } from '@/types/marketplace-search';

const cachedMenuItems = new Map<string, SearchResultItem>();

function cacheKey(item: SearchResultItem): string {
  return item.id;
}

export function mergeMenuItemsIntoSearchCache(items: readonly SearchResultItem[]): void {
  for (const item of items) {
    if (item.type !== 'food') continue;
    cachedMenuItems.set(cacheKey(item), item);
  }
}

export function getCachedMenuItemsForSearch(): readonly SearchResultItem[] {
  return [...cachedMenuItems.values()];
}

export function resetSearchMenuCacheForTests(): void {
  cachedMenuItems.clear();
}
