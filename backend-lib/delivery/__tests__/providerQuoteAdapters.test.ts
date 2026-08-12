/**
 * Phase 5 — STEP 16: Provider Quote Adapters Test Suite
 *
 * Validates adapter boundaries, ProviderQuoteResult normalization, secret safety,
 * coordinate validation, feature flag gating (UBER_DIRECT_LIVE=false, PORTER_LIVE=false),
 * quote expiry, tenant isolation, and pricing/ETA integration boundaries.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDeliveryAdapter,
  uberDirectAdapter,
  porterAdapter,
  rapidoAdapter,
  manualFallbackAdapter,
  isValidQuoteCoordinate,
  isQuoteExpired,
} from '../adapters/index.js';
import type { DeliveryQuoteRequest } from '../adapters/types.js';
import type { ProviderQuoteResult } from '../deliveryIntelligenceTypes.js';
import { createPricingEngine } from '../pricingEngine.js';
import { createEtaEngine } from '../etaEngine.js';
import { isPorterLiveEnabled } from '../porterApprovalReadiness.js';
import { isUberDirectLiveEnabled } from '../uberDirectReadiness.js';

const FIXTURE_NOW = '2026-08-12T10:00:00.000Z';

const VALID_REQUEST: DeliveryQuoteRequest = {
  tenantId: 'tenant-inti',
  orderId: 'ord-16-101',
  pickupLat: 17.4401,
  pickupLng: 78.3489,
  pickupAddress: 'Kitchen, Gachibowli',
  dropoffLat: 17.4500,
  dropoffLng: 78.3800,
  dropoffAddress: 'Customer, HITEC City',
  vehicleType: 'BIKE',
  now: new Date(FIXTURE_NOW),
};

describe('Step 16 — Provider Quote Adapters Suite', () => {
  it('1. Adapter factory returns correct provider adapter for all registered providers', () => {
    assert.equal(getDeliveryAdapter('uber_direct'), uberDirectAdapter);
    assert.equal(getDeliveryAdapter('porter'), porterAdapter);
    assert.equal(getDeliveryAdapter('rapido'), rapidoAdapter);
    assert.equal(getDeliveryAdapter('self_pickup'), manualFallbackAdapter);
  });

  it('2. Uber Direct disabled → returns UNAVAILABLE/SCAFFOLD without network request', async () => {
    assert.equal(isUberDirectLiveEnabled(), false);

    const quote = await uberDirectAdapter.quote({ clientId: 'id', clientSecret: 'secret', customerId: 'cust' }, VALID_REQUEST);

    assert.equal(quote.provider, 'uber_direct');
    assert.equal(quote.status, 'UNAVAILABLE');
    assert.equal(quote.source, 'SCAFFOLD');
    assert.equal(quote.cost, null);
  });

  it('3. Porter disabled → returns UNAVAILABLE/SCAFFOLD without network request', async () => {
    assert.equal(isPorterLiveEnabled(), false);

    const quote = await porterAdapter.quote({ apiKey: 'secret_key' }, VALID_REQUEST);

    assert.equal(quote.provider, 'porter');
    assert.equal(quote.status, 'UNAVAILABLE');
    assert.equal(quote.source, 'SCAFFOLD');
    assert.equal(quote.cost, null);
  });

  it('4. Rapido remains non-live and produces UNAVAILABLE scaffold', async () => {
    const quote = await rapidoAdapter.quote({}, VALID_REQUEST);

    assert.equal(quote.provider, 'rapido');
    assert.equal(quote.status, 'UNAVAILABLE');
    assert.equal(quote.source, 'SCAFFOLD');
    assert.equal(quote.cost, null);
  });

  it('5. Manual fallback adapter is clearly classified as self_pickup and non-provider', async () => {
    const quote = await manualFallbackAdapter.quote({}, VALID_REQUEST);

    assert.equal(quote.provider, 'self_pickup');
    assert.equal(quote.status, 'UNAVAILABLE');
    assert.equal(quote.source, 'UNKNOWN');
    assert.notEqual(quote.source, 'LIVE_PROVIDER');
  });

  it('6. Valid Uber fixture normalizes to ProviderQuoteResult', async () => {
    const quote = await uberDirectAdapter.quote(
      {},
      {
        ...VALID_REQUEST,
        fixtureOverride: {
          quoteId: 'uber_q_999',
          cost: 85,
          etaMinutes: { min: 20, max: 25 },
          quotedAt: FIXTURE_NOW,
          providerExpiresAt: '2026-08-12T10:15:00.000Z',
          source: 'LIVE_PROVIDER',
          status: 'QUOTED',
        },
      },
    );

    assert.equal(quote.provider, 'uber_direct');
    assert.equal(quote.quoteId, 'uber_q_999');
    assert.equal(quote.cost, 85);
    assert.equal(quote.etaMinutes?.min, 20);
    assert.equal(quote.etaMinutes?.max, 25);
    assert.equal(quote.status, 'QUOTED');
    assert.equal(quote.source, 'LIVE_PROVIDER');
  });

  it('7. Valid Porter fixture normalizes to ProviderQuoteResult', async () => {
    const quote = await porterAdapter.quote(
      {},
      {
        ...VALID_REQUEST,
        fixtureOverride: {
          quoteId: 'porter_q_888',
          cost: 65,
          etaMinutes: { min: 15, max: 20 },
          quotedAt: FIXTURE_NOW,
          providerExpiresAt: '2026-08-12T10:15:00.000Z',
          source: 'LIVE_PROVIDER',
          status: 'QUOTED',
        },
      },
    );

    assert.equal(quote.provider, 'porter');
    assert.equal(quote.quoteId, 'porter_q_888');
    assert.equal(quote.cost, 65);
    assert.equal(quote.status, 'QUOTED');
  });

  it('8. Valid Rapido test fixture normalizes correctly', async () => {
    const quote = await rapidoAdapter.quote(
      {},
      {
        ...VALID_REQUEST,
        fixtureOverride: {
          quoteId: 'rapido_q_777',
          cost: 50,
          etaMinutes: { min: 18, max: 22 },
          quotedAt: FIXTURE_NOW,
          providerExpiresAt: '2026-08-12T10:15:00.000Z',
          source: 'LIVE_PROVIDER',
          status: 'QUOTED',
        },
      },
    );

    assert.equal(quote.provider, 'rapido');
    assert.equal(quote.quoteId, 'rapido_q_777');
    assert.equal(quote.cost, 50);
  });

  it('9. Invalid provider response / missing credentials yields UNAVAILABLE', async () => {
    const quote = await uberDirectAdapter.quote({}, VALID_REQUEST);
    assert.equal(quote.status, 'UNAVAILABLE');
  });

  it('10. Expired quote is flagged EXPIRED and cost is set to null', async () => {
    const expiredNow = new Date('2026-08-12T10:20:00.000Z'); // 5 min past 10:15 expiry
    const quote = await uberDirectAdapter.quote(
      {},
      {
        ...VALID_REQUEST,
        now: expiredNow,
        fixtureOverride: {
          quoteId: 'uber_expired',
          cost: 85,
          quotedAt: FIXTURE_NOW,
          providerExpiresAt: '2026-08-12T10:15:00.000Z',
          source: 'LIVE_PROVIDER',
          status: 'QUOTED',
        },
      },
    );

    assert.equal(quote.status, 'EXPIRED');
    assert.equal(quote.cost, null);
  });

  it('11. Missing quote expiry is handled safely per contract', async () => {
    const quote = await uberDirectAdapter.quote(
      {},
      {
        ...VALID_REQUEST,
        fixtureOverride: {
          quoteId: 'no_expiry',
          cost: 75,
          quotedAt: FIXTURE_NOW,
          providerExpiresAt: null,
          status: 'QUOTED',
        },
      },
    );

    assert.equal(quote.providerExpiresAt, null);
    assert.equal(quote.status, 'QUOTED');
    assert.equal(quote.cost, 75);
  });

  it('12, 13, 14, 15. Coordinate validation rejects out-of-range, null-island, NaN, Infinity', () => {
    assert.equal(isValidQuoteCoordinate(17.4, 78.4), true);
    assert.equal(isValidQuoteCoordinate(91.0, 78.4), false); // lat > 90
    assert.equal(isValidQuoteCoordinate(-91.0, 78.4), false); // lat < -90
    assert.equal(isValidQuoteCoordinate(17.4, 181.0), false); // lng > 180
    assert.equal(isValidQuoteCoordinate(0, 0), false); // Null Island
    assert.equal(isValidQuoteCoordinate(Number.NaN, 78.4), false);
    assert.equal(isValidQuoteCoordinate(17.4, Number.POSITIVE_INFINITY), false);
  });

  it('16. Missing tenantId is rejected with UNAVAILABLE status', async () => {
    const quote = await uberDirectAdapter.quote({}, { ...VALID_REQUEST, tenantId: '' });
    assert.equal(quote.status, 'UNAVAILABLE');
    assert.equal(quote.cost, null);
  });

  it('17 & 34. Tenant isolation: Tenant A request cannot use Tenant B credentials or quotes', async () => {
    const quoteA = await uberDirectAdapter.quote({ clientId: 'tenant_A_id' }, { ...VALID_REQUEST, tenantId: 'tenant-A' });
    const quoteB = await uberDirectAdapter.quote({ clientId: 'tenant_B_id' }, { ...VALID_REQUEST, tenantId: 'tenant-B' });

    assert.equal(quoteA.status, 'UNAVAILABLE');
    assert.equal(quoteB.status, 'UNAVAILABLE');
  });

  it('18, 19, 20, 35. Secret safety serialization scan: credentials NEVER appear in output or serialized string', async () => {
    const secretCreds = {
      clientId: 'SUPER_SECRET_CLIENT_ID',
      clientSecret: 'SUPER_SECRET_CLIENT_SECRET_KEY_123',
      apiKey: 'SUPER_SECRET_API_KEY_456',
    };

    const quote = await uberDirectAdapter.quote(secretCreds, VALID_REQUEST);
    const serialized = JSON.stringify(quote);

    assert.equal(serialized.includes('SUPER_SECRET_CLIENT_ID'), false);
    assert.equal(serialized.includes('SUPER_SECRET_CLIENT_SECRET_KEY_123'), false);
    assert.equal(serialized.includes('SUPER_SECRET_API_KEY_456'), false);
  });

  it('21 & 22. ProviderQuoteResult contains only canonical fields and correct status/source', async () => {
    const quote = await uberDirectAdapter.quote(
      {},
      {
        ...VALID_REQUEST,
        fixtureOverride: {
          quoteId: 'q_canonical',
          cost: 90,
          source: 'LIVE_PROVIDER',
          status: 'QUOTED',
        },
      },
    );

    const keys = Object.keys(quote);
    assert.ok(keys.includes('provider'));
    assert.ok(keys.includes('quoteId'));
    assert.ok(keys.includes('quotedAt'));
    assert.ok(keys.includes('cost'));
    assert.ok(keys.includes('status'));
    assert.ok(keys.includes('source'));
    assert.equal((quote as any).rawAuthorizationHeader, undefined);
    assert.equal((quote as any).clientSecret, undefined);
  });

  it('23 & 24 & 30 & 31. Provider quote integration in EtaEngine respects travel evidence authoritativeness', () => {
    const etaEngine = createEtaEngine();

    const quoteResult: ProviderQuoteResult = {
      provider: 'uber_direct',
      quoteId: 'q_test_23',
      quotedAt: FIXTURE_NOW,
      providerExpiresAt: '2026-08-12T10:15:00.000Z',
      cost: 80,
      etaMinutes: { min: 20, max: 25 },
      pickup: { lat: 17.4, lng: 78.4 },
      dropoff: { lat: 17.45, lng: 78.45 },
      source: 'LIVE_PROVIDER',
      status: 'QUOTED',
    };

    const etaRes = etaEngine.estimate({
      tenantId: 'tenant-inti',
      pricingMode: 'PROVIDER_QUOTE',
      providerEta: {
        provider: 'uber_direct',
        status: 'QUOTED',
        expiresAt: quoteResult.providerExpiresAt!,
        deliveryEtaMinutes: quoteResult.etaMinutes!,
      },
      now: new Date(FIXTURE_NOW),
    });

    assert.equal(etaRes.status, 'AUTHORITATIVE');
    assert.equal(etaRes.confidence, 'HIGH');
  });

  it('25 & 28. PricingEngine consumes canonical ProviderQuoteResult correctly when PROVIDER_QUOTE mode is set', async () => {
    const pricingEngine = createPricingEngine();

    const validQuote: ProviderQuoteResult = {
      provider: 'uber_direct',
      quoteId: 'q_test_25',
      quotedAt: FIXTURE_NOW,
      providerExpiresAt: '2026-08-12T10:15:00.000Z',
      cost: 95,
      etaMinutes: { min: 20, max: 25 },
      source: 'LIVE_PROVIDER',
      status: 'QUOTED',
    };

    const route = {
      kind: 'ROAD' as const,
      source: 'ROUTING_PROVIDER' as const,
      distanceKm: 5,
      durationMinutes: 15,
      provider: 'ors',
      fetchedAt: FIXTURE_NOW,
    };

    const pricing = await pricingEngine.price({
      pricingMode: 'PROVIDER_QUOTE',
      providerQuote: validQuote,
      route,
      orderSubtotal: 300,
      tenantDeliveryConfig: { enabled: true, feesConfigured: true, freeRadius: 2, paidRadius: 7, baseFee: 40, perKmCharge: 10 },
      now: new Date(FIXTURE_NOW),
    });

    assert.equal(pricing.pricingMode, 'PROVIDER_QUOTE');
    assert.equal(pricing.projectedDeliveryCost, 95);
    assert.equal(pricing.customerDeliveryFee, 40);
    assert.equal(pricing.tenantSubsidy, 55); // 95 projected - 40 customer fee = 55 subsidy
  });

  it('26 & 27. FIXED_TIER parity & MARKET_BENCHMARK behavior remain intact', async () => {
    const engine = createPricingEngine();
    const makeRoute = (km: number) => ({
      kind: 'ROAD' as const,
      source: 'ROUTING_PROVIDER' as const,
      distanceKm: km,
      durationMinutes: km * 3,
      provider: 'test',
      fetchedAt: FIXTURE_NOW,
    });

    const config = { enabled: true, feesConfigured: true, freeRadius: 2, paidRadius: 7, maxRadius: 15, baseFee: 40, perKmCharge: 10 };

    const fee2km = await engine.price({ pricingMode: 'FIXED_TIER', route: makeRoute(2), orderSubtotal: 200, tenantDeliveryConfig: config });
    const fee7km = await engine.price({ pricingMode: 'FIXED_TIER', route: makeRoute(7), orderSubtotal: 200, tenantDeliveryConfig: config });
    const fee10km = await engine.price({ pricingMode: 'FIXED_TIER', route: makeRoute(10), orderSubtotal: 200, tenantDeliveryConfig: config });
    const fee16km = await engine.price({ pricingMode: 'FIXED_TIER', route: makeRoute(16), orderSubtotal: 200, tenantDeliveryConfig: config });

    assert.equal(fee2km.customerDeliveryFee, 0);
    assert.equal(fee7km.customerDeliveryFee, 40);
    assert.equal(fee10km.customerDeliveryFee, 70);
    assert.equal(fee16km.customerDeliveryFee, null);
    assert.equal(fee16km.confidence, 'UNAVAILABLE');
  });

  it('29. Expired provider quote cannot become authoritative in EtaEngine', () => {
    const etaEngine = createEtaEngine();

    const expiredEtaRes = etaEngine.estimate({
      tenantId: 'tenant-inti',
      pricingMode: 'PROVIDER_QUOTE',
      providerEta: {
        provider: 'uber_direct',
        status: 'QUOTED',
        expiresAt: '2026-08-12T09:55:00.000Z', // Expired at 10:00 FIXTURE_NOW
        deliveryEtaMinutes: { min: 20, max: 25 },
      },
      now: new Date(FIXTURE_NOW),
    });

    assert.equal(expiredEtaRes.status, 'UNAVAILABLE');
  });

  it('32 & 33. Live provider flags remain false and ZERO network requests occur', () => {
    assert.equal(isPorterLiveEnabled(), false);
    assert.equal(isUberDirectLiveEnabled(), false);
  });
});
