/**
 * Phase 5 — ETA Composition Engine (STEP 9).
 *
 * Internal capability ONLY. Step 10 owns runtime/snapshot separation; this module
 * performs NO checkout/tracking integration, NO provider API calls, NO routing
 * calculation, NO distance math, and NO lifecycle persistence. Provider ETA is
 * consumed strictly as INPUT evidence (see {@link EtaProviderEvidence}).
 *
 * Composition (approved order):
 *   PREP + RIDER_ASSIGNMENT + RIDER_TO_KITCHEN + PICKUP_HANDLING + ROAD_TRAVEL + OPERATIONAL_BUFFER
 *
 * Authoritative travel may come ONLY from:
 *   1. a valid ROAD RouteResult (Step 4),
 *   2. a valid provider delivery ETA (input-only evidence),
 *   3. actual lifecycle / live travel evidence (picked up → on route → delivered).
 * Haversine/STRAIGHT_LINE duration is NEVER authoritative and `distance × speed` is
 * NEVER used to manufacture travel time. STRAIGHT_LINE may only produce an
 * ESTIMATE_ONLY/LOW estimate for FIXED_TIER compatibility — never
 * AUTHORITATIVE/HIGH/MEDIUM.
 *
 * Every operational constant is classified ESTIMATED_OPERATIONAL_DEFAULT — estimated
 * configuration data, never live/provider/actual data.
 *
 * DETERMINISTIC UNCERTAINTY POLICY (documented; asserted by tests):
 *   Each composed component carries an integral window [min, max]:
 *     - ACTUAL    → [round(v), round(v)]               observed evidence → zero spread
 *     - PROVIDER  → [floor(pMin), ceil(pMax)]          the provider's own window;
 *                    point value = round((pMin + pMax) / 2)
 *     - ESTIMATED → [floor(v × 0.85), ceil(v × 1.15)]  ±15 % planning band
 *   minMinutes = Σ component minima; maxMinutes = Σ component maxima.
 *   The OPERATIONAL_BUFFER participates exactly once (through its own component
 *   band) — no additional whole-ETA band is ever added on top, so the operational
 *   buffer and uncertainty are never double-counted. The band is proportional to the
 *   estimate each component carries (never a fixed cosmetic "+5 minutes").
 */

import { createPrepEngine, toDeliveryPrep } from './prepEngine.js';
import type { PrepEngineRequest, PrepEngineResult } from './prepEngine.js';
import type {
  DeliveryProviderId,
} from './providerCapabilityMatrix.js';
import type {
  EtaComponentEstimate,
  EtaComponentKey,
  EtaComponentSource,
  EtaConfidence,
  EtaEstimate,
  EtaOperationalConstantClassification,
  EtaOperationalConstantKey,
  EtaStatus,
  KitchenConfigShape,
  PricingMode,
  ProviderQuoteResult,
  RouteResult,
} from './deliveryIntelligenceTypes.js';
import type { TenantDeliveryConfig } from '../marketplace/tenantProjectionHelpers.js';

/** Identity of this engine — carried on every result. */
export const ETA_ENGINE_ID = 'EtaEngine/v1';

/** Approved operational defaults (Step 9). Always ESTIMATED_OPERATIONAL_DEFAULT. */
export const RIDER_ASSIGNMENT_MINUTES = 3;
export const RIDER_TO_KITCHEN_MINUTES = 5;
export const PICKUP_HANDLING_MINUTES = 2;
export const OPERATIONAL_BUFFER_MINUTES = 3;

export const ETA_OPERATIONAL_CONSTANT_CLASSIFICATION: EtaOperationalConstantClassification =
  'ESTIMATED_OPERATIONAL_DEFAULT';

/** Canonical defaults map — ESTIMATED data, never live/provider/actual. */
export const ETA_OPERATIONAL_CONSTANTS: Readonly<Record<EtaOperationalConstantKey, number>> = {
  RIDER_ASSIGNMENT_MINUTES,
  RIDER_TO_KITCHEN_MINUTES,
  PICKUP_HANDLING_MINUTES,
  OPERATIONAL_BUFFER_MINUTES,
};

