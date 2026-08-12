/**
 * Phase 5 — Benchmark Model (STEP 5) — deterministic in-memory fixtures.
 *
 * These records are test/fixture data ONLY. No production Firestore seeding, no
 * `deliveryBenchmarks` collection writes. Region keys follow the repository
 * reference-bundle convention (`ref-city-in-mh-pune` matches cities.json).
 * Numeric pricing values are explicit fixture params — deliberately not the
 * ₹109 / ₹599 magic constants. The "Season Mall golden" fixture is 8 km / 28 min
 * (matches the Step-4 ROAD fixture evidence).
 */

import type { DeliveryBenchmark, RouteResult } from './deliveryIntelligenceTypes.js';

/** Fixture region keys — reference-bundle ids present in `src/data/reference/india`. */
export const FIXTURE_REGION_PUNE = 'ref-city-in-mh-pune';
export const FIXTURE_REGION_BENGALURU = 'ref-city-in-ka-bengaluru';

/** Fixture vehicle dimensions — provider-independent, explicitly declared. */
export const FIXTURE_VEHICLE_BIKE = 'bike';
export const FIXTURE_VEHICLE_CAR = 'car';

/** Deterministic clock used across Step-5 tests. */
export const FIXTURE_NOW = '2026-08-11T10:00:00.000Z';

export const FIXTURE_EFFECTIVE_FROM = '2026-01-01T00:00:00.000Z';
export const FIXTURE_EFFECTIVE_UNTIL = '2026-12-31T00:00:00.000Z';

export const FIXTURE_BENCHMARK_SOURCE = 'FIXTURE_MARKET_SURVEY';

/**
 * Canonical platform catalog used by Step-5 tests. Contents:
 *   - Pune bike v1.0 — Season Mall golden (8 km, 28 min) → max(40, 30 + 8·8) = 94.
 *   - Pune bike v2.0 — newest version wins the deterministic tie-break.
 *                      (8 km, 28 min) → 35 + 9·8 + 0.5·28 = 121.
 *   - Pune car     — distinct vehicle dimension.
 *   - Bengaluru bike — distinct region dimension.
 *   - Expired Pune bike v9.9 — never selected (window precedence over version).
 *   - Future Pune bike v9.9 — never selected while its effectiveFrom is in the future.
 */
export function createPlatformBenchmarkCatalog(): readonly DeliveryBenchmark[] {
  return [
    {
      id: 'bm-pune-bike-1',
      regionKey: FIXTURE_REGION_PUNE,
      vehicleType: FIXTURE_VEHICLE_BIKE,
      effectiveFrom: FIXTURE_EFFECTIVE_FROM,
      effectiveUntil: FIXTURE_EFFECTIVE_UNTIL,
      source: FIXTURE_BENCHMARK_SOURCE,
      version: '1.0',
      pricing: { baseFare: 30, perKm: 8, perMinute: null, minFare: 40, pickupFee: null, dropFee: null },
      createdAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'benchmark-model-fixture',
    },
    {
      id: 'bm-pune-bike-2',
      regionKey: FIXTURE_REGION_PUNE,
      vehicleType: FIXTURE_VEHICLE_BIKE,
      effectiveFrom: FIXTURE_EFFECTIVE_FROM,
      effectiveUntil: FIXTURE_EFFECTIVE_UNTIL,
      source: FIXTURE_BENCHMARK_SOURCE,
      version: '2.0',
      pricing: { baseFare: 35, perKm: 9, perMinute: 0.5, minFare: 40, pickupFee: null, dropFee: null },
      createdAt: '2026-06-01T00:00:00.000Z',
      createdBy: 'benchmark-model-fixture',
    },
    {
      id: 'bm-pune-car-1',
      regionKey: FIXTURE_REGION_PUNE,
      vehicleType: FIXTURE_VEHICLE_CAR,
      effectiveFrom: FIXTURE_EFFECTIVE_FROM,
      effectiveUntil: FIXTURE_EFFECTIVE_UNTIL,
      source: FIXTURE_BENCHMARK_SOURCE,
      version: '1.0',
      pricing: { baseFare: 50, perKm: 12, perMinute: null, minFare: 60, pickupFee: null, dropFee: null },
      createdAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'benchmark-model-fixture',
    },
    {
      id: 'bm-blr-bike-1',
      regionKey: FIXTURE_REGION_BENGALURU,
      vehicleType: FIXTURE_VEHICLE_BIKE,
      effectiveFrom: FIXTURE_EFFECTIVE_FROM,
      effectiveUntil: FIXTURE_EFFECTIVE_UNTIL,
      source: FIXTURE_BENCHMARK_SOURCE,
      version: '1.0',
      pricing: { baseFare: 40, perKm: 10, perMinute: null, minFare: 45, pickupFee: null, dropFee: null },
      createdAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'benchmark-model-fixture',
    },
    {
      id: 'bm-pune-bike-expired',
      regionKey: FIXTURE_REGION_PUNE,
      vehicleType: FIXTURE_VEHICLE_BIKE,
      effectiveFrom: '2025-01-01T00:00:00.000Z',
      effectiveUntil: '2025-12-31T00:00:00.000Z',
      source: FIXTURE_BENCHMARK_SOURCE,
      version: '9.9',
      pricing: { baseFare: 1, perKm: 1, perMinute: null, minFare: null, pickupFee: null, dropFee: null },
      createdAt: '2025-01-01T00:00:00.000Z',
      createdBy: 'benchmark-model-fixture',
    },
    {
      id: 'bm-pune-bike-future',
      regionKey: FIXTURE_REGION_PUNE,
      vehicleType: FIXTURE_VEHICLE_BIKE,
      effectiveFrom: '2027-01-01T00:00:00.000Z',
      effectiveUntil: null,
      source: FIXTURE_BENCHMARK_SOURCE,
      version: '9.9',
      pricing: { baseFare: 1, perKm: 1, perMinute: null, minFare: null, pickupFee: null, dropFee: null },
      createdAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'benchmark-model-fixture',
    },
  ];
}

/** Season Mall golden ROAD route: 8 km / 28 min (matches Step-4 ROAD fixture evidence). */
export function createSeasonMallRoadRoute(): RouteResult {
  return {
    kind: 'ROAD',
    source: 'ROUTING_PROVIDER',
    routeId: 'synthetic-season-mall',
    provider: 'fixture-road',
    distanceKm: 8,
    durationMinutes: 28,
    fetchedAt: FIXTURE_NOW,
  };
}
