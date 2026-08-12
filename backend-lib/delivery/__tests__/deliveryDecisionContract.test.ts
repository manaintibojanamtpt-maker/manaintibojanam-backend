import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DeliveryDecisionContractViolation,
  assertRoadRoute,
  buildDeliveryDecision,
  validateDeliveryDecisionInput,
} from '../decisionEngine.js';
import type { DeliveryDecisionInput } from '../decisionEngine.js';
import type {
  DeliveryPricing,
  EtaEstimate,
  PrepEstimate,
  RouteResult,
  RouteRoadResult,
  ServiceabilityDecision,
} from '../deliveryIntelligenceTypes.js';

const AT = '2026-08-11T10:00:00.000Z';
const ENGINE = 'phase5-test-v1';

const KITCHEN = { lat: 18.5285, lng: 73.9871 };
const CUSTOMER = { lat: 18.5189, lng: 73.9322 };

// Route fixtures — server-produced only (no client distance exists in this contract).
const STRAIGHT_LINE_ROUTE: RouteResult = {
  kind: 'STRAIGHT_LINE',
  source: 'STRAIGHT_LINE',
  distanceKm: 8,
  durationMinutes: null,
  fetchedAt: AT,
};

const ROAD_ROUTE: RouteResult = {
  kind: 'ROAD',
  source: 'ROUTING_PROVIDER',
  distanceKm: 8,
  durationMinutes: 28,
  provider: 'ors_test',
  fetchedAt: AT,
};

// Pricing fixtures — contract inputs only; the builder never computes these numbers.
const FIXED_TIER_UNKNOWN: DeliveryPricing = {
  pricingMode: 'FIXED_TIER',
  distanceKm: 8,
  routeSource: 'STRAIGHT_LINE',
  projectedDeliveryCost: null,
  projectedCostSource: 'UNKNOWN',
  customerDeliveryFee: 70,
  freeDeliveryApplied: false,
  tenantSubsidy: null,
  confidence: 'MEDIUM',
  calculatedAt: AT,
  engineVersion: ENGINE,
};

const FIXED_TIER_ROAD: DeliveryPricing = {
  ...FIXED_TIER_UNKNOWN,
  routeSource: 'ROUTING_PROVIDER',
};

const FREE_KNOWN_COST: DeliveryPricing = {
  pricingMode: 'FIXED_TIER',
  distanceKm: 8,
  routeSource: 'STRAIGHT_LINE',
  projectedDeliveryCost: 120,
  projectedCostSource: 'BENCHMARK',
  customerDeliveryFee: 0,
  freeDeliveryApplied: true,
  tenantSubsidy: null,
  confidence: 'MEDIUM',
  calculatedAt: AT,
  engineVersion: ENGINE,
};

const FREE_UNKNOWN_COST: DeliveryPricing = {
  ...FIXED_TIER_UNKNOWN,
  customerDeliveryFee: 0,
  freeDeliveryApplied: true,
};

const PROVIDER_PRICING_UNKNOWN: DeliveryPricing = {
  pricingMode: 'PROVIDER_QUOTE',
  distanceKm: 8,
  routeSource: 'ROUTING_PROVIDER',
  projectedDeliveryCost: null,
  projectedCostSource: 'UNKNOWN',
  customerDeliveryFee: null,
  freeDeliveryApplied: false,
  tenantSubsidy: null,
  confidence: 'UNAVAILABLE',
  calculatedAt: AT,
  engineVersion: ENGINE,
};

const MARKET_PRICING_KNOWN: DeliveryPricing = {
  pricingMode: 'MARKET_BENCHMARK',
  distanceKm: 8,
  routeSource: 'ROUTING_PROVIDER',
  projectedDeliveryCost: 120,
  projectedCostSource: 'BENCHMARK',
  customerDeliveryFee: 140,
  freeDeliveryApplied: false,
  tenantSubsidy: null,
  confidence: 'MEDIUM',
  calculatedAt: AT,
  engineVersion: ENGINE,
};

