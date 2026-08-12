/**
 * Phase 5 — STEP 18: Legacy Delivery Compatibility & Deprecation Module
 *
 * Establishes safe compatibility wrappers and dual-write helpers between legacy delivery
 * fields/pathways and canonical Phase 5 Step 1–17 implementations.
 *
 * CRITICAL SAFETY RULES:
 *  1. DO NOT DELETE LEGACY FIELDS — All existing legacy properties are supported.
 *  2. NO BEHAVIORAL REGRESSION — Runtime pricing, ETA, prep, routing, free delivery,
 *     subsidy, provider selection, and checkout behavior remain 100% identical.
 *  3. CANONICAL PRECEDENCE — Canonical values take precedence over legacy fallbacks.
 *  4. NO OPERATIONAL BYPASS — Legacy inputs can never bypass tenant isolation, entitlement checks,
 *     or provider readiness/live flags.
 *  5. SECRET SAFETY — No API keys or tokens are ever exposed in legacy mirrors.
 */

import type { OrderDeliverySnapshot } from './deliverySnapshotModel.js';
import type { OrderDeliveryRuntime } from './deliveryRuntimeEngine.js';

export const DEFAULT_PREP_TIME_MINUTES = 30;
export const DEFAULT_FREE_DELIVERY_THRESHOLD = 599;

export interface LegacyTenantDeliveryConfig {
  readonly prepTime?: number | null;
  readonly freeDeliveryMinOrder?: number | null;
  readonly freeRadius?: number | null;
  readonly paidRadius?: number | null;
  readonly maxRadius?: number | null;
  readonly baseFee?: number | null;
  readonly perKmCharge?: number | null;
  readonly enabled?: boolean | null;
  readonly deliveryPartnerPreference?: string | null;
  readonly kitchenConfig?: {
    readonly defaultPrepTimeMinutes?: number | null;
  } | null;
  readonly freeDelivery?: {
    readonly enabled?: boolean | null;
    readonly minimumOrderValue?: number | null;
    readonly basis?: 'SUBTOTAL' | 'ITEMS_ONLY';
    readonly payer?: 'TENANT' | 'PLATFORM';
  } | null;
}

export interface LegacyOrderDeliveryMirrors {
  readonly eta: string | null;
  readonly etaMinutes: number | null;
  readonly deliveryPartner: string | null;
  readonly trackingUrl: string | null;
  readonly deliveryAssignedAt: string | null;
}

/**
 * Resolves kitchen preparation time following canonical 3-level precedence:
 *  1. kitchenConfig.defaultPrepTimeMinutes (Canonical)
 *  2. deliveryConfig.prepTime (Legacy Fallback)
 *  3. DEFAULT_PREP_TIME_MINUTES (Repository Default: 30)
 *
 * @deprecated Use kitchenConfig.defaultPrepTimeMinutes instead.
 */
export function resolveLegacyPrepTime(config?: LegacyTenantDeliveryConfig | null): number {
  if (!config) return DEFAULT_PREP_TIME_MINUTES;

  // 1. Canonical precedence
  const canonicalPrep = config.kitchenConfig?.defaultPrepTimeMinutes;
  if (typeof canonicalPrep === 'number' && Number.isFinite(canonicalPrep) && canonicalPrep > 0) {
    return canonicalPrep;
  }

  // 2. Legacy fallback
  const legacyPrep = config.prepTime;
  if (typeof legacyPrep === 'number' && Number.isFinite(legacyPrep) && legacyPrep > 0) {
    return legacyPrep;
  }

  // 3. Approved repository default
  return DEFAULT_PREP_TIME_MINUTES;
}

/**
 * Resolves free delivery policy following canonical precedence.
 * Preserves invariant: having a legacy `freeDeliveryMinOrder` does NOT auto-enable free delivery.
 * Free delivery MUST be explicitly enabled via `freeDelivery.enabled === true`.
 *
 * @deprecated Use deliveryConfig.freeDelivery.minimumOrderValue instead.
 */
