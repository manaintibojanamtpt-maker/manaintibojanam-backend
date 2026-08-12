/**
 * Phase 5 — STEP 9: ETA Composition Engine tests.
 *
 * Canonical EtaEstimate contract coverage for the approved composition
 *   PREP + RIDER_ASSIGNMENT + RIDER_TO_KITCHEN + PICKUP_HANDLING + ROAD_TRAVEL + OPERATIONAL_BUFFER
 *
 * Hard rules asserted throughout:
 *   - ONLY a valid ROAD route, valid provider ETA, or actual lifecycle/live travel
 *     evidence produces AUTHORITATIVE.
 *   - Haversine/STRAIGHT_LINE duration is NEVER authoritative and `distance × speed`
 *     is NEVER used to manufacture travel time.
 *   - STRAIGHT_LINE → ESTIMATE_ONLY + LOW at most, never AUTHORITATIVE/HIGH/MEDIUM.
 *   - MARKET_BENCHMARK / PROVIDER_QUOTE with no valid ROAD and no valid provider ETA
 *     → UNAVAILABLE, never a manufactured ETA.
 *   - Deterministic, documented uncertainty: ACTUAL [v,v]; PROVIDER follows its own
 *     window; ESTIMATED [floor(v·0.85), ceil(v·1.15)]; min/max = Σ component bounds.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ETA_ENGINE_ID,
  ETA_OPERATIONAL_CONSTANT_CLASSIFICATION,
  ETA_OPERATIONAL_CONSTANTS,
  OPERATIONAL_BUFFER_MINUTES,
  PICKUP_HANDLING_MINUTES,
  RIDER_ASSIGNMENT_MINUTES,
  RIDER_TO_KITCHEN_MINUTES,
  UNCERTAINTY_ESTIMATED_HIGH_FACTOR,
  UNCERTAINTY_ESTIMATED_LOW_FACTOR,
  createEtaEngine,
  providerQuoteToEtaEvidence,
} from '../etaEngine.js';
import type {
  EtaComponentRange,
  EtaEngineRequest,
  EtaEngineResult,
  EtaProviderEvidence,
} from '../etaEngine.js';
import { createPrepEngine, toDeliveryPrep } from '../prepEngine.js';
import type { PrepEngineResult } from '../prepEngine.js';
import { DeliveryDecisionContractViolation, assertRouteEtaConsistency } from '../decisionEngine.js';
import type { EtaEstimate, KitchenConfigShape, ProviderQuoteResult, RouteResult } from '../deliveryIntelligenceTypes.js';

const AT = '2026-08-11T10:00:00.000Z';
const NOW = new Date(AT);

// ---------------------------------------------------------------------------
// Deterministic fixtures (mirror the Golden Season Mall Step-4 contract)
// ---------------------------------------------------------------------------

function roadRoute(
  overrides: Partial<Extract<RouteResult, { readonly kind: 'ROAD' }>> = {},
): Extract<RouteResult, { readonly kind: 'ROAD' }> {
  return { kind: 'ROAD', source: 'ROUTING_PROVIDER', distanceKm: 8, durationMinutes: 28, fetchedAt: AT, ...overrides };
}

const straightLineRoute = (): RouteResult => ({
  kind: 'STRAIGHT_LINE',
  source: 'STRAIGHT_LINE',
  distanceKm: 8,
  durationMinutes: null,
  fetchedAt: AT,
});

const unavailableRoute = (reason = 'no road provider response'): RouteResult => ({
  kind: 'UNAVAILABLE',
  source: 'UNKNOWN',
  distanceKm: null,
  durationMinutes: null,
  reason,
  fetchedAt: AT,
});

function kitchenConfig(overrides: Partial<KitchenConfigShape> = {}): KitchenConfigShape {
  return { ...overrides };
}

function providerEta(overrides: Partial<EtaProviderEvidence> = {}): EtaProviderEvidence {
  return {
    provider: 'porter',
    status: 'QUOTED',
    quotedAt: AT,
    expiresAt: null,
    ...overrides,
  };
}

function request(overrides: Partial<EtaEngineRequest> = {}): EtaEngineRequest {
  return { tenantId: 'tenant-a', pricingMode: 'FIXED_TIER', now: NOW, ...overrides };
}

function estimate(overrides: Partial<EtaEngineRequest> = {}): EtaEngineResult {
  return createEtaEngine().estimate(request(overrides));
}

/** Recomputation of the documented ESTIMATED band, proving the engine maths it (not hardcodes). */
function estimatedBand(minutes: number): { min: number; max: number } {
  return {
    min: Math.floor(minutes * UNCERTAINTY_ESTIMATED_LOW_FACTOR),
    max: Math.ceil(minutes * UNCERTAINTY_ESTIMATED_HIGH_FACTOR),
  };
}