const MARKET_PRICING_UNKNOWN: DeliveryPricing = {
  ...PROVIDER_PRICING_UNKNOWN,
  pricingMode: 'MARKET_BENCHMARK',
};

const PROVIDER_PRICING_NO_QUOTE: DeliveryPricing = {
  ...MARKET_PRICING_KNOWN,
  pricingMode: 'PROVIDER_QUOTE',
  projectedCostSource: 'PROVIDER',
  // provider deliberately omitted → the builder must report PENDING (PROVIDER_QUOTE).
};

// ETA fixtures.
const ETA_ESTIMATE_ONLY: EtaEstimate = {
  status: 'ESTIMATE_ONLY',
  confidence: 'LOW',
  minMinutes: 55,
  maxMinutes: 68,
  components: [],
  basedOnRoadRoute: false,
  calculatedAt: AT,
};

const ETA_AUTHORITATIVE: EtaEstimate = {
  status: 'AUTHORITATIVE',
  confidence: 'HIGH',
  minMinutes: 45,
  maxMinutes: 58,
  components: [],
  basedOnRoadRoute: true,
  calculatedAt: AT,
};

const ETA_UNAVAILABLE: EtaEstimate = {
  status: 'UNAVAILABLE',
  confidence: 'UNAVAILABLE',
  minMinutes: null,
  maxMinutes: null,
  components: [],
  basedOnRoadRoute: false,
  calculatedAt: AT,
};

const PREP: PrepEstimate = {
  estimatedMinutes: 25,
  remainingMinutes: null,
  source: 'CONFIG',
  confidence: 'MEDIUM',
  calculatedAt: AT,
};

const SERVICEABLE: ServiceabilityDecision = { isServiceable: true, distanceKm: 8, reason: 'OK' };
const OUT_OF_RADIUS: ServiceabilityDecision = {
  isServiceable: false,
  distanceKm: 8,
  reason: 'OUT_OF_RADIUS',
};

function baseInput(overrides: Partial<DeliveryDecisionInput> = {}): DeliveryDecisionInput {
  return {
    decisionId: 'decision-1',
    tenantId: 'mana-inti',
    engineVersion: ENGINE,
    requestedAt: AT,
    orderType: 'delivery',
    pricingMode: 'FIXED_TIER',
    deliveryEnabled: true,
    kitchenLocation: KITCHEN,
    customerLocation: CUSTOMER,
    serviceability: SERVICEABLE,
    route: STRAIGHT_LINE_ROUTE,
    pricing: FIXED_TIER_UNKNOWN,
    prep: PREP,
    eta: ETA_ESTIMATE_ONLY,
    ...overrides,
  };
}

/** Compile-time-only guard used to prove STRAIGHT_LINE can never satisfy ROAD consumers. */
function assertRoadOnly(_route: RouteRoadResult): void {
  // no runtime behavior — the type constraint is what is being tested
}

