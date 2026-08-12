/**
 * Phase 5 — Pricing Engine (STEP 6).
 *
 * Centralized delivery pricing. This is the authoritative producer of
 *
 *   projectedDeliveryCost   estimated fulfillment cost (PROVIDER | BENCHMARK | UNKNOWN)
 *   customerDeliveryFee     the amount the customer is charged (Window-1 policy)
 *   tenantSubsidy           projectedDeliveryCost − customerDeliveryFee (null when cost unknown)
 *
 * Consumed inputs ONLY:
 *   RouteResult (canonical, server-produced) + DeliveryBenchmark (BenchmarkModel)
 *   + tenant delivery policy/configuration + order context.
 *
 * Scope boundaries (approved, enforced):
 *   - NEVER calculates distance itself; consumes RouteResult as-is.
 *   - NEVER calls Haversine/straight-line math, routing providers, Rapido/Porter/Uber,
 *     or any external delivery API.
 *   - NEVER estimates ETA and never implements kitchen preparation.
 *   - Step 7: the canonical free-delivery + tenant-subsidy policy is evaluated here.
 *     When `freeDelivery.enabled` is true and the order value (SUBTOTAL basis —
 *     matching the existing checkout threshold semantics) reaches the tenant-configured
 *     threshold, a PRICED result changes ONLY customerDeliveryFee (→ ₹0) and
 *     tenantSubsidy (→ projectedDeliveryCost, or null when the cost is unknown).
 *     projectedDeliveryCost, route, distance, benchmark/quote references are NEVER
 *     modified by the policy. Legacy `freeDeliveryMinOrder` remains supported as the
 *     threshold fallback but never enables the policy by itself (runtime activation
 *     stays off until the Step-11 checkout integration). ₹599 is only the owner-form
 *     default; the engine always reads tenant configuration.
 *   - MARKET_BENCHMARK / PROVIDER_QUOTE / PROVIDER_QUOTE_CACHE require ROAD evidence.
 *     STRAIGHT_LINE and UNAVAILABLE routes are rejected as authoritative pricing
 *     inputs. FIXED_TIER (Window-1) may consume the route-provided distance (ROAD or
 *     the labelled STRAIGHT_LINE ROAD_OR_STRAIGHT_LINE fallback) for the tenant's
 *     fixed customer fee, but its projected fulfillment cost always stays null.
 *   - FIXED_TIER customer fee DELEGATES to the canonical shared helper
 *     `computeTenantDeliveryFee` (backend-lib/marketplace) — the exact helper the
 *     production checkout quote path uses. Window-1 parity is structural, not copied.
 *
 * Pricing ladder (approved):
 *   1. PROVIDER_QUOTE          live provider quote (supplied by the provider layer)
 *   2. PROVIDER_QUOTE_CACHE    cached provider quote (supplied by the provider layer)
 *   3. MARKET_BENCHMARK        benchmark model projected fulfillment cost
 *   4. FIXED_TIER              tenant-configured fixed customer fee (Window 1)
 *   5. UNAVAILABLE             no priced result
 *
 * Provider quote integration is NOT implemented in this step (Step 16 will plug live
 * quotes into this same contract). The engine accepts a ProviderQuoteResult as an
 * INPUT and validates status / expiry / provider / cost / route compatibility. It
 * never invents a quote, never trusts a stale one, and never silently substitutes
 * another source when a supplied quote is invalid. Provider quote SELECTION belongs
 * to the provider layer.
 *
 * Rounding rule (deterministic, single final point per value):
 *   - benchmark cost  → rounds exactly once inside the benchmark model;
 *   - customer fee    → rounds exactly once via Math.round at the delegation boundary
 *                       (mirrors the production `resolveCheckoutDeliveryFee`);
 *   - provider cost   → rounds exactly once (INR integer) on acceptance.
 *   No intermediate per-component rounding accumulates.
 */

import { computeTenantDeliveryFee } from '../marketplace/tenantProjectionHelpers.js';
import type { TenantDeliveryConfig } from '../marketplace/tenantProjectionHelpers.js';
import type {
  DeliveryPricing,
  FreeDeliveryDecision,
  PriceConfidence,
  PricingMode,
  ProjectedCostSource,
  ProviderQuoteResult,
  ProviderQuoteSource,
  RouteResult,
  RouteSourceOrigin,
} from './deliveryIntelligenceTypes.js';
import type { DeliveryProviderId, DeliveryConnectionType } from './providerCapabilityMatrix.js';
import type {
  BenchmarkCostBreakdown,
  BenchmarkModel,
  BenchmarkRecordRef,
} from './benchmarkModel.js';

/** Identity of this pricing engine — carried on every pricing result. */
export const PRICING_ENGINE_ID = 'PricingEngine/v1' as const;