function componentMinutes(result: EtaEngineResult, key: string): number | undefined {
  return result.components.find((c) => c.key === key)?.minutes;
}

function componentSource(result: EtaEngineResult, key: string): string | undefined {
  return result.components.find((c) => c.key === key)?.source;
}

function rangeMin(result: EtaEngineResult, key: string): number | undefined {
  return result.componentRanges.find((r) => r.key === key)?.min;
}

function rangeMax(result: EtaEngineResult, key: string): number | undefined {
  return result.componentRanges.find((r) => r.key === key)?.max;
}

/**
 * Dispatch typical Step-9 FIXED_TIER retro-case onto the Step-3 decision guard so the
 * two layers agree at integration time (route present → guards are active).
 */
function assertGuardFriendly(route: RouteResult | undefined, eta: EtaEngineResult): void {
  assert.doesNotThrow(() => assertRouteEtaConsistency(route, null, eta));
}
describe('Step 9 — ETA Composition Engine', () => {
  describe('composition & determinism', () => {
    it('1. Golden Season Mall ROAD contract: base 66 with approved component order and documented range', () => {
      const r = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 25 }),
        route: roadRoute(), // 8 km / 28 min
      });

      assert.equal(r.engineVersion, ETA_ENGINE_ID);
      assert.equal(r.status, 'AUTHORITATIVE');
      assert.equal(r.confidence, 'MEDIUM');
      assert.equal(r.basedOnRoadRoute, true);
      assert.equal(r.calculatedAt, AT);
      assert.ok(!r.reason);

      // Component order is the approved composition order — never reordered.
      assert.deepEqual(
        r.components.map((c) => c.key),
        [
          'PREP',
          'RIDER_ASSIGNMENT',
          'RIDER_TO_KITCHEN',
          'PICKUP_HANDLING',
          'ROAD_TRAVEL',
          'OPERATIONAL_BUFFER',
        ],
      );
      assert.deepEqual(
        r.components.map((c) => c.minutes),
        [25, 3, 5, 2, 28, 3],
      );
      assert.ok(r.components.every((c) => c.source === 'ESTIMATED'));

      // Base = Σ component point values.
      assert.equal(r.components.reduce((sum, c) => sum + c.minutes, 0), 66);

      // min/max = Σ documented ESTIMATED bands (never a cosmetic +5).
      const expectedMin =
        estimatedBand(25).min +
        estimatedBand(3).min +
        estimatedBand(5).min +
        estimatedBand(2).min +
        estimatedBand(28).min +
        estimatedBand(3).min;
      const expectedMax =
        estimatedBand(25).max +
        estimatedBand(3).max +
        estimatedBand(5).max +
        estimatedBand(2).max +
        estimatedBand(28).max +
        estimatedBand(3).max;
      assert.equal(expectedMin, 53);
      assert.equal(expectedMax, 79);
      assert.equal(r.minMinutes, expectedMin);
      assert.equal(r.maxMinutes, expectedMax);
      assert.ok(r.maxMinutes > r.minMinutes + 20, 'range must not be artificially narrow');
    });

    it('2. componentRanges expose the exact documented formula for every source class', () => {
      const r = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 25 }),
        route: roadRoute(),
      });
      const byKey = new Map(r.componentRanges.map((cr) => [cr.key, cr]));
      assert.deepEqual(byKey.get('PREP'), {
        key: 'PREP',
        minutes: 25,
        min: estimatedBand(25).min,
        max: estimatedBand(25).max,
        source: 'ESTIMATED',
      } satisfies EtaComponentRange);
      assert.deepEqual((byKey.get('ROAD_TRAVEL') as EtaComponentRange).min, estimatedBand(28).min);
      assert.deepEqual((byKey.get('OPERATIONAL_BUFFER') as EtaComponentRange).max, estimatedBand(3).max);
    });

    it('3. deterministic across calls and engine instances with an injected clock', () => {
      const a = estimate({ kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 25 }), route: roadRoute() });
      const b = createEtaEngine().estimate(request({ kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 25 }), route: roadRoute() }));
      assert.deepEqual(b, a);
    });

    it('4. calculatedAt follows the deterministic request clock', () => {
      const custom = new Date('2026-08-11T12:30:00.000Z');
      const r = estimate({ route: roadRoute(), now: custom });
      assert.equal(r.calculatedAt, custom.toISOString());
      assert.equal(r.engineVersion, ETA_ENGINE_ID);
    });

    it('5. fractional prep remains fractional through composition (no rounding away precision)', () => {
      const r = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 22.5 }),
        route: roadRoute(),
      });
      assert.equal(componentMinutes(r, 'PREP'), 22.5);
      assert.equal(rangeMin(r, 'PREP'), estimatedBand(22.5).min); // floor → 19
      assert.equal(rangeMax(r, 'PREP'), estimatedBand(22.5).max); // ceil  → 26
      assert.equal(r.minMinutes, estimatedBand(22.5).min + 2 + 4 + 1 + 23 + 2);
      assert.equal(r.maxMinutes, estimatedBand(22.5).max + 4 + 6 + 3 + 33 + 4);
    });
  });
