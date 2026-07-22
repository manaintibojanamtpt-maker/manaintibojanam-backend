import { RepositoryCache } from './cache/RepositoryCache';
import { fetchOwnerOrdersFromApi } from './ownerOrdersApi';
import type { ApiOrderRecord } from '../sdk/orders/mappers/mapOrderToReadModel';
import {
  apiRecordToOwnerOrder,
  sortOwnerOrdersNewestFirst,
  type OwnerOrderSnapshot,
} from './ownerOrderReadModelMapper';
import { readOwnerSessionJson, writeOwnerSessionJson } from './ownerSessionStore';

export interface OwnerOrdersCachePayload {
  orders: OwnerOrderSnapshot[];
  hasMore: boolean;
  limit: number;
}

const MEMORY_TTL_MS = 20_000;
const MEMORY_STALE_MS = 5 * 60_000;
const SESSION_KEY = (tenantId: string, limit: number) => `orders:${tenantId}:${limit}`;

export const ownerOrdersRepositoryCache = new RepositoryCache<OwnerOrdersCachePayload>({
  ttlMs: MEMORY_TTL_MS,
  staleWhileRevalidateMs: MEMORY_STALE_MS,
  maxStaleMs: 30 * 60_000,
});

function memoryKey(tenantId: string, limit: number): string {
  return `owner-orders:${tenantId}:${limit}`;
}

/** Synchronous peek for instant UI (memory → session). */
export function peekOwnerOrdersCache(
  tenantId: string,
  limit: number,
): OwnerOrdersCachePayload | null {
  const mem = ownerOrdersRepositoryCache.get(memoryKey(tenantId, limit));
  if (mem) return mem.value;

  const fromSession = readOwnerSessionJson<OwnerOrdersCachePayload>(SESSION_KEY(tenantId, limit));
  if (fromSession?.orders) {
    ownerOrdersRepositoryCache.set(memoryKey(tenantId, limit), fromSession);
    return fromSession;
  }

  // Prefer a smaller cached window if exact limit miss (dashboard seeds 40).
  if (limit > 40) {
    const smallerMem = ownerOrdersRepositoryCache.get(memoryKey(tenantId, 40));
    if (smallerMem) return smallerMem.value;
    const smallerSession = readOwnerSessionJson<OwnerOrdersCachePayload>(SESSION_KEY(tenantId, 40));
    if (smallerSession?.orders) {
      ownerOrdersRepositoryCache.set(memoryKey(tenantId, 40), smallerSession);
      return smallerSession;
    }
  }

  return null;
}

export function seedOwnerOrdersCache(
  tenantId: string,
  orders: OwnerOrderSnapshot[],
  options?: { limit?: number; hasMore?: boolean },
): void {
  const limit = options?.limit ?? Math.max(orders.length, 40);
  const payload: OwnerOrdersCachePayload = {
    orders,
    hasMore: options?.hasMore ?? false,
    limit,
  };
  ownerOrdersRepositoryCache.set(memoryKey(tenantId, limit), payload);
  writeOwnerSessionJson(SESSION_KEY(tenantId, limit), payload);
}

export async function fetchOwnerOrdersListCached(
  tenantId: string,
  limit = 50,
  onRevalidate?: (payload: OwnerOrdersCachePayload) => void,
): Promise<OwnerOrdersCachePayload> {
  return ownerOrdersRepositoryCache.getOrFetch(
    memoryKey(tenantId, limit),
    async () => {
      const response = await fetchOwnerOrdersFromApi(tenantId, limit);
      const orders = sortOwnerOrdersNewestFirst(
        ((response.orders ?? []) as ApiOrderRecord[])
          .filter((record) => String(record.tenantId ?? '') === tenantId)
          .map(apiRecordToOwnerOrder),
      );
      const payload: OwnerOrdersCachePayload = {
        orders,
        hasMore: response.hasMore === true,
        limit,
      };
      writeOwnerSessionJson(SESSION_KEY(tenantId, limit), payload);
      return payload;
    },
    (payload) => {
      writeOwnerSessionJson(SESSION_KEY(tenantId, limit), payload);
      onRevalidate?.(payload);
    },
  );
}

export function invalidateOwnerOrdersCache(tenantId: string): void {
  for (const limit of [40, 50, 100, 150]) {
    ownerOrdersRepositoryCache.delete(memoryKey(tenantId, limit));
  }
}
