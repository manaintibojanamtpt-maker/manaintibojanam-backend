/**
 * Phase 5 — Benchmark Model (STEP 5).
 *
 * Traceable, configurable MARKET_BENCHMARK delivery-cost estimation. Consumes the
 * canonical server RouteResult and answers:
 *
 *   "What benchmark was used?"  → region, vehicle, version, source, effective
 *                                  period, pricing parameters, full arithmetic.
 *
 * Scope boundaries (approved):
 *   - ROAD route evidence is authoritative. STRAIGHT_LINE is informational only
 *     and is REJECTED for benchmark cost. An UNAVAILABLE route yields
 *     UNAVAILABLE — never a manufactured road distance.
 *   - This module calculates projected fulfillment cost ONLY. It does NOT set a
 *     customer fee, determine free-delivery eligibility, or compute tenant subsidy
 *     (Free Delivery / Subsidy is a later step; ₹599 is never a production
 *     constant here, and ₹109 may exist only in explicit test fixtures).
 *   - No live provider APIs, no external routing, no Firestore persistence.
 *     Benchmark records are supplied in-memory (platform catalog + optional
 *     server-side tenant overrides). No production `deliveryBenchmarks` seeding.
 *   - No region is hardcoded. `regionKey` follows the repository reference-bundle
 *     convention (`ref-city-in-mh-pune`, `ref-district-in-*`, `ref-state-in-*`).
 *     Resolving coordinates/city → regionKey belongs to the existing location /
 *     reference-data stack at integration time; this service never invents a
 *     region and returns UNAVAILABLE when the region cannot be resolved.
 */

import type {
  DeliveryBenchmark,
  RouteRoadResult,
  RouteResult,
  RouteSourceOrigin,
} from './deliveryIntelligenceTypes.js';

/** Identity of this benchmark model — carried on every quote. */
export const BENCHMARK_MODEL_ID = 'BenchmarkModel/v1' as const;

/** Calculation formula used by every benchmark quote. */
export const BENCHMARK_COST_FORMULA = 'BASE_PLUS_DISTANCE_PLUS_ADJUSTMENTS' as const;

export type BenchmarkUnavailableReason =
  | 'UNKNOWN_REGION'
  | 'UNKNOWN_VEHICLE'
  | 'NO_BENCHMARK_IN_WINDOW'
  | 'ROUTE_UNAVAILABLE'
  | 'ROUTE_NOT_ROAD'
  | 'NO_CATALOG'
  | 'INVALID_BENCHMARK';

export interface BenchmarkRequest {
  /** Owner/tenant scope. Optional — platform benchmark applies when omitted. */
  readonly tenantId?: string;
  /**
   * Canonical region key following the reference-bundle convention
   * (e.g. `ref-city-in-mh-pune`). Resolved by the existing location/reference
   * stack at integration time. Missing/unknown → UNAVAILABLE (UNKNOWN_REGION).
   */
  readonly regionKey?: string;
  /**
   * Vehicle type. When omitted, the model's approved `defaultVehicleType` is used.
   * An explicitly-requested vehicle that has no benchmark record is UNAVAILABLE —
   * the model never silently substitutes a different vehicle.
   */
  readonly vehicleType?: string;
  /** Canonical server route. Only kind === 'ROAD' may drive benchmark cost. */
  readonly route: RouteResult;
  /** Deterministic clock — injectable for tests. Defaults to `new Date()`. */
  readonly now?: Date;
  /** Optional caller trace id. */
  readonly requestId?: string;
}

/** Compact, fully-traceable reference to the benchmark record that produced a quote. */
export interface BenchmarkRecordRef {
  readonly id: string;
  readonly regionKey: string;
  readonly vehicleType: string;
  readonly version: string;
  readonly source: string;
  readonly effectiveFrom: string;
  readonly effectiveUntil: string | null;
  readonly createdAt: string;
}


/**
 * Every arithmetic step of a quote. Formula:
 *
 *   distanceComponent   = perKm × distanceKm
 *   timeComponent       = perMinute × durationMinutes   (only when perMinute set)
 *   rawTotalBeforeFloor = baseFare + distanceComponent + timeComponent
 *                         + (pickupFee ?? 0) + (dropFee ?? 0)
 *   minFareApplied      = max(rawTotalBeforeFloor, minFare) when minFare set
 *   appliedSurge        = surgeMultiplierMin ?? surgeMultiplierMax ?? 1 (deterministic floor)
 *   projectedDeliveryCost = round(minFareApplied × appliedSurge)
 *
 * Rounding happens exactly once, at the end, so results are deterministic.
 */