describe('prep inclusion (Step 8 ownership)', () => {
    it('6. the composition consumes the Step-8 engine result — no duplicated prep math', () => {
      const r = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }),
        route: roadRoute(),
      });
      const prep = toDeliveryPrep(
        createPrepEngine().estimate({
          tenantId: 'tenant-a',
          kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }),
          now: NOW,
        }),
      );
      assert.equal(prep.remainingMinutes, 20);
      assert.equal(componentMinutes(r, 'PREP'), prep.remainingMinutes);
      assert.equal(componentSource(r, 'PREP'), 'ESTIMATED');
    });

    it('7. a Step-8 result can be passed in as the prep override (same chain, no re-estimate)', () => {
      const prepResult: PrepEngineResult = createPrepEngine().estimate({
        tenantId: 'tenant-a',
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }),
        now: NOW,
      });
      const r = estimate({ prep: prepResult, route: roadRoute() });
      assert.equal(componentMinutes(r, 'PREP'), prepResult.remainingMinutes);
    });

    it('8. preparationStartedAt forwards lifecycle into Step 8 → PREP becomes ACTUAL remaining', () => {
      const r = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }),
        route: roadRoute(),
        lifecycle: { preparationStartedAt: '2026-08-11T09:55:00.000Z' }, // 5 min elapsed
      });
      assert.equal(componentMinutes(r, 'PREP'), 15);
      assert.equal(componentSource(r, 'PREP'), 'ACTUAL');
      assert.equal(rangeMin(r, 'PREP'), 15); // ACTUAL → zero spread
      assert.equal(rangeMax(r, 'PREP'), 15);
      assert.equal(r.status, 'AUTHORITATIVE'); // ROAD still authoritative
      assert.equal(r.confidence, 'MEDIUM'); // prep actual but travel remains estimated
    });

    it('9. preparationCompletedAt zeroes PREP as ACTUAL', () => {
      const r = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }),
        route: roadRoute(),
        lifecycle: { preparationCompletedAt: '2026-08-11T09:55:00.000Z' },
      });
      assert.equal(componentMinutes(r, 'PREP'), 0);
      assert.equal(componentSource(r, 'PREP'), 'ACTUAL');
    });
  });
