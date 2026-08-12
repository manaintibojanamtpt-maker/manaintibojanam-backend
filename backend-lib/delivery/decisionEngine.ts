/**
 * Phase 5 — DeliveryDecision contract + builder (STEP 3).
 *
 * Pure domain abstraction. This module assembles a single server-authoritative
 * DeliveryDecision from the outputs that the future engines will produce:
 *
 *   RouteEngine → PricingEngine → PrepEngine → EtaEngine → DeliveryDecision
 *
 * None of those engines exist yet. This module is contract-only:
 *  - defines the input envelope a decision needs;
 *  - validates completeness so an incomplete calculation can never masquerade
 *    as AVAILABLE (PENDING identifies exactly what is missing);
 *  - enforces the approved decision invariants (see below);
 *  - throws {@link DeliveryDecisionContractViolation} on structural misuse so
 *    mistakes surface at integration time, not in production.
 *
 * No routing, no pricing algorithm, no ETA algorithm, no provider selection, no
 * benchmark lookup, no Firestore persistence.
 *
 * Decision invariants (design-required, enforced/documented here):
 *  1. AVAILABLE requires sufficient information to support the delivery mode.
 *  2. UNAVAILABLE always carries a meaningful reason.
 *  3. PENDING always identifies the missing information/calculation.
 *  4. A STRAIGHT_LINE route must never be treated as ROAD (enforced by
 *     {@link assertRouteEtaConsistency} and the discriminated RouteResult).
 *  5. FIXED_TIER may carry projectedDeliveryCost = null + UNKNOWN cost source.
 *  6. tenantSubsidy must be null when projected delivery cost is unknown.
 *  7. customerDeliveryFee is never derived from client-authoritative distance:
 *     this builder accepts NO client distance field; distance always comes from
 *     the server-produced RouteResult.
 *  8. ETA status stays explicit (AUTHORITATIVE | ESTIMATE_ONLY | UNAVAILABLE).
 *  9. ETA confidence stays explicit (HIGH | MEDIUM | LOW | UNAVAILABLE).
 * 10. ₹599 is configuration-driven; never hardcoded by the engine.
 * 11. ₹109 is fixture/test data only; never introduced into production engine logic.
 */

import type {
  ConfidenceLevel,
  DeliveryDecision,
  DeliveryDecisionPendingKey,
  DeliveryDecisionReason,
  DeliveryDecisionStatus,
  DeliveryPricing,
  EtaEstimate,
  FreeDeliveryDecision,
  PrepEstimate,
  PricingMode,
  RouteResult,
  RouteRoadResult,
  ServiceabilityDecision,
  ServiceabilityReason,
  SubsidyDecision,
} from './deliveryIntelligenceTypes.js';

/** Raised when inputs structurally violate the decision contract. */
export class DeliveryDecisionContractViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeliveryDecisionContractViolation';
  }
}

/** Tenant-owned free-delivery policy (threshold is the configured value — engine reads it). */
export interface FreeDeliveryPolicyConfig {
  readonly enabled: boolean;
  /** null/absent = free delivery not offered regardless of order value. */
  readonly thresholdAmount: number | null;
}

/**
 * Inputs a decision needs. Every engine-produced component is optional because the
 * builder must be able to represent PENDING (missing) and UNAVAILABLE states.
 */
export interface DeliveryDecisionInput {
  readonly decisionId: string;
  readonly tenantId: string;
  readonly engineVersion: string;
  readonly requestedAt: string;
  readonly orderType: 'delivery' | 'pickup';
  readonly pricingMode: PricingMode;
  /** tenant.deliveryConfig.enabled — undefined treats delivery as enabled. */
  readonly deliveryEnabled?: boolean;
  readonly kitchenLocation?: { readonly lat: number; readonly lng: number } | null;
  readonly customerLocation?: { readonly lat: number; readonly lng: number } | null;
  readonly freeDeliveryConfig?: FreeDeliveryPolicyConfig | null;
  /** Computed by the future free-delivery policy engine; the builder only enforces invariants. */
  readonly freeDelivery?: FreeDeliveryDecision | null;
  readonly serviceability?: ServiceabilityDecision | null;
  /** Server-produced route only. No client distance is accepted anywhere in this input. */
  readonly route?: RouteResult | null;
  readonly pricing?: DeliveryPricing | null;
  readonly prep?: PrepEstimate | null;
  readonly eta?: EtaEstimate | null;
}

