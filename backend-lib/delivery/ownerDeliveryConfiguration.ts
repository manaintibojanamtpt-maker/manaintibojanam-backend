/**
 * Phase 5 — STEP 14: Owner Delivery Intelligence Configuration
 *
 * Canonical schema reader, validator, and writer for tenant delivery policy.
 * Preserves backward compatibility with legacy fields (`freeDeliveryMinOrder`, `prepTime`, etc.).
 */

import type { DeliveryProviderId } from './providerCapabilityMatrix.js';
import type { PricingMode } from './deliveryIntelligenceTypes.js';

export interface OwnerFreeDeliveryConfig {
  readonly enabled: boolean;
  readonly minimumOrderValue: number;
  readonly basis: 'SUBTOTAL';
  readonly payer: 'TENANT';
}

export interface OwnerKitchenConfig {
  readonly defaultPrepTimeMinutes: number;
  readonly capacity: number;
  readonly orderAcceptanceMode: 'AUTO' | 'MANUAL';
}

export interface OwnerDeliveryRadiusConfig {
  readonly freeRadius: number;
  readonly paidRadius: number;
  readonly maxRadius: number;
  readonly baseFee: number;
  readonly perKmCharge: number;
}

export interface ResolvedOwnerDeliveryConfig {
  readonly pricingMode: PricingMode;
  readonly vehicleType: 'BIKE' | 'SCOOTER' | 'CAR';
  readonly freeDelivery: OwnerFreeDeliveryConfig;
  readonly kitchenConfig: OwnerKitchenConfig;
  readonly radius: OwnerDeliveryRadiusConfig;
  readonly providerSelectionMode: 'MANUAL_ONLY' | 'AUTO_FALLBACK' | 'PREFERRED_ONLY';
  readonly providerPreference: readonly DeliveryProviderId[];
}

export type OwnerDeliveryConfigValidationResult =
  | { readonly ok: true; readonly data: ResolvedOwnerDeliveryConfig }
  | { readonly ok: false; readonly error: string };

const ALLOWED_PRICING_MODES = new Set<PricingMode>(['FIXED_TIER', 'MARKET_BENCHMARK', 'PROVIDER_QUOTE']);
const ALLOWED_VEHICLE_TYPES = new Set(['BIKE', 'SCOOTER', 'CAR']);
const ALLOWED_ACCEPTANCE_MODES = new Set(['AUTO', 'MANUAL']);
const ALLOWED_SELECTION_MODES = new Set(['MANUAL_ONLY', 'AUTO_FALLBACK', 'PREFERRED_ONLY']);
const ALLOWED_PROVIDERS = new Set<DeliveryProviderId>(['porter', 'uber_direct', 'rapido', 'self_pickup']);

/**
 * Reads canonical owner delivery configuration from a raw Firestore tenant document.
 * Merges defaults seamlessly and supports dual-reading legacy fields.
 */
