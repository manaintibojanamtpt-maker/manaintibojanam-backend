/**
 * Phase 5 — STEP 7: Free Delivery + Tenant Subsidy Policy tests.
 *
 * Canonical policy: when `freeDelivery.enabled` is true and the order value
 * (SUBTOTAL basis — item subtotal before discount/tax/delivery/platform-fee/tip,
 * matching the existing checkout threshold semantics) reaches the tenant-configured
 * threshold, a PRICED result changes ONLY
 *   - customerDeliveryFee → ₹0
 *   - tenantSubsidy       → projectedDeliveryCost (null when the cost is unknown)
 * `projectedDeliveryCost`, route, distance, duration, benchmark reference and
 * provider quote are NEVER modified by the policy (core financial rule).
 *
 * Disabled policy / sub-threshold orders keep normal pricing. Legacy
 * `freeDeliveryMinOrder` stays supported as the threshold fallback but never
 * activates the policy by itself.
 *
 * No live providers, no Firestore — deterministic in-memory fixtures only.
 * ₹109 exists ONLY in this test fixture; ₹599 is ONLY the configured threshold.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createPricingEngine, toDeliveryPricing } from '../pricingEngine.js';
import type { PricedDeliveryResult, PricingEngineRequest, PricingResult } from '../pricingEngine.js';
import { createBenchmarkModel } from '../benchmarkModel.js';
import {
  FIXTURE_NOW,
  FIXTURE_REGION_PUNE,
  FIXTURE_VEHICLE_BIKE,
  createPlatformBenchmarkCatalog,
} from '../benchmarkFixtures.js';
import type { DeliveryBenchmark, ProviderQuoteResult, RouteResult } from '../deliveryIntelligenceTypes.js';
import { buildDeliveryDecision } from '../decisionEngine.js';
import type { DeliveryDecisionInput } from '../decisionEngine.js';
import type { DeliveryPricing } from '../deliveryIntelligenceTypes.js';


const AT = FIXTURE_NOW;
const NOW = new Date(FIXTURE_NOW);

const KITCHEN = { lat: 18.5285, lng: 73.9871, label: 'Inti kitchen' };
const DROPOFF = { lat: 18.5189, lng: 73.9322, label: 'Iris society' };

/** Owner storefront delivery config — Window-1 FIXED_TIER parity oracle. */
const MANA_INTI_CONFIG = {
  enabled: true,
  feesConfigured: true,
  freeRadius: 2,
  paidRadius: 7,
  maxRadius: 15,
  baseFee: 40,
  perKmCharge: 10,
} as const;

/**
 * Canonical Step-7 free-delivery policy config — the ONLY way the policy activates.
 * ₹599 is the configured threshold here; the engine never hardcodes it.
 */
const FREE_DELIVERY_599 = {
  enabled: true,
  minimumOrderValue: 599,
  payer: 'TENANT',
  basis: 'SUBTOTAL',
} as const;

const platformCatalog = createPlatformBenchmarkCatalog();
const benchmarkModel = createBenchmarkModel({ catalog: platformCatalog });
const engine = createPricingEngine({ benchmarkModel });

/**
 * Deterministic ₹109 benchmark fixture — this number may exist ONLY in test data.
 * 8 km / 28 min → max(109, 109 + 0·8) = ₹109.
 */
const BENCHMARK_109: DeliveryBenchmark = {
  id: 'bm-step7-fixture-109',
  regionKey: FIXTURE_REGION_PUNE,
  vehicleType: FIXTURE_VEHICLE_BIKE,
  effectiveFrom: '2026-01-01T00:00:00.000Z',
  effectiveUntil: null,
  source: 'STEP7_TEST_FIXTURE_ONLY',
  version: '1.0',
  pricing: { baseFare: 109, perKm: 0, perMinute: null, minFare: 109, pickupFee: null, dropFee: null },
  createdAt: '2026-01-01T00:00:00.000Z',
  createdBy: 'free-delivery-policy-test',
};

const engineBench109 = createPricingEngine({
  benchmarkModel: createBenchmarkModel({ catalog: [BENCHMARK_109] }),
});

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
    quoteId: 'quote-free-delivery-1',
    quotedAt: AT,
    providerExpiresAt: '2026-08-11T11:00:00.000Z',
    cost: 109,
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