export interface BenchmarkCostBreakdown {
  readonly formula: typeof BENCHMARK_COST_FORMULA;
  readonly baseFare: number;
  readonly distanceKm: number;
  readonly perKm: number;
  readonly distanceComponent: number;
  readonly perMinute: number | null;
  readonly durationMinutes: number;
  readonly timeComponent: number;
  readonly pickupFee: number | null;
  readonly dropFee: number | null;
  readonly rawTotalBeforeFloor: number;
  readonly minFare: number | null;
  readonly minFareApplied: number | null;
  readonly surgeMultiplierMin: number | null;
  readonly surgeMultiplierMax: number | null;
  readonly appliedSurgeMultiplier: number;
  readonly projectedDeliveryCost: number;
}

export interface BenchmarkQuote {
  readonly status: 'BENCHMARKED';
  readonly projectedDeliveryCost: number;
  readonly projectedCostSource: 'BENCHMARK';
  /** Authoritative route origin that supplied the distance (ROAD routes only). */
  readonly routeSource: Extract<RouteSourceOrigin, 'ROUTING_PROVIDER' | 'ROUTE_CACHE'>;
  readonly distanceKm: number;
  readonly durationMinutes: number;
  readonly benchmark: BenchmarkRecordRef;
  /** Present only when a server-side tenant override record produced this quote. */
  readonly override?: {
    readonly tenantId: string;
    readonly scope: 'TENANT_OVERRIDE';
  };
  readonly calculation: BenchmarkCostBreakdown;
  readonly calculatedAt: string;
  readonly engineVersion: string;
}

export interface BenchmarkUnavailable {
  readonly status: 'UNAVAILABLE';
  readonly reason: BenchmarkUnavailableReason;
  readonly detail: string;
  readonly calculatedAt: string;
}

export type BenchmarkResult = BenchmarkQuote | BenchmarkUnavailable;

export interface BenchmarkModelConfig {
  /** Canonical platform benchmark catalog (canonical fallback). */
  readonly catalog: readonly DeliveryBenchmark[];
  /** Approved default vehicle type when the request omits vehicleType. */
  readonly defaultVehicleType?: string;
}

export interface BenchmarkModel {
  readonly modelId: string;
  estimate(request: BenchmarkRequest): Promise<BenchmarkResult>;
  /** Register/replace a tenant benchmark override (server-side record only). */
  setTenantOverride(tenantId: string, benchmark: DeliveryBenchmark): void;
  clearTenantOverride(tenantId: string): void;
  reset(): void;
}

/**
 * Deterministic, conservative version comparison — newest version wins.
 * Numeric dot-segments are compared component-wise (`2.0` > `1.9`); missing
 * trailing segments count as 0 (`1.0.1` > `1.0`). Non-numeric segments fall
 * back to a stable lexicographic comparison.
 */
export function compareBenchmarkVersions(a: string, b: string): number {
  const ap = a.split('.');
  const bp = b.split('.');
  const len = Math.max(ap.length, bp.length);
  for (let i = 0; i < len; i += 1) {
    const x = Number(ap[i] ?? 0);
    const y = Number(bp[i] ?? 0);
    if (Number.isNaN(x) || Number.isNaN(y)) return a.localeCompare(b);
    if (x !== y) return x - y;
  }
  return 0;
}

/** Every pricing parameter must be finite for a record to produce a cost. */
function isUsablePricing(pricing: DeliveryBenchmark['pricing']): boolean {
  return (
    Number.isFinite(pricing.baseFare) &&
    Number.isFinite(pricing.perKm) &&
    (pricing.perMinute == null || Number.isFinite(pricing.perMinute)) &&
    (pricing.minFare == null || Number.isFinite(pricing.minFare)) &&
    (pricing.pickupFee == null || Number.isFinite(pricing.pickupFee)) &&
    (pricing.dropFee == null || Number.isFinite(pricing.dropFee)) &&
    (pricing.surgeMultiplierMin == null || Number.isFinite(pricing.surgeMultiplierMin)) &&
    (pricing.surgeMultiplierMax == null || Number.isFinite(pricing.surgeMultiplierMax))
  );
}

/** Inclusive window: effectiveFrom <= now <= effectiveUntil (when set). */
function recordInWindow(record: DeliveryBenchmark, nowMs: number): boolean {
  const fromMs = Date.parse(record.effectiveFrom);
  if (Number.isNaN(fromMs)) return false;
  if (nowMs < fromMs) return false;
  if (record.effectiveUntil == null) return true;
  const untilMs = Date.parse(record.effectiveUntil);
  if (Number.isNaN(untilMs)) return false;
  return nowMs <= untilMs;
}

/**
 * Deterministic record precedence (descending):
 *   1. highest version (component-wise numeric);
 *   2. newest createdAt;
 *   3. source ascending (lexicographic);
 *   4. id ascending (lexicographic).
 */
