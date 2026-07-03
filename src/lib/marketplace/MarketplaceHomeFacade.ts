/**
 * M3 PR-8 — Marketplace home facade.
 * Presentation → DiscoveryFacade only. No Firestore or SDK direct access from UI.
 */

import type { SdkAsyncResult } from '../../sdk/core/result';
import { isSdkSuccess, sdkError, sdkFail } from '../../sdk/core/resultHelpers';
import type { GeolocationOptions } from '../../sdk/location/dto/geo';
import type { GeoTimestamp } from '../../sdk/location/types/branded';
import {
  createCustomerLocationServices,
  detectCustomerLocation,
  readCustomerLocationSession,
  writeCustomerLocationSession,
  type CustomerCanonicalLocation,
  type CustomerLocationServices,
} from '../customerLocation/CustomerLocationFacade';
import { mapGeocodedToCustomerCanonical } from '../customerLocation/mapGeocodedToCustomerCanonical';
import {
  discoverNearbyKitchens,
  retryDiscovery,
  type DiscoveryFacadeDeps,
} from '../discovery/DiscoveryFacade';
import {
  getDiscoverySessionSnapshot,
  subscribeDiscoverySession,
} from '../discovery/DiscoverySession';
import { isDiscoveryEnabled, isDiscoveryMarketplaceEnabled } from '../discovery/discoveryFeatureFlags';
import type { DiscoveryFacadeQuery } from '../discovery/types';
import { mapDiscoveryResultToKitchens } from './mapDiscoveryToMarketplace';
import type {
  MarketplaceHomeOutcome,
  MarketplaceHomeViewModel,
  MarketplaceHomeStatus,
} from './types';

export interface MarketplaceHomeFacadeDeps {
  readonly isMarketplaceEnabled?: () => boolean;
  readonly isDiscoveryEnabled?: () => boolean;
  readonly readCustomerLocation?: () => CustomerCanonicalLocation | null;
  readonly discoveryDeps?: DiscoveryFacadeDeps;
}

const DEFAULT_DISCOVERY_QUERY: DiscoveryFacadeQuery = {
  radiusKm: 10,
  limit: 24,
};

export function createMarketplaceHomeFacadeDeps(
  overrides: MarketplaceHomeFacadeDeps = {}
): Required<
  Pick<MarketplaceHomeFacadeDeps, 'isMarketplaceEnabled' | 'isDiscoveryEnabled' | 'readCustomerLocation'>
> &
  MarketplaceHomeFacadeDeps {
  return {
    isMarketplaceEnabled: overrides.isMarketplaceEnabled ?? isDiscoveryMarketplaceEnabled,
    isDiscoveryEnabled: overrides.isDiscoveryEnabled ?? isDiscoveryEnabled,
    readCustomerLocation: overrides.readCustomerLocation ?? readCustomerLocationSession,
    discoveryDeps: overrides.discoveryDeps,
  };
}

const viewFromSession = (): MarketplaceHomeViewModel => {
  const session = getDiscoverySessionSnapshot();
  const location = readCustomerLocationSession();

  if (session.status === 'loading') {
    return {
      status: 'loading',
      locationLabel: location?.formattedAddress,
      kitchens: [],
    };
  }

  if (session.status === 'success' && session.lastResult) {
    const kitchens = mapDiscoveryResultToKitchens(session.lastResult);
    return {
      status: kitchens.length > 0 ? 'success' : 'empty',
      locationLabel: location?.formattedAddress,
      kitchens,
      totalCandidates: session.lastResult.totalCandidates,
    };
  }

  if (session.status === 'error' && session.lastError) {
    return {
      status: mapDiscoveryErrorStatus(session.lastError.code),
      locationLabel: location?.formattedAddress,
      kitchens: [],
      error: session.lastError,
      retryable: session.lastError.retryable,
    };
  }

  if (session.status === 'disabled') {
    return {
      status: 'disabled',
      kitchens: [],
    };
  }

  return {
    status: location ? 'idle' : 'location_required',
    locationLabel: location?.formattedAddress,
    kitchens: [],
  };
};

const mapDiscoveryErrorStatus = (code: string): MarketplaceHomeStatus => {
  if (code === 'FORBIDDEN') {
    return 'location_denied';
  }
  if (code === 'UNAVAILABLE') {
    return 'location_unavailable';
  }
  return 'error';
};

export function getMarketplaceHomeViewModel(): MarketplaceHomeViewModel {
  if (!isDiscoveryMarketplaceEnabled()) {
    return { status: 'disabled', kitchens: [] };
  }
  return viewFromSession();
}

