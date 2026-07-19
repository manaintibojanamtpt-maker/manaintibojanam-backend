import { RepositoryCache } from './cache/RepositoryCache';
import { ownerApiRequest } from './ownerProvisioning';
import type { OwnerStorefrontResponse } from './ownerStorefrontApi';

const OWNER_STOREFRONT_CACHE_TTL_MS = 30_000;
const OWNER_STOREFRONT_CACHE_STALE_MS = 60_000;

export const ownerStorefrontRepositoryCache = new RepositoryCache<OwnerStorefrontResponse>({
  ttlMs: OWNER_STOREFRONT_CACHE_TTL_MS,
  staleWhileRevalidateMs: OWNER_STOREFRONT_CACHE_STALE_MS,
});

async function fetchOwnerStorefrontUncached(tenantId: string): Promise<OwnerStorefrontResponse> {
  return ownerApiRequest<OwnerStorefrontResponse>('GET', `/api/owner/storefront/${tenantId}`);
}

export async function fetchOwnerStorefrontCached(tenantId: string): Promise<OwnerStorefrontResponse> {
  return ownerStorefrontRepositoryCache.getOrFetch(`owner-storefront:${tenantId}`, () =>
    fetchOwnerStorefrontUncached(tenantId),
  );
}

export function invalidateOwnerStorefrontCache(tenantId: string): void {
  ownerStorefrontRepositoryCache.delete(`owner-storefront:${tenantId}`);
}