describe('operational stages & lifecycle progression', () => {
    it('10. operational defaults are registered as ESTIMATED_OPERATIONAL_DEFAULT constants', () => {
      assert.deepEqual(ETA_OPERATIONAL_CONSTANTS, {
        RIDER_ASSIGNMENT_MINUTES: 3,
        RIDER_TO_KITCHEN_MINUTES: 5,
        PICKUP_HANDLING_MINUTES: 2,
        OPERATIONAL_BUFFER_MINUTES: 3,
      });
      assert.equal(ETA_OPERATIONAL_CONSTANT_CLASSIFICATION, 'ESTIMATED_OPERATIONAL_DEFAULT');
      const r = estimate({ route: roadRoute() });
      assert.equal(componentMinutes(r, 'RIDER_ASSIGNMENT'), RIDER_ASSIGNMENT_MINUTES);
      assert.equal(componentMinutes(r, 'RIDER_TO_KITCHEN'), RIDER_TO_KITCHEN_MINUTES);
      assert.equal(componentMinutes(r, 'PICKUP_HANDLING'), PICKUP_HANDLING_MINUTES);
      assert.equal(componentMinutes(r, 'OPERATIONAL_BUFFER'), OPERATIONAL_BUFFER_MINUTES);
      assert.deepEqual(
        r.components.filter((c) => c.key !== 'PREP' && c.key !== 'ROAD_TRAVEL').map((c) => c.source),
        ['ESTIMATED', 'ESTIMATED', 'ESTIMATED', 'ESTIMATED'],
      );
    });

    it('11. partnerAssignedAt zeroes RIDER_ASSIGNMENT as ACTUAL and lifts confidence to HIGH', () => {
      const r = estimate({
        route: roadRoute(),
        lifecycle: { partnerAssignedAt: '2026-08-11T09:58:00.000Z' },
      });
      assert.equal(componentMinutes(r, 'RIDER_ASSIGNMENT'), 0);
      assert.equal(componentSource(r, 'RIDER_ASSIGNMENT'), 'ACTUAL');
      assert.equal(componentMinutes(r, 'RIDER_TO_KITCHEN'), RIDER_TO_KITCHEN_MINUTES);
      assert.equal(r.confidence, 'HIGH');
      assert.equal(r.status, 'AUTHORITATIVE');
    });

    it('12. partnerArrivedAtKitchenAt zeroes RIDER_TO_KITCHEN (and assignment) as ACTUAL', () => {
      const r = estimate({
        route: roadRoute(),
        lifecycle: { partnerArrivedAtKitchenAt: '2026-08-11T09:59:00.000Z' },
      });
      assert.equal(componentMinutes(r, 'RIDER_ASSIGNMENT'), 0);
      assert.equal(componentMinutes(r, 'RIDER_TO_KITCHEN'), 0);
      assert.equal(componentSource(r, 'RIDER_TO_KITCHEN'), 'ACTUAL');
      assert.equal(componentMinutes(r, 'PICKUP_HANDLING'), PICKUP_HANDLING_MINUTES);
    });

    it('13. pickedUpAt zeroes PICKUP_HANDLING as ACTUAL; travel stays whole until on route', () => {
      const r = estimate({
        route: roadRoute(),
        lifecycle: { pickedUpAt: '2026-08-11T10:00:00.000Z' },
      });
      assert.equal(componentMinutes(r, 'PICKUP_HANDLING'), 0);
      assert.equal(componentSource(r, 'PICKUP_HANDLING'), 'ACTUAL');
      assert.equal(componentMinutes(r, 'ROAD_TRAVEL'), 28);
      assert.equal(componentSource(r, 'ROAD_TRAVEL'), 'ESTIMATED');
      assert.equal(r.confidence, 'HIGH');
    });

    it('14. onRouteAt derives ACTUAL travel remaining from the ROAD total minus elapsed', () => {
      const r = estimate({
        route: roadRoute(), // 28 min
        lifecycle: { onRouteAt: '2026-08-11T09:50:00.000Z' }, // 10 min elapsed
      });
      assert.equal(componentMinutes(r, 'ROAD_TRAVEL'), 18);
      assert.equal(componentSource(r, 'ROAD_TRAVEL'), 'ACTUAL');
      assert.equal(rangeMin(r, 'ROAD_TRAVEL'), 18); // ACTUAL → zero spread
      assert.equal(r.confidence, 'HIGH');
      assert.equal(r.status, 'AUTHORITATIVE');
    });

    it('15. deliveredAt drives every component to 0 ACTUAL (0/0 all-zero estimate)', () => {
      const r = estimate({
        route: roadRoute(),
        lifecycle: { deliveredAt: '2026-08-11T10:05:00.000Z' },
      });
      assert.deepEqual(r.components.map((c) => c.minutes), [0, 0, 0, 0, 0, 0]);
      assert.ok(r.components.every((c) => c.source === 'ACTUAL'));
      assert.equal(r.minMinutes, 0);
      assert.equal(r.maxMinutes, 0);
      assert.equal(r.status, 'AUTHORITATIVE');
      assert.equal(r.confidence, 'HIGH');
    });
  });
