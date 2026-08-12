/**
 * Phase 5 — RouteEngine abstraction (STEP 4).
 *
 * Clean routing boundary. Future pricing/ETA engines consume ONLY the canonical
 * {@link RouteResult} from `/deliveryIntelligenceTypes.js`; they never need to know
 * which routing provider produced it, and no provider-specific implementation
 * detail leaks to consumers.
 *
 *   RouteEngine → RouteResult → Pricing / ETA
 *
 * Route source semantics (Step-2 canonical, enforced here):
 *   ROAD          = authoritative road route (ROUTING_PROVIDER | ROUTE_CACHE)
 *   STRAIGHT_LINE = Haversine/geometric distance ONLY (informational)
 *   UNAVAILABLE   = no usable route, with an explicit failure reason
 *
 * NEVER allowed:
 *   1. STRAIGHT_LINE treated as ROAD.
 *   2. Haversine duration used as authoritative ETA (STRAIGHT_LINE results always
 *      carry `durationMinutes: null`; Step-3 guards throw on misuse).
 *   3. Haversine distance used as projected delivery cost (Step-3 validation refuses
 *      non-ROAD inputs for MARKET_BENCHMARK / PROVIDER_QUOTE modes).
 *
 * Legacy hazard (documented — DO NOT FIX IN THIS STEP):
 *   `marketplace/tenantProjectionHelpers.roadDistanceKm()` is NAMED "road" but
 *   computes pure Haversine (it aliases haversineKm). It is intentionally NOT
 *   renamed or re-routed in Step 4 to avoid breaking existing callers. This engine
 *   never imports that helper; the sanctioned straight-line implementation below is
 *   provably identical (parity-tested), so new authoritative consumers can never be
 *   fooled into treating it as ROAD. A standalone legacy rename/deprecation is
 *   planned separately (out of scope here).
 *
 * Live ROAD routing (ORS/OSRM) stays BEHIND configuration gates. The repository
 * currently contains NO routing-provider configuration and Step 4 holds no approval
 * to enable an external service, so the default ROAD provider returns UNAVAILABLE
 * rather than ever pretending Haversine is a road route.
 *
 * No client-authoritative distance can enter this engine: every route is computed
 * server-side from pickup/dropoff coordinates; consumers only ever read RouteResult.
 */

import type { RouteResult, RouteRoadResult } from './deliveryIntelligenceTypes.js';

// ---------------------------------------------------------------------------
// Route request contract
// ---------------------------------------------------------------------------

/** Server-known coordinate for a route endpoint. */
export interface RoutePoint {
  readonly lat: number;
  readonly lng: number;
  /** Free-text label for traceability only (e.g. "Inti kitchen", "Season Mall"). */
  readonly label?: string;
}

/**
 * What kind of route evidence the caller needs.
 * - `ROAD`                 — authoritative road route only (default).
 * - `STRAIGHT_LINE`        — labelled informational Haversine estimate only.
 * - `ROAD_OR_STRAIGHT_LINE`— ROAD first; on ROAD unavailability return a clearly
 *                            labelled STRAIGHT_LINE (coarse geo pre-filter /
 *                            serviceability pre-check / FIXED_TIER compatibility).
 *                            The fallback is NEVER ROAD and cannot satisfy
 *                            authoritative consumers (type + Step-3 guards).
 */
export type RouteRequestMode = 'ROAD' | 'STRAIGHT_LINE' | 'ROAD_OR_STRAIGHT_LINE';

export interface RouteEngineRequest {
  readonly pickup: RoutePoint;
  readonly dropoff: RoutePoint;
  readonly mode?: RouteRequestMode;
  /** Traceability identifier echoed through provider calls. */
  readonly requestId?: string;
  /**
   * When present, the ROAD cache is tenant-namespaced so no route value can ever
   * leak across tenants. Absent → engine-wide namespace.
   */
  readonly tenantId?: string;
  /** Max cached-route age (minutes) before it is considered stale. Default 10. */
  readonly maxStaleMinutes?: number;
  /** Bypass the cache and hit the ROAD provider. */
  readonly bypassCache?: boolean;
  /** Deterministic clock (tests/cache freshness); default `new Date()`. */
  readonly now?: Date;
}
// ---------------------------------------------------------------------------
// ROAD provider contract (server-side, gated)
// ---------------------------------------------------------------------------

export interface RoadRouteProviderRequest {
  readonly pickup: RoutePoint;
  readonly dropoff: RoutePoint;
  readonly requestId?: string;
  readonly tenantId?: string;
}

export type RoadRouteProviderResult =
  | {
      readonly status: 'OK';
      readonly distanceKm: number;
      readonly durationMinutes: number;
      readonly routeId?: string;
      readonly geometry?: unknown;
    }
  | { readonly status: 'UNAVAILABLE'; readonly reason: string };

