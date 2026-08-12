/**
 * Phase 5 — STEP 5: Benchmark Model tests.
 *
 * Covers the approved MARKET_BENCHMARK data model: valid/region/vehicle selection,
 * effective-window filtering, deterministic precedence, ROAD-only consumption,
 * STRAIGHT_LINE/UNAVAILABLE rejection, traceable arithmetic, tenant-override
 * isolation, and the no-₹109-production-hardcode rule. NO live providers, no
 * Firestore — deterministic in-memory fixtures only.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BENCHMARK_COST_FORMULA,
  BENCHMARK_MODEL_ID,
  compareBenchmarkVersions,
  createBenchmarkModel,
} from '../benchmarkModel.js';
import type {
  BenchmarkModel,
  BenchmarkQuote,
  BenchmarkRequest,
  BenchmarkResult,
} from '../benchmarkModel.js';
import {
  FIXTURE_BENCHMARK_SOURCE,
  FIXTURE_EFFECTIVE_FROM,
  FIXTURE_EFFECTIVE_UNTIL,
  FIXTURE_NOW,
  FIXTURE_REGION_BENGALURU,
  FIXTURE_REGION_PUNE,
  FIXTURE_VEHICLE_BIKE,
  FIXTURE_VEHICLE_CAR,
  createPlatformBenchmarkCatalog,
  createSeasonMallRoadRoute,
} from '../benchmarkFixtures.js';
import type { DeliveryBenchmark, RouteResult } from '../deliveryIntelligenceTypes.js';
import { createRouteEngine } from '../routeEngine.js';
import type { RoadRouteProvider } from '../routeEngine.js';

const catalog = createPlatformBenchmarkCatalog();
const roadRoute = createSeasonMallRoadRoute();
const now = new Date(FIXTURE_NOW);

const puneBikeV1 = catalog.find((record) => record.id === 'bm-pune-bike-1') as DeliveryBenchmark;
const puneBikeV2 = catalog.find((record) => record.id === 'bm-pune-bike-2') as DeliveryBenchmark;

function createModel(
  overrides: { defaultVehicleType?: string; records?: readonly DeliveryBenchmark[] } = {},
): BenchmarkModel {
  return createBenchmarkModel({
    catalog: overrides.records ?? catalog,
    ...(overrides.defaultVehicleType ? { defaultVehicleType: overrides.defaultVehicleType } : {}),
  });
}

function estimate(
  model: BenchmarkModel,
  partial: Partial<BenchmarkRequest> = {},
): Promise<BenchmarkResult> {
  return model.estimate({
    regionKey: FIXTURE_REGION_PUNE,
    vehicleType: FIXTURE_VEHICLE_BIKE,
    route: roadRoute,
    now,
    ...partial,
  });
}

function expectQuote(result: BenchmarkResult): BenchmarkQuote {
  assert.equal(result.status, 'BENCHMARKED');
  return result as BenchmarkQuote;
}

function roadRouteFor(distanceKm: number, durationMinutes = 20): RouteResult {
  return {
    kind: 'ROAD',
    source: 'ROUTING_PROVIDER',
    routeId: `synthetic-${distanceKm}km`,
    provider: 'fixture-road',
    distanceKm,
    durationMinutes,
    fetchedAt: FIXTURE_NOW,
  };
}

const straightLineRoute: RouteResult = {
  kind: 'STRAIGHT_LINE',
  source: 'STRAIGHT_LINE',
  distanceKm: 8,
  durationMinutes: null,
  fetchedAt: FIXTURE_NOW,
};

const unavailableRoute: RouteResult = {
  kind: 'UNAVAILABLE',
  source: 'UNKNOWN',
  distanceKm: null,
  durationMinutes: null,
  reason: 'No road provider configured.',
  fetchedAt: FIXTURE_NOW,
};

describe('BenchmarkModel — Step 5', () => {
  it('1. valid benchmark selection produces a traceable quote', async () => {
    const model = createModel();
    const quote = expectQuote(await estimate(model));
    assert.equal(quote.projectedDeliveryCost, 121);
    assert.equal(quote.projectedCostSource, 'BENCHMARK');
    assert.equal(quote.benchmark.id, 'bm-pune-bike-2');
    assert.equal(quote.benchmark.regionKey, FIXTURE_REGION_PUNE);
    assert.equal(quote.benchmark.vehicleType, FIXTURE_VEHICLE_BIKE);
    assert.equal(quote.distanceKm, 8);
    assert.equal(quote.durationMinutes, 28);
  });

  it('2. correct region selection — Bengaluru benchmark is not Pune', async () => {
    const model = createModel();
    const quote = expectQuote(
      await estimate(model, { regionKey: FIXTURE_REGION_BENGALURU }),
    );
    assert.equal(quote.benchmark.regionKey, FIXTURE_REGION_BENGALURU);
    assert.equal(quote.benchmark.id, 'bm-blr-bike-1');
    assert.equal(quote.projectedDeliveryCost, 120);
  });

  it('3. correct vehicle selection — car benchmark differs from bike', async () => {
    const model = createModel();
    const quote = expectQuote(
      await estimate(model, { vehicleType: FIXTURE_VEHICLE_CAR }),
    );
    assert.equal(quote.benchmark.vehicleType, FIXTURE_VEHICLE_CAR);
    assert.equal(quote.benchmark.id, 'bm-pune-car-1');
    assert.equal(quote.projectedDeliveryCost, 146);
  });

  it('4. effectiveFrom filtering — future-dated v9.9 record is not selected', async () => {
    const model = createModel();
    // At 2026-09-01 the v9.9 record (effectiveFrom 2027-01-01) must NOT win;
    // otherwise the quote would be ₹9 instead of the v2.0 ₹121.
    const quote = expectQuote(
      await estimate(model, { now: new Date('2026-09-01T00:00:00.000Z') }),
    );
    assert.equal(quote.benchmark.version, '2.0');
    assert.equal(quote.projectedDeliveryCost, 121);
    // Once the window opens (2027-02-01), the v9.9 record becomes eligible.
    const later = expectQuote(
      await estimate(model, { now: new Date('2027-02-01T00:00:00.000Z') }),
    );
    assert.equal(later.benchmark.id, 'bm-pune-bike-future');
    assert.equal(later.projectedDeliveryCost, 9);
  });

  it('5. effectiveUntil filtering — expired v9.9 record is never selected', async () => {
    const model = createModel();
    // Expired record (effectiveUntil 2025-12-31) would quote ₹9 if selected.
    const quote = expectQuote(await estimate(model));
    assert.equal(quote.benchmark.id, 'bm-pune-bike-2');
    assert.equal(quote.projectedDeliveryCost, 121);
  });

  it('6. deterministic selection — highest version wins; ties break by createdAt then id', async () => {
    const model = createModel();
    const quote = expectQuote(await estimate(model));
    assert.equal(quote.benchmark.version, '2.0');
    assert.equal(quote.benchmark.id, 'bm-pune-bike-2');

    // Version tie → newest createdAt wins.
    const newer = { ...puneBikeV2, id: 'bm-tie-newer', createdAt: '2026-07-01T00:00:00.000Z' };
    const older = { ...puneBikeV2, id: 'bm-tie-older', createdAt: '2026-03-01T00:00:00.000Z' };
    const tieByCreated = expectQuote(await estimate(createModel({ records: [older, newer] })));
    assert.equal(tieByCreated.benchmark.id, 'bm-tie-newer');

    // Full tie (version + createdAt + source) → id ascending.
    const tieA = { ...puneBikeV2, id: 'bm-tie-aaa', createdAt: '2026-06-01T00:00:00.000Z' };
    const tieZ = { ...puneBikeV2, id: 'bm-tie-zzz', createdAt: '2026-06-01T00:00:00.000Z' };
    const tieById = expectQuote(await estimate(createModel({ records: [tieZ, tieA] })));
    assert.equal(tieById.benchmark.id, 'bm-tie-aaa');
  });

  it('7. unknown region → UNAVAILABLE; missing region → UNAVAILABLE', async () => {
    const model = createModel();
    const unknown = await estimate(model, { regionKey: 'ref-city-up-lucknow' });
    assert.equal(unknown.status, 'UNAVAILABLE');
    assert.equal(unknown.reason, 'UNKNOWN_REGION');

    const missing = await estimate(model, { regionKey: undefined });
    assert.equal(missing.status, 'UNAVAILABLE');
    assert.equal(missing.reason, 'UNKNOWN_REGION');
  });

  it('8. unknown vehicle → UNAVAILABLE; approved default used only when configured', async () => {
    const model = createModel();
    const unknown = await estimate(model, { vehicleType: 'scooter' });
    assert.equal(unknown.status, 'UNAVAILABLE');
    assert.equal(unknown.reason, 'UNKNOWN_VEHICLE');

    // Explicit approved default — request without vehicleType resolves to it.
    const withDefault = createModel({ defaultVehicleType: FIXTURE_VEHICLE_BIKE });
    const quote = expectQuote(await estimate(withDefault, { vehicleType: undefined }));
    assert.equal(quote.benchmark.vehicleType, FIXTURE_VEHICLE_BIKE);

    // No default configured + no vehicleType → UNAVAILABLE (never invented).
    const noDefault = createModel();
    const none = await estimate(noDefault, { vehicleType: undefined });
    assert.equal(none.status, 'UNAVAILABLE');
    assert.equal(none.reason, 'UNKNOWN_VEHICLE');
  });

  it('9. ROAD distance accepted with full breakdown traceability', async () => {
    const model = createModel();
    const quote = expectQuote(await estimate(model));
    assert.equal(quote.routeSource, 'ROUTING_PROVIDER');
    const calc = quote.calculation;
    assert.equal(calc.formula, BENCHMARK_COST_FORMULA);
    assert.equal(calc.baseFare, 35);
    assert.equal(calc.perKm, 9);
    assert.equal(calc.distanceKm, 8);
    assert.equal(calc.distanceComponent, 72);
    assert.equal(calc.perMinute, 0.5);
    assert.equal(calc.timeComponent, 14);
    assert.equal(calc.rawTotalBeforeFloor, 121);
    assert.equal(calc.projectedDeliveryCost, 121);
  });

  it('10. STRAIGHT_LINE route rejected — never drives benchmark cost', async () => {
    const model = createModel();
    const result = await estimate(model, { route: straightLineRoute });
    assert.equal(result.status, 'UNAVAILABLE');
    assert.equal(result.reason, 'ROUTE_NOT_ROAD');
  });

  it('11. UNAVAILABLE route → benchmark unavailable, not a manufactured cost', async () => {
    const model = createModel();
    const result = await estimate(model, { route: unavailableRoute });
    assert.equal(result.status, 'UNAVAILABLE');
    assert.equal(result.reason, 'ROUTE_UNAVAILABLE');
  });

  it('12. arithmetic is deterministic — identical inputs produce identical quotes', async () => {
    const model = createModel();
    const first = await estimate(model);
    const second = await estimate(model);
    assert.deepEqual(first, second);
    assert.equal(first.status, 'BENCHMARKED');
  });

  it('13. version/source/effective period preserved on the quote', async () => {
    const model = createModel();
    const quote = expectQuote(await estimate(model));
    assert.equal(quote.benchmark.version, '2.0');
    assert.equal(quote.benchmark.source, FIXTURE_BENCHMARK_SOURCE);
    assert.equal(quote.benchmark.effectiveFrom, FIXTURE_EFFECTIVE_FROM);
    assert.equal(quote.benchmark.effectiveUntil, FIXTURE_EFFECTIVE_UNTIL);
    assert.equal(quote.benchmark.createdAt, '2026-06-01T00:00:00.000Z');
    assert.equal(quote.calculatedAt, FIXTURE_NOW);
    assert.equal(quote.engineVersion, BENCHMARK_MODEL_ID);
  });

  it('14. tenant override is explicit, isolated, and falls back to the platform', async () => {
    const model = createModel();

    // Server-side override record for tenant-a (Pune bike, higher economics).
    const overrideA: DeliveryBenchmark = {
      ...puneBikeV1,
      id: 'bm-tenant-a-override',
      source: 'TENANT_NEGOTIATED',
      version: '1.0',
      pricing: { baseFare: 50, perKm: 20, perMinute: null, minFare: 40, pickupFee: null, dropFee: null },
      createdAt: '2026-07-01T00:00:00.000Z',
      createdBy: 'owner-tooling',
    };
    model.setTenantOverride('tenant-a', overrideA);

    const quoteA = expectQuote(await estimate(model, { tenantId: 'tenant-a' }));
    assert.equal(quoteA.projectedDeliveryCost, 210);
    assert.deepEqual(quoteA.override, { tenantId: 'tenant-a', scope: 'TENANT_OVERRIDE' });
    assert.equal(quoteA.benchmark.id, 'bm-tenant-a-override');
    assert.equal(quoteA.benchmark.source, 'TENANT_NEGOTIATED');

    // No cross-tenant leakage: tenant-b (and anonymous) get the platform quote.
    const quoteB = expectQuote(await estimate(model, { tenantId: 'tenant-b' }));
    assert.equal(quoteB.projectedDeliveryCost, 121);
    assert.equal(quoteB.override, undefined);
    const quoteAnonymous = expectQuote(await estimate(model));
    assert.equal(quoteAnonymous.projectedDeliveryCost, 121);

    // Override on the wrong region does not leak into Pune.
    const overrideWrongRegion: DeliveryBenchmark = {
      ...overrideA,
      id: 'bm-tenant-a-blr',
      regionKey: FIXTURE_REGION_BENGALURU,
      pricing: { baseFare: 999, perKm: 999, perMinute: null, minFare: null, pickupFee: null, dropFee: null },
    };
    model.setTenantOverride('tenant-a', overrideWrongRegion);
    const stillPune = expectQuote(await estimate(model, { tenantId: 'tenant-a' }));
    assert.equal(stillPune.projectedDeliveryCost, 210);

    // Clearing the override restores the canonical platform fallback.
    model.clearTenantOverride('tenant-a');
    const restored = expectQuote(await estimate(model, { tenantId: 'tenant-a' }));
    assert.equal(restored.projectedDeliveryCost, 121);
    assert.equal(restored.override, undefined);
  });

  it('15. no ₹109 production hardcode — cost comes from configured pricing params', async () => {
    const model = createModel();
    const quote = expectQuote(await estimate(model));
    assert.notEqual(quote.projectedDeliveryCost, 109);

    const fixtureValues = catalog.flatMap((record) => [
      record.pricing.baseFare,
      record.pricing.perKm,
      record.pricing.perMinute,
      record.pricing.minFare,
      record.pricing.pickupFee,
      record.pricing.dropFee,
    ]);
    assert.equal(fixtureValues.some((value) => value === 109), false);

    // Recompute the fixture cost from the params — it is a formula result, not a
    // hardcoded lookup keyed on distance.
    const breakdown = quote.calculation;
    assert.equal(
      breakdown.projectedDeliveryCost,
      Math.round(
        Math.max(
          breakdown.minFare ?? Number.NEGATIVE_INFINITY,
          breakdown.rawTotalBeforeFloor,
        ) * breakdown.appliedSurgeMultiplier,
      ),
    );
  });

  it('16. Season Mall golden — 8 km ROAD fixture produces the expected fixture result', async () => {
    // v1.0-only catalog: max(40, 30 + 8·8) = 94 for 8 km / 28 min.
    const v1Only = createModel({ records: [puneBikeV1] });
    const golden = expectQuote(await estimate(v1Only));
    assert.equal(golden.projectedDeliveryCost, 94);
    assert.equal(golden.benchmark.id, 'bm-pune-bike-1');
    assert.equal(golden.distanceKm, 8);
    assert.equal(golden.calculation.distanceComponent, 64);
  });

  it('17. different ROAD distances produce different benchmark costs', async () => {
    const v1Only = createModel({ records: [puneBikeV1] });
    const short = expectQuote(await estimate(v1Only, { route: roadRouteFor(8, 28) }));
    const long = expectQuote(await estimate(v1Only, { route: roadRouteFor(12, 28) }));
    assert.equal(short.projectedDeliveryCost, 94);
    assert.equal(long.projectedDeliveryCost, 126);
    assert.notEqual(short.projectedDeliveryCost, long.projectedDeliveryCost);
  });

  it('18. minFare floors the projected cost deterministically', async () => {
    const floored: DeliveryBenchmark[] = [
      {
        ...puneBikeV1,
        id: 'bm-minfare',
        pricing: { baseFare: 30, perKm: 8, perMinute: null, minFare: 200, pickupFee: null, dropFee: null },
      },
    ];
    const quote = expectQuote(
      await estimate(createModel({ records: floored }), { route: roadRouteFor(2, 10) }),
    );
    assert.equal(quote.calculation.rawTotalBeforeFloor, 46);
    assert.equal(quote.calculation.minFareApplied, 200);
    assert.equal(quote.projectedDeliveryCost, 200);
  });

  it('19. surge is deterministic — conservative MIN multiplier wins over MAX', async () => {
    const surged: DeliveryBenchmark[] = [
      {
        ...puneBikeV2,
        id: 'bm-surge',
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
      },
    ];
    const quote = expectQuote(await estimate(createModel({ records: surged })));
    assert.equal(quote.calculation.appliedSurgeMultiplier, 1.1);
    assert.equal(quote.projectedDeliveryCost, Math.round(121 * 1.1));
  });

  it('20. empty catalog → NO_CATALOG unavailable', async () => {
    const result = await estimate(createModel({ records: [] }));
    assert.equal(result.status, 'UNAVAILABLE');
    assert.equal(result.reason, 'NO_CATALOG');
  });

  it('21. non-finite pricing parameters → INVALID_BENCHMARK unavailable', async () => {
    const invalid: DeliveryBenchmark[] = [
      { ...puneBikeV2, id: 'bm-invalid', pricing: { ...puneBikeV2.pricing, perKm: Number.NaN } },
    ];
    const result = await estimate(createModel({ records: invalid }));
    assert.equal(result.status, 'UNAVAILABLE');
    assert.equal(result.reason, 'INVALID_BENCHMARK');
  });

  it('22. version comparator is deterministic and numeric-aware', () => {
    assert.ok(compareBenchmarkVersions('2.0', '1.9') > 0);
    assert.ok(compareBenchmarkVersions('1.0', '1.0.1') < 0);
    assert.equal(compareBenchmarkVersions('1.0', '1.0'), 0);
    assert.ok(compareBenchmarkVersions('2.0', '10.0') < 0);
  });

  it('23. effective-window boundaries are inclusive', async () => {
    const endsAtNow: DeliveryBenchmark[] = [
      {
        ...puneBikeV1,
        id: 'bm-ends-at-now',
        effectiveFrom: '2020-01-01T00:00:00.000Z',
        effectiveUntil: FIXTURE_NOW,
      },
    ];
    const atBoundary = expectQuote(await estimate(createModel({ records: endsAtNow })));
    assert.equal(atBoundary.benchmark.id, 'bm-ends-at-now');

    const endsBeforeNow: DeliveryBenchmark[] = [
      {
        ...puneBikeV1,
        id: 'bm-ends-before',
        effectiveFrom: '2020-01-01T00:00:00.000Z',
        effectiveUntil: '2026-08-11T09:59:59.999Z',
      },
    ];
    const justAfter = await estimate(createModel({ records: endsBeforeNow }));
    assert.equal(justAfter.status, 'UNAVAILABLE');
    assert.equal(justAfter.reason, 'NO_BENCHMARK_IN_WINDOW');
  });

  it('24. RouteEngine → RouteResult → benchmark estimate end-to-end', async () => {
    const fixtureRoadProvider: RoadRouteProvider = {
      providerId: 'benchmark-fixture-road',
      async getRoadRoute() {
        return { status: 'OK', distanceKm: 8, durationMinutes: 28, routeId: 'synthetic-season-mall' };
      },
    };
    const routeEngine = createRouteEngine({ roadProvider: fixtureRoadProvider });
    const route = await routeEngine.getRoute({
      pickup: { lat: 18.52, lng: 73.86, label: 'Inti kitchen' },
      dropoff: { lat: 18.5, lng: 73.91, label: 'Season Mall' },
      mode: 'ROAD',
      now,
    });
    assert.equal(route.kind, 'ROAD');

    const model = createModel();
    const quote = expectQuote(
      await model.estimate({ route, regionKey: FIXTURE_REGION_PUNE, vehicleType: FIXTURE_VEHICLE_BIKE, now }),
    );
    assert.equal(quote.projectedDeliveryCost, 121);
    assert.equal(quote.distanceKm, 8);
    assert.equal(quote.durationMinutes, 28);
  });
});