describe('authoritativeness & confidence', () => {
    it('16. ROAD + deterministic estimates → AUTHORITATIVE / MEDIUM (no provider, no actuals)', () => {
      const r = estimate({ route: roadRoute() });
      assert.equal(r.status, 'AUTHORITATIVE');
      assert.equal(r.confidence, 'MEDIUM');
      assert.equal(r.basedOnRoadRoute, true);
      assertGuardFriendly(roadRoute(), r);
    });

    it('17. stale/cached ROAD stays authoritative travel but confidence drops to LOW', () => {
      const r = estimate({ route: roadRoute({ source: 'ROUTE_CACHE' }) });
      assert.equal(r.status, 'AUTHORITATIVE'); // ROAD evidence remains authoritative
      assert.equal(r.confidence, 'LOW'); // cached → LOW
      assert.equal(r.basedOnRoadRoute, true);
      assert.equal(componentSource(r, 'ROAD_TRAVEL'), 'ESTIMATED');
    });

    it('18. valid provider delivery ETA → AUTHORITATIVE / HIGH, even without a ROAD route', () => {
      const r = estimate({
        providerEta: providerEta({ deliveryEtaMinutes: { min: 22, max: 34 } }),
      });
      assert.equal(r.status, 'AUTHORITATIVE');
      assert.equal(r.confidence, 'HIGH');
      assert.equal(r.basedOnRoadRoute, true); // live provider duration underpins travel
      assert.equal(componentSource(r, 'ROAD_TRAVEL'), 'PROVIDER');
      assert.equal(componentMinutes(r, 'ROAD_TRAVEL'), 28); // deterministic midpoint
      assert.equal(rangeMin(r, 'ROAD_TRAVEL'), 22); // own window
      assert.equal(rangeMax(r, 'ROAD_TRAVEL'), 34);
    });

    it('19. confidence hierarchy holds: HIGH > MEDIUM > LOW > UNAVAILABLE', () => {
      const hierarchy = ['HIGH', 'MEDIUM', 'LOW', 'UNAVAILABLE'] as const;
      const high = estimate({ providerEta: providerEta({ deliveryEtaMinutes: { min: 20, max: 30 } }) });
      const medium = estimate({ route: roadRoute() });
      const low = estimate({ route: roadRoute({ source: 'ROUTE_CACHE' }) });
      const unavailable = estimate({
        pricingMode: 'MARKET_BENCHMARK',
        route: straightLineRoute(),
      });
      assert.deepEqual(
        [high.confidence, medium.confidence, low.confidence, unavailable.confidence],
        [...hierarchy],
      );
      assert.equal(high.status, 'AUTHORITATIVE');
      assert.equal(unavailable.status, 'UNAVAILABLE');
    });
  });
describe('pricing-mode availability', () => {
    it('20. MARKET_BENCHMARK without a valid ROAD route → UNAVAILABLE (no manufactured ETA)', () => {
      const straight = estimate({ pricingMode: 'MARKET_BENCHMARK', route: straightLineRoute() });
      assert.equal(straight.status, 'UNAVAILABLE');
      assert.equal(straight.confidence, 'UNAVAILABLE');
      assert.equal(straight.minMinutes, null);
      assert.equal(straight.maxMinutes, null);
      assert.deepEqual(straight.components, []);
      assert.match(straight.reason ?? '', /MARKET_BENCHMARK/);

      const noRoute = estimate({ pricingMode: 'MARKET_BENCHMARK', route: unavailableRoute() });
      assert.equal(noRoute.status, 'UNAVAILABLE');
    });

    it('21. MARKET_BENCHMARK with a valid ROAD route → AUTHORITATIVE (mode never downgrades ROAD)', () => {
      const r = estimate({ pricingMode: 'MARKET_BENCHMARK', route: roadRoute() });
      assert.equal(r.status, 'AUTHORITATIVE');
      assert.equal(r.confidence, 'MEDIUM');
    });

    it('22. PROVIDER_QUOTE without valid provider ETA and no ROAD → UNAVAILABLE', () => {
      const expired = estimate({
        pricingMode: 'PROVIDER_QUOTE',
        providerEta: providerEta({ status: 'EXPIRED', deliveryEtaMinutes: { min: 20, max: 30 } }),
      });
      assert.equal(expired.status, 'UNAVAILABLE');
      assert.equal(expired.confidence, 'UNAVAILABLE');

      const missing = estimate({ pricingMode: 'PROVIDER_QUOTE' });
      assert.equal(missing.status, 'UNAVAILABLE');
      assert.match(missing.reason ?? '', /PROVIDER_QUOTE/);
    });

    it('23. PROVIDER_QUOTE with a valid provider delivery ETA → AUTHORITATIVE / HIGH', () => {
      const r = estimate({
        pricingMode: 'PROVIDER_QUOTE',
        providerEta: providerEta({ deliveryEtaMinutes: { min: 22, max: 34 } }),
      });
      assert.equal(r.status, 'AUTHORITATIVE');
      assert.equal(r.confidence, 'HIGH');
      assert.equal(componentSource(r, 'ROAD_TRAVEL'), 'PROVIDER');
    });

    it('24. FIXED_TIER with STRAIGHT_LINE only → ESTIMATE_ONLY / LOW compatibility estimate', () => {
      const r = estimate({ route: straightLineRoute() });
      assert.equal(r.status, 'ESTIMATE_ONLY');
      assert.equal(r.confidence, 'LOW');
      assert.equal(r.basedOnRoadRoute, false);
      assert.match(r.reason ?? '', /ESTIMATE_ONLY/);
      // Prep + operational stages only — travel is never invented from the distance.
      assert.deepEqual(
        r.components.map((c) => c.key),
        ['PREP', 'RIDER_ASSIGNMENT', 'RIDER_TO_KITCHEN', 'PICKUP_HANDLING', 'OPERATIONAL_BUFFER'],
      );
      assert.equal(r.components.reduce((sum, c) => sum + c.minutes, 0), 25 + 3 + 5 + 2 + 3);
      assert.equal(r.minMinutes, estimatedBand(25).min + 2 + 4 + 1 + 2);
      assert.equal(r.maxMinutes, estimatedBand(25).max + 4 + 6 + 3 + 4);
      assertGuardFriendly(straightLineRoute(), r);
    });

    it('25. FIXED_TIER with an UNAVAILABLE route still produces the prep/ops-only estimate', () => {
      const r = estimate({ route: unavailableRoute() });
      assert.equal(r.status, 'ESTIMATE_ONLY');
      assert.equal(r.confidence, 'LOW');
      assert.ok(!r.components.some((c) => c.key === 'ROAD_TRAVEL'));
    });

    it('26. every mode with a valid ROAD route is authoritative — mode is never a downgrade path', () => {
      for (const pricingMode of ['FIXED_TIER', 'MARKET_BENCHMARK', 'PROVIDER_QUOTE'] as const) {
        const r = estimate({ pricingMode, route: roadRoute() });
        assert.equal(r.status, 'AUTHORITATIVE', pricingMode);
        assert.equal(r.basedOnRoadRoute, true, pricingMode);
      }
    });
  });
