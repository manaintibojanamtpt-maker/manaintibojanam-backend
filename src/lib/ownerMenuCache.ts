import { RepositoryCache } from './cache/RepositoryCache';
import { fetchOwnerMenuItems } from './ownerMenuApi';
import type { MenuItem } from '../types';
import { readOwnerSessionJson, writeOwnerSessionJson } from './ownerSessionStore';

export interface OwnerMenuCachePayload {
  items: MenuItem[];
}

const OWNER_MENU_CACHE_TTL_MS = 60_000;
const OWNER_MENU_CACHE_STALE_MS = 15 * 60_000;
const SESSION_KEY = (tenantId: string) => `menu:${tenantId}`;

export const ownerMenuRepositoryCache = new RepositoryCache<OwnerMenuCachePayload>({
  ttlMs: OWNER_MENU_CACHE_TTL_MS,
  staleWhileRevalidateMs: OWNER_MENU_CACHE_STALE_MS,
  maxStaleMs: 60 * 60_000,
});

function memoryKey(tenantId: string): string {
  return `owner-menu:${tenantId}`;
}

/** Synchronous peek for instant Menu Builder paint. */
export function peekOwnerMenuCache(tenantId: string): OwnerMenuCachePayload | null {
  const mem = ownerMenuRepositoryCache.get(memoryKey(tenantId));
  if (mem) return mem.value;

  const fromSession = readOwnerSessionJson<OwnerMenuCachePayload>(SESSION_KEY(tenantId));
  if (fromSession?.items) {
    ownerMenuRepositoryCache.set(memoryKey(tenantId), fromSession);
    return fromSession;
  }
  return null;
}

export function seedOwnerMenuCache(tenantId: string, items: MenuItem[]): void {
  const payload = { items };
  ownerMenuRepositoryCache.set(memoryKey(tenantId), payload);
  writeOwnerSessionJson(SESSION_KEY(tenantId), payload);
}

export async function fetchOwnerMenuItemsCached(
  tenantId: string,
  onRevalidate?: (payload: OwnerMenuCachePayload) => void,
): Promise<OwnerMenuCachePayload> {
  return ownerMenuRepositoryCache.getOrFetch(
    memoryKey(tenantId),
    async () => {
      const response = await fetchOwnerMenuItems(tenantId);
      const payload = { items: response.items ?? [] };
      writeOwnerSessionJson(SESSION_KEY(tenantId), payload);
      return payload;
    },
    (payload) => {
      writeOwnerSessionJson(SESSION_KEY(tenantId), payload);
      onRevalidate?.(payload);
    },
  );
}

export function invalidateOwnerMenuCache(tenantId: string): void {
  ownerMenuRepositoryCache.delete(memoryKey(tenantId));
}