/**
 * Estimated-component uncertainty band factors. Rounded with floor/ceil so every
 * band endpoint and therefore every min/max minute is integral and deterministic.
 */
export const UNCERTAINTY_ESTIMATED_LOW_FACTOR = 0.85;
export const UNCERTAINTY_ESTIMATED_HIGH_FACTOR = 1.15;

// ---------------------------------------------------------------------------
// Evidence inputs (input-only — never produced by this engine)
// ---------------------------------------------------------------------------

/**
 * Actual lifecycle evidence supplied by the order system. Never persisted by this
 * engine. `orderAcceptedAt` is informational (recorded, no arithmetic effect).
 * Progression applied deterministically:
 *   NOT_STARTED               → estimated prep + operational stages + travel
 *   PREPARATION_STARTED       → actual remaining prep + operational stages + travel
 *   PREPARATION_COMPLETED     → remaining prep 0 + operational stages + travel
 *   PARTNER_ASSIGNED          → rider assignment 0 + remaining stages + travel
 *   PARTNER_ARRIVED_AT_KITCHEN→ rider-to-kitchen 0 + pickup + travel
 *   PICKED_UP                 → pickup handling 0 + travel
 *   ON_ROUTE                  → travel remaining from the authoritative travel total
 *   DELIVERED                 → all components 0 → min = max = 0
 */
export interface EtaLifecycleEvidence {
  readonly orderAcceptedAt?: string;
  readonly preparationStartedAt?: string;
  readonly preparationCompletedAt?: string;
  readonly partnerAssignedAt?: string;
  readonly partnerArrivedAtKitchenAt?: string;
  readonly pickedUpAt?: string;
  readonly onRouteAt?: string;
  readonly deliveredAt?: string;
}

/** Reuses the canonical provider quote lifecycle. */
export type EtaProviderEtaStatus = ProviderQuoteResult['status'];

/**
 * Provider ETA evidence. INPUT ONLY — this engine never calls a provider. A provider
 * ETA is valid when status is QUOTED and (no expiry, or expiry is in the future).
 * Pickup ETA replaces the RIDER_TO_KITCHEN estimate; delivery ETA replaces the
 * generic ROAD_TRAVEL minutes.
 */
export interface EtaProviderEvidence {
  readonly provider: DeliveryProviderId;
  readonly status: EtaProviderEtaStatus;
  readonly quotedAt: string;
  readonly expiresAt?: string | null;
  readonly pickupEtaMinutes?: { readonly min: number; readonly max: number };
  readonly deliveryEtaMinutes?: { readonly min: number; readonly max: number };
}

/**
 * Adapter mapping for the canonical {@link ProviderQuoteResult}: its single
 * customer-facing `etaMinutes` window becomes the delivery ETA evidence. Purely a
 * data mapping — no provider API is invoked.
 */
export function providerQuoteToEtaEvidence(quote: ProviderQuoteResult): EtaProviderEvidence {
  const hasEtaWindow =
    quote.etaMinutes !== null &&
    (Number.isFinite(quote.etaMinutes.min) || Number.isFinite(quote.etaMinutes.max));
  return {
    provider: quote.provider,
    status: quote.status,
    quotedAt: quote.quotedAt,
    expiresAt: quote.providerExpiresAt,
    ...(hasEtaWindow && quote.etaMinutes
      ? {
          deliveryEtaMinutes: {
            min: quote.etaMinutes.min ?? quote.etaMinutes.max ?? 0,
            max: quote.etaMinutes.max ?? quote.etaMinutes.min ?? 0,
          },
        }
      : {}),
  };
}

// ---------------------------------------------------------------------------
// Engine request / result contracts
// ---------------------------------------------------------------------------