export function resolveLegacyFreeDeliveryPolicy(config?: LegacyTenantDeliveryConfig | null): {
  readonly isEnabled: boolean;
  readonly minimumOrderValue: number;
  readonly basis: 'SUBTOTAL';
  readonly payer: 'TENANT';
} {
  const isEnabled = Boolean(config?.freeDelivery?.enabled);

  let minimumOrderValue = DEFAULT_FREE_DELIVERY_THRESHOLD;

  // 1. Canonical threshold precedence
  const canonicalThreshold = config?.freeDelivery?.minimumOrderValue;
  if (typeof canonicalThreshold === 'number' && Number.isFinite(canonicalThreshold) && canonicalThreshold > 0) {
    minimumOrderValue = canonicalThreshold;
  } else {
    // 2. Legacy threshold fallback
    const legacyThreshold = config?.freeDeliveryMinOrder;
    if (typeof legacyThreshold === 'number' && Number.isFinite(legacyThreshold) && legacyThreshold > 0) {
      minimumOrderValue = legacyThreshold;
    }
  }

  return {
    isEnabled,
    minimumOrderValue,
    basis: 'SUBTOTAL',
    payer: 'TENANT',
  };
}

/**
 * Generates legacy order mirror fields from canonical snapshot and runtime evidence.
 * Serves as the single authoritative transformer for order.eta, order.etaMinutes,
 * order.deliveryPartner, order.trackingUrl, and order.deliveryAssignedAt.
 *
 * @deprecated Prefer OrderDeliverySnapshot and OrderDeliveryRuntime directly for new features.
 */
export function toLegacyDeliveryMirrors(
  snapshot?: OrderDeliverySnapshot | null,
  runtime?: OrderDeliveryRuntime | null,
): LegacyOrderDeliveryMirrors {
  // ETA formatted string & display minutes
  let eta: string | null = null;
  let etaMinutes: number | null = null;

  if (snapshot?.eta) {
    eta = snapshot.eta.formattedDisplay || null;
    etaMinutes = snapshot.eta.displayMinutes ?? null;
  } else if (runtime?.currentEta) {
    eta = runtime.currentEta.formattedDisplay || null;
    etaMinutes = runtime.currentEta.displayMinutes ?? null;
  }

  // Delivery Partner
  const deliveryPartner =
    runtime?.currentProvider?.providerId ||
    snapshot?.providerQuote?.provider ||
    (snapshot as any)?.provider ||
    null;

  // Tracking URL
  const trackingUrl =
    runtime?.currentProvider?.trackingUrl ||
    runtime?.evidence?.trackingUrl ||
    null;

  // Delivery Assigned At
  const deliveryAssignedAt =
    runtime?.currentProvider?.assignedAt ||
    runtime?.evidence?.partnerAssignedAt ||
    null;

  return {
    eta,
    etaMinutes,
    deliveryPartner,
    trackingUrl,
    deliveryAssignedAt,
  };
}

/**
 * Resolves legacy provider preference string to canonical provider selection mode.
 *
 * @deprecated Use ownerDeliveryConfig.providerSelectionMode instead.
 */
export function resolveLegacyProviderPreference(legacyPreference?: string | null): {
  readonly selectionMode: 'MANUAL_FALLBACK' | 'CHEAPEST' | 'FASTEST';
  readonly preferredProviderId: string | null;
} {
  if (!legacyPreference || typeof legacyPreference !== 'string') {
    return { selectionMode: 'MANUAL_FALLBACK', preferredProviderId: null };
  }

  const normalized = legacyPreference.trim().toLowerCase();

  if (normalized === 'uber' || normalized === 'uber_direct') {
    return { selectionMode: 'CHEAPEST', preferredProviderId: 'uber_direct' };
  }

  if (normalized === 'porter') {
    return { selectionMode: 'CHEAPEST', preferredProviderId: 'porter' };
  }

  if (normalized === 'rapido') {
    return { selectionMode: 'CHEAPEST', preferredProviderId: 'rapido' };
  }

  return { selectionMode: 'MANUAL_FALLBACK', preferredProviderId: null };
}