/** MARKET_BENCHMARK engine whose only benchmark is the ₹109 fixture. */
function priceBench109(input: PricingEngineRequest): Promise<PricingResult> {
  return engineBench109.price({
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

function expectUnavailable(result: PricingResult): Extract<PricingResult, { readonly status: 'UNAVAILABLE' }> {
  assert.equal(result.status, 'UNAVAILABLE');
  return result as Extract<PricingResult, { readonly status: 'UNAVAILABLE' }>;
}

/** Minimal DeliveryDecision input wired from engine output (decision-layer contract). */
function decisionInput(
  pricing: DeliveryPricing,
  route: RouteResult,
  freeDelivery: NonNullable<DeliveryDecisionInput['freeDelivery']>,
  extra: Partial<DeliveryDecisionInput> = {},
): DeliveryDecisionInput {
  return {
    decisionId: 'dec-step7-test',
    tenantId: 'mana-inti',
    engineVersion: 'step7-test-v1',
    requestedAt: AT,
    orderType: 'delivery',
    pricingMode: pricing.pricingMode,
    deliveryEnabled: true,
    kitchenLocation: KITCHEN,
    customerLocation: DROPOFF,
    serviceability: { isServiceable: true, distanceKm: route.kind === 'UNAVAILABLE' ? null : route.distanceKm, reason: 'OK' },
    route,
    pricing,
    freeDelivery,
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

describe('Step 7 — Free Delivery + Tenant Subsidy Policy', () => {
  // ---------------------------------------------------------------------------
  // Threshold behaviour (FIXED_TIER 7 km → normal fee ₹40, cost unknown).
  // ---------------------------------------------------------------------------

  it('1. free delivery disabled → normal fee even above the threshold', async () => {
    const r = expectPriced(
      await price({
        pricingMode: 'FIXED_TIER',
        route: roadRoute(7),
        freeDelivery: { enabled: false, minimumOrderValue: 599 },
        orderValue: 750,
      }),
    );
    assert.equal(r.freeDelivery.enabled, false);
    assert.equal(r.freeDelivery.eligible, false);
    assert.equal(r.freeDelivery.applied, false);
    assert.equal(r.freeDelivery.reason, 'DISABLED');
    assert.equal(r.freeDelivery.minimumOrderValue, 599); // threshold still read through
    assert.equal(r.customerDeliveryFee, 40); // normal fee — no policy applied
    assert.equal(r.tenantSubsidy, null);
  });

  it('2. order 598 → normal delivery fee', async () => {
    const r = expectPriced(
      await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7), freeDelivery: FREE_DELIVERY_599, orderValue: 598 }),
    );
    assert.equal(r.freeDelivery.eligible, false);
    assert.equal(r.freeDelivery.applied, false);
    assert.equal(r.freeDelivery.reason, 'BELOW_THRESHOLD');
    assert.equal(r.customerDeliveryFee, 40);
    assert.equal(r.tenantSubsidy, null);
  });

  it('3. order 599 → FREE delivery', async () => {
    const r = expectPriced(
      await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7), freeDelivery: FREE_DELIVERY_599, orderValue: 599 }),
    );
    assert.equal(r.freeDelivery.eligible, true);
    assert.equal(r.freeDelivery.applied, true);
    assert.equal(r.freeDelivery.reason, 'THRESHOLD_MET');
    assert.equal(r.customerDeliveryFee, 0);
    assert.equal(r.projectedDeliveryCost, null); // FIXED_TIER cost stays unknown
    assert.equal(r.tenantSubsidy, null); // no invented subsidy
  });

  it('4. order 600 → FREE delivery', async () => {
    const r = expectPriced(
      await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7), freeDelivery: FREE_DELIVERY_599, orderValue: 600 }),
    );
    assert.equal(r.freeDelivery.eligible, true);
    assert.equal(r.freeDelivery.applied, true);
    assert.equal(r.customerDeliveryFee, 0);
  });

  it('5. order 598.99 → normal delivery fee (deterministic boundary)', async () => {
    const r = expectPriced(
      await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7), freeDelivery: FREE_DELIVERY_599, orderValue: 598.99 }),
    );
    assert.equal(r.freeDelivery.reason, 'BELOW_THRESHOLD');
    assert.equal(r.freeDelivery.eligible, false);
    assert.equal(r.customerDeliveryFee, 40);
  });

  it('6. order 599.00 → FREE delivery (deterministic boundary)', async () => {
    const r = expectPriced(
      await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7), freeDelivery: FREE_DELIVERY_599, orderValue: 599.0 }),
    );
    assert.equal(r.freeDelivery.reason, 'THRESHOLD_MET');
    assert.equal(r.freeDelivery.eligible, true);
    assert.equal(r.customerDeliveryFee, 0);
  });

  it('7. order 599.01 → FREE delivery (deterministic boundary)', async () => {
    const r = expectPriced(
      await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7), freeDelivery: FREE_DELIVERY_599, orderValue: 599.01 }),
    );
    assert.equal(r.freeDelivery.reason, 'THRESHOLD_MET');
    assert.equal(r.freeDelivery.eligible, true);
    assert.equal(r.customerDeliveryFee, 0);
  });

  // ---------------------------------------------------------------------------
  // Projected-cost economics (deterministic ₹109 fixture, 8 km → fee ₹50).
  // ---------------------------------------------------------------------------

  it('8. known projected cost + free delivery → fee 0, subsidy = cost, cost unchanged', async () => {
    const r = expectPriced(
      await priceBench109({
        pricingMode: 'MARKET_BENCHMARK',
        route: roadRoute(8, 28),
        freeDelivery: FREE_DELIVERY_599,
        orderValue: 650,
      }),
    );
    assert.equal(r.projectedDeliveryCost, 109);
    assert.equal(r.projectedCostSource, 'BENCHMARK');
    assert.equal(r.customerDeliveryFee, 0);
    assert.equal(r.tenantSubsidy, 109); // tenant absorbs the full projected cost
    assert.equal(r.freeDelivery.applied, true);
  });

  it('9. known projected cost + paid delivery → fee normal, subsidy = cost − fee', async () => {
    const r = expectPriced(
      await priceBench109({
        pricingMode: 'MARKET_BENCHMARK',
        route: roadRoute(8, 28),
        freeDelivery: FREE_DELIVERY_599,
        orderValue: 500,
      }),
    );
    assert.equal(r.projectedDeliveryCost, 109);
    assert.equal(r.customerDeliveryFee, 50);
    assert.equal(r.tenantSubsidy, 59); // 109 − 50
    assert.equal(r.freeDelivery.applied, false);
  });

  it('10. unknown projected cost + free delivery → fee 0, subsidy null (no invented cost)', async () => {
    const r = expectPriced(
      await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7), freeDelivery: FREE_DELIVERY_599, orderValue: 750 }),
    );
    assert.equal(r.customerDeliveryFee, 0);
    assert.equal(r.projectedDeliveryCost, null);
    assert.equal(r.projectedCostSource, 'UNKNOWN');
    assert.equal(r.tenantSubsidy, null);
    assert.equal(r.freeDelivery.applied, true);
  });

  it('11. unknown projected cost + paid delivery → fee normal, subsidy null', async () => {
    const r = expectPriced(
      await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7), freeDelivery: FREE_DELIVERY_599, orderValue: 500 }),
    );
    assert.equal(r.customerDeliveryFee, 40);
    assert.equal(r.tenantSubsidy, null);
  });

  // ---------------------------------------------------------------------------
  // Tenant isolation — thresholds are tenant configuration, never shared.
  // ---------------------------------------------------------------------------

  it('12. tenant A threshold ₹599 → order 599 is FREE', async () => {
    const r = expectPriced(
      await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7), freeDelivery: FREE_DELIVERY_599, orderValue: 599 }),
    );
    assert.equal(r.freeDelivery.minimumOrderValue, 599);
    assert.equal(r.freeDelivery.eligible, true);
    assert.equal(r.customerDeliveryFee, 0);
  });

  it('13. tenant B threshold ₹999 → order 599 paid, order 999 FREE', async () => {
    const tenantB = { enabled: true, minimumOrderValue: 999, payer: 'TENANT', basis: 'SUBTOTAL' } as const;
    const below = expectPriced(
      await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7), freeDelivery: tenantB, orderValue: 599 }),
    );
    assert.equal(below.freeDelivery.reason, 'BELOW_THRESHOLD');
    assert.equal(below.customerDeliveryFee, 40);
    const at = expectPriced(
      await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7), freeDelivery: tenantB, orderValue: 999 }),
    );
    assert.equal(at.freeDelivery.reason, 'THRESHOLD_MET');
    assert.equal(at.customerDeliveryFee, 0);
  });

  it('14. tenant isolation — thresholds never leak between tenants', async () => {
    const tenantA = FREE_DELIVERY_599;
    const tenantB = { enabled: true, minimumOrderValue: 999, payer: 'TENANT', basis: 'SUBTOTAL' } as const;
    const a = expectPriced(
      await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7), freeDelivery: tenantA, orderValue: 700 }),
    );
    const b = expectPriced(
      await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7), freeDelivery: tenantB, orderValue: 700 }),
    );
    assert.equal(a.freeDelivery.eligible, true);
    assert.equal(a.customerDeliveryFee, 0);
    assert.equal(b.freeDelivery.eligible, false);
    assert.equal(b.customerDeliveryFee, 40);
  });

  // ---------------------------------------------------------------------------
  // Basis semantics — SUBTOTAL (pre-discount, pre-tax, pre-fee, pre-tip).
  // ---------------------------------------------------------------------------

  it('15. SUBTOTAL basis + TENANT payer recorded on the decision', async () => {
    const r = expectPriced(
      await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7), freeDelivery: FREE_DELIVERY_599, orderValue: 650 }),
    );
    assert.equal(r.freeDelivery.basis, 'SUBTOTAL');
    assert.equal(r.freeDelivery.payer, 'TENANT');
    assert.equal(r.freeDelivery.orderValue, 650);
    assert.equal(r.freeDelivery.minimumOrderValue, 599);
    assert.equal(r.freeDelivery.reason, 'THRESHOLD_MET');
  });

  it('16. configured basis (SUBTOTAL) is honored and recorded', async () => {
    const r = expectPriced(
      await price({
        pricingMode: 'FIXED_TIER',
        route: roadRoute(7),
        freeDelivery: { enabled: true, minimumOrderValue: 599, payer: 'TENANT', basis: 'SUBTOTAL' },
        orderValue: 650,
      }),
    );
    assert.equal(r.freeDelivery.basis, 'SUBTOTAL');
    assert.equal(r.customerDeliveryFee, 0);
  });

  it('17. discount interaction — threshold basis is pre-discount SUBTOTAL', async () => {
    // The checkout passes the item subtotal BEFORE discount/tax/delivery fee/tip as
    // orderValue. A ₹100 discount would put the effective total at ₹499, but the
    // ₹599 SUBTOTAL still qualifies — the engine compares the SUBTOTAL basis only,
    // and it has no discount/tax/grandTotal input at all (see compile-time guard).
    const r = expectPriced(
      await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7), freeDelivery: FREE_DELIVERY_599, orderValue: 599 }),
    );
    assert.equal(r.freeDelivery.basis, 'SUBTOTAL');
    assert.equal(r.freeDelivery.eligible, true);
    assert.equal(r.customerDeliveryFee, 0);
  });

  // ---------------------------------------------------------------------------
  // Mode interactions — FIXED_TIER / MARKET_BENCHMARK / PROVIDER_QUOTE.
  // ---------------------------------------------------------------------------

  it('18. FIXED_TIER + free delivery → fee 0, cost null, subsidy null (₹40 never becomes a cost)', async () => {
    const r = expectPriced(
      await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7), freeDelivery: FREE_DELIVERY_599, orderValue: 750 }),
    );
    assert.equal(r.pricingStep, 'FIXED_TIER');
    assert.equal(r.customerDeliveryFee, 0);
    assert.equal(r.projectedDeliveryCost, null);
    assert.equal(r.projectedCostSource, 'UNKNOWN');
    assert.equal(r.tenantSubsidy, null);
    assert.equal(r.freeDelivery.applied, true);
  });

  it('19. MARKET_BENCHMARK + free delivery → only fee/subsidy change; route+benchmark intact', async () => {
    const free = expectPriced(
      await price({ pricingMode: 'MARKET_BENCHMARK', route: roadRoute(8, 28), freeDelivery: FREE_DELIVERY_599, orderValue: 750 }),
    );
    assert.equal(free.projectedDeliveryCost, 121);
    assert.equal(free.customerDeliveryFee, 0);
    assert.equal(free.tenantSubsidy, 121);
    assert.equal(free.distanceKm, 8);
    assert.equal(free.durationMinutes, 28);
    assert.equal(free.routeSource, 'ROUTING_PROVIDER');
    assert.equal(free.benchmark?.id, 'bm-pune-bike-2');
    assert.equal(free.benchmarkCalculation?.projectedDeliveryCost, 121);
    // Paid comparison: same request, sub-threshold order → normal economics.
    const paid = expectPriced(
      await price({ pricingMode: 'MARKET_BENCHMARK', route: roadRoute(8, 28), freeDelivery: FREE_DELIVERY_599, orderValue: 500 }),
    );
    assert.equal(paid.projectedDeliveryCost, 121);
    assert.equal(paid.customerDeliveryFee, 50);
    assert.equal(paid.tenantSubsidy, 71);
  });

  it('20. provider quote + free delivery → fee 0, subsidy = quote cost, quote untouched', async () => {
    const r = expectPriced(
      await price({
        pricingMode: 'PROVIDER_QUOTE',
        route: roadRoute(8, 28),
        providerQuote: validQuote({ cost: 109 }),
        pickup: KITCHEN,
        dropoff: DROPOFF,
        freeDelivery: FREE_DELIVERY_599,
        orderValue: 650,
      }),
    );
    assert.equal(r.projectedDeliveryCost, 109);
    assert.equal(r.projectedCostSource, 'PROVIDER');
    assert.equal(r.customerDeliveryFee, 0);
    assert.equal(r.tenantSubsidy, 109);
    assert.equal(r.providerQuote?.cost, 109); // quote reference stays authentic
    assert.equal(r.providerQuote?.provider, 'porter');
    assert.equal(r.freeDelivery.applied, true);
  });

  // ---------------------------------------------------------------------------
  // Subsidy honesty — subsidy exists only when a projected cost is known.
  // ---------------------------------------------------------------------------

  it('21. subsidy arithmetic — paid 109 − 50 = 59; free → 109', async () => {
    const paid = expectPriced(
      await price({
        pricingMode: 'PROVIDER_QUOTE',
        route: roadRoute(8, 28),
        providerQuote: validQuote({ cost: 109 }),
        pickup: KITCHEN,
        dropoff: DROPOFF,
        freeDelivery: FREE_DELIVERY_599,
        orderValue: 500,
      }),
    );
    assert.equal(paid.customerDeliveryFee, 50);
    assert.equal(paid.tenantSubsidy, 59);
    const free = expectPriced(
      await price({
        pricingMode: 'PROVIDER_QUOTE',
        route: roadRoute(8, 28),
        providerQuote: validQuote({ cost: 109 }),
        pickup: KITCHEN,
        dropoff: DROPOFF,
        freeDelivery: FREE_DELIVERY_599,
        orderValue: 650,
      }),
    );
    assert.equal(free.customerDeliveryFee, 0);
    assert.equal(free.tenantSubsidy, 109);
  });

  it('22. subsidy stays null when the cost is unknown — even with free delivery', async () => {
    const r = expectPriced(
      await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7), freeDelivery: FREE_DELIVERY_599, orderValue: 750 }),
    );
    assert.equal(r.customerDeliveryFee, 0);
    assert.equal(r.projectedDeliveryCost, null);
    assert.equal(r.tenantSubsidy, null);
    assert.equal(r.freeDelivery.applied, true);
  });

  // ---------------------------------------------------------------------------
  // No magic numbers — ₹109 only in test fixtures, ₹599 only as configuration.
  // ---------------------------------------------------------------------------

  it('23. ₹109 exists only in this test fixture — never in pricing engine source', async () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/delivery/pricingEngine.ts'),
      'utf8',
    );
    assert.equal(source.includes('109'), false, '₹109 must exist only in explicit test fixtures');
    // The ₹109 fixture engine really produces ₹109.
    const r = expectPriced(
      await priceBench109({ pricingMode: 'MARKET_BENCHMARK', route: roadRoute(8, 28) }),
    );
    assert.equal(r.projectedDeliveryCost, 109);
  });

  it('24. ₹599 is only configuration — no ₹599 logic literal in the engine source', async () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/delivery/pricingEngine.ts'),
      'utf8',
    );
    // Prose may mention ₹599 (owner-form default); a BARE 599 literal (preceded by
    // anything other than ₹) would be a hardcoded business rule.
    assert.equal(
      /(?<![₹\d\w])599/.test(source),
      false,
      '₹599 must be tenant configuration, never a pricing-engine literal',
    );
    // The engine applies a tenant-configured threshold (599 here), proving read-through.
    const r = expectPriced(
      await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7), freeDelivery: FREE_DELIVERY_599, orderValue: 599 }),
    );
    assert.equal(r.freeDelivery.minimumOrderValue, 599);
    assert.equal(r.customerDeliveryFee, 0);
  });

  // ---------------------------------------------------------------------------
  // Audit metadata, input-surface security, and the core financial proof.
  // ---------------------------------------------------------------------------

  it('25. reason/audit metadata — the decision records the full canonical picture', async () => {
    const r = expectPriced(
      await priceBench109({
        pricingMode: 'MARKET_BENCHMARK',
        route: roadRoute(8, 28),
        freeDelivery: FREE_DELIVERY_599,
        orderValue: 650,
      }),
    );
    assert.equal(r.freeDelivery.enabled, true);
    assert.equal(r.freeDelivery.eligible, true);
    assert.equal(r.freeDelivery.applied, true);
    assert.equal(r.freeDelivery.reason, 'THRESHOLD_MET');
    assert.equal(r.freeDelivery.minimumOrderValue, 599);
    assert.equal(r.freeDelivery.orderValue, 650);
    assert.equal(r.freeDelivery.basis, 'SUBTOTAL');
    assert.equal(r.freeDelivery.payer, 'TENANT');
    // Contract mapping carries the applied flag + zeroed fee through.
    const pricing = toDeliveryPricing(r);
    assert.equal(pricing.freeDeliveryApplied, true);
    assert.equal(pricing.customerDeliveryFee, 0);
    assert.equal(pricing.tenantSubsidy, 109);
    assert.equal(pricing.projectedDeliveryCost, 109);
  });

  it('26. no client-authoritative fee input — fee/subsidy derive server-side only', async () => {
    // Compile-time: the request type must REJECT any client-supplied fee/subsidy.
    // @ts-expect-error — freeDeliveryApplied is an OUTPUT, never a request input
    const req1: PricingEngineRequest = { pricingMode: 'FIXED_TIER', freeDeliveryApplied: true };
    void req1;
    // @ts-expect-error — customerDeliveryFee is an OUTPUT, never a request input
    const req2: PricingEngineRequest = { pricingMode: 'FIXED_TIER', customerDeliveryFee: 0 };
    void req2;
    // @ts-expect-error — tenantSubsidy is an OUTPUT, never a request input
    const req3: PricingEngineRequest = { pricingMode: 'FIXED_TIER', tenantSubsidy: 0 };
    void req3;
    // @ts-expect-error — grandTotal/discount/tax must never feed the threshold basis
    const req4: PricingEngineRequest = { pricingMode: 'FIXED_TIER', grandTotal: 549 };
    void req4;
    // Runtime: the engine derives every fee/subsidy value from config + order value.
    const r = expectPriced(
      await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7), freeDelivery: FREE_DELIVERY_599, orderValue: 750 }),
    );
    assert.equal(r.customerDeliveryFee, 0);
    assert.equal(r.tenantSubsidy, null);
  });

  it('27. THE core financial proof — projectedDeliveryCost is unchanged by free delivery', async () => {
    const paid = expectPriced(
      await price({ pricingMode: 'MARKET_BENCHMARK', route: roadRoute(8, 28), freeDelivery: FREE_DELIVERY_599, orderValue: 500 }),
    );
    const free = expectPriced(
      await price({ pricingMode: 'MARKET_BENCHMARK', route: roadRoute(8, 28), freeDelivery: FREE_DELIVERY_599, orderValue: 750 }),
    );
    // Everything EXCEPT fee/subsidy/freeDelivery.applied is bit-for-bit identical.
    assert.equal(free.projectedDeliveryCost, paid.projectedDeliveryCost);
    assert.equal(free.projectedCostSource, paid.projectedCostSource);
    assert.equal(free.distanceKm, paid.distanceKm);
    assert.equal(free.durationMinutes, paid.durationMinutes);
    assert.equal(free.routeSource, paid.routeSource);
    assert.deepEqual(free.benchmark, paid.benchmark);
    assert.deepEqual(free.benchmarkCalculation, paid.benchmarkCalculation);
    assert.equal(free.confidence, paid.confidence);
    assert.equal(free.pricingStep, paid.pricingStep);
    // Only the delivery-fee economics and the applied flag differ.
    assert.equal(paid.customerDeliveryFee, 50);
    assert.equal(free.customerDeliveryFee, 0);
    assert.equal(paid.tenantSubsidy, 71);
    assert.equal(free.tenantSubsidy, 121);
    assert.equal(paid.freeDelivery.applied, false);
    assert.equal(free.freeDelivery.applied, true);
  });

  // ---------------------------------------------------------------------------
  // Edge coverage — missing order value, legacy fallback, non-PRICED safety.
  // ---------------------------------------------------------------------------

  it('28. no order value → policy not applied (NO_ORDER_VALUE), fee normal', async () => {
    const r = expectPriced(
      await price({ pricingMode: 'FIXED_TIER', route: roadRoute(7), freeDelivery: FREE_DELIVERY_599 }),
    );
    assert.equal(r.freeDelivery.eligible, false);
    assert.equal(r.freeDelivery.applied, false);
    assert.equal(r.freeDelivery.reason, 'NO_ORDER_VALUE');
    assert.equal(r.customerDeliveryFee, 40);
  });

  it('29. legacy freeDeliveryMinOrder stays the threshold fallback — never auto-enables', async () => {
    const legacyConfig = { ...MANA_INTI_CONFIG, freeDeliveryMinOrder: 599 } as const;
    // Canonical enabled:true + legacy threshold only → threshold read through.
    const canonical = expectPriced(
      await price({
        tenantDeliveryConfig: legacyConfig,
        pricingMode: 'FIXED_TIER',
        route: roadRoute(7),
        freeDelivery: { enabled: true },
        orderValue: 599,
      }),
    );
    assert.equal(canonical.freeDelivery.minimumOrderValue, 599); // legacy fallback value
    assert.equal(canonical.freeDelivery.enabled, true);
    assert.equal(canonical.freeDelivery.eligible, true);
    assert.equal(canonical.customerDeliveryFee, 0);
    // Legacy value alone (no canonical `enabled`) → policy stays OFF (Step-6 parity).
    const legacyOnly = expectPriced(
      await price({
        tenantDeliveryConfig: legacyConfig,
        pricingMode: 'FIXED_TIER',
        route: roadRoute(7),
        orderValue: 750,
      }),
    );
    assert.equal(legacyOnly.freeDelivery.enabled, false);
    assert.equal(legacyOnly.freeDelivery.applied, false);
    assert.equal(legacyOnly.freeDelivery.reason, 'DISABLED');
    assert.equal(legacyOnly.customerDeliveryFee, 40);
  });

  it('30. UNAVAILABLE / PENDING results never claim applied free delivery', async () => {
    const unavailable = expectUnavailable(
      await price({
        pricingMode: 'MARKET_BENCHMARK',
        route: unavailableRoute(),
        freeDelivery: FREE_DELIVERY_599,
        orderValue: 750,
      }),
    );
    assert.equal(unavailable.status, 'UNAVAILABLE');
    assert.equal(unavailable.freeDelivery.eligible, true);
    assert.equal(unavailable.freeDelivery.applied, false);
    const pending = await price({
      pricingMode: 'PROVIDER_QUOTE',
      route: roadRoute(8, 28),
      freeDelivery: FREE_DELIVERY_599,
      orderValue: 750,
    });
    assert.equal(pending.status, 'PENDING');
    assert.equal(pending.freeDelivery.eligible, true);
    assert.equal(pending.freeDelivery.applied, false);
  });

  it('31. decision-level end-to-end — AVAILABLE with FREE_DELIVERY subsidy', async () => {
    const r = expectPriced(
      await priceBench109({
        pricingMode: 'MARKET_BENCHMARK',
        route: roadRoute(8, 28),
        freeDelivery: FREE_DELIVERY_599,
        orderValue: 650,
      }),
    );
    const decision = buildDeliveryDecision(
      decisionInput(toDeliveryPricing(r), roadRoute(8, 28), r.freeDelivery),
    );
    assert.equal(decision.status, 'AVAILABLE');
    assert.equal(decision.pricing?.customerDeliveryFee, 0);
    assert.equal(decision.pricing?.freeDeliveryApplied, true);
    assert.equal(decision.subsidy?.basis, 'FREE_DELIVERY');
    assert.equal(decision.subsidy?.tenantSubsidy, 109);
    assert.equal(decision.freeDelivery.applied, true);
    assert.equal(decision.freeDelivery.reason, 'THRESHOLD_MET');
  });
});