export function readOwnerDeliveryConfig(rawTenantDoc: Record<string, unknown>): ResolvedOwnerDeliveryConfig {
  const delivery = (rawTenantDoc.deliveryConfig ?? {}) as Record<string, unknown>;
  const kitchen = (rawTenantDoc.kitchenConfig ?? {}) as Record<string, unknown>;
  const freeDeliveryRaw = (delivery.freeDelivery ?? {}) as Record<string, unknown>;

  const pricingMode = ALLOWED_PRICING_MODES.has(delivery.pricingMode as PricingMode)
    ? (delivery.pricingMode as PricingMode)
    : 'FIXED_TIER';

  const vehicleType = ALLOWED_VEHICLE_TYPES.has(delivery.vehicleType as string)
    ? (delivery.vehicleType as 'BIKE' | 'SCOOTER' | 'CAR')
    : 'BIKE';

  const freeDeliveryEnabled =
    typeof freeDeliveryRaw.enabled === 'boolean'
      ? freeDeliveryRaw.enabled
      : typeof delivery.freeDeliveryMinOrder === 'number' && delivery.freeDeliveryMinOrder > 0;

  const minOrderVal =
    typeof freeDeliveryRaw.minimumOrderValue === 'number' && Number.isFinite(freeDeliveryRaw.minimumOrderValue)
      ? freeDeliveryRaw.minimumOrderValue
      : typeof delivery.freeDeliveryMinOrder === 'number' && Number.isFinite(delivery.freeDeliveryMinOrder)
        ? delivery.freeDeliveryMinOrder
        : 599;

  const defaultPrepTime =
    typeof kitchen.defaultPrepTimeMinutes === 'number' && Number.isFinite(kitchen.defaultPrepTimeMinutes) && kitchen.defaultPrepTimeMinutes > 0
      ? kitchen.defaultPrepTimeMinutes
      : typeof delivery.prepTime === 'number' && Number.isFinite(delivery.prepTime) && delivery.prepTime > 0
        ? delivery.prepTime
        : 20;

  const capacity =
    typeof kitchen.capacity === 'number' && Number.isFinite(kitchen.capacity) && kitchen.capacity > 0
      ? kitchen.capacity
      : 10;

  const orderAcceptanceMode = ALLOWED_ACCEPTANCE_MODES.has(kitchen.orderAcceptanceMode as string)
    ? (kitchen.orderAcceptanceMode as 'AUTO' | 'MANUAL')
    : 'AUTO';

  const freeRadius =
    typeof delivery.freeRadius === 'number' && Number.isFinite(delivery.freeRadius) && delivery.freeRadius >= 0
      ? delivery.freeRadius
      : 2;

  const paidRadius =
    typeof delivery.paidRadius === 'number' && Number.isFinite(delivery.paidRadius) && delivery.paidRadius >= freeRadius
      ? delivery.paidRadius
      : 7;

  const maxRadius =
    typeof delivery.maxRadius === 'number' && Number.isFinite(delivery.maxRadius) && delivery.maxRadius >= paidRadius
      ? delivery.maxRadius
      : 10;

  const baseFee =
    typeof delivery.baseFee === 'number' && Number.isFinite(delivery.baseFee) && delivery.baseFee >= 0
      ? delivery.baseFee
      : 0;

  const perKmCharge =
    typeof delivery.perKmCharge === 'number' && Number.isFinite(delivery.perKmCharge) && delivery.perKmCharge >= 0
      ? delivery.perKmCharge
      : 0;

  const providerSelectionMode = ALLOWED_SELECTION_MODES.has(delivery.providerSelectionMode as string)
    ? (delivery.providerSelectionMode as 'MANUAL_ONLY' | 'AUTO_FALLBACK' | 'PREFERRED_ONLY')
    : 'MANUAL_ONLY';

  const rawPref = Array.isArray(delivery.providerPreference) ? delivery.providerPreference : ['rapido', 'porter', 'self_pickup'];
  const providerPreference = rawPref.filter((p): p is DeliveryProviderId => ALLOWED_PROVIDERS.has(p as DeliveryProviderId));

  return {
    pricingMode,
    vehicleType,
    freeDelivery: {
      enabled: freeDeliveryEnabled,
      minimumOrderValue: minOrderVal,
      basis: 'SUBTOTAL',
      payer: 'TENANT',
    },
    kitchenConfig: {
      defaultPrepTimeMinutes: defaultPrepTime,
      capacity,
      orderAcceptanceMode,
    },
    radius: {
      freeRadius,
      paidRadius,
      maxRadius,
      baseFee,
      perKmCharge,
    },
    providerSelectionMode,
    providerPreference: providerPreference.length > 0 ? providerPreference : ['rapido', 'porter', 'self_pickup'],
  };
}

/**
 * Validates an incoming owner delivery configuration payload before saving.
 * Enforces non-negative values, prep time > 0, valid enums, and radius ordering constraints.
 */