/** Approved pricing ladder. */
export type PricingLadderStep =
  | 'PROVIDER_QUOTE'
  | 'PROVIDER_QUOTE_CACHE'
  | 'MARKET_BENCHMARK'
  | 'FIXED_TIER'
  | 'UNAVAILABLE';

/** Why the engine could not produce a priced result (component-level reason). */
export type PricingUnavailableReason =
  | 'ROUTE_UNAVAILABLE'
  | 'ROUTE_NOT_ROAD'
  | 'MISSING_BENCHMARK_MODEL'
  | 'MISSING_REGION'
  | 'BENCHMARK_UNAVAILABLE'
  | 'PROVIDER_QUOTE_INVALID'
  | 'PROVIDER_QUOTE_EXPIRED'
  | 'PROVIDER_QUOTE_ROUTE_MISMATCH'
  | 'FIXED_TIER_UNAVAILABLE';

/** Ladder step that could not produce a priced result (traceability). */
export interface PricingFallbackReason {
  readonly attempted: PricingLadderStep;
  readonly reason: PricingUnavailableReason;
  readonly detail: string;
}

/** Coordinate pair used to cross-check a provider quote against the priced route. */
export interface PricingRoutePoint {
  readonly lat: number;
  readonly lng: number;
  readonly label?: string;
}

/**
 * Canonical Step-7 free-delivery policy configuration (tenant-owned). ₹599 is only
 * the owner-form default; the engine reads `minimumOrderValue` from here, falling
 * back to the legacy `tenantDeliveryConfig.freeDeliveryMinOrder` field. `enabled`
 * must be explicitly true — a legacy value alone never activates the policy.
 */
export interface FreeDeliveryPolicyConfig {
  readonly enabled: boolean;
  readonly minimumOrderValue?: number | null;
  readonly payer?: 'TENANT';
  readonly basis?: 'SUBTOTAL';
}

/**
 * @deprecated Step 7 — superseded by the canonical {@link FreeDeliveryDecision}
 * (deliveryIntelligenceTypes). Kept as a type alias for import compatibility only;
 * new code must use the canonical decision.
 */
export type FreeDeliveryReadiness = FreeDeliveryDecision;

export interface ProviderQuoteRef {
  readonly provider: DeliveryProviderId;
  readonly quoteId: string | null;
  readonly quotedAt: string;
  readonly providerExpiresAt: string | null;
  readonly cost: number;
  readonly source: ProviderQuoteSource;
  readonly connectionType?: DeliveryConnectionType;
  readonly vehicleType?: string;
}

/**
 * Shared traceability surface. Every pricing result answers:
 *   "Why did BhojanOS charge this customer ₹X?"        → pricingMode, pricingStep,
 *                                                        customerDeliveryFee, freeDelivery
 *   "What did BhojanOS estimate the actual fulfillment → projectedDeliveryCost,
 *    would cost?"                                       projectedCostSource, benchmark/quote refs
 */
export interface PricingResultBase {
  /** Effective pricing mode that produced this result (FIXED_TIER on an approved fallback). */
  readonly pricingMode: PricingMode;
  /** Which ladder step produced this result. */
  readonly pricingStep: PricingLadderStep;
  readonly routeSource: RouteSourceOrigin;
  readonly distanceKm: number | null;
  readonly durationMinutes: number | null;
  readonly projectedDeliveryCost: number | null;
  readonly projectedCostSource: ProjectedCostSource;
  readonly customerDeliveryFee: number | null;
  readonly tenantSubsidy: number | null;
  readonly confidence: PriceConfidence;
  /** Step-7 canonical free-delivery decision (evaluated from tenant config + order value). */
  readonly freeDelivery: FreeDeliveryDecision;
  readonly calculatedAt: string;
  readonly engineVersion: string;
  readonly requestId?: string;
}

export interface PricedDeliveryResult extends PricingResultBase {
  readonly status: 'PRICED';
  /** Present for MARKET_BENCHMARK results — the exact benchmark record used. */
  readonly benchmark?: BenchmarkRecordRef;
  readonly benchmarkCalculation?: BenchmarkCostBreakdown;
  readonly benchmarkOverride?: { readonly tenantId: string; readonly scope: 'TENANT_OVERRIDE' };
  /** Present for PROVIDER_QUOTE / PROVIDER_QUOTE_CACHE results. */
  readonly providerQuote?: ProviderQuoteRef;
  /** Present only when an approved explicit fallback produced this result. */
  readonly fallback?: PricingFallbackReason;
}

export interface UnavailablePricingResult extends PricingResultBase {
  readonly status: 'UNAVAILABLE';
  readonly reason: PricingUnavailableReason;
  readonly detail: string;
}

export interface PendingPricingResult extends PricingResultBase {
  readonly status: 'PENDING';
  readonly pendingRequirements: readonly ('PROVIDER_QUOTE' | 'PRICING')[];
  readonly detail: string;
}

export type PricingResult = PricedDeliveryResult | UnavailablePricingResult | PendingPricingResult;