export interface DecisionValidation {
  readonly status: DeliveryDecisionStatus;
  readonly reason: DeliveryDecisionReason | null;
  readonly pendingRequirements: readonly DeliveryDecisionPendingKey[];
}

function isValidCoordinate(value: { readonly lat: number; readonly lng: number } | null | undefined): boolean {
  return (
    Boolean(value) &&
    Number.isFinite(value!.lat) &&
    Number.isFinite(value!.lng) &&
    !(value!.lat === 0 && value!.lng === 0)
  );
}

/** Maps the component-level serviceability reason onto the decision-level reason model. */
export function mapServiceabilityReason(reason: ServiceabilityReason | undefined): DeliveryDecisionReason {
  switch (reason) {
    case 'NO_KITCHEN_COORDS':
      return 'MISSING_KITCHEN_LOCATION';
    case 'NO_ADDRESS':
      return 'MISSING_CUSTOMER_LOCATION';
    case 'OUT_OF_RADIUS':
    case 'PINCODE_BLOCKED':
      return 'OUTSIDE_DELIVERY_AREA';
    default:
      return 'INVALID_LOCATION';
  }
}

const PENDING_KEY_ORDER: readonly DeliveryDecisionPendingKey[] = [
  'ROUTE',
  'PRICING',
  'PREP',
  'ETA',
  'PROVIDER_QUOTE',
  'SERVICEABILITY',
];

/**
 * Pure completeness/status validation. Never computes pricing, routing or ETA.
 * Emits UNAVAILABLE only for hard blockers; anything still computable is PENDING.
 */
export function validateDeliveryDecisionInput(input: DeliveryDecisionInput): DecisionValidation {
  const empty: readonly DeliveryDecisionPendingKey[] = [];

  if (input.orderType !== 'delivery') {
    return { status: 'AVAILABLE', reason: null, pendingRequirements: empty };
  }

  if (input.deliveryEnabled === false) {
    return { status: 'UNAVAILABLE', reason: 'DELIVERY_DISABLED', pendingRequirements: empty };
  }

  if (!isValidCoordinate(input.kitchenLocation)) {
    return { status: 'UNAVAILABLE', reason: 'MISSING_KITCHEN_LOCATION', pendingRequirements: empty };
  }

  if (!isValidCoordinate(input.customerLocation)) {
    return { status: 'UNAVAILABLE', reason: 'MISSING_CUSTOMER_LOCATION', pendingRequirements: empty };
  }

  if (input.serviceability && input.serviceability.isServiceable === false) {
    return {
      status: 'UNAVAILABLE',
      reason: mapServiceabilityReason(input.serviceability.reason),
      pendingRequirements: empty,
    };
  }

  const pending: DeliveryDecisionPendingKey[] = [];

  if (!input.route || input.route.kind === 'UNAVAILABLE') {
    pending.push('ROUTE');
  }
  if (!input.pricing) {
    pending.push('PRICING');
  }
  if (!input.prep) {
    pending.push('PREP');
  }
  if (!input.eta) {
    pending.push('ETA');
  }
  if (!input.serviceability) {
    pending.push('SERVICEABILITY');
  }

  const needsRoad = input.pricingMode === 'MARKET_BENCHMARK' || input.pricingMode === 'PROVIDER_QUOTE';

  // Modes other than FIXED_TIER require a ROAD route.
  if (needsRoad && (!input.route || input.route.kind !== 'ROAD')) {
    return { status: 'UNAVAILABLE', reason: 'ROUTE_UNAVAILABLE', pendingRequirements: empty };
  }

  if (input.pricingMode === 'PROVIDER_QUOTE' && input.pricing && input.pricing.projectedCostSource === 'UNKNOWN') {
    return { status: 'UNAVAILABLE', reason: 'PROVIDER_UNAVAILABLE', pendingRequirements: empty };
  }

  if (input.pricingMode === 'MARKET_BENCHMARK' && input.pricing && input.pricing.projectedCostSource === 'UNKNOWN') {
    return { status: 'UNAVAILABLE', reason: 'PRICING_UNAVAILABLE', pendingRequirements: empty };
  }

  if (needsRoad && input.eta && input.eta.status === 'UNAVAILABLE') {
    return { status: 'UNAVAILABLE', reason: 'ETA_UNAVAILABLE', pendingRequirements: empty };
  }

  if (pending.length > 0) {
    const ordered = PENDING_KEY_ORDER.filter((key) => pending.includes(key));
    return { status: 'PENDING', reason: null, pendingRequirements: ordered };
  }

  if (input.pricingMode === 'PROVIDER_QUOTE' && !input.pricing?.provider) {
    pending.push('PROVIDER_QUOTE');
  }

  if (pending.length > 0) {
    const ordered = PENDING_KEY_ORDER.filter((key) => pending.includes(key));
    return { status: 'PENDING', reason: null, pendingRequirements: ordered };
  }

  return { status: 'AVAILABLE', reason: null, pendingRequirements: empty };
}

