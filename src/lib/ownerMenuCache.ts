import { RepositoryCache } from './cache/RepositoryCache';
import { fetchOwnerMenuItems } from './ownerMenuApi';
import type { MenuItem } from '../types';

export interface OwnerMenuCachePayload {
  items: MenuItem[];
}

const OWNER_MENU_CACHE_TTL_MS = 15_000;
const OWNER_MENU_CACHE_STALE_MS = 30_000;

export const ownerMenuRepositoryCache = new RepositoryCache<OwnerMenuCachePayload>({
  ttlMs: OWNER_MENU_CACHE_TTL_MS,
  staleWhileRevalidateMs: OWNER_MENU_CACHE_STALE_MS,
});

export async function fetchOwnerMenuItemsCached(tenantId: string): Promise<OwnerMenuCachePayload> {
  return ownerMenuRepositoryCache.getOrFetch(`owner-menu:${tenantId}`, async () => {
    const response = await fetchOwnerMenuItems(tenantId);
    return { items: response.items ?? [] };
  });
}

export function invalidateOwnerMenuCache(tenantId: string): void {
  ownerMenuRepositoryCache.delete(`owner-menu:${tenantId}`);
}
