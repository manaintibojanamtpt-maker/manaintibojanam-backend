import { isFeatureEnabled, loadFeatureFlags } from '@/featureFlags';

/** Mock/MSW mode — keep responses warm for dev UX. */
export const MARKETPLACE_MOCK_STALE_TIME_MS = 60_000;
export const MARKETPLACE_MOCK_GC_TIME_MS = 10 * 60_000;

/**
 * Live Firestore storefront sync — owner edits must reach customers quickly.
 * staleTime 0 + interval polling + focus/reconnect refetch.
 */
export const MARKETPLACE_LIVE_STALE_TIME_MS = 30_000;
export const MARKETPLACE_LIVE_GC_TIME_MS = 2 * 60_000;
export const MARKETPLACE_LIVE_REFETCH_INTERVAL_MS = 5_000;

export function isLiveStorefrontSyncEnabled(): boolean {
  return isFeatureEnabled(loadFeatureFlags(), 'FF_OB_FIRESTORE');
}

export interface MarketplaceQueryBehavior {
  readonly staleTime: number;
  readonly gcTime: number;
  readonly refetchOnWindowFocus: boolean;
  readonly refetchOnReconnect: boolean;
  readonly refetchInterval: number | false;
  readonly refetchIntervalInBackground: boolean;
}

export function getMarketplaceQueryBehavior(): MarketplaceQueryBehavior {
  if (!isLiveStorefrontSyncEnabled()) {
    return {
      staleTime: MARKETPLACE_MOCK_STALE_TIME_MS,
      gcTime: MARKETPLACE_MOCK_GC_TIME_MS,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      refetchIntervalInBackground: false,
    };
  }

  return {
    staleTime: MARKETPLACE_LIVE_STALE_TIME_MS,
    gcTime: MARKETPLACE_LIVE_GC_TIME_MS,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: false,
    refetchIntervalInBackground: false,
  };
}

export function shouldBypassMarketplaceHttpCache(): boolean {
  return isLiveStorefrontSyncEnabled();
}
