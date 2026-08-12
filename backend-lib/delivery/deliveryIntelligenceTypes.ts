/**
 * Phase 5 — Delivery Intelligence Engine: canonical domain contracts (STEP 2: types only).
 *
 * These types are PURE CONTRACTS. No calculation, no routing, no provider calls,
 * no Firestore reads/writes, and no behavior change is introduced by this module.
 * Keep this file free of any runtime logic beyond the type aliases/interfaces below.
 *
 * Canonical rules encoded here (design-required, enforced by later steps):
 *  - The client is NEVER authoritative for distance, fee, projected cost, subsidy,
 *    free-delivery eligibility, ETA, or provider cost. All authoritative values come
 *    from the server-side DeliveryDecision.
 *  - STRAIGHT_LINE/haversine must NEVER be used as authoritative ROAD data. This is
 *    expressed structurally: {@link RouteResult} is a discriminated union whose only
 *    `kind: 'ROAD'` members may satisfy authoritative consumers.
 *  - FIXED_TIER pricing MAY carry `projectedDeliveryCost: null` with
 *    `projectedCostSource: 'UNKNOWN'` (the fixed customer fee is NOT a fulfillment cost).
 *  - tenantSubsidy = projectedDeliveryCost - customerDeliveryFee,
 *    or = projectedDeliveryCost when free delivery is applied (fee = 0),
 *    or = null when projected cost is unknown.
 *  - ₹109 may appear ONLY in explicit test/benchmark fixtures — never in production
 *    pricing logic. ₹599 is ONLY the owner-form default; the engine reads the
 *    tenant-configured value.
 *  - Operational constants (RIDER_ASSIGNMENT_MINUTES, RIDER_TO_KITCHEN_MINUTES,
 *    PICKUP_HANDLING_MINUTES, OPERATIONAL_BUFFER) are classified as
 *    ESTIMATED_OPERATIONAL_DEFAULT — estimated data, never live/provider/actual data.
 */

import type { DeliveryProviderId, DeliveryConnectionType } from './providerCapabilityMatrix.js';

/**
 * Confirmation level used across the decision. When ROAD/provider evidence is the sole
 * basis the level is HIGH; when deterministic estimates are layered on a valid ROAD
 * route it is MEDIUM; cached/stale/straight-line fallback is LOW; no authoritative
 * inputs is UNAVAILABLE.
 */
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNAVAILABLE';

/**
 * Overall lifecycle of a server-authoritative DeliveryDecision.
 * AVAILABLE  – decision committed and usable for checkout/snapshot.
 * PENDING    – still awaiting authoritative inputs (ROAD route, provider quote, prep
 *              data, …). Never surfaced as a committed customer charge.
 * UNAVAILABLE – cannot be decided (out of radius, kitchen coords missing, no address…).
 */
export type DeliveryDecisionStatus = 'AVAILABLE' | 'PENDING' | 'UNAVAILABLE';

// ---------------------------------------------------------------------------
// Serviceability
// ---------------------------------------------------------------------------

/**
 * Why a delivery was (or was not) accepted. Reuses the existing location-core reasons
 * and adds the extended cases the engine may emit.
 */
export type ServiceabilityReason =
  | 'OK'
  | 'OUT_OF_RADIUS'
  | 'NO_KITCHEN_COORDS'
  | 'PINCODE_BLOCKED'
  | 'STORE_CLOSED'
  | 'NO_ADDRESS'
  | 'UNKNOWN';