export interface PricingEngineRequest {
  /** Owner/tenant scope — always passed through to the benchmark model. */
  readonly tenantId?: string;
  readonly pricingMode: PricingMode;
  /** Canonical server route. The engine consumes distance/duration — it never computes them. */
  readonly route: RouteResult;
  /** Tenant delivery policy/configuration (Window-1 customer-fee source). */
  readonly tenantDeliveryConfig?: TenantDeliveryConfig;
  /** Per-request benchmark model (overrides the engine-level default). */
  readonly benchmarkModel?: BenchmarkModel;
  /** Reference-bundle region key for MARKET_BENCHMARK (e.g. `ref-city-in-mh-pune`). */
  readonly regionKey?: string;
  readonly vehicleType?: string;
  /** Supplied by the provider layer when pricingMode === PROVIDER_QUOTE. Never invented here. */
  readonly providerQuote?: ProviderQuoteResult;
  /**
   * Order value expressed in the configured free-delivery basis (SUBTOTAL — item
   * subtotal before discount/tax/delivery/platform-fee/tip, matching the existing
   * checkout threshold semantics). Only evaluated when the canonical free-delivery
   * policy is enabled.
   */
  readonly orderValue?: number | null;
  /** Canonical Step-7 free-delivery policy (enabled / minimumOrderValue / payer / basis). */
  readonly freeDelivery?: FreeDeliveryPolicyConfig;
  /** Route endpoints for provider-quote route-compatibility validation. */
  readonly pickup?: PricingRoutePoint;
  readonly dropoff?: PricingRoutePoint;
  /**
   * Explicit Window-1 compatibility opt-in: when true, an authoritative mode that
   * cannot price (benchmark unavailable or non-ROAD route) falls back to the tenant's
   * FIXED_TIER customer fee. Default false — never silently downgraded.
   */
  readonly window1FixedTierFallback?: boolean;
  /** Deterministic clock — injectable for tests. Defaults to `new Date()`. */
  readonly now?: Date;
  readonly requestId?: string;
}

export interface PricingEngineConfig {
  readonly engineId?: string;
  /** Engine-level default benchmark model (MARKET_BENCHMARK mode). */
  readonly benchmarkModel?: BenchmarkModel;
}

export interface PricingEngine {
  readonly engineId: string;
  price(request: PricingEngineRequest): Promise<PricingResult>;
}


// ---------------------------------------------------------------------------
// Internal context + helpers
// ---------------------------------------------------------------------------

interface PricingContext {
  readonly now: Date;
  readonly calculatedAt: string;
  readonly engineVersion: string;
  readonly requestId?: string;
  readonly benchmarkModel?: BenchmarkModel;
  readonly freeDelivery: FreeDeliveryDecision;
}

/** Route origin, tolerating UNAVAILABLE results. */
function routeSourceOf(route: RouteResult): RouteSourceOrigin {
  if (route.kind === 'ROAD') return route.source;
  if (route.kind === 'STRAIGHT_LINE') return 'STRAIGHT_LINE';
  return 'UNKNOWN';
}

/** Distance/duration on the result surface (never invented for UNAVAILABLE routes). */
function routeMetrics(route: RouteResult): { distanceKm: number | null; durationMinutes: number | null } {
  if (route.kind === 'UNAVAILABLE') return { distanceKm: null, durationMinutes: null };
  return {
    distanceKm: route.distanceKm,
    durationMinutes: route.kind === 'ROAD' ? route.durationMinutes : null,
  };
}

/**
 * Window-1 customer fee policy: the tenant-configured delivery fee ladder,
 * delegated to the canonical shared helper used by the production checkout
 * quote path. Returns null when the tenant config cannot price the distance
 * (`computeTenantDeliveryFee` returns -1 for out-of-radius / unconfigured fees).
 * Rounds exactly once at this delegation boundary.
 */
function resolveCustomerFee(distanceKm: number | null, config?: TenantDeliveryConfig): number | null {
  if (distanceKm === null) return null;
  const computed = computeTenantDeliveryFee(distanceKm, config);
  if (computed === -1) return null;
  return Math.max(0, Math.round(computed));
}

/**
 * Step-7 canonical free-delivery policy evaluation.
 *
 * Config resolution (additive migration):
 *   - canonical `request.freeDelivery.minimumOrderValue` wins;
 *   - otherwise the legacy `tenantDeliveryConfig.freeDeliveryMinOrder` is the
 *     threshold fallback (still supported — never removed);
 *   - `enabled` must be explicitly true: a legacy value alone never activates the
 *     policy (runtime activation stays off until the Step-11 checkout integration).
 *
 * Basis: SUBTOTAL (item subtotal before discount/tax/fees/tip) — the exact basis the
 * existing checkout already uses for its free-delivery threshold. ₹599 is only the
 * owner-form default; the engine never hardcodes it.
 */