export { subscribeDiscoverySession };

export async function loadMarketplaceHome(
  query: DiscoveryFacadeQuery = DEFAULT_DISCOVERY_QUERY,
  deps: MarketplaceHomeFacadeDeps = {}
): Promise<MarketplaceHomeOutcome> {
  const resolved = createMarketplaceHomeFacadeDeps(deps);

  if (!resolved.isMarketplaceEnabled()) {
    return {
      ok: true,
      view: { status: 'disabled', kitchens: [] },
    };
  }

  const location = resolved.readCustomerLocation();
  if (!location) {
    return {
      ok: true,
      view: { status: 'location_required', kitchens: [] },
    };
  }

  if (!resolved.isDiscoveryEnabled()) {
    return {
      ok: true,
      view: {
        status: 'disabled',
        locationLabel: location.formattedAddress,
        kitchens: [],
        error: {
          code: 'NOT_CONFIGURED',
          message: 'Discovery is not enabled',
          userMessage: 'Marketplace discovery is not available yet.',
          retryable: false,
        },
      },
    };
  }

  const outcome = await discoverNearbyKitchens(query, {
    ...resolved.discoveryDeps,
    readCustomerLocation: () => location,
    isEnabled: resolved.isDiscoveryEnabled,
  });

  if (outcome.ok === false) {
    const { error } = outcome;
    return {
      ok: false,
      view: {
        status: mapDiscoveryErrorStatus(error.code),
        locationLabel: location.formattedAddress,
        kitchens: [],
        error,
        retryable: error.retryable,
      },
    };
  }

  const kitchens = mapDiscoveryResultToKitchens(outcome.result);
  return {
    ok: true,
    view: {
      status: kitchens.length > 0 ? 'success' : 'empty',
      locationLabel: location.formattedAddress,
      kitchens,
      totalCandidates: outcome.result.totalCandidates,
    },
  };
}

export async function retryMarketplaceHome(
  deps: MarketplaceHomeFacadeDeps = {}
): Promise<MarketplaceHomeOutcome> {
  const resolved = createMarketplaceHomeFacadeDeps(deps);

  if (!resolved.isMarketplaceEnabled() || !resolved.isDiscoveryEnabled()) {
    return loadMarketplaceHome(DEFAULT_DISCOVERY_QUERY, deps);
  }

  const location = resolved.readCustomerLocation();
  const outcome = await retryDiscovery({
    ...resolved.discoveryDeps,
    readCustomerLocation: () => location,
    isEnabled: resolved.isDiscoveryEnabled,
  });

  if (outcome.ok === false) {
    const { error } = outcome;
    return {
      ok: false,
      view: {
        status: mapDiscoveryErrorStatus(error.code),
        locationLabel: location?.formattedAddress,
        kitchens: [],
        error,
        retryable: error.retryable,
      },
    };
  }

  const kitchens = mapDiscoveryResultToKitchens(outcome.result);
  return {
    ok: true,
    view: {
      status: kitchens.length > 0 ? 'success' : 'empty',
      locationLabel: location?.formattedAddress,
      kitchens,
      totalCandidates: outcome.result.totalCandidates,
    },
  };
}

export async function detectMarketplaceLocation(
  options?: GeolocationOptions
): SdkAsyncResult<CustomerCanonicalLocation> {
  return detectCustomerLocation(options);
}

export async function saveMarketplaceManualLocation(
  addressQuery: string,
  services: CustomerLocationServices = createCustomerLocationServices()
): SdkAsyncResult<CustomerCanonicalLocation> {
  const trimmed = addressQuery.trim();
  if (!trimmed) {
    return sdkFail(sdkError('VALIDATION', 'Address is required'));
  }

  const geocoded = await services.location.forwardGeocode({ query: trimmed });
  if (!isSdkSuccess(geocoded)) {
    return geocoded;
  }

  if (!geocoded.value.geohash?.trim()) {
    return sdkFail(sdkError('VALIDATION', 'Could not compute geohash for that address'));
  }

  const canonical = mapGeocodedToCustomerCanonical(
    {
      lat: geocoded.value.point.lat,
      lng: geocoded.value.point.lng,
      accuracyM: 100,
      timestamp: Date.now() as unknown as GeoTimestamp,
    },
    geocoded.value
  );

  writeCustomerLocationSession(canonical);
  return { ok: true, value: canonical };
}