export function validateOwnerDeliveryConfig(input: unknown): OwnerDeliveryConfigValidationResult {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Invalid configuration payload' };
  }

  const raw = input as Record<string, unknown>;

  const pricingMode = raw.pricingMode as PricingMode;
  if (!ALLOWED_PRICING_MODES.has(pricingMode)) {
    return { ok: false, error: 'Invalid pricingMode: must be FIXED_TIER, MARKET_BENCHMARK, or PROVIDER_QUOTE' };
  }

  const vehicleType = raw.vehicleType as string;
  if (!ALLOWED_VEHICLE_TYPES.has(vehicleType)) {
    return { ok: false, error: 'Invalid vehicleType: must be BIKE, SCOOTER, or CAR' };
  }

  const freeDeliveryRaw = (raw.freeDelivery ?? {}) as Record<string, unknown>;
  const freeDeliveryEnabled = Boolean(freeDeliveryRaw.enabled);
  const minimumOrderValue = Number(freeDeliveryRaw.minimumOrderValue);

  if (typeof freeDeliveryRaw.minimumOrderValue !== 'undefined') {
    if (!Number.isFinite(minimumOrderValue) || minimumOrderValue < 0) {
      return { ok: false, error: 'Invalid free delivery minimum order value: must be non-negative number' };
    }
  }

  const kitchenRaw = (raw.kitchenConfig ?? {}) as Record<string, unknown>;
  const defaultPrepTimeMinutes = Number(kitchenRaw.defaultPrepTimeMinutes ?? raw.prepTime ?? 20);
  if (!Number.isFinite(defaultPrepTimeMinutes) || defaultPrepTimeMinutes <= 0) {
    return { ok: false, error: 'Invalid default prep time: must be a positive number' };
  }

  const capacity = Number(kitchenRaw.capacity ?? 10);
  if (!Number.isFinite(capacity) || capacity <= 0) {
    return { ok: false, error: 'Invalid kitchen capacity: must be a positive number' };
  }

  const orderAcceptanceMode = (kitchenRaw.orderAcceptanceMode ?? 'AUTO') as string;
  if (!ALLOWED_ACCEPTANCE_MODES.has(orderAcceptanceMode)) {
    return { ok: false, error: 'Invalid order acceptance mode: must be AUTO or MANUAL' };
  }

  const radiusRaw = (raw.radius ?? raw) as Record<string, unknown>;
  const freeRadius = Number(radiusRaw.freeRadius ?? 2);
  const paidRadius = Number(radiusRaw.paidRadius ?? 7);
  const maxRadius = Number(radiusRaw.maxRadius ?? 10);
  const baseFee = Number(radiusRaw.baseFee ?? 0);
  const perKmCharge = Number(radiusRaw.perKmCharge ?? 0);

  if (!Number.isFinite(freeRadius) || freeRadius < 0) {
    return { ok: false, error: 'Invalid freeRadius: must be a non-negative number' };
  }
  if (!Number.isFinite(paidRadius) || paidRadius < 0) {
    return { ok: false, error: 'Invalid paidRadius: must be a non-negative number' };
  }
  if (!Number.isFinite(maxRadius) || maxRadius < 0) {
    return { ok: false, error: 'Invalid maxRadius: must be a non-negative number' };
  }
  if (!Number.isFinite(baseFee) || baseFee < 0) {
    return { ok: false, error: 'Invalid baseFee: must be a non-negative number' };
  }
  if (!Number.isFinite(perKmCharge) || perKmCharge < 0) {
    return { ok: false, error: 'Invalid perKmCharge: must be a non-negative number' };
  }

  if (freeRadius > paidRadius) {
    return { ok: false, error: 'Invalid radius ordering: freeRadius must be less than or equal to paidRadius' };
  }
  if (paidRadius > maxRadius) {
    return { ok: false, error: 'Invalid radius ordering: paidRadius must be less than or equal to maxRadius' };
  }

  const selectionMode = (raw.providerSelectionMode ?? 'MANUAL_ONLY') as string;
  if (!ALLOWED_SELECTION_MODES.has(selectionMode)) {
    return { ok: false, error: 'Invalid providerSelectionMode: must be MANUAL_ONLY, AUTO_FALLBACK, or PREFERRED_ONLY' };
  }

  return {
    ok: true,
    data: {
      pricingMode,
      vehicleType: vehicleType as 'BIKE' | 'SCOOTER' | 'CAR',
      freeDelivery: {
        enabled: freeDeliveryEnabled,
        minimumOrderValue: Number.isFinite(minimumOrderValue) ? minimumOrderValue : 599,
        basis: 'SUBTOTAL',
        payer: 'TENANT',
      },
      kitchenConfig: {
        defaultPrepTimeMinutes,
        capacity,
        orderAcceptanceMode: orderAcceptanceMode as 'AUTO' | 'MANUAL',
      },
      radius: {
        freeRadius,
        paidRadius,
        maxRadius,
        baseFee,
        perKmCharge,
      },
      providerSelectionMode: selectionMode as 'MANUAL_ONLY' | 'AUTO_FALLBACK' | 'PREFERRED_ONLY',
      providerPreference: Array.isArray(raw.providerPreference)
        ? raw.providerPreference.filter((p): p is DeliveryProviderId => ALLOWED_PROVIDERS.has(p as DeliveryProviderId))
        : ['rapido', 'porter', 'self_pickup'],
    },
  };
}

/**
 * Formats a validated owner delivery configuration into Firestore update payloads.
 * Dual-writes legacy fields to preserve full backward compatibility.
 */
export function buildOwnerDeliveryConfigFirestoreUpdates(
  validated: ResolvedOwnerDeliveryConfig,
): { deliveryConfig: Record<string, unknown>; kitchenConfig: Record<string, unknown> } {
  const deliveryConfig = {
    enabled: true,
    pricingMode: validated.pricingMode,
    vehicleType: validated.vehicleType,
    freeRadius: validated.radius.freeRadius,
    paidRadius: validated.radius.paidRadius,
    maxRadius: validated.radius.maxRadius,
    baseFee: validated.radius.baseFee,
    perKmCharge: validated.radius.perKmCharge,
    prepTime: validated.kitchenConfig.defaultPrepTimeMinutes, // legacy dual write
    freeDeliveryMinOrder: validated.freeDelivery.minimumOrderValue, // legacy dual write
    freeDelivery: {
      enabled: validated.freeDelivery.enabled,
      minimumOrderValue: validated.freeDelivery.minimumOrderValue,
      basis: validated.freeDelivery.basis,
      payer: validated.freeDelivery.payer,
    },
    providerSelectionMode: validated.providerSelectionMode,
    providerPreference: validated.providerPreference,
    feesConfigured: validated.radius.baseFee > 0 || validated.radius.perKmCharge > 0,
  };

  const kitchenConfig = {
    defaultPrepTimeMinutes: validated.kitchenConfig.defaultPrepTimeMinutes,
    capacity: validated.kitchenConfig.capacity,
    orderAcceptanceMode: validated.kitchenConfig.orderAcceptanceMode,
  };

  return { deliveryConfig, kitchenConfig };
}