describe('delivery decision contract (Step 3)', () => {
  it('1. produces a valid AVAILABLE decision for a fully-supported FIXED_TIER request', () => {
    const decision = buildDeliveryDecision(baseInput());
    assert.equal(decision.status, 'AVAILABLE');
    assert.equal(decision.reason, null);
    assert.equal(decision.id, 'decision-1');
    assert.equal(decision.tenantId, 'mana-inti');
    assert.equal(decision.route.kind, 'STRAIGHT_LINE');
    assert.equal(decision.pricing.customerDeliveryFee, 70);
    assert.equal(decision.pricing.tenantSubsidy, null);
    assert.equal(decision.subsidy.basis, 'UNKNOWN_COST');
  });

  it('2. returns PENDING and identifies exactly what is missing', () => {
    const decision = buildDeliveryDecision(
      baseInput({ route: undefined, pricing: undefined, eta: undefined, prep: undefined }),
    );
    assert.equal(decision.status, 'PENDING');
    assert.notEqual(decision.status, 'AVAILABLE');
    assert.deepEqual(decision.pendingRequirements, ['ROUTE', 'PRICING', 'PREP', 'ETA']);
    assert.equal(decision.reason, null);
  });

  it('3. returns UNAVAILABLE with a meaningful reason for hard blockers', () => {
    const disabled = buildDeliveryDecision(baseInput({ deliveryEnabled: false }));
    assert.equal(disabled.status, 'UNAVAILABLE');
    assert.equal(disabled.reason, 'DELIVERY_DISABLED');

    const outside = buildDeliveryDecision(baseInput({ serviceability: OUT_OF_RADIUS }));
    assert.equal(outside.status, 'UNAVAILABLE');
    assert.equal(outside.reason, 'OUTSIDE_DELIVERY_AREA');
  });

  it('4. missing route stays PENDING (FIXED_TIER) and never becomes AVAILABLE', () => {
    const decision = buildDeliveryDecision(baseInput({ route: undefined }));
    assert.equal(decision.status, 'PENDING');
    assert.ok(decision.pendingRequirements?.includes('ROUTE'));
  });

  it('5. missing pricing stays PENDING and lists PRICING', () => {
    const decision = buildDeliveryDecision(baseInput({ pricing: undefined }));
    assert.equal(decision.status, 'PENDING');
    assert.ok(decision.pendingRequirements?.includes('PRICING'));
  });

  it('6. missing ETA stays PENDING and lists ETA', () => {
    const decision = buildDeliveryDecision(baseInput({ eta: undefined }));
    assert.equal(decision.status, 'PENDING');
    assert.ok(decision.pendingRequirements?.includes('ETA'));
  });

  it('7. invalid/missing locations are UNAVAILABLE with the right reason', () => {
    const noKitchen = buildDeliveryDecision(
      baseInput({ kitchenLocation: { lat: 0, lng: 0 } }),
    );
    assert.equal(noKitchen.status, 'UNAVAILABLE');
    assert.equal(noKitchen.reason, 'MISSING_KITCHEN_LOCATION');

    const noCustomer = buildDeliveryDecision(baseInput({ customerLocation: null }));
    assert.equal(noCustomer.status, 'UNAVAILABLE');
    assert.equal(noCustomer.reason, 'MISSING_CUSTOMER_LOCATION');
  });

  it('8. FIXED_TIER with unknown projected cost is AVAILABLE and keeps subsidy null', () => {
    const decision = buildDeliveryDecision(baseInput());
    assert.equal(decision.status, 'AVAILABLE');
    assert.equal(decision.pricing.projectedDeliveryCost, null);
    assert.equal(decision.pricing.projectedCostSource, 'UNKNOWN');
    assert.equal(decision.pricing.tenantSubsidy, null);
    assert.equal(decision.subsidy.tenantSubsidy, null);
  });

  it('9. free delivery with known projected cost yields tenantSubsidy = cost', () => {
    const decision = buildDeliveryDecision(
      baseInput({
        pricing: FREE_KNOWN_COST,
        freeDelivery: {
          enabled: true,
          thresholdAmount: 599,
          applied: true,
          reason: 'ABOVE_THRESHOLD',
        },
      }),
    );
    assert.equal(decision.status, 'AVAILABLE');
    assert.equal(decision.pricing.customerDeliveryFee, 0);
    assert.equal(decision.pricing.freeDeliveryApplied, true);
    assert.equal(decision.pricing.tenantSubsidy, 120);
    assert.equal(decision.subsidy.basis, 'FREE_DELIVERY');
    assert.equal(decision.subsidy.tenantSubsidy, 120);
  });

  it('10. free delivery with unknown projected cost keeps tenantSubsidy null', () => {
    const decision = buildDeliveryDecision(
      baseInput({
        pricing: FREE_UNKNOWN_COST,
        freeDelivery: {
          enabled: true,
          thresholdAmount: 599,
          applied: true,
          reason: 'ABOVE_THRESHOLD',
        },
      }),
    );
    assert.equal(decision.pricing.customerDeliveryFee, 0);
    assert.equal(decision.pricing.freeDeliveryApplied, true);
    assert.equal(decision.pricing.projectedDeliveryCost, null);
    assert.equal(decision.pricing.tenantSubsidy, null);
    assert.equal(decision.subsidy.basis, 'UNKNOWN_COST');
    assert.equal(decision.subsidy.tenantSubsidy, null);
  });

  it('11. STRAIGHT_LINE can never satisfy a ROAD-only consumer', () => {
    assert.throws(() => assertRoadRoute(STRAIGHT_LINE_ROUTE), DeliveryDecisionContractViolation);
    assert.equal(assertRoadRoute(ROAD_ROUTE).kind, 'ROAD');

    assert.throws(
      () =>
        buildDeliveryDecision(
          baseInput({ route: STRAIGHT_LINE_ROUTE, eta: ETA_AUTHORITATIVE }),
        ),
      DeliveryDecisionContractViolation,
    );
    assert.throws(
      () =>
        buildDeliveryDecision(
          baseInput({ route: ROAD_ROUTE, pricing: FIXED_TIER_UNKNOWN }),
        ),
      DeliveryDecisionContractViolation,
    );
  });

  it('12. ETA status is preserved (ESTIMATE_ONLY and AUTHORITATIVE)', () => {
    const estimate = buildDeliveryDecision(baseInput());
    assert.equal(estimate.eta.status, 'ESTIMATE_ONLY');

    const authoritative = buildDeliveryDecision(
      baseInput({ route: ROAD_ROUTE, pricing: FIXED_TIER_ROAD, eta: ETA_AUTHORITATIVE }),
    );
    assert.equal(authoritative.eta.status, 'AUTHORITATIVE');
    assert.equal(authoritative.eta.basedOnRoadRoute, true);
  });

  it('13. ETA confidence is preserved and feeds the decision confidence', () => {
    const estimate = buildDeliveryDecision(baseInput());
    assert.equal(estimate.eta.confidence, 'LOW');
    assert.equal(estimate.confidence, 'LOW');

    const authoritative = buildDeliveryDecision(
      baseInput({ route: ROAD_ROUTE, pricing: FIXED_TIER_ROAD, eta: ETA_AUTHORITATIVE }),
    );
    assert.equal(authoritative.eta.confidence, 'HIGH');
    // Worst of pricing(MEDIUM)/prep(MEDIUM)/eta(HIGH) must stay MEDIUM.
    assert.equal(authoritative.confidence, 'MEDIUM');
  });

  it('14. engine version and decision identity are preserved', () => {
    const decision = buildDeliveryDecision(baseInput());
    assert.equal(decision.engineVersion, ENGINE);
    assert.equal(decision.id, 'decision-1');
    assert.equal(decision.decidedAt, AT);
  });

  it('PROVIDER_QUOTE without ROAD evidence is UNAVAILABLE with ROUTE_UNAVAILABLE', () => {
    const decision = buildDeliveryDecision(
      baseInput({
        pricingMode: 'PROVIDER_QUOTE',
        route: STRAIGHT_LINE_ROUTE,
        pricing: { ...PROVIDER_PRICING_UNKNOWN, routeSource: 'STRAIGHT_LINE' },
        eta: ETA_ESTIMATE_ONLY,
      }),
    );
    assert.equal(decision.status, 'UNAVAILABLE');
    assert.equal(decision.reason, 'ROUTE_UNAVAILABLE');
  });

  it('PROVIDER_QUOTE with unknown projected cost is UNAVAILABLE (PROVIDER_UNAVAILABLE)', () => {
    const decision = buildDeliveryDecision(
      baseInput({
        pricingMode: 'PROVIDER_QUOTE',
        route: ROAD_ROUTE,
        pricing: PROVIDER_PRICING_UNKNOWN,
        eta: ETA_AUTHORITATIVE,
      }),
    );
    assert.equal(decision.status, 'UNAVAILABLE');
    assert.equal(decision.reason, 'PROVIDER_UNAVAILABLE');
  });

  it('MARKET_BENCHMARK with unknown projected cost is UNAVAILABLE (PRICING_UNAVAILABLE)', () => {
    const decision = buildDeliveryDecision(
      baseInput({
        pricingMode: 'MARKET_BENCHMARK',
        route: ROAD_ROUTE,
        pricing: MARKET_PRICING_UNKNOWN,
        eta: ETA_AUTHORITATIVE,
      }),
    );
    assert.equal(decision.status, 'UNAVAILABLE');
    assert.equal(decision.reason, 'PRICING_UNAVAILABLE');
  });

  it('MARKET_BENCHMARK with unavailable ETA is UNAVAILABLE (ETA_UNAVAILABLE)', () => {
    const decision = buildDeliveryDecision(
      baseInput({
        pricingMode: 'MARKET_BENCHMARK',
        route: ROAD_ROUTE,
        pricing: MARKET_PRICING_KNOWN,
        eta: ETA_UNAVAILABLE,
      }),
    );
    assert.equal(decision.status, 'UNAVAILABLE');
    assert.equal(decision.reason, 'ETA_UNAVAILABLE');
  });

  it('PROVIDER_QUOTE awaiting the provider quote is PENDING with PROVIDER_QUOTE listed', () => {
    const decision = buildDeliveryDecision(
      baseInput({
        pricingMode: 'PROVIDER_QUOTE',
        route: ROAD_ROUTE,
        pricing: PROVIDER_PRICING_NO_QUOTE,
        eta: ETA_AUTHORITATIVE,
      }),
    );
    assert.equal(decision.status, 'PENDING');
    assert.deepEqual(decision.pendingRequirements, ['PROVIDER_QUOTE']);
  });

  it('free delivery with a non-zero fee is a contract violation', () => {
    assert.throws(
      () =>
        buildDeliveryDecision(
          baseInput({
            pricing: { ...FIXED_TIER_UNKNOWN, freeDeliveryApplied: true },
            freeDelivery: {
              enabled: true,
              thresholdAmount: 599,
              applied: true,
              reason: 'ABOVE_THRESHOLD',
            },
          }),
        ),
      DeliveryDecisionContractViolation,
    );
  });

  it('rejects missing decision identity/engine version', () => {
    assert.throws(
      () => buildDeliveryDecision(baseInput({ decisionId: '' })),
      DeliveryDecisionContractViolation,
    );
    assert.throws(
      () => buildDeliveryDecision(baseInput({ engineVersion: '' })),
      DeliveryDecisionContractViolation,
    );
  });

  it('pickup requests are trivially AVAILABLE (no delivery computation)', () => {
    const validation = validateDeliveryDecisionInput(baseInput({ orderType: 'pickup' }));
    assert.equal(validation.status, 'AVAILABLE');
    assert.equal(validation.reason, null);
  });

  it('missing serviceability keeps the decision PENDING (never AVAILABLE)', () => {
    const decision = buildDeliveryDecision(baseInput({ serviceability: undefined }));
    assert.equal(decision.status, 'PENDING');
    assert.ok(decision.pendingRequirements?.includes('SERVICEABILITY'));
  });

  it('the decision input exposes no client-distance field at all', () => {
    const input = baseInput();
    assert.equal('clientDistanceKm' in input, false);
    const decision = buildDeliveryDecision(input);
    assert.equal('clientDistanceKm' in decision, false);
  });

  it('ROAD route satisfies a ROAD-only consumer', () => {
    assertRoadOnly(ROAD_ROUTE);
  });

  it('STRAIGHT_LINE is rejected at compile time by a ROAD-only consumer', () => {
    // @ts-expect-error — RouteRoadResult structurally excludes kind 'STRAIGHT_LINE'
    assertRoadOnly(STRAIGHT_LINE_ROUTE);
  });
});
