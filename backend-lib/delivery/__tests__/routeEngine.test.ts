/**
 * Phase 5 — STEP 4: RouteEngine tests.
 *
 * Verifies ROAD vs STRAIGHT_LINE vs UNAVAILABLE semantics, the Haversine wrapper
 * parity (no arbitrary multiplier), cache/stale behaviour, tenant cache isolation,
 * provider failure handling, and the Golden Season Mall contract. NO live external
 * routing is involved — all ROAD evidence comes from the deterministic fixture.
 *
 * Hard rule asserted throughout: a STRAIGHT_LINE result can never be consumed as
 * ROAD (kind + durationMinutes null + Step-3 guards).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  NO_ROAD_PROVIDER_ID,
  ROUTE_ENGINE_ID,
  createNoopRoadRouteProvider,
  createRouteEngine,
  createStraightLineRouteProvider,
} from '../routeEngine.js';
import type { RoadRouteProvider, RoadRouteProviderResult, RoutePoint } from '../routeEngine.js';
import { haversineKm as legacyHaversineKm } from '../../marketplace/tenantProjectionHelpers.js';
import {
  DeliveryDecisionContractViolation,
  assertRoadRoute,
  assertRouteEtaConsistency,
  validateDeliveryDecisionInput,
} from '../decisionEngine.js';
import type { DeliveryDecisionInput } from '../decisionEngine.js';
import type { EtaEstimate, RouteResult } from '../deliveryIntelligenceTypes.js';

const T0 = new Date('2026-08-11T10:00:00.000Z');
const T0_ISO = T0.toISOString();

// Golden Season Mall contract coordinates.
const KITCHEN = { lat: 18.5285, lng: 73.9871, label: 'Inti kitchen' };
const SEASON_MALL = { lat: 18.5228, lng: 73.9812, label: 'Season Mall / Keshav Nagar' };

/** Deterministic ROAD fixture provider: serves results from a queue in order. */
class FixedRoadProvider implements RoadRouteProvider {
  readonly providerId = 'fixture-road';
  callCount = 0;
  constructor(private readonly queue: readonly RoadRouteProviderResult[]) {}
  async getRoadRoute(): Promise<RoadRouteProviderResult> {
    this.callCount += 1;
    const index = Math.min(this.callCount - 1, this.queue.length - 1);
    return this.queue[index];
  }
}

const okRoad = (overrides: Partial<Extract<RoadRouteProviderResult, { status: 'OK' }>> = {}) =>
  ({
    status: 'OK',
    distanceKm: 8,
    durationMinutes: 28,
    routeId: 'synthetic-season-mall',
    ...overrides,
  }) as const;

const noRoad = (reason: string): RoadRouteProviderResult => ({ status: 'UNAVAILABLE', reason });

function straightLineRoute(distanceKm: number): RouteResult {
  return {
    kind: 'STRAIGHT_LINE',
    source: 'STRAIGHT_LINE',
    distanceKm,
    durationMinutes: null,
    fetchedAt: T0_ISO,
  };
}

function roadRoute(distanceKm = 8, durationMinutes = 28): RouteResult {
  return {
    kind: 'ROAD',
    source: 'ROUTING_PROVIDER',
    distanceKm,
    durationMinutes,
    provider: 'fixture-road',
    fetchedAt: T0_ISO,
  };
}

/** Minimal MARKET_BENCHMARK pricing — every value is fixture data, never hardcoded engine logic. */
function marketBenchmarkPricing(routeSource: 'STRAIGHT_LINE' | 'ROUTING_PROVIDER') {
  return {
    pricingMode: 'MARKET_BENCHMARK' as const,
    distanceKm: 8,
    routeSource,
    projectedDeliveryCost: 110,
    projectedCostSource: 'BENCHMARK' as const,
    customerDeliveryFee: 70,
    freeDeliveryApplied: false,
    tenantSubsidy: 40,
    confidence: 'MEDIUM' as const,
    calculatedAt: T0_ISO,
    engineVersion: 'phase5-step4-test',
  };
}