/**
 * Enforces the approved financial invariants on a pricing result (pure contract wiring,
 * not a pricing algorithm):
 *  - free delivery ⇒ customerDeliveryFee MUST be 0 (else contract violation);
 *  - UNKNOWN projected cost ⇒ tenantSubsidy MUST be null;
 *  - known cost + free delivery ⇒ tenantSubsidy = projectedDeliveryCost;
 *  - known cost + paid delivery ⇒ tenantSubsidy = max(0, projectedDeliveryCost − fee).
 */
export function normalizeDeliveryPricing(
  pricing: DeliveryPricing,
  freeDeliveryApplied: boolean,
): DeliveryPricing {
  if (freeDeliveryApplied && pricing.customerDeliveryFee !== 0) {
    throw new DeliveryDecisionContractViolation(
      'Free delivery applied but customerDeliveryFee is not 0.',
    );
  }

  const fee = freeDeliveryApplied ? 0 : pricing.customerDeliveryFee;
  const cost = pricing.projectedDeliveryCost;

  let tenantSubsidy: number | null;
  if (cost === null) {
    tenantSubsidy = null;
  } else if (freeDeliveryApplied) {
    tenantSubsidy = cost;
  } else if (fee === null) {
    tenantSubsidy = null;
  } else {
    tenantSubsidy = Math.max(0, cost - fee);
  }

  return { ...pricing, customerDeliveryFee: fee, freeDeliveryApplied, tenantSubsidy };
}

/** Subsidy summary used by {@link DeliveryDecision.subsidy}. Never invents a cost. */
export function finalizeSubsidyDecision(pricing: DeliveryPricing): SubsidyDecision {
  const cost = pricing.projectedDeliveryCost;
  if (cost === null) {
    return { tenantSubsidy: null, basis: 'UNKNOWN_COST' };
  }
  if (pricing.freeDeliveryApplied) {
    return { tenantSubsidy: cost, basis: 'FREE_DELIVERY' };
  }
  if (pricing.customerDeliveryFee === null) {
    return { tenantSubsidy: null, basis: 'UNKNOWN_COST' };
  }
  return {
    tenantSubsidy: Math.max(0, cost - pricing.customerDeliveryFee),
    basis: 'STANDARD',
  };
}

/**
 * Structural guards ensuring ROAD vs STRAIGHT_LINE evidence can never be conflated.
 * Throws on misuse so the mistake surfaces at integration time.
 */
