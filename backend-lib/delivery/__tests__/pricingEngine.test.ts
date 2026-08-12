/**
 * Phase 5 — STEP 6: Pricing Engine tests.
 *
 * Covers the approved centralized pricing contract: FIXED_TIER Window-1 parity
 * (2 → ₹0, 7 → ₹40, 10 → ₹70, 16 → unavailable), MARKET_BENCHMARK traceability and
 * ROAD-only authority, provider-quote validation, the three financial values
 * (projectedDeliveryCost / customerDeliveryFee / tenantSubsidy), the pricing
 * ladder, route safety (STRAIGHT_LINE/UNAVAILABLE rejection), no-₹109 and no-₹599
 * production logic, deterministic single-point rounding, and the DecisionEngine
 * mapping. NO live providers, no Firestore — deterministic in-memory fixtures only.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createPricingEngine, PRICING_ENGINE_ID, toDeliveryPricing } from '../pricingEngine.js';
import type {
  PricedDeliveryResult,
  PricingEngineRequest,
  PricingResult,
  UnavailablePricingResult,
} from '../pricingEngine.js';
import { createBenchmarkModel } from '../benchmarkModel.js';
import type { BenchmarkModel } from '../benchmarkModel.js';
import { computeTenantDeliveryFee } from '../../marketplace/tenantProjectionHelpers.js';
import {
  FIXTURE_NOW,
  FIXTURE_REGION_PUNE,
  FIXTURE_VEHICLE_BIKE,
  createPlatformBenchmarkCatalog,
  createSeasonMallRoadRoute,
} from '../benchmarkFixtures.js';
import type { DeliveryBenchmark, ProviderQuoteResult, RouteResult } from '../deliveryIntelligenceTypes.js';
import { buildDeliveryDecision } from '../decisionEngine.js';
import type { DeliveryDecisionInput } from '../decisionEngine.js';
import type { DeliveryPricing, PricingMode } from '../deliveryIntelligenceTypes.js';

const AT = FIXTURE_NOW;
const NOW = new Date(FIXTURE_NOW);

const KITCHEN = { lat: 18.5285, lng: 73.9871, label: 'Inti kitchen' };
const DROPOFF = { lat: 18.5189, lng: 73.9322, label: 'Iris society' };

/**
 * Owner storefront delivery config for mana-inti (from the marketplace parity
 * test suite). Drives the exact Window-1 FIXED_TIER oracle:
 *   2 km → ₹0, 7 km → ₹40, 10 km → ₹70, 16 km → unavailable.
 */
const MANA_INTI_CONFIG = {
  enabled: true,
  feesConfigured: true,
  freeRadius: 2,
  paidRadius: 7,
  maxRadius: 15,
  baseFee: 40,
  perKmCharge: 10,
} as const;

const platformCatalog = createPlatformBenchmarkCatalog();
const benchmarkModel = createBenchmarkModel({ catalog: platformCatalog });
const engine = createPricingEngine({ benchmarkModel });

function roadRoute(distanceKm: number, durationMinutes = 20): RouteResult {
  return {
    kind: 'ROAD',
    source: 'ROUTING_PROVIDER',
    routeId: `synthetic-${distanceKm}km`,
    provider: 'fixture-road',
    distanceKm,
    durationMinutes,
    fetchedAt: AT,
  };
}

function straightLineRoute(distanceKm: number): RouteResult {
  return {
    kind: 'STRAIGHT_LINE',
    source: 'STRAIGHT_LINE',
    distanceKm,
    durationMinutes: null,
    fetchedAt: AT,
  };
}

function unavailableRoute(reason = 'No road provider configured.'): RouteResult {
  return {
    kind: 'UNAVAILABLE',
    source: 'UNKNOWN',
    distanceKm: null,
    durationMinutes: null,
    reason,
    fetchedAt: AT,
  };
}

function validQuote(overrides: Partial<ProviderQuoteResult> = {}): ProviderQuoteResult {
  return {
    provider: 'porter',
    quoteId: 'quote-season-mall-1',
    quotedAt: AT,
    providerExpiresAt: '2026-08-11T11:00:00.000Z',
    cost: 132,
    etaMinutes: { min: 25, max: 32 },
    vehicleType: FIXTURE_VEHICLE_BIKE,
    pickup: KITCHEN,
    dropoff: DROPOFF,
    source: 'LIVE_PROVIDER',
    status: 'QUOTED',
    ...overrides,
  };
}