function compareRecordsDesc(a: DeliveryBenchmark, b: DeliveryBenchmark): number {
  const versionOrder = compareBenchmarkVersions(b.version, a.version);
  if (versionOrder !== 0) return versionOrder;
  const createdAtOrder = Date.parse(b.createdAt) - Date.parse(a.createdAt);
  if (Number.isFinite(createdAtOrder) && createdAtOrder !== 0) return createdAtOrder;
  const sourceOrder = a.source.localeCompare(b.source);
  if (sourceOrder !== 0) return sourceOrder;
  return (a.id ?? '').localeCompare(b.id ?? '');
}

function selectFrom(
  records: readonly DeliveryBenchmark[],
  regionKey: string,
  vehicleType: string,
  nowMs: number,
): DeliveryBenchmark | null {
  const candidates = records
    .filter(
      (record) =>
        record.regionKey === regionKey &&
        record.vehicleType === vehicleType &&
        recordInWindow(record, nowMs),
    )
    .sort(compareRecordsDesc);
  return candidates[0] ?? null;
}

function benchmarkRecordRef(record: DeliveryBenchmark): BenchmarkRecordRef {
  return {
    id: record.id ?? '',
    regionKey: record.regionKey,
    vehicleType: record.vehicleType,
    version: record.version,
    source: record.source,
    effectiveFrom: record.effectiveFrom,
    effectiveUntil: record.effectiveUntil,
    createdAt: record.createdAt,
  };
}

function computeBenchmarkCost(
  pricing: DeliveryBenchmark['pricing'],
  route: RouteRoadResult,
): BenchmarkCostBreakdown {
  const perMinute = pricing.perMinute;
  const distanceComponent = pricing.perKm * route.distanceKm;
  const hasTime = perMinute != null && Number.isFinite(perMinute);
  const timeComponent = hasTime ? perMinute * route.durationMinutes : 0;
  const pickupFee = pricing.pickupFee ?? 0;
  const dropFee = pricing.dropFee ?? 0;
  const rawTotalBeforeFloor =
    pricing.baseFare + distanceComponent + timeComponent + pickupFee + dropFee;
  const minFare = pricing.minFare;
  const minFareApplied = minFare != null ? Math.max(rawTotalBeforeFloor, minFare) : null;
  const flooredTotal = minFareApplied != null ? minFareApplied : rawTotalBeforeFloor;
  const surgeMin = pricing.surgeMultiplierMin;
  const surgeMax = pricing.surgeMultiplierMax;
  // Deterministic surge: conservative floor (MIN when present, else MAX, else 1).
  const appliedSurgeMultiplier = surgeMin != null ? surgeMin : surgeMax != null ? surgeMax : 1;
  const projectedDeliveryCost = Math.round(flooredTotal * appliedSurgeMultiplier);
  return {
    formula: BENCHMARK_COST_FORMULA,
    baseFare: pricing.baseFare,
    distanceKm: route.distanceKm,
    perKm: pricing.perKm,
    distanceComponent,
    perMinute,
    durationMinutes: route.durationMinutes,
    timeComponent,
    pickupFee: pricing.pickupFee,
    dropFee: pricing.dropFee,
    rawTotalBeforeFloor,
    minFare,
    minFareApplied,
    surgeMultiplierMin: surgeMin ?? null,
    surgeMultiplierMax: surgeMax ?? null,
    appliedSurgeMultiplier,
    projectedDeliveryCost,
  };
}

/**
 * Creates a benchmark model backed by an in-memory platform catalog plus an
 * optional server-side tenant override registry. Pure and deterministic — no IO,
 * no Firestore, no live providers.
 */