describe('provider ETA evidence (input only)', () => {
    it('27. pickup ETA replaces the RIDER_TO_KITCHEN estimate with its own window', () => {
      const r = estimate({
        route: roadRoute(),
        providerEta: providerEta({ pickupEtaMinutes: { min: 3, max: 7 } }),
      });
      assert.equal(componentSource(r, 'RIDER_TO_KITCHEN'), 'PROVIDER');
      assert.equal(componentMinutes(r, 'RIDER_TO_KITCHEN'), 5); // midpoint round((3+7)/2)
      assert.equal(rangeMin(r, 'RIDER_TO_KITCHEN'), 3);
      assert.equal(rangeMax(r, 'RIDER_TO_KITCHEN'), 7);
      // delivery ETA absent → travel remains on the ROAD route, still MEDIUM.
      assert.equal(componentSource(r, 'ROAD_TRAVEL'), 'ESTIMATED');
      assert.equal(componentMinutes(r, 'ROAD_TRAVEL'), 28);
      assert.equal(r.confidence, 'MEDIUM');
    });

    it('28. delivery ETA replaces generic travel when present alongside a ROAD route', () => {
      const r = estimate({
        route: roadRoute(),
        providerEta: providerEta({ deliveryEtaMinutes: { min: 22, max: 34 } }),
      });
      assert.equal(componentSource(r, 'ROAD_TRAVEL'), 'PROVIDER');
      assert.equal(componentMinutes(r, 'ROAD_TRAVEL'), 28);
      assert.equal(rangeMin(r, 'ROAD_TRAVEL'), 22);
      assert.equal(rangeMax(r, 'ROAD_TRAVEL'), 34);
      assert.equal(r.basedOnRoadRoute, true);
      assert.equal(r.confidence, 'HIGH');
    });

    it('29. expired provider ETA (expiresAt in the past) is rejected → ESTIMATED defaults', () => {
      const r = estimate({
        route: roadRoute(),
        providerEta: providerEta({
          expiresAt: '2026-08-11T09:59:59.000Z',
          deliveryEtaMinutes: { min: 22, max: 34 },
          pickupEtaMinutes: { min: 3, max: 7 },
        }),
      });
      assert.equal(componentSource(r, 'ROAD_TRAVEL'), 'ESTIMATED');
      assert.equal(componentSource(r, 'RIDER_TO_KITCHEN'), 'ESTIMATED');
      assert.equal(r.confidence, 'MEDIUM'); // provider no longer counts toward HIGH
    });

    it('30. non-QUOTED statuses (PENDING/EXPIRED/UNAVAILABLE/BLOCKED) are never trusted as ETA evidence', () => {
      for (const status of ['PENDING', 'EXPIRED', 'UNAVAILABLE', 'BLOCKED'] as const) {
        const r = estimate({
          pricingMode: 'PROVIDER_QUOTE',
          providerEta: providerEta({ status, deliveryEtaMinutes: { min: 20, max: 30 } }),
        });
        assert.equal(r.status, 'UNAVAILABLE', status);
      }
    });

    it('31. providerQuoteToEtaEvidence maps the canonical ProviderQuoteResult contract', () => {
      const quote: ProviderQuoteResult = {
        provider: 'porter',
        quoteId: 'q-1',
        quotedAt: AT,
        providerExpiresAt: null,
        cost: 99,
        etaMinutes: { min: 22, max: 34 },
        source: 'CACHED',
        status: 'QUOTED',
      };
      const evidence = providerQuoteToEtaEvidence(quote);
      assert.equal(evidence.provider, 'porter');
      assert.equal(evidence.status, 'QUOTED');
      assert.deepEqual(evidence.deliveryEtaMinutes, { min: 22, max: 34 });

      const noWindow = providerQuoteToEtaEvidence({ ...quote, etaMinutes: null });
      assert.equal(noWindow.deliveryEtaMinutes, undefined);

      const nullWindow = providerQuoteToEtaEvidence({ ...quote, etaMinutes: { min: null, max: null } });
      assert.equal(nullWindow.deliveryEtaMinutes, undefined);
    });
  });

  describe('hard rules — no manufactured ETA, no customer breakdown leakage', () => {
    it('32. STRAIGHT_LINE is NEVER authoritative and never produces HIGH/MEDIUM — across every mode', () => {
      for (const pricingMode of ['FIXED_TIER', 'MARKET_BENCHMARK', 'PROVIDER_QUOTE'] as const) {
        const r = estimate({ pricingMode, route: straightLineRoute() });
        assert.notEqual(r.status, 'AUTHORITATIVE', pricingMode);
        assert.notEqual(r.confidence, 'HIGH', pricingMode);
        assert.notEqual(r.confidence, 'MEDIUM', pricingMode);
        assert.equal(r.basedOnRoadRoute, false, pricingMode);
        assertGuardFriendly(straightLineRoute(), r);
      }
    });

    it('33. no Haversine authoritative ETA: straight-line distance is never converted to minutes', () => {
      const straight = estimate({ route: straightLineRoute() });
      // ROAD_TRAVEL must be absent in ESTIMATE_ONLY mode; the 8 km distance cannot
      // materialize any travel minutes through a speed multiplier.
      assert.ok(!straight.components.some((c) => c.key === 'ROAD_TRAVEL'));
      // No component may carry the legacy distance × 3 min/km product for 8 km.
      const speedProduct = Math.round(8 * 3); // 24 — the manufacturing this step forbids
      assert.ok(!straight.components.some((c) => c.minutes === speedProduct));
      assert.equal(straight.components.reduce((sum, c) => sum + c.minutes, 0), 38); // prep+ops only
      // The only authoritative travel class composes from ROAD durationMinutes —
      // never from distance × speed.
      const road = estimate({ route: roadRoute() });
      assert.equal(road.status, 'AUTHORITATIVE');
      assert.equal(componentMinutes(road, 'ROAD_TRAVEL'), 28);
    });

    it('34. result carries only the canonical EtaEstimate surface — no pricing/customer leakage', () => {
      const allowed = new Set([
        'status',
        'confidence',
        'minMinutes',
        'maxMinutes',
        'components',
        'basedOnRoadRoute',
        'calculatedAt',
        'reason',
        'componentRanges',
        'engineVersion',
      ]);
      const r = estimate({ route: roadRoute() });
      for (const key of Object.keys(r)) {
        assert.ok(allowed.has(key), `unexpected field on ETA result: ${key}`);
      }
      // No pricing, fee, subsidy, route-cost, or breakdown field may survive.
      for (const forbidden of ['fee', 'subsidy', 'cost', 'routeSource', 'subtotal', 'freeDelivery']) {
        assert.ok(!Object.keys(r).some((k) => k.toLowerCase().includes(forbidden)), `leaked ${forbidden}`);
      }
      // Components only use the approved ETA component keys.
      assert.ok(r.components.every((c) =>
        ['PREP', 'RIDER_ASSIGNMENT', 'RIDER_TO_KITCHEN', 'PICKUP_HANDLING', 'ROAD_TRAVEL', 'OPERATIONAL_BUFFER'].includes(c.key),
      ));
    });
  });