function price(input: PricingEngineRequest): Promise<PricingResult> {
  return engine.price({
    tenantDeliveryConfig: MANA_INTI_CONFIG,
    regionKey: FIXTURE_REGION_PUNE,
    vehicleType: FIXTURE_VEHICLE_BIKE,
    now: NOW,
    ...input,
  });
}

function expectPriced(result: PricingResult): PricedDeliveryResult {
  assert.equal(result.status, 'PRICED');
  return result as PricedDeliveryResult;
}

function expectUnavailable(result: PricingResult): UnavailablePricingResult {
  assert.equal(result.status, 'UNAVAILABLE');
  return result as UnavailablePricingResult;
}

/** Minimal DeliveryDecision input wired from engine output (decision-layer contract). */
function baseDecisionInput(
  pricing: DeliveryPricing,
  route: RouteResult,
  extra: Partial<DeliveryDecisionInput> = {},
): DeliveryDecisionInput {
  return {
    decisionId: 'dec-pricing-test',
    tenantId: 'mana-inti',
    engineVersion: 'pricing-test-v1',
    requestedAt: AT,
    orderType: 'delivery',
    pricingMode: pricing.pricingMode,
    deliveryEnabled: true,
    kitchenLocation: KITCHEN,
    customerLocation: DROPOFF,
    serviceability: { isServiceable: true, distanceKm: route.kind === 'UNAVAILABLE' ? null : route.distanceKm, reason: 'OK' },
    route,
    pricing,
    prep: { estimatedMinutes: 40, remainingMinutes: 40, source: 'CONFIG', confidence: 'MEDIUM', calculatedAt: AT },
    eta: {
      status: 'ESTIMATE_ONLY',
      confidence: 'LOW',
      minMinutes: 30,
      maxMinutes: 45,
      components: [],
      basedOnRoadRoute: false,
      calculatedAt: AT,
      reason: 'estimate-only fixture',
    },
    ...extra,
  };
}

