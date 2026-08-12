/**
 * Phase 5 — Step 11 & 12: Delivery Checkout Integration & Security Hardening Module
 *
 * Provides server-authoritative DeliveryDecision assembly for checkout workflows.
 * Integrates RouteEngine, PricingEngine, FreeDeliveryPolicy, PrepEngine, and EtaEngine
 * into checkout quote generation and order placement snapshotting.
 *
 * Key Invariants & Security Hardening (Step 12):
 *  - Server is ALWAYS authoritative for distance, customer fee, projected cost, subsidy, free delivery, and ETA.
 *  - Client distance / fee / ETA / freeDelivery inputs are NEVER trusted for price or decision calculation.
 *  - Fixed tier pricing parity is strictly enforced: 2 km -> ₹0, 7 km -> ₹40, 10 km -> ₹70, 16 km -> Unavailable.
 *  - Creates immutable OrderDeliverySnapshot and initial OrderDeliveryRuntime upon order placement.
 *  - Coordinate bounds (-90 to +90 lat, -180 to +180 lng) and non-zero checks strictly enforced.
 */

import { createRouteEngine } from './routeEngine.js';
import { createPricingEngine, toDeliveryPricing } from './pricingEngine.js';
import { createPrepEngine } from './prepEngine.js';
import { createEtaEngine } from './etaEngine.js';
import { buildDeliveryDecision } from './decisionEngine.js';
import { createDeliverySnapshot } from './deliverySnapshotModel.js';
import { createDeliveryRuntime, toLegacyOrderDeliveryMirrors } from './deliveryRuntimeEngine.js';
import type { DeliveryDecision, PricingMode } from './deliveryIntelligenceTypes.js';

export interface AuthoritativeCheckoutDeliveryParams {
  readonly tenantId: string;
  readonly tenantRaw: Record<string, unknown>;
  readonly orderSubtotal: number;
  readonly orderType?: 'delivery' | 'pickup';
  readonly deliveryAddress?: {
    readonly lat?: number;
    readonly lng?: number;
    readonly distanceKm?: number;
  };
  readonly providerQuoteId?: string;
  readonly clock?: () => Date;
}

export interface AuthoritativeCheckoutDeliveryResult {
  readonly decision: DeliveryDecision;
  readonly customerDeliveryFee: number;
  readonly deliveryPending: boolean;
  readonly isServiceable: boolean;
}

/**
 * Resolves kitchen coordinates from tenant configuration document with strict boundary checks.
 */
export function resolveKitchenCoordinates(tenantRaw: Record<string, unknown>): { lat: number; lng: number } | null {
  const loc = (tenantRaw.location ?? (tenantRaw.storefront as any)?.location ?? {}) as { lat?: number; lng?: number };
  if (
    typeof loc.lat === 'number' &&
    typeof loc.lng === 'number' &&
    Number.isFinite(loc.lat) &&
    Number.isFinite(loc.lng) &&
    loc.lat >= -90 &&
    loc.lat <= 90 &&
    loc.lng >= -180 &&
    loc.lng <= 180 &&
    !(loc.lat === 0 && loc.lng === 0)
  ) {
    return { lat: loc.lat, lng: loc.lng };
  }
  return null;
}

/**
 * Evaluates server-authoritative DeliveryDecision for checkout quote or order placement.
 * Completely immune to client distance, fee, subsidy, freeDelivery, or ETA tampering.
 */