function minimalDecisionInput(route: RouteResult): DeliveryDecisionInput {
  return {
    decisionId: 'step4-decision',
    tenantId: 'step4-tenant',
    engineVersion: 'phase5-step4-test',
    requestedAt: T0_ISO,
    orderType: 'delivery',
    pricingMode: 'MARKET_BENCHMARK',
    deliveryEnabled: true,
    kitchenLocation: KITCHEN,
    customerLocation: SEASON_MALL,
    serviceability: {
      isServiceable: true,
      distanceKm: route.kind === 'UNAVAILABLE' ? null : route.distanceKm,
      reason: 'OK',
    },
    route,
    pricing: marketBenchmarkPricing(route.kind === 'ROAD' ? 'ROUTING_PROVIDER' : 'STRAIGHT_LINE'),
  };
}
describe('RouteEngine — request modes & Haversine semantics', () => {
  it('STRAIGHT_LINE mode returns a labelled informational route with no duration', async () => {
    const engine = createRouteEngine();
    const route = await engine.getRoute({
      pickup: KITCHEN,
      dropoff: SEASON_MALL,
      mode: 'STRAIGHT_LINE',
      now: T0,
    });
    assert.equal(route.kind, 'STRAIGHT_LINE');
    assert.equal(route.source, 'STRAIGHT_LINE');
    assert.equal(route.durationMinutes, null);
    assert.ok(Number.isFinite(route.distanceKm) && route.distanceKm > 0);
    assert.equal(route.fetchedAt, T0_ISO);
  });

  it('Haversine wrapper has NO arbitrary multiplier — exact parity with the legacy helper', () => {
    const provider = createStraightLineRouteProvider();
    const pairs: Array<[RoutePoint, RoutePoint]> = [
      [KITCHEN, SEASON_MALL],
      [SEASON_MALL, KITCHEN],
      [KITCHEN, { lat: 18.62, lng: 74.08 }],
    ];
    for (const [a, b] of pairs) {
      const got = provider.getStraightLineDistanceKm({ pickup: a, dropoff: b });
      const expected = legacyHaversineKm(a.lat, a.lng, b.lat, b.lng);
      assert.ok(Math.abs(got - expected) < 1e-9, `expected ${expected}, got ${got}`);
    }
    // Same point is exactly zero — no invented minimum distance.
    assert.equal(
      provider.getStraightLineDistanceKm({ pickup: KITCHEN, dropoff: KITCHEN }),
      0,
    );
  });

  it('default engine with no ROAD provider configured returns UNAVAILABLE in ROAD mode — Haversine never masquerades as ROAD', async () => {
    const engine = createRouteEngine();
    const route = await engine.getRoute({ pickup: KITCHEN, dropoff: SEASON_MALL, now: T0 });
    assert.equal(route.kind, 'UNAVAILABLE');
    assert.equal(route.source, 'UNKNOWN');
    assert.equal(route.distanceKm, null);
    assert.equal(route.durationMinutes, null);
    assert.match(route.reason, /No live ROAD routing provider/i);
  });

  it('ROAD_OR_STRAIGHT_LINE fallback is labelled STRAIGHT_LINE and REJECTED by assertRoadRoute', async () => {
    const engine = createRouteEngine(); // noop road provider forces the fallback
    const route = await engine.getRoute({
      pickup: KITCHEN,
      dropoff: SEASON_MALL,
      mode: 'ROAD_OR_STRAIGHT_LINE',
      now: T0,
    });
    assert.equal(route.kind, 'STRAIGHT_LINE');
    assert.equal(route.durationMinutes, null);
    assert.throws(() => assertRoadRoute(route), DeliveryDecisionContractViolation);
  });

  it('Haversine-derived values can never be ROAD evidence (assertRoadRoute structural guard)', () => {
    assert.throws(() => assertRoadRoute(straightLineRoute(8)), DeliveryDecisionContractViolation);
  });

  it('Haversine duration is never an authoritative ETA — Step-3 guard throws', () => {
    const straight = straightLineRoute(8);
    const eta: EtaEstimate = {
      status: 'AUTHORITATIVE', // claims live basis — must be rejected for STRAIGHT_LINE
      confidence: 'HIGH',
      minMinutes: 40,
      maxMinutes: 50,
      components: [],
      basedOnRoadRoute: false,
      calculatedAt: T0_ISO,
      reason: 'test fixture',
    };
    assert.throws(
      () => assertRouteEtaConsistency(straight, null, eta),
      DeliveryDecisionContractViolation,
    );
  });

  it('Haversine distance can never feed projected cost — decision builder refuses MARKET_BENCHMARK on STRAIGHT_LINE', () => {
    const validation = validateDeliveryDecisionInput(minimalDecisionInput(straightLineRoute(8)));
    assert.equal(validation.status, 'UNAVAILABLE');
    assert.equal(validation.reason, 'ROUTE_UNAVAILABLE');
  });
});
describe('RouteEngine — ROAD provider', () => {
  it('produces ROAD with distanceKm, durationMinutes, routeId, provider and fetchedAt', async () => {
    const provider = new FixedRoadProvider([okRoad()]);
    const engine = createRouteEngine({ roadProvider: provider });
    const route = await engine.getRoute({ pickup: KITCHEN, dropoff: SEASON_MALL, now: T0 });
    assert.equal(route.kind, 'ROAD');
    assert.equal(route.source, 'ROUTING_PROVIDER');
    assert.equal(route.distanceKm, 8);
    assert.equal(route.durationMinutes, 28);
    assert.equal(route.routeId, 'synthetic-season-mall');
    assert.equal(route.provider, 'fixture-road');
    assert.equal(route.fetchedAt, T0_ISO);
    assert.equal(provider.callCount, 1);
  });

  it('invalid provider evidence (negative duration) → UNAVAILABLE and is never cached', async () => {
    const provider = new FixedRoadProvider([okRoad({ durationMinutes: -5 }), okRoad()]);
    const engine = createRouteEngine({ roadProvider: provider });
    const first = await engine.getRoute({ pickup: KITCHEN, dropoff: SEASON_MALL, now: T0 });
    assert.equal(first.kind, 'UNAVAILABLE');
    assert.match(first.reason, /invalid route/i);
    // Cache is not poisoned: the next call reaches the provider and succeeds.
    const second = await engine.getRoute({ pickup: KITCHEN, dropoff: SEASON_MALL, now: T0 });
    assert.equal(second.kind, 'ROAD');
    assert.equal(second.source, 'ROUTING_PROVIDER');
    assert.equal(provider.callCount, 2);
  });

  it('provider exceptions become UNAVAILABLE with the failure reason — no crash', async () => {
    const throwing: RoadRouteProvider = {
      providerId: 'flaky-provider',
      async getRoadRoute() {
        throw new Error('provider exploded');
      },
    };
    const engine = createRouteEngine({ roadProvider: throwing });
    const route = await engine.getRoute({ pickup: KITCHEN, dropoff: SEASON_MALL, now: T0 });
    assert.equal(route.kind, 'UNAVAILABLE');
    assert.match(route.reason, /provider exploded/);
  });

  it('engine id and default noop provider id are stable constants', async () => {
    const engine = createRouteEngine();
    assert.equal(engine.engineId, ROUTE_ENGINE_ID);
    assert.equal(createNoopRoadRouteProvider().providerId, NO_ROAD_PROVIDER_ID);
  });
});
describe('RouteEngine — cache & stale handling', () => {
  const T1 = new Date('2026-08-11T10:02:00.000Z'); // +2 min (fresh under the 10 min default)
  const T2 = new Date('2026-08-11T10:35:00.000Z'); // +35 min (stale under the 10 min default)

  it('cached ROAD route is served as ROUTE_CACHE with exactly one provider hit', async () => {
    const provider = new FixedRoadProvider([okRoad(), okRoad()]);
    const engine = createRouteEngine({ roadProvider: provider });
    const first = await engine.getRoute({ pickup: KITCHEN, dropoff: SEASON_MALL, now: T0 });
    const second = await engine.getRoute({ pickup: KITCHEN, dropoff: SEASON_MALL, now: T1 });
    assert.equal(first.source, 'ROUTING_PROVIDER');
    assert.equal(second.kind, 'ROAD');
    assert.equal(second.source, 'ROUTE_CACHE');
    assert.equal(second.distanceKm, 8);
    assert.equal(second.durationMinutes, 28);
    assert.equal(second.fetchedAt, T0_ISO);
    assert.equal(provider.callCount, 1);
  });

  it('stale cached ROAD route survives provider failure as ROUTE_CACHE with the original fetchedAt', async () => {
    const provider = new FixedRoadProvider([okRoad(), noRoad('provider outage')]);
    const engine = createRouteEngine({ roadProvider: provider });
    await engine.getRoute({ pickup: KITCHEN, dropoff: SEASON_MALL, now: T0 });
    const stale = await engine.getRoute({ pickup: KITCHEN, dropoff: SEASON_MALL, now: T2 });
    assert.equal(stale.kind, 'ROAD');
    assert.equal(stale.source, 'ROUTE_CACHE');
    assert.equal(stale.distanceKm, 8);
    assert.equal(stale.fetchedAt, T0_ISO);
    assert.equal(provider.callCount, 2);
  });

  it('allowStaleOnProviderFailure=false drops the stale route → UNAVAILABLE', async () => {
    const provider = new FixedRoadProvider([okRoad(), noRoad('provider outage')]);
    const engine = createRouteEngine({
      roadProvider: provider,
      cache: { maxStaleMinutes: 10, allowStaleOnProviderFailure: false },
    });
    await engine.getRoute({ pickup: KITCHEN, dropoff: SEASON_MALL, now: T0 });
    const result = await engine.getRoute({ pickup: KITCHEN, dropoff: SEASON_MALL, now: T2 });
    assert.equal(result.kind, 'UNAVAILABLE');
  });

  it('bypassCache forces a provider round-trip (ROUTING_PROVIDER, two hits)', async () => {
    const provider = new FixedRoadProvider([okRoad(), okRoad()]);
    const engine = createRouteEngine({ roadProvider: provider });
    await engine.getRoute({ pickup: KITCHEN, dropoff: SEASON_MALL, now: T0 });
    const fresh = await engine.getRoute({
      pickup: KITCHEN,
      dropoff: SEASON_MALL,
      now: T0,
      bypassCache: true,
    });
    assert.equal(fresh.source, 'ROUTING_PROVIDER');
    assert.equal(provider.callCount, 2);
  });

  it("cache 'disabled' serves every call from the provider", async () => {
    const provider = new FixedRoadProvider([okRoad({ distanceKm: 8 }), okRoad({ distanceKm: 9 })]);
    const engine = createRouteEngine({ roadProvider: provider, cache: 'disabled' });
    const a = await engine.getRoute({ pickup: KITCHEN, dropoff: SEASON_MALL, now: T0 });
    const b = await engine.getRoute({ pickup: KITCHEN, dropoff: SEASON_MALL, now: T1 });
    assert.equal(a.source, 'ROUTING_PROVIDER');
    assert.equal(b.source, 'ROUTING_PROVIDER');
    assert.equal(a.distanceKm, 8);
    assert.equal(b.distanceKm, 9);
    assert.equal(provider.callCount, 2);
  });

  it('cache key isolation — different coordinate pairs never share a cache slot', async () => {
    const provider = new FixedRoadProvider([okRoad({ distanceKm: 5 }), okRoad({ distanceKm: 12 })]);
    const engine = createRouteEngine({ roadProvider: provider });
    const otherDrop = { lat: 18.6, lng: 74.0 };
    const a = await engine.getRoute({ pickup: KITCHEN, dropoff: SEASON_MALL, now: T0 });
    const b = await engine.getRoute({ pickup: KITCHEN, dropoff: otherDrop, now: T0 });
    assert.equal(a.source, 'ROUTING_PROVIDER');
    assert.equal(b.source, 'ROUTING_PROVIDER');
    assert.equal(a.distanceKm, 5);
    assert.equal(b.distanceKm, 12);
    assert.equal(provider.callCount, 2);
  });

  it('no cross-tenant cache leakage when tenantId participates in the key', async () => {
    const provider = new FixedRoadProvider([
      okRoad({ distanceKm: 5 }),
      okRoad({ distanceKm: 9 }),
      okRoad(),
    ]);
    const engine = createRouteEngine({ roadProvider: provider });
    const request = { pickup: KITCHEN, dropoff: SEASON_MALL, now: T0 };
    const t1 = await engine.getRoute({ ...request, tenantId: 'tenant-a' });
    const t2 = await engine.getRoute({ ...request, tenantId: 'tenant-b' });
    const t1again = await engine.getRoute({ ...request, tenantId: 'tenant-a', now: T1 });
    assert.equal(t1.distanceKm, 5);
    assert.equal(t2.distanceKm, 9); // NOT leaked from tenant-a
    assert.equal(t1again.source, 'ROUTE_CACHE'); // tenant-a slot reused
    assert.equal(provider.callCount, 2);
  });

  it('resetCache clears cached routes', async () => {
    const provider = new FixedRoadProvider([okRoad(), okRoad()]);
    const engine = createRouteEngine({ roadProvider: provider });
    await engine.getRoute({ pickup: KITCHEN, dropoff: SEASON_MALL, now: T0 });
    engine.resetCache();
    const again = await engine.getRoute({ pickup: KITCHEN, dropoff: SEASON_MALL, now: T1 });
    assert.equal(again.source, 'ROUTING_PROVIDER');
    assert.equal(provider.callCount, 2);
  });
});
describe('RouteEngine — Golden Season Mall contract', () => {
  it('ROAD fixture → ROAD; Haversine provider → STRAIGHT_LINE; the two are never confused', async () => {
    const provider = new FixedRoadProvider([okRoad()]);
    const engine = createRouteEngine({ roadProvider: provider });

    const road = await engine.getRoute({ pickup: KITCHEN, dropoff: SEASON_MALL, now: T0 });
    assert.equal(road.kind, 'ROAD');
    assert.equal(road.source, 'ROUTING_PROVIDER');
    assert.equal(road.distanceKm, 8); // ≈ 8 km
    assert.equal(road.durationMinutes, 28); // ≈ 28 minutes
    assert.equal(road.routeId, 'synthetic-season-mall');

    const straight = await engine.getRoute({
      pickup: KITCHEN,
      dropoff: SEASON_MALL,
      mode: 'STRAIGHT_LINE',
      now: T0,
    });
    assert.equal(straight.kind, 'STRAIGHT_LINE');
    assert.equal(straight.source, 'STRAIGHT_LINE');
    assert.equal(straight.durationMinutes, null);
    assert.equal(
      straight.distanceKm,
      legacyHaversineKm(KITCHEN.lat, KITCHEN.lng, SEASON_MALL.lat, SEASON_MALL.lng),
    );

    // Different kinds, and the straight-line result is structurally unusable as ROAD.
    assert.notEqual(road.kind, straight.kind);
    assert.throws(() => assertRoadRoute(straight), DeliveryDecisionContractViolation);
  });
});

describe('RouteEngine — input validation', () => {
  it('out-of-range coordinates → UNAVAILABLE with a descriptive reason', async () => {
    const engine = createRouteEngine();
    const route = await engine.getRoute({
      pickup: { lat: 120, lng: 73.98 },
      dropoff: SEASON_MALL,
      now: T0,
    });
    assert.equal(route.kind, 'UNAVAILABLE');
    assert.match(route.reason, /Invalid route coordinates/);
  });

  it('NaN coordinates are rejected', async () => {
    const engine = createRouteEngine();
    const route = await engine.getRoute({
      pickup: { lat: Number.NaN, lng: 73.98 },
      dropoff: SEASON_MALL,
      now: T0,
    });
    assert.equal(route.kind, 'UNAVAILABLE');
  });
});