describe('scheduled orders & tenant isolation', () => {
    it('35. scheduled-order compatibility: composition is unchanged and deterministic', () => {
      const instant = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }),
        route: roadRoute(),
      });
      const scheduled = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }),
        route: roadRoute(),
        fulfillmentType: 'scheduled',
        scheduledFor: '2026-08-11T14:00:00.000Z',
      });
      assert.equal(scheduled.status, instant.status);
      assert.deepEqual(scheduled.components, instant.components);
      assert.equal(scheduled.minMinutes, instant.minMinutes);
      assert.equal(scheduled.maxMinutes, instant.maxMinutes);
    });

    it('36. tenant isolation: configuration never bleeds across requests', () => {
      const engine = createEtaEngine();
      const a = engine.estimate(request({ tenantId: 'tenant-a', kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }), route: roadRoute() }));
      const b = engine.estimate(request({ tenantId: 'tenant-b', kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 35 }), route: roadRoute() }));
      assert.equal(componentMinutes(a, 'PREP'), 20);
      assert.equal(componentMinutes(b, 'PREP'), 35);
      assert.ok(!Object.keys(a).includes('tenantId')); // tenant is scope, not leaked detail
    });
  });

  describe('decision guard integration', () => {
    it('37. engine output satisfies the Step-3 assertRouteEtaConsistency guard', () => {
      const road = estimate({ route: roadRoute() });
      assert.doesNotThrow(() => assertRouteEtaConsistency(roadRoute(), null, road));

      const straight = estimate({ route: straightLineRoute() });
      assert.doesNotThrow(() => assertRouteEtaConsistency(straightLineRoute(), null, straight));

      const providerOnly = estimate({ providerEta: providerEta({ deliveryEtaMinutes: { min: 22, max: 34 } }) });
      assert.doesNotThrow(() => assertRouteEtaConsistency(roadRoute(), null, providerOnly));
    });

    it('38. the guard still rejects the forbidden combos at integration time (engine never emits them)', () => {
      const forbiddenEta: EtaEstimate = {
        status: 'AUTHORITATIVE',
        confidence: 'MEDIUM',
        minMinutes: 53,
        maxMinutes: 79,
        components: [],
        basedOnRoadRoute: false,
        calculatedAt: AT,
      };
      assert.throws(
        () => assertRouteEtaConsistency(roadRoute(), null, forbiddenEta),
        DeliveryDecisionContractViolation,
      );
      assert.throws(
        () => assertRouteEtaConsistency(straightLineRoute(), null, { ...forbiddenEta, basedOnRoadRoute: true }),
        DeliveryDecisionContractViolation,
      );
    });
  });

  describe('dependency boundaries', () => {
    it('39. etaEngine depends only on contracts and the Step-8 engine — no provider/route/pricing wiring', () => {
      const source = fs.readFileSync(
        path.join(process.cwd(), 'backend-lib/delivery/etaEngine.ts'),
        'utf8',
      );

      // Flatten so multi-line `import type { … }` statements are matchable as units.
      const flattened = source.replace(/\s+/g, ' ');

      // The approved dependency surface:
      assert.match(flattened, /from '\.\/prepEngine\.js'/); // Step-8 ownership
      assert.match(flattened, /from '\.\/deliveryIntelligenceTypes\.js'/);
      assert.match(flattened, /from '\.\/providerCapabilityMatrix\.js'/);
      assert.match(flattened, /from '\.\.\/marketplace\/tenantProjectionHelpers\.js'/);

      // Runtime coupling that Step 9 explicitly must not introduce:
      assert.doesNotMatch(flattened, /routeEngine\.js/);
      assert.doesNotMatch(flattened, /pricingEngine\.js/);
      assert.doesNotMatch(flattened, /decisionEngine\.js/);
      assert.doesNotMatch(flattened, /marketplace\/etaEstimate\.js/);
      assert.doesNotMatch(flattened, /haversineKm/);
      assert.doesNotMatch(flattened, /estimateDeliveryEtaMinutes/);

      // The legacy speed-multiplier math and distance arithmetic must be absent.
      assert.doesNotMatch(source, /estimateDeliveryEtaMinutes/);
      assert.doesNotMatch(source, /haversineKm/);
      assert.doesNotMatch(source, /distanceKm\s*\*/);
      assert.doesNotMatch(source, /\.distance\s*\*/);
    });
  });
});