export async function resolveAuthoritativeDeliveryDecision(
  params: AuthoritativeCheckoutDeliveryParams,
): Promise<AuthoritativeCheckoutDeliveryResult> {
  const { tenantId, tenantRaw, orderSubtotal, orderType, deliveryAddress, clock } = params;
  const now = clock ? clock() : new Date();
  const nowIso = now.toISOString();

  if (orderType === 'pickup') {
    const pickupDecision = buildDeliveryDecision({
      decisionId: `dec_pickup_${tenantId}_${Date.now()}`,
      engineVersion: '1.0.0',
      requestedAt: nowIso,
      orderType: 'pickup',
      kitchenLocation: resolveKitchenCoordinates(tenantRaw) ?? { lat: 17.4, lng: 78.4 },
      customerLocation: { lat: 17.4, lng: 78.4 },
      pricingMode: 'FIXED_TIER',
      pricing: {
        pricingMode: 'FIXED_TIER',
        distanceKm: 0,
        routeSource: 'UNKNOWN',
        projectedDeliveryCost: null,
        projectedCostSource: 'UNKNOWN',
        customerDeliveryFee: 0,
        freeDeliveryApplied: false,
        tenantSubsidy: null,
        confidence: 'HIGH',
        calculatedAt: nowIso,
        engineVersion: '1.0.0',
      },
      route: {
        kind: 'ROAD',
        source: 'ROUTING_PROVIDER',
        distanceKm: 0,
        durationMinutes: 0,
        provider: 'pickup',
        fetchedAt: nowIso,
      },
      prep: {
        estimatedMinutes: 15,
        remainingMinutes: 15,
        source: 'CONFIG',
        confidence: 'HIGH',
        calculatedAt: nowIso,
      },
      eta: {
        status: 'AUTHORITATIVE',
        confidence: 'HIGH',
        minMinutes: 15,
        maxMinutes: 20,
        formattedDisplay: '15–20 min (Pickup)',
        displayMinutes: 15,
        components: [{ label: 'Kitchen Preparation', minMinutes: 15, maxMinutes: 15, type: 'PREP' }],
        basedOnRoadRoute: true,
        calculatedAt: nowIso,
      },
      serviceability: { isServiceable: true, distanceKm: 0, reason: 'OK' },
      freeDelivery: { isFreeDelivery: true, threshold: 0, orderTotal: orderSubtotal, amountNeededForFreeDelivery: 0 },
    });

    return {
      decision: pickupDecision,
      customerDeliveryFee: 0,
      deliveryPending: false,
      isServiceable: true,
    };
  }

  const kitchenCoords = resolveKitchenCoordinates(tenantRaw);
  const hasCustomerCoords =
    typeof deliveryAddress?.lat === 'number' &&
    typeof deliveryAddress?.lng === 'number' &&
    Number.isFinite(deliveryAddress.lat) &&
    Number.isFinite(deliveryAddress.lng) &&
    deliveryAddress.lat >= -90 &&
    deliveryAddress.lat <= 90 &&
    deliveryAddress.lng >= -180 &&
    deliveryAddress.lng <= 180 &&
    !(deliveryAddress.lat === 0 && deliveryAddress.lng === 0);

  if (!kitchenCoords || !hasCustomerCoords) {
    const unavailDecision = buildDeliveryDecision({
      decisionId: `dec_pending_${tenantId}_${Date.now()}`,
      engineVersion: '1.0.0',
      requestedAt: nowIso,
      orderType: 'delivery',
      kitchenLocation: kitchenCoords ?? { lat: 17.4, lng: 78.4 },
      customerLocation: hasCustomerCoords ? { lat: deliveryAddress!.lat!, lng: deliveryAddress!.lng! } : { lat: 17.4, lng: 78.4 },
      pricingMode: 'FIXED_TIER',
      route: {
        kind: 'UNAVAILABLE',
        source: 'UNKNOWN',
        distanceKm: null,
        durationMinutes: null,
        reason: !kitchenCoords ? 'Missing kitchen location' : 'Missing customer location',
        fetchedAt: nowIso,
      },
    });

    return {
      decision: unavailDecision,
      customerDeliveryFee: 0,
      deliveryPending: true,
      isServiceable: false,
    };
  }

  // 1. Server-authoritative Route Engine
  const routeEngine = createRouteEngine();
  const route = await routeEngine.getRoute({
    tenantId,
    pickup: kitchenCoords,
    dropoff: { lat: deliveryAddress!.lat!, lng: deliveryAddress!.lng! },
    mode: 'ROAD_OR_STRAIGHT_LINE',
  });

  // 2. Pricing Engine + Central Free Delivery Policy (Step 6 & 7)
  const deliveryConfig = (tenantRaw.deliveryConfig ?? {}) as Record<string, unknown>;
  const pricingMode = (deliveryConfig.pricingMode as PricingMode) || 'FIXED_TIER';

  const freeDeliveryThreshold = Number(
    deliveryConfig.freeDeliveryThreshold ??
    deliveryConfig.freeDeliveryMinOrder ??
    599,
  );

  const pricingEngine = createPricingEngine();
  const pricingResult = await pricingEngine.price({
    tenantId,
    pricingMode,
    route,
    tenantDeliveryConfig: deliveryConfig,
    freeDelivery: {
      enabled: true,
      minimumOrderValue: freeDeliveryThreshold,
    },
    orderValue: orderSubtotal,
    now,
  });

  const finalPricing = toDeliveryPricing(pricingResult);
  const freeDeliveryDecision = pricingResult.freeDelivery;

  const isFeeUnresolvable = finalPricing.customerDeliveryFee === null || pricingResult.status === 'UNAVAILABLE';
  const serviceabilityReason = isFeeUnresolvable ? 'OUT_OF_RADIUS' : 'OK';

  // 4. Prep & ETA Engines (Step 8 & 9)
  const prepEngine = createPrepEngine();
  const prepResult = prepEngine.estimate({
    tenantId,
    tenantDeliveryConfig: deliveryConfig,
    now,
  });

  const etaEngine = createEtaEngine();
  const etaResult = etaEngine.estimate({
    tenantId,
    pricingMode,
    route,
    prep: prepResult,
    now,
  });

  // 5. Canonical Decision Assembly
  const decision = buildDeliveryDecision({
    decisionId: `dec_chk_${tenantId}_${Date.now()}`,
    engineVersion: '1.0.0',
    requestedAt: nowIso,
    orderType: 'delivery',
    kitchenLocation: kitchenCoords,
    customerLocation: { lat: deliveryAddress!.lat!, lng: deliveryAddress!.lng! },
    pricingMode,
    pricing: finalPricing,
    route,
    prep: prepResult,
    eta: etaResult,
    freeDelivery: freeDeliveryDecision,
    serviceability: {
      isServiceable: !isFeeUnresolvable,
      distanceKm: route.distanceKm,
      reason: serviceabilityReason,
    },
  });

  const isServiceable = decision.status === 'AVAILABLE' || decision.status === 'PENDING';
  const finalFee = isFeeUnresolvable ? 0 : (finalPricing.customerDeliveryFee ?? 0);

  return {
    decision,
    customerDeliveryFee: finalFee,
    deliveryPending: decision.status === 'PENDING' || finalPricing.customerDeliveryFee === null,
    isServiceable: isServiceable && !isFeeUnresolvable,
  };
}

/**
 * Creates OrderDeliverySnapshot and OrderDeliveryRuntime objects for order placement.
 */
export function createCheckoutOrderDeliveryArtifacts(
  decision: DeliveryDecision,
  params: { tenantId: string; orderId: string; clock?: () => Date },
) {
  const snapshot = createDeliverySnapshot(decision, {
    tenantId: params.tenantId,
    orderId: params.orderId,
    clock: params.clock,
  });

  const runtime = createDeliveryRuntime(snapshot, {}, params.clock);
  const legacyMirrors = toLegacyOrderDeliveryMirrors(snapshot, runtime);

  return {
    snapshot,
    runtime,
    legacyMirrors,
  };
}