export interface EtaEngineRequest {
  /** Tenant scope — recorded on the result and never shared across requests. */
  readonly tenantId: string;
  /** The pricing mode governs whether an estimate may be produced without authority. */
  readonly pricingMode: PricingMode;
  /** Server-produced route (Step 4). STRAIGHT_LINE/UNAVAILABLE are never authoritative. */
  readonly route?: RouteResult | null;
  /** Prep inputs forwarded to the Step 8 engine when {@link prep} is absent. */
  readonly kitchenConfig?: KitchenConfigShape;
  readonly tenantDeliveryConfig?: TenantDeliveryConfig;
  readonly items?: PrepEngineRequest['items'];
  /** Provider ETA evidence — input only. */
  readonly providerEta?: EtaProviderEvidence | null;
  readonly lifecycle?: EtaLifecycleEvidence;
  /** Repository scheduled-order semantics — passed through, composition unchanged. */
  readonly fulfillmentType?: 'instant' | 'scheduled';
  readonly scheduledFor?: string;
  /**
   * Optional Step 8 result override. When absent the engine invokes the Step 8
   * engine itself (createPrepEngine → estimate → toDeliveryPrep). Step 8 remains the
   * single owner of preparation math.
   */
  readonly prep?: PrepEngineResult | null;
  /** Deterministic clock — defaults to `new Date()`. */
  readonly now?: Date;
  readonly requestId?: string;
}

/** Per-component window produced by the documented uncertainty policy. */
export interface EtaComponentRange {
  readonly key: EtaComponentKey;
  /** Point value used in the base composition. */
  readonly minutes: number;
  readonly min: number;
  readonly max: number;
  readonly source: EtaComponentSource;
}

/** Engine result = canonical {@link EtaEstimate} plus traceable ranges/version. */
export interface EtaEngineResult extends EtaEstimate {
  readonly componentRanges: readonly EtaComponentRange[];
  readonly engineVersion: string;
}

export interface EtaEngineConfig {
  readonly engineId?: string;
}

