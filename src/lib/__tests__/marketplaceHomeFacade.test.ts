import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { sdkOk } from '../../sdk/core/resultHelpers';
import type { DiscoveryResult } from '../../sdk/discovery/dto';
import type { NearbyRestaurant } from '../../sdk/discovery/dto/candidates';
import { createStubDiscoveryAdapter } from '../../sdk/discovery/adapters/StubDiscoveryAdapter';
import { resetDiscoverySession } from '../discovery/DiscoverySession';
import type { CustomerCanonicalLocation } from '../customerLocation/types';
import {
  deriveKitchenBadges,
  mapDiscoveryResultToKitchens,
  mapRestaurantToKitchenCard,
} from '../marketplace/mapDiscoveryToMarketplace';
import {
  loadMarketplaceHome,
  retryMarketplaceHome,
} from '../marketplace/MarketplaceHomeFacade';

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

const baseRestaurant = (overrides: Partial<NearbyRestaurant> = {}): NearbyRestaurant =>
  ({
    tenantId: 't1',
    branchId: 'b1',
    name: 'Test Kitchen',
    slug: 'test-kitchen',
    point: { lat: 18.521, lng: 73.857 },
    distanceKm: 1.2,
    geohash: 'tdr1x',
    eligibility: {
      status: 'serviceable',
      isServiceable: true,
      distanceKm: 1.2,
      maxRadiusKm: 5,
    },
    eta: { prepTimeMins: 15, deliveryTimeMins: 10, totalMins: 25 },
    rating: 4.7,
    isOpen: true,
    ranking: {
      score: 0.9,
      rank: 1,
      factors: [{ factor: 'rating', signal: 0.9, weight: 0.2, contribution: 0.18 }],
    },
    ...overrides,
  }) as NearbyRestaurant;

const SUCCESS_RESULT: DiscoveryResult = {
  restaurants: [baseRestaurant(), baseRestaurant({ tenantId: 't2', slug: 'far-kitchen', distanceKm: 4.5, rating: 3.8 })],
  totalCandidates: 2,
  queryRadiusKm: 10,
  customerGeohash: 'tdr1w',
  rankedAt: Date.now(),
};

describe('mapDiscoveryToMarketplace (M3 PR-8)', () => {
  it('derives explainable badges from discovery signals', () => {
    const badges = deriveKitchenBadges(baseRestaurant(), 0);
    const labels = badges.map((badge) => badge.label);
    assert.ok(labels.includes('Closest'));
    assert.ok(labels.includes('Within Delivery Radius'));
    assert.ok(labels.includes('Fast Delivery'));
    assert.ok(labels.includes('Highly Rated'));
  });

  it('maps discovery result to kitchen cards with store paths', () => {
    const cards = mapDiscoveryResultToKitchens(SUCCESS_RESULT);
    assert.equal(cards.length, 2);
    assert.equal(cards[0].storePath, '/k/test-kitchen');
    assert.equal(cards[0].etaMins, 25);
    assert.equal(cards[0].isServiceable, true);
  });

  it('maps eligibility labels for out-of-radius kitchens', () => {
    const card = mapRestaurantToKitchenCard(
      baseRestaurant({
        eligibility: {
          status: 'out_of_radius',
          isServiceable: false,
          distanceKm: 12,
          reason: 'Too far',
        },
      }),
      1
    );
    assert.equal(card.eligibilityLabel, 'Outside delivery radius');
    assert.equal(card.isServiceable, false);
  });
});