function buildFreeDeliveryDecision(request: PricingEngineRequest): FreeDeliveryDecision {
  const canonical = request.freeDelivery;
  const legacyRaw = request.tenantDeliveryConfig?.freeDeliveryMinOrder;
  const enabled = canonical?.enabled === true;

  const raw = canonical?.minimumOrderValue ?? legacyRaw;
  const minimumOrderValue =
    raw != null && Number.isFinite(Number(raw)) ? Math.max(0, Number(raw)) : null;

  const rawOrderValue = request.orderValue;
  const orderValue =
    rawOrderValue != null && Number.isFinite(Number(rawOrderValue)) && Number(rawOrderValue) >= 0
      ? Number(rawOrderValue)
      : null;

  const basis: FreeDeliveryDecision['basis'] = enabled ? (canonical?.basis ?? 'SUBTOTAL') : null;
  const payer: FreeDeliveryDecision['payer'] = enabled ? (canonical?.payer ?? 'TENANT') : null;

  let eligible = false;
  let reason: FreeDeliveryDecision['reason'];
  if (!enabled || minimumOrderValue === null) {
    reason = 'DISABLED';
  } else if (orderValue === null) {
    reason = 'NO_ORDER_VALUE';
  } else if (orderValue >= minimumOrderValue) {
    eligible = true;
    reason = 'THRESHOLD_MET';
  } else {
    reason = 'BELOW_THRESHOLD';
  }

  return {
    enabled,
    thresholdAmount: minimumOrderValue,
    minimumOrderValue,
    orderValue,
    basis,
    payer,
    eligible,
    applied: false, // finalized per-result in applyFreeDeliveryPolicy
    reason,
  };
}

/**
 * Step-7 central policy application (single point, applied to every pricing result).
 *
 * THE CORE FINANCIAL RULE: when the order qualifies for free delivery, the ONLY
 * values that change on a PRICED result are
 *   - customerDeliveryFee → ₹0
 *   - tenantSubsidy       → projectedDeliveryCost (null when the cost is unknown)
 * `projectedDeliveryCost`, route, distance, duration, benchmark reference and
 * provider quote are NEVER modified by the policy. UNAVAILABLE/PENDING results and
 * non-eligible results never claim `applied`.
 */
function applyFreeDeliveryPolicy(
  result: PricingResult,
  decision: FreeDeliveryDecision,
): PricingResult {
  if (result.status !== 'PRICED' || decision.eligible !== true) {
    return { ...result, freeDelivery: { ...decision, applied: false } };
  }
  return {
    ...result,
    customerDeliveryFee: 0,
    tenantSubsidy: result.projectedDeliveryCost,
    freeDelivery: { ...decision, applied: true },
  };
}

function providerQuoteRef(quote: ProviderQuoteResult, cost: number): ProviderQuoteRef {
  return {
    provider: quote.provider,
    quoteId: quote.quoteId,
    quotedAt: quote.quotedAt,
    providerExpiresAt: quote.providerExpiresAt,
    cost,
    source: quote.source,
    ...(quote.connectionType ? { connectionType: quote.connectionType } : {}),
    ...(quote.vehicleType ? { vehicleType: quote.vehicleType } : {}),
  };
}

const ROUTE_POINT_EPSILON_DEG = 0.001;

/** Both sides must be supplied to compare; a missing side is not treated as a mismatch. */
function coordinateMismatch(
  a: PricingRoutePoint | undefined,
  b: { readonly lat: number; readonly lng: number } | undefined,
): boolean {
  if (!a || !b) return false;
  return (
    Math.abs(a.lat - b.lat) > ROUTE_POINT_EPSILON_DEG ||
    Math.abs(a.lng - b.lng) > ROUTE_POINT_EPSILON_DEG
  );
}

/**
 * Provider quote validation. Rejects non-QUOTED statuses, non-finite/negative
 * costs, and quotes whose declared expiry has passed. Stale quotes are never trusted.
 */