/**
 * A ROAD evidence source (ORS / self-hosted OSRM behind configuration gates, or a
 * test fixture). Providers return raw road evidence; the engine owns the canonical
 * RouteResult envelope, provenance labels, and validation.
 */
export interface RoadRouteProvider {
  readonly providerId: string;
  getRoadRoute(request: RoadRouteProviderRequest): Promise<RoadRouteProviderResult>;
}

export const NO_ROAD_PROVIDER_ID = 'no-road-provider';

/**
 * Safe default ROAD provider: returns UNAVAILABLE. Used until the repo gains a
 * configured + approved live routing service — Haversine is never substituted.
 */
export function createNoopRoadRouteProvider(
  reason =
    'No live ROAD routing provider is configured (ORS/OSRM remain gated). ROAD routes are unavailable.',
): RoadRouteProvider {
  return {
    providerId: NO_ROAD_PROVIDER_ID,
    async getRoadRoute(): Promise<RoadRouteProviderResult> {
      return { status: 'UNAVAILABLE', reason };
    },
  };
}
// ---------------------------------------------------------------------------
// STRAIGHT_LINE (Haversine) provider
// ---------------------------------------------------------------------------

export interface StraightLineRouteProviderRequest {
  readonly pickup: RoutePoint;
  readonly dropoff: RoutePoint;
}

/**
 * Produces labelled informational straight-line distance only. Never yields a
 * ROAD result, never yields a duration, and applies NO arbitrary road multiplier.
 */
export interface StraightLineRouteProvider {
  readonly providerId: string;
  getStraightLineDistanceKm(request: StraightLineRouteProviderRequest): number;
}

/**
 * Haversine great-circle distance (km). Sanctioned straight-line implementation for
 * this engine — numerically identical to `marketplace/tenantProjectionHelpers`
 * `haversineKm` (and therefore to `roadDistanceKm`, which IS haversine despite its
 * name — see module header). Parity is proven by tests; no multiplier is applied.
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const STRAIGHT_LINE_PROVIDER_ID = 'haversine';

export function createStraightLineRouteProvider(): StraightLineRouteProvider {
  return {
    providerId: STRAIGHT_LINE_PROVIDER_ID,
    getStraightLineDistanceKm(request: StraightLineRouteProviderRequest): number {
      return haversineKm(
        request.pickup.lat,
        request.pickup.lng,
        request.dropoff.lat,
        request.dropoff.lng,
      );
    },
  };
}
// ---------------------------------------------------------------------------
// Cache policy + engine
// ---------------------------------------------------------------------------

export interface RouteEngineCachePolicy {
  /** Cached ROAD route older than this (minutes) is stale. */
  readonly maxStaleMinutes: number;
  /**
   * When the ROAD provider is unavailable but a stale route exists, return the
   * stale route labelled `source: 'ROUTE_CACHE'` with its original `fetchedAt`.
   * The Step-2/Step-3 confidence rules already map cached/stale evidence to LOW.
   */
  readonly allowStaleOnProviderFailure: boolean;
}

export interface RouteEngineConfig {
  readonly roadProvider?: RoadRouteProvider;
  readonly straightLineProvider?: StraightLineRouteProvider;
  /** One of the policy above, or `'disabled'` to bypass the cache entirely. */
  readonly cache?: RouteEngineCachePolicy | 'disabled';
}

export interface RouteEngine {
  readonly engineId: string;
  /** Resolve the server-authoritative route for a pickup → dropoff pair. */
  getRoute(request: RouteEngineRequest): Promise<RouteResult>;
  /** Drop all cached ROAD routes (e.g. provider switch or security event). */
  resetCache(): void;
}

export const ROUTE_ENGINE_ID = 'RouteEngine/v1';
export const DEFAULT_MAX_STALE_MINUTES = 10;

interface RouteCacheEntry {
  readonly route: RouteRoadResult;
}