describe('MarketplaceHomeFacade (M3 PR-8)', () => {
  beforeEach(() => {
    resetDiscoverySession();
  });

  it('returns disabled view when marketplace flag is off', async () => {
    const outcome = await loadMarketplaceHome(
      { radiusKm: 10 },
      {
        isMarketplaceEnabled: () => false,
        isDiscoveryEnabled: () => true,
        readCustomerLocation: () => CUSTOMER_LOCATION,
      }
    );

    assert.equal(outcome.ok, true);
    assert.equal(outcome.view.status, 'disabled');
    assert.equal(outcome.view.kitchens.length, 0);
  });

  it('requires customer location before discovery', async () => {
    const outcome = await loadMarketplaceHome(
      { radiusKm: 10 },
      {
        isMarketplaceEnabled: () => true,
        isDiscoveryEnabled: () => true,
        readCustomerLocation: () => null,
      }
    );

    assert.equal(outcome.view.status, 'location_required');
  });

  it('returns disabled when discovery master flag is off', async () => {
    const outcome = await loadMarketplaceHome(
      { radiusKm: 10 },
      {
        isMarketplaceEnabled: () => true,
        isDiscoveryEnabled: () => false,
        readCustomerLocation: () => CUSTOMER_LOCATION,
      }
    );

    assert.equal(outcome.view.status, 'disabled');
    assert.match(outcome.view.error?.userMessage ?? '', /not available/i);
  });

  it('loads kitchens through DiscoveryFacade and maps presentation cards', async () => {
    const outcome = await loadMarketplaceHome(
      { radiusKm: 10, limit: 20 },
      {
        isMarketplaceEnabled: () => true,
        isDiscoveryEnabled: () => true,
        readCustomerLocation: () => CUSTOMER_LOCATION,
        discoveryDeps: {
          isEnabled: () => true,
          isRankingEnabled: () => false,
          readCustomerLocation: () => CUSTOMER_LOCATION,
          sdk: {
            ...createStubDiscoveryAdapter(),
            discoverNearby: async () => sdkOk(SUCCESS_RESULT),
          },
        },
      }
    );

    assert.equal(outcome.ok, true);
    assert.equal(outcome.view.status, 'success');
    assert.equal(outcome.view.kitchens.length, 2);
    assert.equal(outcome.view.locationLabel, 'Pune, Maharashtra');
  });

  it('returns empty state when discovery finds no restaurants', async () => {
    const outcome = await loadMarketplaceHome(
      { radiusKm: 10 },
      {
        isMarketplaceEnabled: () => true,
        isDiscoveryEnabled: () => true,
        readCustomerLocation: () => CUSTOMER_LOCATION,
        discoveryDeps: {
          isEnabled: () => true,
          readCustomerLocation: () => CUSTOMER_LOCATION,
          sdk: {
            ...createStubDiscoveryAdapter(),
            discoverNearby: async () =>
              sdkOk({
                restaurants: [],
                totalCandidates: 0,
                queryRadiusKm: 10,
                rankedAt: Date.now(),
              }),
          },
        },
      }
    );

    assert.equal(outcome.view.status, 'empty');
    assert.equal(outcome.view.kitchens.length, 0);
  });

  it('retryMarketplaceHome reuses last discovery query via session', async () => {
    let calls = 0;
    const discoverNearby = async () => {
      calls += 1;
      return sdkOk(SUCCESS_RESULT);
    };

    await loadMarketplaceHome(
      { radiusKm: 10 },
      {
        isMarketplaceEnabled: () => true,
        isDiscoveryEnabled: () => true,
        readCustomerLocation: () => CUSTOMER_LOCATION,
        discoveryDeps: {
          isEnabled: () => true,
          readCustomerLocation: () => CUSTOMER_LOCATION,
          sdk: { ...createStubDiscoveryAdapter(), discoverNearby },
        },
      }
    );

    const retry = await retryMarketplaceHome({
      isMarketplaceEnabled: () => true,
      isDiscoveryEnabled: () => true,
      readCustomerLocation: () => CUSTOMER_LOCATION,
      discoveryDeps: {
        isEnabled: () => true,
        readCustomerLocation: () => CUSTOMER_LOCATION,
        sdk: { ...createStubDiscoveryAdapter(), discoverNearby },
      },
    });

    assert.equal(retry.view.status, 'success');
    assert.equal(calls, 2);
  });
});