describe('PricingEngine — Step 6', () => {
  it('1. FIXED_TIER parity: 2 km → ₹0 with unknown projected cost', async () => {
    const r = expectPriced(await price({ pricingMode: 'FIXED_TIER', route: roadRoute(2) }));
    assert.equal(r.pricingMode, 'FIXED_TIER');
    assert.equal(r.pricingStep, 'FIXED_TIER');
    assert.equal(r.customerDeliveryFee, 0);
    assert.equal(r.projectedDeliveryCost, null);
    assert.equal(r.projectedCostSource, 'UNKNOWN');
    assert.equal(r.tenantSubsidy, null);
    assert.equal(r.confidence, 'MEDIUM');
  });

  it('2. FIXED_TIER parity: 7 km → ₹40', async () => {
    const r = expectPriced(await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7) }));
    assert.equal(r.customerDeliveryFee, 40);
  });

  it('3. FIXED_TIER parity: 10 km → ₹70 (per-km only beyond paid radius)', async () => {
    const r = expectPriced(await price({ pricingMode: 'FIXED_TIER', route: roadRoute(10) }));
    assert.equal(r.customerDeliveryFee, 70);
  });

  it('4. FIXED_TIER parity: 16 km → unavailable (pricing-level, never a fake fee)', async () => {
    const r = expectUnavailable(await price({ pricingMode: 'FIXED_TIER', route: roadRoute(16) }));
    assert.equal(r.reason, 'FIXED_TIER_UNAVAILABLE');
    assert.equal(r.customerDeliveryFee, null);
    assert.equal(r.projectedDeliveryCost, null);
    assert.equal(r.projectedCostSource, 'UNKNOWN');
  });

  it('5. MARKET_BENCHMARK on a valid ROAD route produces a traceable benchmark cost', async () => {
    const r = expectPriced(
      await price({ pricingMode: 'MARKET_BENCHMARK', route: roadRoute(8, 28) }),
    );
    assert.equal(r.pricingMode, 'MARKET_BENCHMARK');
    assert.equal(r.pricingStep, 'MARKET_BENCHMARK');
    assert.equal(r.projectedDeliveryCost, 121); // fixture v2 maths: 35 + 9·8 + 0.5·28
    assert.equal(r.projectedCostSource, 'BENCHMARK');
    assert.equal(r.customerDeliveryFee, 50); // tenant ladder at 8 km: 40 + 1·10
    assert.equal(r.tenantSubsidy, 71); // 121 − 50
    assert.equal(r.confidence, 'MEDIUM');
  });

  it('6. MARKET_BENCHMARK rejects STRAIGHT_LINE (Haversine can never price)', async () => {
    const r = expectUnavailable(
      await price({ pricingMode: 'MARKET_BENCHMARK', route: straightLineRoute(8) }),
    );
    assert.equal(r.reason, 'ROUTE_NOT_ROAD');
    assert.equal(r.projectedDeliveryCost, null);
    assert.equal(r.projectedCostSource, 'UNKNOWN');
  });

  it('7. MARKET_BENCHMARK with an UNAVAILABLE route is UNAVAILABLE', async () => {
    const r = expectUnavailable(
      await price({ pricingMode: 'MARKET_BENCHMARK', route: unavailableRoute() }),
    );
    assert.equal(r.reason, 'ROUTE_UNAVAILABLE');
    assert.equal(r.distanceKm, null);
    assert.equal(r.projectedDeliveryCost, null);
  });

  it('8. Benchmark traceability is fully retained on the pricing result', async () => {
    const r = expectPriced(
      await price({ pricingMode: 'MARKET_BENCHMARK', route: roadRoute(8, 28) }),
    );
    assert.equal(r.benchmark?.id, 'bm-pune-bike-2');
    assert.equal(r.benchmark?.regionKey, FIXTURE_REGION_PUNE);
    assert.equal(r.benchmark?.vehicleType, FIXTURE_VEHICLE_BIKE);
    assert.equal(r.benchmark?.version, '2.0');
    assert.ok(r.benchmark?.source);
    assert.ok(r.benchmark?.effectiveFrom);
    assert.equal(r.benchmarkCalculation?.formula, 'BASE_PLUS_DISTANCE_PLUS_ADJUSTMENTS');
    assert.equal(r.benchmarkCalculation?.distanceComponent, 72);
    assert.equal(r.benchmarkCalculation?.timeComponent, 14);
    assert.equal(r.benchmarkCalculation?.projectedDeliveryCost, 121);
    assert.equal(r.engineVersion, PRICING_ENGINE_ID);
    assert.equal(r.calculatedAt, AT);
  });

  it('9. Tenants may use their own benchmark override (explicitly scoped)', async () => {
    const overrideRecord: DeliveryBenchmark = {
      id: 'bm-pune-bike-tenant-a',
      regionKey: FIXTURE_REGION_PUNE,
      vehicleType: FIXTURE_VEHICLE_BIKE,
      effectiveFrom: '2026-01-01T00:00:00.000Z',
      effectiveUntil: null,
      source: 'TENANT_A_MARKET_SURVEY',
      version: '1.0',
      pricing: { baseFare: 100, perKm: 5, perMinute: null, minFare: 90, pickupFee: null, dropFee: null },
      createdAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'pricing-engine-test',
    };
    benchmarkModel.setTenantOverride('tenant-a', overrideRecord);
    try {
      const r = expectPriced(
        await price({ pricingMode: 'MARKET_BENCHMARK', route: roadRoute(8, 28), tenantId: 'tenant-a' }),
      );
      assert.equal(r.projectedDeliveryCost, 140); // 100 + 5·8, floor 90 ignored
      assert.equal(r.benchmark?.id, 'bm-pune-bike-tenant-a');
      assert.deepEqual(r.benchmarkOverride, { tenantId: 'tenant-a', scope: 'TENANT_OVERRIDE' });
    } finally {
      benchmarkModel.reset();
    }
  });

  it('10. Tenant A can never use Tenant B override', async () => {
    const overrideRecord: DeliveryBenchmark = {
      id: 'bm-pune-bike-tenant-b',
      regionKey: FIXTURE_REGION_PUNE,
      vehicleType: FIXTURE_VEHICLE_BIKE,
      effectiveFrom: '2026-01-01T00:00:00.000Z',
      effectiveUntil: null,
      source: 'TENANT_B_MARKET_SURVEY',
      version: '42.0',
      pricing: { baseFare: 1, perKm: 1, perMinute: null, minFare: 1, pickupFee: null, dropFee: null },
      createdAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'pricing-engine-test',
    };
    const model = createBenchmarkModel({ catalog: platformCatalog });
    model.setTenantOverride('tenant-b', overrideRecord);
    const engineB = createPricingEngine({ benchmarkModel: model });
    const r = expectPriced(
      await engineB.price({
        tenantId: 'tenant-a',
        pricingMode: 'MARKET_BENCHMARK',
        route: roadRoute(8, 28),
        regionKey: FIXTURE_REGION_PUNE,
        vehicleType: FIXTURE_VEHICLE_BIKE,
        tenantDeliveryConfig: MANA_INTI_CONFIG,
        now: NOW,
      }),
    );
    assert.equal(r.projectedDeliveryCost, 121); // platform record — B's override is invisible
    assert.equal(r.benchmark?.id, 'bm-pune-bike-2');
    assert.equal(r.benchmarkOverride, undefined);
  });

  it('11. A valid provider quote input prices a delivery (PROVIDER_QUOTE)', async () => {
    const r = expectPriced(
      await price({
        pricingMode: 'PROVIDER_QUOTE',
        route: roadRoute(8, 28),
        providerQuote: validQuote(),
        pickup: KITCHEN,
        dropoff: DROPOFF,
      }),
    );
    assert.equal(r.pricingStep, 'PROVIDER_QUOTE');
    assert.equal(r.projectedDeliveryCost, 132);
    assert.equal(r.projectedCostSource, 'PROVIDER');
    assert.equal(r.customerDeliveryFee, 50);
    assert.equal(r.tenantSubsidy, 82);
    assert.equal(r.confidence, 'HIGH');
    assert.equal(r.providerQuote?.provider, 'porter');
    assert.equal(r.providerQuote?.quoteId, 'quote-season-mall-1');
  });

  it('12. Expired provider quotes are rejected (stale quotes are never trusted)', async () => {
    const r = expectUnavailable(
      await price({
        pricingMode: 'PROVIDER_QUOTE',
        route: roadRoute(8, 28),
        providerQuote: validQuote({ providerExpiresAt: '2026-08-11T09:59:59.999Z' }),
      }),
    );
    assert.equal(r.reason, 'PROVIDER_QUOTE_EXPIRED');
    assert.equal(r.projectedDeliveryCost, null);
  });

  it('13. Invalid provider quotes are rejected (status / cost)', async () => {
    const blocked = expectUnavailable(
      await price({ pricingMode: 'PROVIDER_QUOTE', route: roadRoute(8, 28), providerQuote: validQuote({ status: 'BLOCKED' }) }),
    );
    assert.equal(blocked.reason, 'PROVIDER_QUOTE_INVALID');

    const missingCost = expectUnavailable(
      await price({ pricingMode: 'PROVIDER_QUOTE', route: roadRoute(8, 28), providerQuote: validQuote({ cost: null }) }),
    );
    assert.equal(missingCost.reason, 'PROVIDER_QUOTE_INVALID');

    const negativeCost = expectUnavailable(
      await price({ pricingMode: 'PROVIDER_QUOTE', route: roadRoute(8, 28), providerQuote: validQuote({ cost: -5 }) }),
    );
    assert.equal(negativeCost.reason, 'PROVIDER_QUOTE_INVALID');
  });

  it('14. Unknown projected fulfillment cost is represented honestly (UNKNOWN source)', async () => {
    const r = expectPriced(await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7) }));
    assert.equal(r.projectedDeliveryCost, null);
    assert.equal(r.projectedCostSource, 'UNKNOWN');
    assert.equal(r.customerDeliveryFee, 40);
  });

  it('15. Subsidy is null whenever the projected cost is unknown', async () => {
    const r = expectPriced(await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7) }));
    assert.equal(r.projectedDeliveryCost, null);
    assert.equal(r.tenantSubsidy, null);
  });

  it('16. No ₹109 is ever produced by the pricing engine source', async () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/delivery/pricingEngine.ts'),
      'utf8',
    );
    assert.equal(source.includes('109'), false, '₹109 must exist only in explicit fixtures');
    const r = expectPriced(await price({ pricingMode: 'FIXED_TIER', route: roadRoute(8) }));
    assert.notEqual(r.projectedDeliveryCost, 109);
  });

  it('17. No Haversine / straight-line math exists inside the pricing engine', async () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/delivery/pricingEngine.ts'),
      'utf8',
    );
    // Comments may name the ban; executable code must not contain the math.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    assert.equal(/haversine/i.test(code), false);
    assert.equal(/atan2/i.test(code), false);
    assert.equal(/Math\.sin/i.test(code), false);
    // Behavioral: STRAIGHT_LINE is rejected before any price math can run (covered above).
  });

  it('18. Season Mall 8 km regression — configured benchmark maths, no ₹109, no ₹40 collapse', async () => {
    const seasonMall = createSeasonMallRoadRoute(); // 8 km / 28 min ROAD fixture
    const r = expectPriced(await price({ pricingMode: 'MARKET_BENCHMARK', route: seasonMall }));
    assert.equal(r.distanceKm, 8);
    assert.equal(r.durationMinutes, 28);
    assert.equal(r.routeSource, 'ROUTING_PROVIDER');
    assert.equal(r.projectedDeliveryCost, 121); // what the configured fixture mathematically produces
    assert.notEqual(r.projectedDeliveryCost, 109);
    assert.notEqual(r.projectedDeliveryCost, 40); // no Haversine-based ₹40 collapse
    assert.equal(r.benchmark?.id, 'bm-pune-bike-2');
    assert.equal(r.benchmarkCalculation?.formula, 'BASE_PLUS_DISTANCE_PLUS_ADJUSTMENTS');
    assert.equal(r.benchmarkCalculation?.distanceComponent, 72);
    assert.equal(r.customerDeliveryFee, 50);
    assert.equal(r.tenantSubsidy, 71);
  });

  it('19. Deterministic rounding — single final point, stable repeatable results', async () => {
    const a = expectPriced(await price({ pricingMode: 'MARKET_BENCHMARK', route: roadRoute(8, 28) }));
    const b = expectPriced(await price({ pricingMode: 'MARKET_BENCHMARK', route: roadRoute(8, 28) }));
    assert.deepEqual(a, b);
    assert.equal(Number.isInteger(a.projectedDeliveryCost), true);
    assert.equal(Number.isInteger(a.customerDeliveryFee), true);
    assert.equal(Number.isInteger(a.tenantSubsidy), true);
    // Everything is rounded from a single final-point calculation, no per-component drift.
    const base = expectPriced(await price({ pricingMode: 'FIXED_TIER', route: roadRoute(10) }));
    assert.equal(base.customerDeliveryFee, 70);
  });

  it('20. Benchmark minimum fare is respected through the pricing engine', async () => {
    const v1Only = createBenchmarkModel({
      catalog: platformCatalog.filter((record) => record.id === 'bm-pune-bike-1'),
    });
    const engineV1 = createPricingEngine({ benchmarkModel: v1Only });
    const r = expectPriced(
      await engineV1.price({
        pricingMode: 'MARKET_BENCHMARK',
        route: roadRoute(0), // raw = 30 + 0 -> floor to minFare 40
        regionKey: FIXTURE_REGION_PUNE,
        vehicleType: FIXTURE_VEHICLE_BIKE,
        now: NOW,
      }),
    );
    assert.equal(r.projectedDeliveryCost, 40);
    assert.equal(r.benchmarkCalculation?.minFareApplied, 40);
  });

  it('21. Benchmark surge behaviour flows through deterministically', async () => {
    const surged: DeliveryBenchmark[] = [
      {
        id: 'bm-surge-pune-bike',
        regionKey: FIXTURE_REGION_PUNE,
        vehicleType: FIXTURE_VEHICLE_BIKE,
        effectiveFrom: '2026-01-01T00:00:00.000Z',
        effectiveUntil: null,
        source: 'FIXTURE_MARKET_SURVEY',
        version: '1.0',
        pricing: {
          baseFare: 35,
          perKm: 9,
          perMinute: 0.5,
          minFare: 40,
          pickupFee: null,
          dropFee: null,
          surgeMultiplierMin: 1.1,
          surgeMultiplierMax: 1.5,
        },
        createdAt: '2026-01-01T00:00:00.000Z',
        createdBy: 'pricing-engine-test',
      },
    ];
    const surgedModel = createBenchmarkModel({ catalog: surged });
    const surgedEngine = createPricingEngine({ benchmarkModel: surgedModel });
    const r = expectPriced(
      await surgedEngine.price({
        pricingMode: 'MARKET_BENCHMARK',
        route: roadRoute(8, 28),
        regionKey: FIXTURE_REGION_PUNE,
        vehicleType: FIXTURE_VEHICLE_BIKE,
        now: NOW,
      }),
    );
    assert.equal(r.benchmarkCalculation?.appliedSurgeMultiplier, 1.1);
    assert.equal(r.projectedDeliveryCost, Math.round(121 * 1.1)); // 133
  });

  it('22. Missing region → benchmark pricing resumes with a clear unavailable reason', async () => {
    const r = expectUnavailable(
      await price({ pricingMode: 'MARKET_BENCHMARK', route: roadRoute(8, 28), regionKey: undefined }),
    );
    assert.equal(r.pricingMode, 'MARKET_BENCHMARK');
    assert.equal(r.reason, 'MISSING_REGION');
    assert.match(String(r.detail), /regionKey/i);
    assert.equal(r.customerDeliveryFee, null);
  });

  it('23. Missing vehicle → benchmark pricing resumes with a clear unavailable reason', async () => {
    const r = expectUnavailable(
      await price({ pricingMode: 'MARKET_BENCHMARK', route: roadRoute(8, 28), vehicleType: undefined }),
    );
    // The benchmark model refuses on its vehicle gate; the engine surfaces it verbatim.
    assert.equal(r.reason, 'BENCHMARK_UNAVAILABLE');
    assert.match(String(r.detail), /vehicle/i);
  });

  it('24. PRICING_UNAVAILABLE vs SERVICEABILITY_UNAVAILABLE stay distinct', async () => {
    const routing = expectUnavailable(await price({ pricingMode: 'MARKET_BENCHMARK', route: unavailableRoute() }));
    assert.equal(routing.reason, 'ROUTE_UNAVAILABLE'); // pricing never duplicates serviceability maths
    assert.equal(routing.customerDeliveryFee, null);

    const fixedOnUnavailable = expectUnavailable(
      await price({ pricingMode: 'FIXED_TIER', route: unavailableRoute() }),
    );
    assert.equal(fixedOnUnavailable.reason, 'ROUTE_UNAVAILABLE');
    assert.equal(fixedOnUnavailable.pricingStep, 'UNAVAILABLE');
  });

  it('25. Checkout quote path parity — FIXED_TIER reproduces the existing oracle exactly', async () => {
    // The engine is instantiated behind the same boundary the future checkout shim will use:
    // a FIXED_TIER pricingMode with explicit fallback policy, platform differences fixture.
    const e = createPricingEngine({ benchmarkModel: createBenchmarkModel({ catalog: platformCatalog }) });
    const oracle: Array<[number, number]> = [
      [2, 0],
      [7, 40],
      [10, 70],
    ];
    for (const [km, fee] of oracle) {
      const r = await e.price({
        pricingMode: 'FIXED_TIER',
        route: roadRoute(km),
        tenantDeliveryConfig: MANA_INTI_CONFIG,
        now: NOW,
      });
      assert.equal(r.status, 'PRICED', `${km} km must be priced`);
      assert.equal(r.customerDeliveryFee, fee, `${km} km parity`);
      assert.equal(r.projectedDeliveryCost, null, `${km} km fixed tier has no independent cost`);
      assert.equal(r.tenantSubsidy, null, `${km} km fixed tier subsify null`);
      assert.equal(r.pricingMode, 'FIXED_TIER');
      assert.equal(r.pricingStep, 'FIXED_TIER');
      assert.equal(r.distanceKm, km, `${km} km route distance retained`);
    }
    // 16 km remains unavailable through the same path.
    const u = expectUnavailable(
      await e.price({
        pricingMode: 'FIXED_TIER',
        route: roadRoute(16),
        tenantDeliveryConfig: MANA_INTI_CONFIG,
        now: NOW,
      }),
    );
    assert.equal(u.reason, 'FIXED_TIER_UNAVAILABLE');
  });

  // -------------------------------------------------------------------------
  // Supplementary robustness (beyond the 25 required items).
  // -------------------------------------------------------------------------

  it('26. Provider quote with conflicting route endpoints is rejected (route mismatch)', async () => {
    const r = expectUnavailable(
      await price({
        pricingMode: 'PROVIDER_QUOTE',
        route: roadRoute(8, 28),
        providerQuote: validQuote(),
        // A different dropoff than the one the quote was issued for.
        pickup: KITCHEN,
        dropoff: { lat: 0, lng: 0 },
      }),
    );
    assert.equal(r.reason, 'PROVIDER_QUOTE_ROUTE_MISMATCH');
    assert.equal(r.projectedDeliveryCost, null);
  });

  it('27. Cached provider quote prices through PROVIDER_QUOTE_CACHE with LOW confidence', async () => {
    const r = expectPriced(
      await price({
        pricingMode: 'PROVIDER_QUOTE',
        route: roadRoute(8, 28),
        providerQuote: validQuote({ source: 'CACHED', cost: 129.6 }),
      }),
    );
    assert.equal(r.pricingMode, 'PROVIDER_QUOTE');
    assert.equal(r.pricingStep, 'PROVIDER_QUOTE_CACHE');
    assert.equal(r.projectedDeliveryCost, 130); // single final rounding point (INR integer)
    assert.equal(r.confidence, 'LOW');
    assert.equal(r.providerQuote?.source, 'CACHED');
    assert.equal(r.providerQuote?.cost, 130);
  });

  it('28. Step 6 exposes free-delivery readiness but never evaluates ₹599', async () => {
    const withoutThreshold = expectPriced(await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7) }));
    assert.equal(withoutThreshold.freeDelivery.enabled, false);
    assert.equal(withoutThreshold.freeDelivery.applied, false);
    assert.equal(withoutThreshold.freeDelivery.minimumOrderValue, null); // echo-only when configured
    assert.equal(withoutThreshold.freeDelivery.payer, null);
    assert.equal(withoutThreshold.freeDelivery.basis, null);

    // Even when a threshold is configured, Step 6 only exposes it — it never applies it.
    const withThreshold = expectPriced(
      await price({
        pricingMode: 'MARKET_BENCHMARK',
        route: roadRoute(8, 28),
        tenantDeliveryConfig: { ...MANA_INTI_CONFIG, freeDeliveryMinOrder: 599 },
        orderValue: 750, // above the threshold — still ignored by Step 6
      }),
    );
    assert.equal(withThreshold.freeDelivery.minimumOrderValue, 599);
    assert.equal(withThreshold.freeDelivery.enabled, false);
    assert.equal(withThreshold.freeDelivery.applied, false);
    assert.equal(withThreshold.customerDeliveryFee, 50); // pricing unchanged
    assert.equal(withThreshold.tenantSubsidy, 71); // no free-delivery subsidy invented
  });

  it('29. toDeliveryPricing maps engine output onto the decision-layer contract', async () => {
    const priced = expectPriced(await price({ pricingMode: 'MARKET_BENCHMARK', route: roadRoute(8, 28) }));
    const mapped = toDeliveryPricing(priced);
    assert.equal(mapped.pricingMode, 'MARKET_BENCHMARK');
    assert.equal(mapped.projectedCostSource, 'BENCHMARK');
    assert.equal(mapped.projectedDeliveryCost, 121);
    assert.equal(mapped.customerDeliveryFee, 50);
    assert.equal(mapped.tenantSubsidy, 71);
    assert.equal(mapped.routeSource, 'ROUTING_PROVIDER');
    assert.equal(mapped.freeDeliveryApplied, false);
    assert.equal(mapped.engineVersion, PRICING_ENGINE_ID);
    assert.equal(mapped.provider, undefined); // benchmark mode carries no provider

    // PENDING (provider quote requested but not yet supplied) maps without a
    // provider so the decision layer reports a PROVIDER_QUOTE pending requirement.
    const pending = await price({ pricingMode: 'PROVIDER_QUOTE', route: roadRoute(8, 28) });
    assert.equal(pending.status, 'PENDING');
    const mappedPending = toDeliveryPricing(pending);
    assert.equal(mappedPending.projectedCostSource, 'PROVIDER');
    assert.equal(mappedPending.customerDeliveryFee, null);
    assert.equal(mappedPending.provider, undefined);
    assert.equal(mappedPending.freeDeliveryApplied, false);
  });
});