function isValidCoordinate(point: RoutePoint): boolean {
  const { lat, lng } = point;
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function describePoint(point: RoutePoint): string {
  return `(${point.lat}, ${point.lng})`;
}

function isFinitePositive(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}
export function createRouteEngine(config: RouteEngineConfig = {}): RouteEngine {
  const roadProvider = config.roadProvider ?? createNoopRoadRouteProvider();
  const straightLineProvider = config.straightLineProvider ?? createStraightLineRouteProvider();

  const cacheDisabled = config.cache === 'disabled';
  const cachePolicy: RouteEngineCachePolicy = cacheDisabled
    ? { maxStaleMinutes: 0, allowStaleOnProviderFailure: false }
    : config.cache ?? {
        maxStaleMinutes: DEFAULT_MAX_STALE_MINUTES,
        allowStaleOnProviderFailure: true,
      };

  const cache = new Map<string, RouteCacheEntry>();

  const nowIso = (at: Date): string => at.toISOString();

  /**
   * Tenant + provider namespaced, coordinate-exact cache key. Never collides
   * across tenants when `tenantId` is supplied by the caller.
   */
  const cacheKey = (request: RouteEngineRequest): string =>
    [
      request.tenantId ?? '',
      roadProvider.providerId,
      request.pickup.lat,
      request.pickup.lng,
      request.dropoff.lat,
      request.dropoff.lng,
    ].join('|');

  const isFresh = (entry: RouteCacheEntry, at: Date): boolean => {
    const ageMs = at.getTime() - Date.parse(entry.route.fetchedAt);
    if (Number.isNaN(ageMs)) return false;
    return ageMs <= cachePolicy.maxStaleMinutes * 60_000;
  };

  const unavailable = (fetchedAt: string, reason: string): RouteResult => ({
    kind: 'UNAVAILABLE',
    source: 'UNKNOWN',
    distanceKm: null,
    durationMinutes: null,
    reason,
    fetchedAt,
  });

  const straightLineResult = (request: RouteEngineRequest, fetchedAt: string): RouteResult => {
    const distanceKm = straightLineProvider.getStraightLineDistanceKm({
      pickup: request.pickup,
      dropoff: request.dropoff,
    });
    return {
      kind: 'STRAIGHT_LINE',
      source: 'STRAIGHT_LINE',
      distanceKm,
      // Haversine duration is NEVER authoritative.
      durationMinutes: null,
      fetchedAt,
    };
  };

  async function getRoute(request: RouteEngineRequest): Promise<RouteResult> {
    const mode = request.mode ?? 'ROAD';
    const at = request.now ?? new Date();
    const fetchedAt = nowIso(at);

    if (!isValidCoordinate(request.pickup) || !isValidCoordinate(request.dropoff)) {
      return unavailable(
        fetchedAt,
        `Invalid route coordinates (pickup=${describePoint(request.pickup)}, dropoff=${describePoint(request.dropoff)}).`,
      );
    }

    if (mode === 'STRAIGHT_LINE') {
      return straightLineResult(request, fetchedAt);
    }

    // --- ROAD evidence path (with optional labelled straight-line fallback) ---
    let staleHit: RouteCacheEntry | undefined;
    if (!cacheDisabled && !request.bypassCache) {
      const hit = cache.get(cacheKey(request));
      if (hit && isFresh(hit, at)) {
        return { ...hit.route, source: 'ROUTE_CACHE', fetchedAt: hit.route.fetchedAt };
      }
      if (hit) staleHit = hit;
    }

    let providerResult: RoadRouteProviderResult;
    try {
      providerResult = await roadProvider.getRoadRoute({
        pickup: request.pickup,
        dropoff: request.dropoff,
        requestId: request.requestId,
        tenantId: request.tenantId,
      });
    } catch (error) {
      providerResult = {
        status: 'UNAVAILABLE',
        reason: error instanceof Error ? error.message : 'ROAD provider request failed.',
      };
    }

    if (providerResult.status === 'OK') {
      if (
        !isFinitePositive(providerResult.distanceKm) ||
        !isFinitePositive(providerResult.durationMinutes)
      ) {
        return unavailable(
          fetchedAt,
          'ROAD provider returned an invalid route (non-finite or negative distance/duration).',
        );
      }
      const road: RouteRoadResult = {
        kind: 'ROAD',
        source: 'ROUTING_PROVIDER',
        distanceKm: providerResult.distanceKm,
        durationMinutes: providerResult.durationMinutes,
        ...(providerResult.routeId !== undefined ? { routeId: providerResult.routeId } : {}),
        ...(providerResult.geometry !== undefined ? { geometry: providerResult.geometry } : {}),
        provider: roadProvider.providerId,
        fetchedAt,
      };
      if (!cacheDisabled) cache.set(cacheKey(request), { route: road });
      return road;
    }

    // Provider unavailable — prefer traceable stale ROAD evidence over nothing.
    if (!cacheDisabled && cachePolicy.allowStaleOnProviderFailure && staleHit) {
      return { ...staleHit.route, source: 'ROUTE_CACHE', fetchedAt: staleHit.route.fetchedAt };
    }

    if (mode === 'ROAD_OR_STRAIGHT_LINE') {
      return straightLineResult(request, fetchedAt);
    }

    return unavailable(fetchedAt, providerResult.reason);
  }

  const engine: RouteEngine = {
    engineId: ROUTE_ENGINE_ID,
    getRoute,
    resetCache(): void {
      cache.clear();
    },
  };
  return engine;
}