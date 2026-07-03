/**
 * M3 PR-8 — Marketplace home hook (session-driven, no duplicate discovery queries).
 */

import { useCallback, useEffect, useState } from 'react';
import { isSdkSuccess } from '../sdk/core/resultHelpers';
import { readCustomerLocationSession } from '../lib/customerLocation/CustomerLocationFacade';
import { getDiscoverySessionSnapshot } from '../lib/discovery/DiscoverySession';
import { isDiscoveryMarketplaceEnabled } from '../lib/discovery/discoveryFeatureFlags';
import {
  detectMarketplaceLocation,
  getMarketplaceHomeViewModel,
  loadMarketplaceHome,
  retryMarketplaceHome,
  saveMarketplaceManualLocation,
  subscribeDiscoverySession,
} from '../lib/marketplace/MarketplaceHomeFacade';
import type { MarketplaceHomeViewModel } from '../lib/marketplace/types';

export function useMarketplaceHome() {
  const [view, setView] = useState<MarketplaceHomeViewModel>(() => getMarketplaceHomeViewModel());
  const marketplaceEnabled = isDiscoveryMarketplaceEnabled();

  useEffect(() => {
    if (!marketplaceEnabled) {
      setView({ status: 'disabled', kitchens: [] });
      return;
    }

    const sync = () => setView(getMarketplaceHomeViewModel());
    sync();
    return subscribeDiscoverySession(sync);
  }, [marketplaceEnabled]);

  const refresh = useCallback(async () => {
    const outcome = await loadMarketplaceHome();
    setView(outcome.view);
    return outcome;
  }, []);

  const retry = useCallback(async () => {
    const outcome = await retryMarketplaceHome();
    setView(outcome.view);
    return outcome;
  }, []);

  const detectLocation = useCallback(async () => {
    const result = await detectMarketplaceLocation({ enableHighAccuracy: true, timeoutMs: 12_000 });
    if (!isSdkSuccess(result)) {
      setView((current) => ({
        ...current,
        status: result.error.code === 'FORBIDDEN' ? 'location_denied' : 'location_unavailable',
        error: {
          code: result.error.code,
          message: result.error.message,
          userMessage:
            result.error.code === 'FORBIDDEN'
              ? 'Location permission was denied.'
              : 'Could not detect your location.',
          retryable: result.error.code === 'UNAVAILABLE',
        },
        retryable: result.error.code === 'UNAVAILABLE',
      }));
      return result;
    }

    const outcome = await loadMarketplaceHome();
    setView(outcome.view);
    return result;
  }, []);

  useEffect(() => {
    if (!marketplaceEnabled) {
      return;
    }

    const location = readCustomerLocationSession();
    const snapshot = getDiscoverySessionSnapshot();
    if (location && snapshot.status === 'idle') {
      void refresh();
    }
  }, [marketplaceEnabled, refresh]);

  const setManualLocation = useCallback(async (address: string) => {
    const result = await saveMarketplaceManualLocation(address);
    if (!isSdkSuccess(result)) {
      setView((current) => ({
        ...current,
        status: 'location_unavailable',
        error: {
          code: result.error.code,
          message: result.error.message,
          userMessage: 'Could not find that address. Try a more specific search.',
          retryable: true,
        },
        retryable: true,
      }));
      return result;
    }

    const outcome = await loadMarketplaceHome();
    setView(outcome.view);
    return result;
  }, []);

  return {
    view,
    marketplaceEnabled,
    refresh,
    retry,
    detectLocation,
    setManualLocation,
  };
}
