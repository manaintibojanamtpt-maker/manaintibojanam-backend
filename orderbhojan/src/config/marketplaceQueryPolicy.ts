import { isFeatureEnabled, loadFeatureFlags } from '@/featureFlags';
import { isNativePlatform } from '@/lib/nativePlatform';

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
/** @deprecated Native now uses live sync timings; kept for tests/docs. */
export const MARKETPLACE_NATIVE_STALE_TIME_MS = MARKETPLACE_LIVE_STALE_TIME_MS;

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

  const native = isNativePlatform();

  return {
    staleTime: MARKETPLACE_LIVE_STALE_TIME_MS,
    gcTime: MARKETPLACE_LIVE_GC_TIME_MS,
    // Native relies on revision polling + resume poll — avoid 5s interval churn in WebView.
    refetchOnWindowFocus: !native,
    refetchOnReconnect: !native,
    refetchInterval: native ? false : MARKETPLACE_LIVE_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
  };
}

export function getSearchQueryBehavior(): MarketplaceQueryBehavior {
  const base = getMarketplaceQueryBehavior();
  return {
    ...base,
    // Search is user-driven; polling every 5s keeps autocomplete stuck on "Loading…".
    refetchInterval: false,
    refetchIntervalInBackground: false,
    staleTime: MARKETPLACE_LIVE_STALE_TIME_MS,
  };
}

export function shouldBypassMarketplaceHttpCache(): boolean {
  return isLiveStorefrontSyncEnabled();
}
