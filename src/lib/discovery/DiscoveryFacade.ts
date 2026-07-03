/**
 * M3 PR-2 — Discovery presentation facade (ADR-011).
 * Presentation MUST use this module — not DiscoverySDK, Firestore, or LocationSDK directly.
 */

import { createDiscoverySDK } from '../../sdk/discovery/createDiscoverySDK';
import type { DiscoverySDK } from '../../sdk/discovery/contracts/DiscoverySDK';
import type { SdkError } from '../../sdk/core/errors';
import { isSdkSuccess } from '../../sdk/core/resultHelpers';
import { readCustomerLocationSession } from '../customerLocation/CustomerLocationFacade';
import type { CustomerCanonicalLocation } from '../customerLocation/types';
import { buildDiscoveryQuery } from './DiscoveryContext';
import {
  isDiscoveryEnabled,
  isDiscoveryRankingEnabled,
  resolveDiscoveryProviderKind,
} from './discoveryFeatureFlags';
import {
  getDiscoverySessionSnapshot,
  getLastDiscoveryQuery,
  markDiscoveryDisabled,
  markDiscoveryError,
  markDiscoveryLoading,
  markDiscoverySuccess,
  resetDiscoverySession,
  subscribeDiscoverySession,
} from './DiscoverySession';
import type {
  DiscoveryFacadeOutcome,
  DiscoveryFacadeQuery,
  DiscoveryPresentationError,
  DiscoverySessionSnapshot,
} from './types';

export interface DiscoveryFacadeDeps {
  readonly sdk?: DiscoverySDK;
  readonly readCustomerLocation?: () => CustomerCanonicalLocation | null;
  readonly isEnabled?: () => boolean;
  readonly isRankingEnabled?: () => boolean;
}

const DEFAULT_MAX_RETRIES = 3;

const createDefaultDiscoverySdk = () => {
  const providerKind = resolveDiscoveryProviderKind();
  if (providerKind === 'tenant-scan') {
    const { createLibFirestoreTenantReadPort } =
      require('./firestoreTenantReadPort') as typeof import('./firestoreTenantReadPort');
    return createDiscoverySDK({
      providerKind,
      firestoreTenantReadPort: createLibFirestoreTenantReadPort(),
    });
  }
  return createDiscoverySDK({ providerKind: 'stub' });
};

export function createDiscoveryFacadeDeps(
  overrides: DiscoveryFacadeDeps = {}
): Required<DiscoveryFacadeDeps> {
  return {
    sdk: overrides.sdk ?? createDefaultDiscoverySdk(),
    readCustomerLocation: overrides.readCustomerLocation ?? readCustomerLocationSession,
    isEnabled: overrides.isEnabled ?? isDiscoveryEnabled,
    isRankingEnabled: overrides.isRankingEnabled ?? isDiscoveryRankingEnabled,
  };
}

export function normalizeDiscoveryError(error: SdkError): DiscoveryPresentationError {
  const retryable =
    error.code === 'UNAVAILABLE' ||
    error.code === 'RATE_LIMITED' ||
    Boolean(error.details?.retryable);

  const userMessage = (() => {
    switch (error.code) {
      case 'NOT_CONFIGURED':
        return 'Nearby kitchen discovery is not available yet.';
      case 'VALIDATION':
        return error.message || 'Please set your delivery location first.';
      case 'FORBIDDEN':
        return 'Discovery is not permitted for this request.';
      case 'NOT_FOUND':
        return 'No kitchens found near your location.';
      case 'RATE_LIMITED':
        return 'Too many requests. Please try again shortly.';
      case 'UNAVAILABLE':
        return 'Discovery is temporarily unavailable. Please try again.';
      default:
        return error.message || 'Could not load nearby kitchens.';
    }
  })();

  return {
    code: error.code,
    message: error.message,
    userMessage,
    retryable,
  };
}

export function discoveryFeatureDisabledError(): DiscoveryPresentationError {
  return {
    code: 'NOT_CONFIGURED',
    message: 'FF_DISCOVERY_ENABLED is off',
    userMessage: 'Nearby kitchen discovery is not enabled.',
    retryable: false,
    featureDisabled: true,
  };
}

export async function discoverNearbyKitchens(
  query: DiscoveryFacadeQuery,
  deps: DiscoveryFacadeDeps = {}
): Promise<DiscoveryFacadeOutcome> {
  const resolved = createDiscoveryFacadeDeps(deps);

  if (!resolved.isEnabled()) {
    markDiscoveryDisabled();
    return { ok: false, error: discoveryFeatureDisabledError() };
  }

  markDiscoveryLoading(query);

  const customerLocation = resolved.readCustomerLocation();
  const built = buildDiscoveryQuery({
    facadeQuery: query,
    customerLocation,
    rankingEnabled: resolved.isRankingEnabled(),
  });
  if (!isSdkSuccess(built)) {
    const error = normalizeDiscoveryError(built.error);
    markDiscoveryError(error);
    return { ok: false, error };
  }

  const sdkResult = await resolved.sdk.discoverNearby(built.value.query);
  if (!isSdkSuccess(sdkResult)) {
    const error = normalizeDiscoveryError(sdkResult.error);
    markDiscoveryError(error);
    return { ok: false, error };
  }

  markDiscoverySuccess(sdkResult.value);
  return { ok: true, result: sdkResult.value };
}

export async function retryDiscovery(
  deps: DiscoveryFacadeDeps = {}
): Promise<DiscoveryFacadeOutcome> {
  const lastQuery = getLastDiscoveryQuery();
  if (!lastQuery) {
    const error: DiscoveryPresentationError = {
      code: 'VALIDATION',
      message: 'No prior discovery query to retry',
      userMessage: 'Nothing to retry yet.',
      retryable: false,
    };
    markDiscoveryError(error);
    return { ok: false, error };
  }

  if (getDiscoverySessionSnapshot().retryCount >= DEFAULT_MAX_RETRIES) {
    const error: DiscoveryPresentationError = {
      code: 'VALIDATION',
      message: 'Discovery retry limit reached',
      userMessage: 'Maximum retry attempts reached. Please try again later.',
      retryable: false,
    };
    markDiscoveryError(error);
    return { ok: false, error };
  }

  return discoverNearbyKitchens(lastQuery, deps);
}

export {
  getDiscoverySessionSnapshot,
  subscribeDiscoverySession,
  resetDiscoverySession,
  getLastDiscoveryQuery,
  buildDiscoveryQuery,
};

export type {
  DiscoveryFacadeQuery,
  DiscoveryFacadeOutcome,
  DiscoveryPresentationError,
  DiscoverySessionSnapshot,
};

export {
  isDiscoveryEnabled,
  isDiscoveryRankingEnabled,
  isDiscoveryMarketplaceEnabled,
  isDiscoveryTenantRepositoryEnabled,
  resolveDiscoveryProviderKind,
} from './discoveryFeatureFlags';