export function createBenchmarkModel(config: BenchmarkModelConfig): BenchmarkModel {
  const tenantOverrides = new Map<string, DeliveryBenchmark[]>();

  return {
    modelId: BENCHMARK_MODEL_ID,

    async estimate(request: BenchmarkRequest): Promise<BenchmarkResult> {
      const now = request.now ?? new Date();
      const nowMs = now.getTime();
      const calculatedAt = now.toISOString();

      // 1. Route gate — only ROAD evidence may drive benchmark cost.
      if (request.route.kind === 'UNAVAILABLE') {
        return {
          status: 'UNAVAILABLE',
          reason: 'ROUTE_UNAVAILABLE',
          detail: `Route unavailable (${request.route.reason}).`,
          calculatedAt,
        };
      }
      if (request.route.kind !== 'ROAD') {
        return {
          status: 'UNAVAILABLE',
          reason: 'ROUTE_NOT_ROAD',
          detail:
            'STRAIGHT_LINE distance is informational only and never drives benchmark cost; ROAD evidence is required.',
          calculatedAt,
        };
      }
      const route: RouteRoadResult = request.route;

      // 2. Region gate — never invent a region.
      const regionKey = request.regionKey?.trim() ?? '';
      if (!regionKey) {
        return {
          status: 'UNAVAILABLE',
          reason: 'UNKNOWN_REGION',
          detail: 'regionKey is required (reference-bundle entity id, e.g. ref-city-in-mh-pune).',
          calculatedAt,
        };
      }

      // 3. Vehicle gate — approved default only; never an invented vehicle.
      const vehicleType = request.vehicleType?.trim() || config.defaultVehicleType?.trim() || '';
      if (!vehicleType) {
        return {
          status: 'UNAVAILABLE',
          reason: 'UNKNOWN_VEHICLE',
          detail: 'vehicleType is required and no approved defaultVehicleType is configured.',
          calculatedAt,
        };
      }

      // 4. Deterministic selection. Precedence:
      //    a) tenant override (server-side record) matching region+vehicle+window;
      //    b) platform catalog (canonical fallback);
      //    c) within each group: highest version → newest createdAt → source asc → id asc.
      const tenantId = request.tenantId?.trim();
      const tenantRecords = tenantId ? (tenantOverrides.get(tenantId) ?? []) : [];
      const tenantMatch = selectFrom(tenantRecords, regionKey, vehicleType, nowMs);
      const selected = tenantMatch ?? selectFrom(config.catalog, regionKey, vehicleType, nowMs);

      if (!selected) {
        const allCandidates = [...tenantRecords, ...config.catalog];
        if (allCandidates.length === 0) {
          return {
            status: 'UNAVAILABLE',
            reason: 'NO_CATALOG',
            detail: 'No benchmark catalog is configured.',
            calculatedAt,
          };
        }
        const hasRegion = allCandidates.some((record) => record.regionKey === regionKey);
        if (!hasRegion) {
          return {
            status: 'UNAVAILABLE',
            reason: 'UNKNOWN_REGION',
            detail: `No benchmark record exists for region "${regionKey}".`,
            calculatedAt,
          };
        }
        const hasVehicle = allCandidates.some(
          (record) => record.regionKey === regionKey && record.vehicleType === vehicleType,
        );
        if (!hasVehicle) {
          return {
            status: 'UNAVAILABLE',
            reason: 'UNKNOWN_VEHICLE',
            detail: `No benchmark record exists for region "${regionKey}", vehicle "${vehicleType}".`,
            calculatedAt,
          };
        }
        return {
          status: 'UNAVAILABLE',
          reason: 'NO_BENCHMARK_IN_WINDOW',
          detail: `No benchmark record for region "${regionKey}", vehicle "${vehicleType}" effective at ${calculatedAt}.`,
          calculatedAt,
        };
      }
      if (!selected.id?.trim()) {
        return {
          status: 'UNAVAILABLE',
          reason: 'INVALID_BENCHMARK',
          detail: 'Selected benchmark record has no id; every record must be traceable.',
          calculatedAt,
        };
      }
      if (!isUsablePricing(selected.pricing)) {
        return {
          status: 'UNAVAILABLE',
          reason: 'INVALID_BENCHMARK',
          detail: 'Selected benchmark record carries non-finite pricing parameters.',
          calculatedAt,
        };
      }

      const calculation = computeBenchmarkCost(selected.pricing, route);

      return {
        status: 'BENCHMARKED',
        projectedDeliveryCost: calculation.projectedDeliveryCost,
        projectedCostSource: 'BENCHMARK',
        routeSource: route.source,
        distanceKm: route.distanceKm,
        durationMinutes: route.durationMinutes,
        benchmark: benchmarkRecordRef(selected),
        ...(tenantMatch
          ? { override: { tenantId: tenantId as string, scope: 'TENANT_OVERRIDE' as const } }
          : {}),
        calculation,
        calculatedAt,
        engineVersion: BENCHMARK_MODEL_ID,
      };
    },

    setTenantOverride(tenantId: string, benchmark: DeliveryBenchmark): void {
      const key = tenantId.trim();
      if (!key) return;
      const list = tenantOverrides.get(key) ?? [];
      const existingIndex = list.findIndex(
        (record) => (record.id ?? '') === (benchmark.id ?? ''),
      );
      if (existingIndex >= 0) list[existingIndex] = benchmark;
      else list.push(benchmark);
      tenantOverrides.set(key, list);
    },

    clearTenantOverride(tenantId: string): void {
      tenantOverrides.delete(tenantId);
    },

    reset(): void {
      tenantOverrides.clear();
    },
  };
}