export interface EtaEngine {
  readonly engineId: string;
  estimate(request: EtaEngineRequest): EtaEngineResult;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface ComposedComponent {
  readonly component: EtaComponentEstimate;
  readonly range: { readonly min: number; readonly max: number };
}

interface TravelAnchor {
  readonly kind: 'ROAD' | 'PROVIDER' | 'ACTUAL' | 'NONE';
  /** Authoritative total travel minutes when a durable anchor exists. */
  readonly totalMinutes: number | null;
}

function parseTs(value: string | undefined | null): number {
  if (!value) return Number.NaN;
  return Date.parse(value);
}

function hasEvidence(lifecycle: EtaLifecycleEvidence, key: keyof EtaLifecycleEvidence): boolean {
  const parsed = parseTs(lifecycle[key]);
  return Number.isFinite(parsed);
}

function isFiniteMinutes(value: number | undefined | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** Provider window validity: finite, non-negative, max ≥ min, and well-formed. */
function resolveProviderWindow(
  window: { readonly min: number | null | undefined; readonly max: number | null | undefined } | undefined,
): { readonly min: number; readonly max: number } | null {
  if (!window) return null;
  if (!isFiniteMinutes(window.min) || !isFiniteMinutes(window.max)) return null;
  if (window.max < window.min) return null;
  return { min: window.min, max: window.max };
}

/** A provider ETA is valid only while QUOTED and not expired. */
function isValidProviderEta(
  providerEta: EtaProviderEvidence | null | undefined,
  nowMs: number,
): providerEta is EtaProviderEvidence {
  if (!providerEta) return false;
  if (providerEta.status !== 'QUOTED') return false;
  const expiresMs = parseTs(providerEta.expiresAt);
  if (Number.isFinite(expiresMs) && expiresMs <= nowMs) return false;
  return true;
}

/** Point value for a provider window — the deterministic midpoint. */
function providerPoint(window: { readonly min: number; readonly max: number }): number {
  return Math.round((window.min + window.max) / 2);
}

/** Integral band endpoints for a component under the documented uncertainty policy. */
function uncertaintyWindow(
  minutes: number,
  source: EtaComponentSource,
  providerWindow?: { readonly min: number; readonly max: number } | null,
): { readonly min: number; readonly max: number } {
  if (source === 'ACTUAL') {
    const point = Math.round(minutes);
    return { min: point, max: point };
  }
  if (source === 'PROVIDER' && providerWindow) {
    return {
      min: Math.floor(providerWindow.min),
      max: Math.ceil(providerWindow.max),
    };
  }
  return {
    min: Math.floor(minutes * UNCERTAINTY_ESTIMATED_LOW_FACTOR),
    max: Math.ceil(minutes * UNCERTAINTY_ESTIMATED_HIGH_FACTOR),
  };
}

function calculateAt(now: Date): {
  readonly nowMs: number;
  readonly calculatedAt: string;
} {
  return { nowMs: now.getTime(), calculatedAt: now.toISOString() };
}

function unavailableResult(
  calculatedAt: string,
  engineVersion: string,
  reason: string,
): EtaEngineResult {
  return {
    status: 'UNAVAILABLE',
    confidence: 'UNAVAILABLE',
    minMinutes: null,
    maxMinutes: null,
    components: [],
    basedOnRoadRoute: false,
    calculatedAt,
    reason,
    componentRanges: [],
    engineVersion,
  };
}

function composeResult(
  composed: readonly ComposedComponent[],
  status: EtaStatus,
  confidence: EtaConfidence,
  basedOnRoadRoute: boolean,
  calculatedAt: string,
  engineVersion: string,
  reason?: string,
): EtaEngineResult {
  let min = 0;
  let max = 0;
  const components: EtaComponentEstimate[] = [];
  const ranges: EtaComponentRange[] = [];
  for (const item of composed) {
    components.push(item.component);
    ranges.push({ key: item.component.key, minutes: item.component.minutes, ...item.range, source: item.component.source });
    min += item.range.min;
    max += item.range.max;
  }
  return {
    status,
    confidence,
    minMinutes: min,
    maxMinutes: max,
    components,
    basedOnRoadRoute,
    calculatedAt,
    ...(reason ? { reason } : {}),
    componentRanges: ranges,
    engineVersion,
  };
}
function estimatedComponent(key: EtaComponentKey, v: number): ComposedComponent {
  return {
    component: { key, minutes: v, source: 'ESTIMATED' },
    range: uncertaintyWindow(v, 'ESTIMATED'),
  };
}

function actualComponent(key: EtaComponentKey, v: number): ComposedComponent {
  return {
    component: { key, minutes: v, source: 'ACTUAL' },
    range: uncertaintyWindow(v, 'ACTUAL'),
  };
}

function providerComponent(
  key: EtaComponentKey,
  window: { readonly min: number; readonly max: number },
): ComposedComponent {
  const point = providerPoint(window);
  return {
    component: { key, minutes: point, source: 'PROVIDER' },
    range: uncertaintyWindow(point, 'PROVIDER', window),
  };
}

function prepSourceOf(source: PrepEngineResult['source']): EtaComponentSource {
  return source === 'ACTUAL' ? 'ACTUAL' : 'ESTIMATED';
}
/**
 * Resolves the durable travel anchor deterministically (priority order):
 *   1. DELIVERED                → actual travel complete (total 0)
 *   2. ON_ROUTE + anchor total  → actual travel in progress (remaining derived)
 *   3. valid provider delivery  → provider window (replaces generic travel)
 *   4. valid ROAD route         → road durationMinutes
 *   else                        → no authoritative travel anchor
 */
function resolveTravelAnchor(
  lifecycle: EtaLifecycleEvidence,
  delivered: boolean,
  onRoute: boolean,
  deliveryWindow: { readonly min: number; readonly max: number } | null,
  road: Extract<RouteResult, { readonly kind: 'ROAD' }> | null,
): TravelAnchor {
  if (delivered) return { kind: 'ACTUAL', totalMinutes: 0 };
  if (onRoute) {
    const total = deliveryWindow
      ? providerPoint(deliveryWindow)
      : road
        ? road.durationMinutes
        : null;
    return total === null
      ? { kind: 'NONE', totalMinutes: null }
      : { kind: 'ACTUAL', totalMinutes: total };
  }
  if (deliveryWindow) return { kind: 'PROVIDER', totalMinutes: providerPoint(deliveryWindow) };
  if (road) return { kind: 'ROAD', totalMinutes: road.durationMinutes };
  return { kind: 'NONE', totalMinutes: null };
}

/** Confidence per the approved hierarchy: live provider/actual → HIGH; ROAD → MEDIUM/LOW; fallback → LOW. */
function resolveConfidence(
  status: EtaStatus,
  delivered: boolean,
  onRoute: boolean,
  pickedUp: boolean,
  partnerArrived: boolean,
  partnerAssigned: boolean,
  deliveryWindow: { readonly min: number; readonly max: number } | null,
  road: Extract<RouteResult, { readonly kind: 'ROAD' }> | null,
  roadCached: boolean,
): EtaConfidence {
  if (status === 'UNAVAILABLE') return 'UNAVAILABLE';
  if (status === 'ESTIMATE_ONLY') return 'LOW';
  if (delivered || onRoute || pickedUp || partnerArrived || partnerAssigned || deliveryWindow) {
    return 'HIGH';
  }
  return roadCached ? 'LOW' : 'MEDIUM';
}

function estimateEta(request: EtaEngineRequest, engineVersion: string): EtaEngineResult {
  const now = request.now ?? new Date();
  const { nowMs, calculatedAt } = calculateAt(now);
  const lifecycle: EtaLifecycleEvidence = request.lifecycle ?? {};

  const delivered = hasEvidence(lifecycle, 'deliveredAt');
  const onRoute = hasEvidence(lifecycle, 'onRouteAt') && !delivered;
  const pickedUp = hasEvidence(lifecycle, 'pickedUpAt') && !onRoute && !delivered;
  const partnerArrived =
    hasEvidence(lifecycle, 'partnerArrivedAtKitchenAt') && !pickedUp && !onRoute && !delivered;
  const partnerAssigned =
    hasEvidence(lifecycle, 'partnerAssignedAt') && !partnerArrived && !pickedUp && !onRoute && !delivered;

  // --- Step 8 prep: the preparation engine remains the single owner of prep math.
  const prepResult =
    request.prep ??
    createPrepEngine().estimate({
      tenantId: request.tenantId,
      ...(request.kitchenConfig ? { kitchenConfig: request.kitchenConfig } : {}),
      ...(request.tenantDeliveryConfig ? { tenantDeliveryConfig: request.tenantDeliveryConfig } : {}),
      ...(request.items ? { items: request.items } : {}),
      preparationStartedAt: lifecycle.preparationStartedAt,
      preparationCompletedAt: lifecycle.preparationCompletedAt,
      ...(request.fulfillmentType ? { fulfillmentType: request.fulfillmentType } : {}),
      ...(request.scheduledFor ? { scheduledFor: request.scheduledFor } : {}),
      ...(request.requestId ? { requestId: request.requestId } : {}),
      now,
    });
  const prep = toDeliveryPrep(prepResult);
  if (prep.remainingMinutes === null) {
    return unavailableResult(
      calculatedAt,
      engineVersion,
      'PREP_UNAVAILABLE — preparation could not be resolved, so no ETA can be composed.',
    );
  }
  // Delivery is terminal: every stage — including preparation — is fully actual.
  const prepMinutes = delivered ? 0 : prep.remainingMinutes;
  const prepSource: EtaComponentSource = delivered ? 'ACTUAL' : prepSourceOf(prep.source);

  // --- Provider ETA evidence (input only; QUOTED + unexpired).
  const providerValid = isValidProviderEta(request.providerEta, nowMs);
  const pickupWindow = providerValid ? resolveProviderWindow(request.providerEta?.pickupEtaMinutes) : null;
  const deliveryWindow = providerValid ? resolveProviderWindow(request.providerEta?.deliveryEtaMinutes) : null;

  const road = request.route?.kind === 'ROAD' ? request.route : null;
  const travelAnchor = resolveTravelAnchor(lifecycle, delivered, onRoute, deliveryWindow, road);

  const status: EtaStatus = travelAnchor.kind === 'NONE' ? 'ESTIMATE_ONLY' : 'AUTHORITATIVE';
  if (request.pricingMode !== 'FIXED_TIER' && travelAnchor.kind === 'NONE') {
    return unavailableResult(
      calculatedAt,
      engineVersion,
      `ETA_UNAVAILABLE — no valid ROAD route, valid provider ETA, or actual travel evidence for pricing mode ${request.pricingMode}.`,
    );
  }

  const confidence = resolveConfidence(
    status,
    delivered,
    onRoute,
    pickedUp,
    partnerArrived,
    partnerAssigned,
    deliveryWindow,
    road,
    road?.source === 'ROUTE_CACHE',
  );
  const composed: ComposedComponent[] = [];

  // PREP — remaining preparation from the Step 8 engine (0 ACTUAL once delivered).
  composed.push({
    component: { key: 'PREP', minutes: prepMinutes, source: prepSource },
    range: uncertaintyWindow(prepMinutes, prepSource),
  });

  // RIDER_ASSIGNMENT — actual once a partner is assigned.
  if (delivered || onRoute || pickedUp || partnerArrived || partnerAssigned) {
    composed.push(actualComponent('RIDER_ASSIGNMENT', 0));
  } else {
    composed.push(estimatedComponent('RIDER_ASSIGNMENT', RIDER_ASSIGNMENT_MINUTES));
  }

  // RIDER_TO_KITCHEN — provider pickup ETA replaces the estimate.
  if (delivered || onRoute || pickedUp || partnerArrived) {
    composed.push(actualComponent('RIDER_TO_KITCHEN', 0));
  } else if (pickupWindow) {
    composed.push(providerComponent('RIDER_TO_KITCHEN', pickupWindow));
  } else {
    composed.push(estimatedComponent('RIDER_TO_KITCHEN', RIDER_TO_KITCHEN_MINUTES));
  }

  // PICKUP_HANDLING — actual once the order is picked up.
  if (delivered || onRoute || pickedUp) {
    composed.push(actualComponent('PICKUP_HANDLING', 0));
  } else {
    composed.push(estimatedComponent('PICKUP_HANDLING', PICKUP_HANDLING_MINUTES));
  }

  // ROAD_TRAVEL — authoritative anchor ordering; STRAIGHT_LINE never enters here.
  if (delivered) {
    composed.push(actualComponent('ROAD_TRAVEL', 0));
  } else if (onRoute && travelAnchor.totalMinutes !== null) {
    const elapsedMinutes = Math.max(0, nowMs - parseTs(lifecycle.onRouteAt)) / 60000;
    const remaining = Math.max(0, Math.ceil(travelAnchor.totalMinutes - elapsedMinutes));
    composed.push(actualComponent('ROAD_TRAVEL', remaining));
  } else if (deliveryWindow) {
    composed.push(providerComponent('ROAD_TRAVEL', deliveryWindow));
  } else if (road) {
    composed.push(estimatedComponent('ROAD_TRAVEL', road.durationMinutes));
  }

  // OPERATIONAL_BUFFER — participates exactly once; the band is never re-applied on top.
  if (delivered) {
    composed.push(actualComponent('OPERATIONAL_BUFFER', 0));
  } else {
    composed.push(estimatedComponent('OPERATIONAL_BUFFER', OPERATIONAL_BUFFER_MINUTES));
  }

  return composeResult(
    composed,
    status,
    confidence,
    road !== null || deliveryWindow !== null,
    calculatedAt,
    engineVersion,
    status === 'ESTIMATE_ONLY'
      ? 'ESTIMATE_ONLY — no authoritative travel evidence; FIXED_TIER compatibility estimate covering preparation and operational stages only.'
      : undefined,
  );
}

export function createEtaEngine(config: EtaEngineConfig = {}): EtaEngine {
  const engineVersion = config.engineId?.trim() || ETA_ENGINE_ID;
  return {
    engineId: engineVersion,
    estimate(request: EtaEngineRequest): EtaEngineResult {
      return estimateEta(request, engineVersion);
    },
  };
}