export interface ServiceabilityDecision {
  readonly isServiceable: boolean;
  /** Latitude/longitude straight-line distance in km (informational only). */
  readonly distanceKm: number | null;
  readonly reason: ServiceabilityReason;
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

/**
 * Where a distance/duration measurement originated.
 * Only `ROUTING_PROVIDER` and `ROUTE_CACHE` are ROAD evidence.
 * `STRAIGHT_LINE` (haversine) and `UNKNOWN` are explicitly non-authoritative.
 */
export type RouteSourceOrigin =
  | 'ROUTING_PROVIDER'
  | 'ROUTE_CACHE'
  | 'STRAIGHT_LINE'
  | 'UNKNOWN';

/**
 * Discriminated route result. Consumers that must use authoritative ROAD data accept
 * `RouteRoadResult` (kind === 'ROAD'); STRAIGHT_LINE results cannot satisfy them, so
 * haversine can never silently flow into authoritative pricing/ETA at the type level.
 */
export type RouteResult =
  | {
      readonly kind: 'ROAD';
      readonly source: Extract<RouteSourceOrigin, 'ROUTING_PROVIDER' | 'ROUTE_CACHE'>;
      readonly distanceKm: number;
      readonly durationMinutes: number;
      readonly routeId?: string;
      /** Provider name when available (e.g. ORS/OSRM instance label). */
      readonly provider?: string;
      readonly geometry?: unknown;
      readonly fetchedAt: string;
    }
  | {
      readonly kind: 'STRAIGHT_LINE';
      readonly source: 'STRAIGHT_LINE';
      readonly distanceKm: number;
      /** MUST stay null — straight-line duration is never authoritative. */
      readonly durationMinutes: null;
      readonly fetchedAt: string;
    }
  | {
      readonly kind: 'UNAVAILABLE';
      readonly source: 'UNKNOWN';
      readonly distanceKm: null;
      readonly durationMinutes: null;
      readonly reason: string;
      readonly fetchedAt: string;
    };

/** Structural guard so future engines cannot accept a non-ROAD route. */
export type RouteRoadResult = Extract<RouteResult, { readonly kind: 'ROAD' }>;

// ---------------------------------------------------------------------------
// ETA
// ---------------------------------------------------------------------------

/**
 * Authoritativeness of the whole ETA estimate.
 * AUTHORITATIVE – derived from live provider/actual evidence and/or a valid ROAD route.
 * ESTIMATE_ONLY – deterministic estimates only (FIXED_TIER compatibility); clearly
 *                 labelled, never presented as live.
 * UNAVAILABLE   – no authoritative route/provider/actual basis exists.
 */
export type EtaStatus = 'AUTHORITATIVE' | 'ESTIMATE_ONLY' | 'UNAVAILABLE';

/**
 * ETA confidence rules (approved):
 * HIGH   – live provider / actual evidence + valid ROAD route.
 * MEDIUM – valid ROAD route + deterministic estimates.
 * LOW    – cached / stale / straight-line fallback.
 * UNAVAILABLE – no authoritative route or provider ETA.
 */
export type EtaConfidence = ConfidenceLevel;

/**
 * Per-component provenance. Operational constants and prep defaults are ESTIMATED;
 * values that came from a live provider are PROVIDER; observed lifecycle events are
 * ACTUAL. As the order progresses, components must progressively move ESTIMATED → ACTUAL.
 */
export type EtaComponentSource = 'ESTIMATED' | 'PROVIDER' | 'ACTUAL';

/** Components of the checkout ETA in approved order. */
export type EtaComponentKey =
  | 'PREP'
  | 'RIDER_ASSIGNMENT'
  | 'RIDER_TO_KITCHEN'
  | 'PICKUP_HANDLING'
  | 'ROAD_TRAVEL'
  | 'OPERATIONAL_BUFFER';

export interface EtaComponentEstimate {
  readonly key: EtaComponentKey;
  readonly minutes: number;
  readonly source: EtaComponentSource;
}

export interface EtaEstimate {
  readonly status: EtaStatus;
  readonly confidence: EtaConfidence;
  readonly minMinutes: number | null;
  readonly maxMinutes: number | null;
  readonly components: readonly EtaComponentEstimate[];
  /**
   * True only when a ROAD route (or live provider duration) underpins ROAD_TRAVEL.
   * STRAIGHT_LINE travel time MUST NOT be counted as authoritative — if no ROAD
   * evidence exists this stays false and status cannot be AUTHORITATIVE.
   */
  readonly basedOnRoadRoute: boolean;
  readonly calculatedAt: string;
  readonly reason?: string;
}

/**
 * Operational constants are classified as ESTIMATED_OPERATIONAL_DEFAULT. They are
 * estimated default data, never live/provider/actual data, and never authoritative.
 */
export type EtaOperationalConstantKey =
  | 'RIDER_ASSIGNMENT_MINUTES'
  | 'RIDER_TO_KITCHEN_MINUTES'
  | 'PICKUP_HANDLING_MINUTES'
  | 'OPERATIONAL_BUFFER_MINUTES';

export type EtaOperationalConstantClassification = 'ESTIMATED_OPERATIONAL_DEFAULT';

// ---------------------------------------------------------------------------
// Kitchen prep
// ---------------------------------------------------------------------------

export type PrepSource = 'CONFIG' | 'ITEM_MAP' | 'ACTUAL' | 'UNKNOWN';
export type PrepConfidence = ConfidenceLevel;

export interface PrepEstimate {
  readonly estimatedMinutes: number | null;
  /** Remaining prep once preparation has started (actual lifecycle evidence). */
  readonly remainingMinutes: number | null;
  readonly source: PrepSource;
  readonly confidence: PrepConfidence;
  readonly calculatedAt: string;
}

/**
 * Tenant kitchen configuration shape (additive tenant field, Phase 5). The engine reads
 * the tenant-configured value; nothing defaults to ₹-tied business numbers here.
 */
export interface KitchenConfigShape {
  readonly defaultPrepTimeMinutes?: number;
  readonly orderAcceptanceMode?: 'AUTO' | 'MANUAL';
  readonly itemPrepTimeMinutes?: Readonly<Record<string, number>>;
  readonly capacity?: number;
}

// ---------------------------------------------------------------------------
// Pricing / financial semantics
// ---------------------------------------------------------------------------

/** Canonical pricing engines. FIXED_TIER preserves Window-1 parity. */
export type PricingMode = 'FIXED_TIER' | 'MARKET_BENCHMARK' | 'PROVIDER_QUOTE';

/**
 * What `projectedDeliveryCost` is based on.
 * PROVIDER – live/cached provider quote.
 * BENCHMARK – versioned market benchmark.
 * UNKNOWN  – no real fulfillment cost available (typical FIXED_TIER).
 */
export type ProjectedCostSource = 'PROVIDER' | 'BENCHMARK' | 'UNKNOWN';

export type PriceConfidence = ConfidenceLevel;

/**
 * Canonical basis the free-delivery threshold is compared against.
 * SUBTOTAL = item subtotal BEFORE discount/tax/delivery/platform-fee/tip — this is
 * the basis the existing checkout already uses (cart total vs freeDeliveryThreshold).
 */
export type FreeDeliveryBasis = 'SUBTOTAL';

/** Approved payer of the projected delivery cost under free delivery. Only TENANT exists. */
export type FreeDeliveryPayer = 'TENANT';

export interface FreeDeliveryDecision {
  readonly enabled: boolean;
  /** Tenant-configured threshold. Engine reads config; ₹599 is only the owner-form default. */
  readonly thresholdAmount: number | null;
  readonly applied: boolean;
  readonly reason:
    | 'THRESHOLD_MET'
    | 'ABOVE_THRESHOLD' // legacy alias, still accepted as caller input
    | 'BELOW_THRESHOLD'
    | 'DISABLED'
    | 'NO_ORDER_VALUE'
    | 'UNKNOWN';
  /**
   * Step-7 canonical fields — populated by the pricing engine and by the decision
   * builder's disabled default. Optional so Step-3 caller fixtures stay additive;
   * the engine ALWAYS fills these when it produces a decision.
   */
  /** Canonical alias of {@link thresholdAmount} — same configured value. */
  readonly minimumOrderValue?: number | null;
  /** Order value actually compared (expressed in {@link basis} units). null when absent/invalid. */
  readonly orderValue?: number | null;
  /** Basis used for the threshold comparison. null while the policy is disabled. */
  readonly basis?: FreeDeliveryBasis | null;
  /** Who absorbs the projected cost. Only TENANT is approved. null while disabled. */
  readonly payer?: FreeDeliveryPayer | null;
  /**
   * Policy-level qualification: enabled AND threshold configured AND order value ≥
   * threshold. Independent of whether this particular result was actually PRICED
   * (`applied` requires PRICED + eligible).
   */
  readonly eligible?: boolean;
}

export interface SubsidyDecision {
  /**
   * null when the projected fulfillment cost is unknown — never report the fixed
   * customer fee as the actual courier fulfillment cost.
   */
  readonly tenantSubsidy: number | null;
  readonly basis: 'FREE_DELIVERY' | 'STANDARD' | 'UNKNOWN_COST';
}

export interface DeliveryPricing {
  readonly pricingMode: PricingMode;
  readonly provider?: DeliveryProviderId;
  readonly distanceKm: number | null;
  readonly routeSource: RouteSourceOrigin;
  /**
   * Actual fulfillment cost when known. FIXED_TIER will usually carry null with
   * projectedCostSource 'UNKNOWN'.
   */
  readonly projectedDeliveryCost: number | null;
  readonly projectedCostSource: ProjectedCostSource;
  readonly customerDeliveryFee: number | null;
  readonly freeDeliveryApplied: boolean;
  readonly tenantSubsidy: number | null;
  readonly confidence: PriceConfidence;
  readonly calculatedAt: string;
  readonly engineVersion: string;
}

// ---------------------------------------------------------------------------
// Provider quotes (contracts only — no provider integration)
// ---------------------------------------------------------------------------

export type ProviderQuoteStatus =
  | 'QUOTED'
  | 'PENDING'
  | 'EXPIRED'
  | 'UNAVAILABLE'
  | 'BLOCKED';

export type ProviderQuoteSource = 'LIVE_PROVIDER' | 'CACHED' | 'SCAFFOLD' | 'UNKNOWN';

export interface ProviderQuoteResult {
  readonly provider: DeliveryProviderId;
  readonly connectionType?: DeliveryConnectionType;
  readonly quoteId: string | null;
  readonly quotedAt: string;
  readonly providerExpiresAt: string | null;
  /** Quote currency amount (INR). */
  readonly cost: number | null;
  readonly etaMinutes: { readonly min: number | null; readonly max: number | null } | null;
  readonly vehicleType?: string;
  readonly pickup?: { readonly lat: number; readonly lng: number; readonly address?: string };
  readonly dropoff?: { readonly lat: number; readonly lng: number; readonly address?: string };
  readonly source: ProviderQuoteSource;
  readonly status: ProviderQuoteStatus;
}

// ---------------------------------------------------------------------------
// Benchmarks (contracts only — no production benchmark records)
// ---------------------------------------------------------------------------

/**
 * Traceable market benchmark. `version` + `source` make every projected cost
 * explainable. Numeric values (e.g. ₹109) may exist only in explicit test/fixture data.
 */
export interface DeliveryBenchmark {
  readonly id?: string;
  readonly regionKey: string;
  readonly vehicleType: string;
  readonly effectiveFrom: string;
  readonly effectiveUntil: string | null;
  readonly source: string;
  readonly version: string;
  readonly pricing: {
    readonly baseFare: number;
    readonly perKm: number;
    readonly perMinute: number | null;
    readonly minFare: number | null;
    readonly pickupFee: number | null;
    readonly dropFee: number | null;
    readonly surgeMultiplierMin?: number;
    readonly surgeMultiplierMax?: number;
  };
  readonly createdAt: string;
  readonly createdBy?: string;
}

// ---------------------------------------------------------------------------
// Delivery decision
// ---------------------------------------------------------------------------

/**
 * Stable decision-level reasons. Deliberately distinct from the component-level
 * {@link ServiceabilityReason}; defined once here and reused by every decision stage
 * and the decision consumers (checkout UI, owner UI, snapshot).
 */
export type DeliveryDecisionReason =
  | 'ROUTE_UNAVAILABLE'
  | 'OUTSIDE_DELIVERY_AREA'
  | 'DELIVERY_DISABLED'
  | 'INVALID_LOCATION'
  | 'PROVIDER_UNAVAILABLE'
  | 'PRICING_UNAVAILABLE'
  | 'ETA_UNAVAILABLE'
  | 'MISSING_KITCHEN_LOCATION'
  | 'MISSING_CUSTOMER_LOCATION';

/** What must still be produced before a decision can become AVAILABLE. */
export type DeliveryDecisionPendingKey =
  | 'ROUTE'
  | 'PRICING'
  | 'ETA'
  | 'PREP'
  | 'PROVIDER_QUOTE'
  | 'SERVICEABILITY';

export interface DeliveryDecision {
  readonly id: string;
  readonly tenantId: string;
  readonly status: DeliveryDecisionStatus;
  readonly reason: DeliveryDecisionReason | null;
  /** Present on PENDING decisions — identifies the missing information/calculation. */
  readonly pendingRequirements?: readonly DeliveryDecisionPendingKey[];
  readonly serviceability: ServiceabilityDecision;
  readonly route: RouteResult;
  readonly pricing: DeliveryPricing;
  readonly freeDelivery: FreeDeliveryDecision;
  readonly subsidy: SubsidyDecision;
  readonly eta: EtaEstimate;
  readonly prep: PrepEstimate;
  readonly confidence: ConfidenceLevel;
  readonly engineVersion: string;
  readonly decidedAt: string;
}

// ---------------------------------------------------------------------------
// Order snapshot / runtime / events (write shapes — no writes here)
// ---------------------------------------------------------------------------

/**
 * Immutable snapshot written to `order.delivery` at order creation. Never mutated
 * afterwards; ETA/status changes go to {@link DeliveryRuntime}, history to
 * {@link DeliveryEvent}. Legacy mirrors (`order.eta`, `order.etaMinutes`,
 * `order.deliveryPartner`, `order.trackingUrl`, `order.deliveryAssignedAt`) keep
 * functioning unchanged for Window-1 compatibility.
 */
export interface OrderDeliverySnapshot {
  readonly orderDecision: DeliveryDecision;
  readonly createdAt: string;
  readonly createdBy: 'ENGINE';
  readonly engineVersion: string;
}

export type DeliveryRuntimePhase =
  | 'PENDING'
  | 'PLANNED'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED';

/** Mutable runtime delivery state on `order.deliveryRuntime`. ETA refreshes land here. */
export interface DeliveryRuntime {
  readonly updatedAt: string;
  readonly phase: DeliveryRuntimePhase;
  readonly eta: EtaEstimate;
  readonly prep: PrepEstimate;
  readonly providerQuote: ProviderQuoteResult | null;
  readonly rider?: {
    readonly name?: string;
    readonly phone?: string;
    readonly partner?: DeliveryProviderId;
    readonly trackingUrl?: string;
    readonly assignedAt?: string;
  };
}

export type DeliveryEventType =
  | 'DECISION_CREATED'
  | 'ACCEPTED'
  | 'PREPARATION_STARTED'
  | 'READY'
  | 'RIDER_ASSIGNED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'ETA_REFRESHED'
  | 'PROVIDER_QUOTE_REFRESHED'
  | 'FAILED'
  | 'CANCELLED';

export type DeliveryEventSource = 'ENGINE' | 'PROVIDER' | 'OWNER' | 'SYSTEM';

export interface DeliveryEvent {
  readonly id: string;
  readonly type: DeliveryEventType;
  readonly at: string;
  readonly source: DeliveryEventSource;
  readonly message?: string;
  readonly data?: Readonly<Record<string, unknown>>;
}