export function assertRouteEtaConsistency(
  route: RouteResult | null | undefined,
  pricing: DeliveryPricing | null | undefined,
  eta: EtaEstimate | null | undefined,
): void {
  if (!route) return;

  if (route.kind === 'STRAIGHT_LINE') {
    if (eta?.status === 'AUTHORITATIVE') {
      throw new DeliveryDecisionContractViolation(
        'STRAIGHT_LINE route must never produce an AUTHORITATIVE ETA.',
      );
    }
    if (eta?.basedOnRoadRoute === true) {
      throw new DeliveryDecisionContractViolation(
        'basedOnRoadRoute must be false for a STRAIGHT_LINE route.',
      );
    }
    if (pricing?.routeSource === 'ROUTING_PROVIDER' || pricing?.routeSource === 'ROUTE_CACHE') {
      throw new DeliveryDecisionContractViolation(
        'Pricing routeSource claims ROAD evidence for a STRAIGHT_LINE route.',
      );
    }
  }

  if (route.kind === 'ROAD' && pricing?.routeSource === 'STRAIGHT_LINE') {
    throw new DeliveryDecisionContractViolation(
      'Pricing routeSource contradicts a ROAD route.',
    );
  }

  if (eta?.status === 'AUTHORITATIVE' && eta.basedOnRoadRoute !== true) {
    throw new DeliveryDecisionContractViolation(
      'AUTHORITATIVE ETA requires ROAD evidence (basedOnRoadRoute=true).',
    );
  }
}

/** Narrowing guard: only a ROAD route may satisfy authoritative consumers. */
export function assertRoadRoute(route: RouteResult | null | undefined): RouteRoadResult {
  if (!route || route.kind !== 'ROAD') {
    throw new DeliveryDecisionContractViolation(
      'A ROAD route is required here; STRAIGHT_LINE is never acceptable.',
    );
  }
  return route;
}

const CONFIDENCE_SEVERITY: Readonly<Record<ConfidenceLevel, number>> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  UNAVAILABLE: 0,
};

/** AVAILABLE decisions take the weakest component confidence so none is overstated. */
export function resolveDecisionConfidence(
  pricing: DeliveryPricing | null | undefined,
  eta: EtaEstimate | null | undefined,
  prep: PrepEstimate | null | undefined,
): ConfidenceLevel {
  const candidate: ConfidenceLevel[] = [pricing?.confidence, eta?.confidence, prep?.confidence].filter(
    (level): level is ConfidenceLevel => Boolean(level),
  );
  if (eta?.status === 'ESTIMATE_ONLY') {
    candidate.push('LOW');
  }
  if (candidate.length === 0) return 'UNAVAILABLE';
  return candidate.reduce((worst, level) =>
    CONFIDENCE_SEVERITY[level] < CONFIDENCE_SEVERITY[worst] ? level : worst,
  );
}

function unavailableRoute(reason: DeliveryDecisionReason | null, fetchedAt: string): RouteResult {
  return {
    kind: 'UNAVAILABLE',
    source: 'UNKNOWN',
    distanceKm: null,
    durationMinutes: null,
    reason: reason ?? 'Route not yet resolved.',
    fetchedAt,
  };
}

function unavailablePricing(
  pricingMode: PricingMode,
  route: RouteResult | undefined | null,
  engineVersion: string,
): DeliveryPricing {
  const routeSource = route?.kind === 'ROAD' ? route.source : route?.kind === 'STRAIGHT_LINE' ? 'STRAIGHT_LINE' : 'UNKNOWN';
  const distanceKm = route && route.kind !== 'UNAVAILABLE' ? route.distanceKm : null;
  return {
    pricingMode,
    distanceKm,
    routeSource,
    projectedDeliveryCost: null,
    projectedCostSource: 'UNKNOWN',
    customerDeliveryFee: null,
    freeDeliveryApplied: false,
    tenantSubsidy: null,
    confidence: 'UNAVAILABLE',
    calculatedAt: '',
    engineVersion,
  };
}

