import { createMarketplaceHttpClient } from '@/marketplace-api/client';

export interface MarketplaceSyncRevisionResponse {
  readonly poolSyncRevision: string | null;
  readonly polledAt: string;
}

export interface TenantSyncRevisionResponse extends MarketplaceSyncRevisionResponse {
  readonly slug: string;
  readonly tenantSyncRevision: string | null;
}

export async function fetchMarketplacePoolRevision(): Promise<MarketplaceSyncRevisionResponse> {
  const client = createMarketplaceHttpClient();
  return client.request<MarketplaceSyncRevisionResponse>({
    path: '/api/marketplace/sync/revision',
  });
}

export async function fetchTenantSyncRevision(slug: string): Promise<TenantSyncRevisionResponse> {
  const client = createMarketplaceHttpClient();
  return client.request<TenantSyncRevisionResponse>({
    path: `/api/marketplace/sync/revision/${encodeURIComponent(slug)}`,
  });
}
