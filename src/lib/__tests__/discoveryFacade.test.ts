import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { sdkOk } from '../../sdk/core/resultHelpers';
import type { DiscoverySDK } from '../../sdk/discovery/contracts/DiscoverySDK';
import { createStubDiscoveryAdapter } from '../../sdk/discovery/adapters/StubDiscoveryAdapter';
import { buildDiscoveryQuery } from '../discovery/DiscoveryContext';
import {
  discoverNearbyKitchens,
  discoveryFeatureDisabledError,
  normalizeDiscoveryError,
  retryDiscovery,
} from '../discovery/DiscoveryFacade';
import { resetDiscoverySession, getDiscoverySessionSnapshot } from '../discovery/DiscoverySession';
import type { CustomerCanonicalLocation } from '../customerLocation/types';

const CUSTOMER_LOCATION: CustomerCanonicalLocation = {
  country: 'IN',
  lat: 18.5204,
  lng: 73.8567,
  accuracyM: 12,
  geohash: 'tdr1w',
  formattedAddress: 'Pune, Maharashtra',
  coordinateSource: 'gps',
  detectedAt: Date.now(),
};

const SUCCESS_RESULT = {
  restaurants: [],
  totalCandidates: 0,
  queryRadiusKm: 5,
  customerGeohash: 'tdr1w',
  rankedAt: Date.now(),
};

const createMockSdk = (overrides: Partial<DiscoverySDK> = {}): DiscoverySDK => {
  const stub = createStubDiscoveryAdapter();
  return { ...stub, ...overrides };
};

describe('DiscoveryFacade (M3 PR-2)', () => {
  beforeEach(() => {
    resetDiscoverySession();
  });

  it('returns feature-disabled outcome when FF_DISCOVERY_ENABLED is off', async () => {
    const outcome = await discoverNearbyKitchens(
      { radiusKm: 5 },
      {
        isEnabled: () => false,
        readCustomerLocation: () => CUSTOMER_LOCATION,
        sdk: createMockSdk(),
      }
    );

    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.featureDisabled, true);
    assert.equal(getDiscoverySessionSnapshot().status, 'disabled');
  });

  it('buildDiscoveryQuery requires customer location when no override', () => {
    const result = buildDiscoveryQuery({
      facadeQuery: { radiusKm: 5 },
      customerLocation: null,
    });
    assert.equal(result.ok, false);
  });

  it('buildDiscoveryQuery maps customer session to DiscoveryQuery', () => {
    const result = buildDiscoveryQuery({
      facadeQuery: { radiusKm: 8, limit: 10 },
      customerLocation: CUSTOMER_LOCATION,
      rankingEnabled: false,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.query.customerPoint.lat, 18.5204);
    assert.equal(result.value.query.radiusKm, 8);
    assert.equal(result.value.meta.usedCustomerSession, true);
  });

  it('discoverNearbyKitchens invokes SDK and stores success in session', async () => {
    const outcome = await discoverNearbyKitchens(
      { radiusKm: 5 },
      {
        isEnabled: () => true,
        isRankingEnabled: () => false,
        readCustomerLocation: () => CUSTOMER_LOCATION,
        sdk: createMockSdk({
          discoverNearby: async () => sdkOk(SUCCESS_RESULT),
        }),
      }
    );

    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.result.totalCandidates, 0);
    assert.equal(getDiscoverySessionSnapshot().status, 'success');
    assert.equal(getDiscoverySessionSnapshot().retryCount, 0);
  });

  it('normalizes NOT_CONFIGURED SDK errors for presentation', async () => {
    const outcome = await discoverNearbyKitchens(
      { radiusKm: 5 },
      {
        isEnabled: () => true,
        isRankingEnabled: () => false,
        readCustomerLocation: () => CUSTOMER_LOCATION,
        sdk: createStubDiscoveryAdapter(),
      }
    );

    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.code, 'NOT_CONFIGURED');
    assert.match(outcome.error.userMessage, /not available/i);
    assert.equal(getDiscoverySessionSnapshot().status, 'error');
  });

  it('normalizeDiscoveryError marks UNAVAILABLE as retryable', () => {
    const normalized = normalizeDiscoveryError({
      code: 'UNAVAILABLE',
      message: 'timeout',
      details: { retryable: true },
    });
    assert.equal(normalized.retryable, true);
  });

  it('retryDiscovery re-runs last query and increments retry count on failure', async () => {
    const retryableFail = async () => ({
      ok: false as const,
      error: {
        code: 'UNAVAILABLE' as const,
        message: 'temporary',
        details: { retryable: true },
      },
    });

    await discoverNearbyKitchens(
      { radiusKm: 5 },
      {
        isEnabled: () => true,
        isRankingEnabled: () => false,
        readCustomerLocation: () => CUSTOMER_LOCATION,
        sdk: createMockSdk({ discoverNearby: retryableFail }),
      }
    );

    assert.equal(getDiscoverySessionSnapshot().retryCount, 1);

    const retry = await retryDiscovery({
      isEnabled: () => true,
      isRankingEnabled: () => false,
      readCustomerLocation: () => CUSTOMER_LOCATION,
      sdk: createMockSdk({ discoverNearby: retryableFail }),
    });

    assert.equal(retry.ok, false);
    assert.equal(getDiscoverySessionSnapshot().retryCount, 2);
  });

  it('discoveryFeatureDisabledError is not retryable', () => {
    const error = discoveryFeatureDisabledError();
    assert.equal(error.retryable, false);
    assert.equal(error.featureDisabled, true);
  });
});

describe('StubDiscoveryAdapter (M3 PR-2)', () => {
  it('discoverNearby returns NOT_CONFIGURED', async () => {
    const sdk = createStubDiscoveryAdapter();
    const result = await sdk.discoverNearby({
      customerPoint: { lat: 1, lng: 2 },
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });
});