function unavailableEta(requestedAt: string): EtaEstimate {
  return {
    status: 'UNAVAILABLE',
    confidence: 'UNAVAILABLE',
    minMinutes: null,
    maxMinutes: null,
    components: [],
    basedOnRoadRoute: false,
    calculatedAt: requestedAt,
    reason: 'ETA not yet resolved.',
  };
}

function unavailablePrep(requestedAt: string): PrepEstimate {
  return {
    estimatedMinutes: null,
    remainingMinutes: null,
    source: 'UNKNOWN',
    confidence: 'UNAVAILABLE',
    calculatedAt: requestedAt,
  };
}

function fallbackServiceability(
  validation: DecisionValidation,
  route: RouteResult | null | undefined,
): ServiceabilityDecision {
  const distanceKm = route && route.kind !== 'UNAVAILABLE' ? route.distanceKm : null;
  let reason: ServiceabilityDecision['reason'] = 'UNKNOWN';
  if (validation.reason === 'MISSING_KITCHEN_LOCATION') reason = 'NO_KITCHEN_COORDS';
  else if (validation.reason === 'MISSING_CUSTOMER_LOCATION' || validation.reason === 'INVALID_LOCATION') {
    reason = 'NO_ADDRESS';
  } else if (validation.reason === 'OUTSIDE_DELIVERY_AREA') reason = 'OUT_OF_RADIUS';
  return {
    isServiceable: validation.status === 'AVAILABLE' || validation.status === 'PENDING',
    distanceKm,
    reason,
  };
}

/**
 * Assembles the authoritative decision from engine-produced parts.
 * AVAILABLE is only produced when the delivery mode is fully supported; otherwise the
 * decision is PENDING (missing inputs listed) or UNAVAILABLE (meaningful reason).
 */
export function buildDeliveryDecision(input: DeliveryDecisionInput): DeliveryDecision {
  if (!input.decisionId?.trim()) {
    throw new DeliveryDecisionContractViolation('decisionId is required.');
  }
  if (!input.engineVersion?.trim()) {
    throw new DeliveryDecisionContractViolation('engineVersion is required.');
  }

  assertRouteEtaConsistency(input.route, input.pricing, input.eta);

  const validation = validateDeliveryDecisionInput(input);

  const freeDelivery: FreeDeliveryDecision =
    input.freeDelivery ??
    {
      enabled: Boolean(input.freeDeliveryConfig?.enabled),
      thresholdAmount: input.freeDeliveryConfig?.thresholdAmount ?? null,
      minimumOrderValue: input.freeDeliveryConfig?.thresholdAmount ?? null,
      orderValue: null,
      basis: null,
      payer: null,
      eligible: false,
      applied: false,
      reason: 'DISABLED',
    };

  const pricing = input.pricing
    ? normalizeDeliveryPricing(input.pricing, freeDelivery.applied)
    : unavailablePricing(input.pricingMode, input.route, input.engineVersion);

  const subsidy = finalizeSubsidyDecision(pricing);

  return {
    id: input.decisionId.trim(),
    tenantId: input.tenantId,
    status: validation.status,
    reason: validation.reason,
    ...(validation.pendingRequirements.length > 0
      ? { pendingRequirements: validation.pendingRequirements }
      : {}),
    serviceability: input.serviceability ?? fallbackServiceability(validation, input.route),
    route: input.route ?? unavailableRoute(validation.reason, input.requestedAt),
    pricing,
    freeDelivery,
    subsidy,
    eta: input.eta ?? unavailableEta(input.requestedAt),
    prep: input.prep ?? unavailablePrep(input.requestedAt),
    confidence: resolveDecisionConfidence(pricing, input.eta, input.prep),
    engineVersion: input.engineVersion,
    decidedAt: input.requestedAt,
  };
}