function validateProviderQuote(
  quote: ProviderQuoteResult,
  now: Date,
): { reason: 'PROVIDER_QUOTE_INVALID' | 'PROVIDER_QUOTE_EXPIRED'; detail: string } | null {
  if (quote.status !== 'QUOTED') {
    return {
      reason: 'PROVIDER_QUOTE_INVALID',
      detail: `Provider quote status is "${quote.status}"; only QUOTED quotes may price a delivery.`,
    };
  }
  if (quote.cost === null || !Number.isFinite(quote.cost) || quote.cost < 0) {
    return { reason: 'PROVIDER_QUOTE_INVALID', detail: 'Provider quote carries no finite non-negative cost.' };
  }
  if (quote.providerExpiresAt) {
    const expiresMs = Date.parse(quote.providerExpiresAt);
    if (!Number.isFinite(expiresMs) || expiresMs <= now.getTime()) {
      return {
        reason: 'PROVIDER_QUOTE_EXPIRED',
        detail: `Provider quote expired at ${quote.providerExpiresAt}; stale quotes are never trusted.`,
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Ladder step implementations
// ---------------------------------------------------------------------------

function priceFixedTier(
  request: PricingEngineRequest,
  ctx: PricingContext,
  fallback?: PricingFallbackReason,
): PricingResult {
  const route = request.route;

  if (route.kind === 'UNAVAILABLE') {
    return {
      status: 'UNAVAILABLE',
      pricingMode: 'FIXED_TIER',
      pricingStep: 'UNAVAILABLE',
      reason: 'ROUTE_UNAVAILABLE',
      detail: `Route unavailable (${route.reason}); no distance exists to price a fixed customer fee.`,
      routeSource: 'UNKNOWN',
      distanceKm: null,
      durationMinutes: null,
      projectedDeliveryCost: null,
      projectedCostSource: 'UNKNOWN',
      customerDeliveryFee: null,
      tenantSubsidy: null,
      confidence: 'UNAVAILABLE',
      freeDelivery: ctx.freeDelivery,
      calculatedAt: ctx.calculatedAt,
      engineVersion: ctx.engineVersion,
      ...(ctx.requestId ? { requestId: ctx.requestId } : {}),
    };
  }

  const customerDeliveryFee = resolveCustomerFee(route.distanceKm, request.tenantDeliveryConfig);
  if (customerDeliveryFee === null) {
    return {
      status: 'UNAVAILABLE',
      pricingMode: 'FIXED_TIER',
      pricingStep: 'UNAVAILABLE',
      reason: 'FIXED_TIER_UNAVAILABLE',
      detail:
        'Tenant delivery configuration cannot price this distance (beyond maxRadius or fees unconfigured). This is a pricing-level unavailable — distinct from the serviceability layer.',
      routeSource: routeSourceOf(route),
      ...routeMetrics(route),
      projectedDeliveryCost: null,
      projectedCostSource: 'UNKNOWN',
      customerDeliveryFee: null,
      tenantSubsidy: null,
      confidence: 'UNAVAILABLE',
      freeDelivery: ctx.freeDelivery,
      calculatedAt: ctx.calculatedAt,
      engineVersion: ctx.engineVersion,
      ...(ctx.requestId ? { requestId: ctx.requestId } : {}),
    };
  }

  // Window-1 FIXED_TIER: the tenant's fixed fee is a customer charge, never a
  // fulfillment cost — projectedDeliveryCost stays null (projectedCostSource UNKNOWN).
  const base: PricedDeliveryResult = {
    status: 'PRICED',
    pricingMode: 'FIXED_TIER',
    pricingStep: 'FIXED_TIER',
    routeSource: routeSourceOf(route),
    ...routeMetrics(route),
    projectedDeliveryCost: null,
    projectedCostSource: 'UNKNOWN',
    customerDeliveryFee,
    tenantSubsidy: null,
    confidence: 'MEDIUM',
    freeDelivery: ctx.freeDelivery,
    calculatedAt: ctx.calculatedAt,
    engineVersion: ctx.engineVersion,
    ...(ctx.requestId ? { requestId: ctx.requestId } : {}),
  };
  return fallback ? { ...base, fallback } : base;
}

async function priceMarketBenchmark(
  request: PricingEngineRequest,
  ctx: PricingContext,
): Promise<PricingResult> {
  const route = request.route;

  if (route.kind === 'UNAVAILABLE') {
    return {
      status: 'UNAVAILABLE',
      pricingMode: 'MARKET_BENCHMARK',
      pricingStep: 'UNAVAILABLE',
      reason: 'ROUTE_UNAVAILABLE',
      detail: `Route unavailable (${route.reason}); benchmark cost requires ROAD evidence.`,
      routeSource: 'UNKNOWN',
      distanceKm: null,
      durationMinutes: null,
      projectedDeliveryCost: null,
      projectedCostSource: 'UNKNOWN',
      customerDeliveryFee: null,
      tenantSubsidy: null,
      confidence: 'UNAVAILABLE',
      freeDelivery: ctx.freeDelivery,
      calculatedAt: ctx.calculatedAt,
      engineVersion: ctx.engineVersion,
      ...(ctx.requestId ? { requestId: ctx.requestId } : {}),
    };
  }

  if (route.kind !== 'ROAD') {
    // Never: Haversine → price. STRAIGHT_LINE distance is informational only.
    if (request.window1FixedTierFallback === true) {
      return priceFixedTier(request, ctx, {
        attempted: 'MARKET_BENCHMARK',
        reason: 'ROUTE_NOT_ROAD',
        detail:
          'STRAIGHT_LINE distance can never drive benchmark cost; explicit Window-1 FIXED_TIER fallback applied.',
      });
    }
    return {
      status: 'UNAVAILABLE',
      pricingMode: 'MARKET_BENCHMARK',
      pricingStep: 'UNAVAILABLE',
      reason: 'ROUTE_NOT_ROAD',
      detail:
        'MARKET_BENCHMARK pricing requires a ROAD route; STRAIGHT_LINE distance is informational only and never becomes projected cost.',
      routeSource: routeSourceOf(route),
      ...routeMetrics(route),
      projectedDeliveryCost: null,
      projectedCostSource: 'UNKNOWN',
      customerDeliveryFee: null,
      tenantSubsidy: null,
      confidence: 'UNAVAILABLE',
      freeDelivery: ctx.freeDelivery,
      calculatedAt: ctx.calculatedAt,
      engineVersion: ctx.engineVersion,
      ...(ctx.requestId ? { requestId: ctx.requestId } : {}),
    };
  }

  const model = request.benchmarkModel ?? ctx.benchmarkModel;
  if (!model) {
    return {
      status: 'UNAVAILABLE',
      pricingMode: 'MARKET_BENCHMARK',
      pricingStep: 'UNAVAILABLE',
      reason: 'MISSING_BENCHMARK_MODEL',
      detail: 'MARKET_BENCHMARK pricing requires a configured benchmark model.',
      routeSource: route.source,
      ...routeMetrics(route),
      projectedDeliveryCost: null,
      projectedCostSource: 'UNKNOWN',
      customerDeliveryFee: null,
      tenantSubsidy: null,
      confidence: 'UNAVAILABLE',
      freeDelivery: ctx.freeDelivery,
      calculatedAt: ctx.calculatedAt,
      engineVersion: ctx.engineVersion,
      ...(ctx.requestId ? { requestId: ctx.requestId } : {}),
    };
  }

  const regionKey = request.regionKey?.trim();
  if (!regionKey) {
    return {
      status: 'UNAVAILABLE',
      pricingMode: 'MARKET_BENCHMARK',
      pricingStep: 'UNAVAILABLE',
      reason: 'MISSING_REGION',
      detail:
        'regionKey is required for MARKET_BENCHMARK (reference-bundle entity id, e.g. ref-city-in-mh-pune); the engine never invents a region.',
      routeSource: route.source,
      ...routeMetrics(route),
      projectedDeliveryCost: null,
      projectedCostSource: 'UNKNOWN',
      customerDeliveryFee: null,
      tenantSubsidy: null,
      confidence: 'UNAVAILABLE',
      freeDelivery: ctx.freeDelivery,
      calculatedAt: ctx.calculatedAt,
      engineVersion: ctx.engineVersion,
      ...(ctx.requestId ? { requestId: ctx.requestId } : {}),
    };
  }

  const estimate = await model.estimate({
    tenantId: request.tenantId,
    regionKey,
    vehicleType: request.vehicleType,
    route,
    now: ctx.now,
    requestId: ctx.requestId,
  });

  if (estimate.status === 'UNAVAILABLE') {
    if (request.window1FixedTierFallback === true) {
      return priceFixedTier(request, ctx, {
        attempted: 'MARKET_BENCHMARK',
        reason: 'BENCHMARK_UNAVAILABLE',
        detail: `${estimate.reason}: ${estimate.detail} — explicit Window-1 FIXED_TIER fallback applied.`,
      });
    }
    return {
      status: 'UNAVAILABLE',
      pricingMode: 'MARKET_BENCHMARK',
      pricingStep: 'UNAVAILABLE',
      reason: 'BENCHMARK_UNAVAILABLE',
      detail: `${estimate.reason}: ${estimate.detail}`,
      routeSource: route.source,
      ...routeMetrics(route),
      projectedDeliveryCost: null,
      projectedCostSource: 'UNKNOWN',
      customerDeliveryFee: null,
      tenantSubsidy: null,
      confidence: 'UNAVAILABLE',
      freeDelivery: ctx.freeDelivery,
      calculatedAt: ctx.calculatedAt,
      engineVersion: ctx.engineVersion,
      ...(ctx.requestId ? { requestId: ctx.requestId } : {}),
    };
  }

  const cost = estimate.projectedDeliveryCost;
  const customerDeliveryFee = resolveCustomerFee(route.distanceKm, request.tenantDeliveryConfig);
  // Subsidy only exists when the fulfillment cost is actually known.
  const tenantSubsidy = customerDeliveryFee === null ? null : Math.max(0, cost - customerDeliveryFee);

  return {
    status: 'PRICED',
    pricingMode: 'MARKET_BENCHMARK',
    pricingStep: 'MARKET_BENCHMARK',
    routeSource: route.source,
    ...routeMetrics(route),
    projectedDeliveryCost: cost,
    projectedCostSource: 'BENCHMARK',
    customerDeliveryFee,
    tenantSubsidy,
    confidence: 'MEDIUM',
    freeDelivery: ctx.freeDelivery,
    benchmark: estimate.benchmark,
    benchmarkCalculation: estimate.calculation,
    ...(estimate.override ? { benchmarkOverride: estimate.override } : {}),
    calculatedAt: ctx.calculatedAt,
    engineVersion: ctx.engineVersion,
    ...(ctx.requestId ? { requestId: ctx.requestId } : {}),
  };
}



function priceProviderQuote(request: PricingEngineRequest, ctx: PricingContext): PricingResult {
  const route = request.route;

  if (route.kind === 'UNAVAILABLE') {
    return {
      status: 'UNAVAILABLE',
      pricingMode: 'PROVIDER_QUOTE',
      pricingStep: 'UNAVAILABLE',
      reason: 'ROUTE_UNAVAILABLE',
      detail: `Route unavailable (${route.reason}); provider pricing requires ROAD evidence.`,
      routeSource: 'UNKNOWN',
      distanceKm: null,
      durationMinutes: null,
      projectedDeliveryCost: null,
      projectedCostSource: 'UNKNOWN',
      customerDeliveryFee: null,
      tenantSubsidy: null,
      confidence: 'UNAVAILABLE',
      freeDelivery: ctx.freeDelivery,
      calculatedAt: ctx.calculatedAt,
      engineVersion: ctx.engineVersion,
      ...(ctx.requestId ? { requestId: ctx.requestId } : {}),
    };
  }

  if (route.kind !== 'ROAD') {
    return {
      status: 'UNAVAILABLE',
      pricingMode: 'PROVIDER_QUOTE',
      pricingStep: 'UNAVAILABLE',
      reason: 'ROUTE_NOT_ROAD',
      detail:
        'PROVIDER_QUOTE pricing requires a ROAD route; STRAIGHT_LINE distance is never authoritative for provider cost.',
      routeSource: routeSourceOf(route),
      ...routeMetrics(route),
      projectedDeliveryCost: null,
      projectedCostSource: 'UNKNOWN',
      customerDeliveryFee: null,
      tenantSubsidy: null,
      confidence: 'UNAVAILABLE',
      freeDelivery: ctx.freeDelivery,
      calculatedAt: ctx.calculatedAt,
      engineVersion: ctx.engineVersion,
      ...(ctx.requestId ? { requestId: ctx.requestId } : {}),
    };
  }

  const quote = request.providerQuote;
  if (!quote) {
    return {
      status: 'PENDING',
      pricingMode: 'PROVIDER_QUOTE',
      pricingStep: 'UNAVAILABLE',
      pendingRequirements: ['PROVIDER_QUOTE'],
      detail:
        'Provider quote integration is not yet implemented and no ProviderQuoteResult was supplied; Step 16 will plug live provider quotes into this same contract.',
      routeSource: route.source,
      ...routeMetrics(route),
      projectedDeliveryCost: null,
      projectedCostSource: 'PROVIDER',
      customerDeliveryFee: null,
      tenantSubsidy: null,
      confidence: 'UNAVAILABLE',
      freeDelivery: ctx.freeDelivery,
      calculatedAt: ctx.calculatedAt,
      engineVersion: ctx.engineVersion,
      ...(ctx.requestId ? { requestId: ctx.requestId } : {}),
    };
  }

  const quoteError = validateProviderQuote(quote, ctx.now);
  if (quoteError) {
    return {
      status: 'UNAVAILABLE',
      pricingMode: 'PROVIDER_QUOTE',
      pricingStep: 'UNAVAILABLE',
      reason: quoteError.reason,
      detail: quoteError.detail,
      routeSource: route.source,
      ...routeMetrics(route),
      projectedDeliveryCost: null,
      projectedCostSource: 'UNKNOWN',
      customerDeliveryFee: null,
      tenantSubsidy: null,
      confidence: 'UNAVAILABLE',
      freeDelivery: ctx.freeDelivery,
      calculatedAt: ctx.calculatedAt,
      engineVersion: ctx.engineVersion,
      ...(ctx.requestId ? { requestId: ctx.requestId } : {}),
    };
  }

  if (coordinateMismatch(request.pickup, quote.pickup) || coordinateMismatch(request.dropoff, quote.dropoff)) {
    return {
      status: 'UNAVAILABLE',
      pricingMode: 'PROVIDER_QUOTE',
      pricingStep: 'UNAVAILABLE',
      reason: 'PROVIDER_QUOTE_ROUTE_MISMATCH',
      detail:
        'Provider quote pickup/dropoff coordinates do not match the priced route endpoints; the quote does not belong to this route.',
      routeSource: route.source,
      ...routeMetrics(route),
      projectedDeliveryCost: null,
      projectedCostSource: 'UNKNOWN',
      customerDeliveryFee: null,
      tenantSubsidy: null,
      confidence: 'UNAVAILABLE',
      freeDelivery: ctx.freeDelivery,
      calculatedAt: ctx.calculatedAt,
      engineVersion: ctx.engineVersion,
      ...(ctx.requestId ? { requestId: ctx.requestId } : {}),
    };
  }

  const cost = Math.round(quote.cost); // single final rounding point (INR integer)
  const customerDeliveryFee = resolveCustomerFee(route.distanceKm, request.tenantDeliveryConfig);
  const tenantSubsidy = customerDeliveryFee === null ? null : Math.max(0, cost - customerDeliveryFee);
  const isCached = quote.source === 'CACHED';

  return {
    status: 'PRICED',
    pricingMode: 'PROVIDER_QUOTE',
    pricingStep: isCached ? 'PROVIDER_QUOTE_CACHE' : 'PROVIDER_QUOTE',
    routeSource: route.source,
    ...routeMetrics(route),
    projectedDeliveryCost: cost,
    projectedCostSource: 'PROVIDER',
    customerDeliveryFee,
    tenantSubsidy,
    confidence: isCached ? 'LOW' : 'HIGH',
    freeDelivery: ctx.freeDelivery,
    providerQuote: providerQuoteRef(quote, cost),
    calculatedAt: ctx.calculatedAt,
    engineVersion: ctx.engineVersion,
    ...(ctx.requestId ? { requestId: ctx.requestId } : {}),
  };
}



// ---------------------------------------------------------------------------
// Engine factory + contract mapping
// ---------------------------------------------------------------------------

/**
 * Creates the canonical delivery pricing engine. Pure and deterministic — no IO,
 * no Firestore, no routing, no provider calls, no ETA. The free-delivery policy
 * reads tenant configuration only (₹599 is never hardcoded).
 */
export function createPricingEngine(config: PricingEngineConfig = {}): PricingEngine {
  const engineVersion = config.engineId?.trim() || PRICING_ENGINE_ID;

  async function price(request: PricingEngineRequest): Promise<PricingResult> {
    const now = request.now ?? new Date();
    const calculatedAt = now.toISOString();
    const ctx: PricingContext = {
      now,
      calculatedAt,
      engineVersion,
      requestId: request.requestId,
      benchmarkModel: config.benchmarkModel,
      freeDelivery: buildFreeDeliveryDecision(request),
    };

    let result: PricingResult;
    switch (request.pricingMode) {
      case 'PROVIDER_QUOTE':
        result = priceProviderQuote(request, ctx);
        break;
      case 'MARKET_BENCHMARK':
        result = await priceMarketBenchmark(request, ctx);
        break;
      case 'FIXED_TIER':
        result = priceFixedTier(request, ctx);
        break;
      default:
        // Exhaustive over PricingMode — defensive only.
        result = {
          status: 'UNAVAILABLE',
          pricingMode: request.pricingMode,
          pricingStep: 'UNAVAILABLE',
          reason: 'ROUTE_UNAVAILABLE',
          detail: `Unsupported pricing mode ${String(request.pricingMode)}.`,
          routeSource: routeSourceOf(request.route),
          ...routeMetrics(request.route),
          projectedDeliveryCost: null,
          projectedCostSource: 'UNKNOWN',
          customerDeliveryFee: null,
          tenantSubsidy: null,
          confidence: 'UNAVAILABLE',
          freeDelivery: ctx.freeDelivery,
          calculatedAt,
          engineVersion,
          ...(request.requestId ? { requestId: request.requestId } : {}),
        };
        break;
    }

    return applyFreeDeliveryPolicy(result, ctx.freeDelivery);
  }

  return { engineId: engineVersion, price };
}

/**
 * Maps a PricingResult onto the canonical {@link DeliveryPricing} contract so the
 * engine output can feed {@link buildDeliveryDecision} without any decision-engine
 * change. A PENDING result intentionally omits `provider`, which makes the decision
 * layer report PENDING with a PROVIDER_QUOTE pending requirement.
 */
export function toDeliveryPricing(result: PricingResult): DeliveryPricing {
  const base = {
    distanceKm: result.distanceKm,
    routeSource: result.routeSource,
    calculatedAt: result.calculatedAt,
    engineVersion: result.engineVersion,
  };

  if (result.status === 'PENDING') {
    return {
      ...base,
      pricingMode: result.pricingMode,
      // provider deliberately omitted → DeliveryDecision reports PENDING PROVIDER_QUOTE
      projectedDeliveryCost: null,
      projectedCostSource: 'PROVIDER',
      customerDeliveryFee: null,
      freeDeliveryApplied: false,
      tenantSubsidy: null,
      confidence: 'UNAVAILABLE',
    };
  }

  return {
    ...base,
    pricingMode: result.pricingMode,
    ...(result.status === 'PRICED' && result.providerQuote
      ? { provider: result.providerQuote.provider }
      : {}),
    projectedDeliveryCost: result.projectedDeliveryCost,
    projectedCostSource: result.projectedCostSource,
    customerDeliveryFee: result.customerDeliveryFee,
    freeDeliveryApplied: result.freeDelivery.applied,
    tenantSubsidy: result.tenantSubsidy,
    confidence: result.confidence,
  };
}


