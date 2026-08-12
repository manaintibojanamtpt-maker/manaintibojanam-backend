/**
 * Phase 5 — Step 10: Snapshot Model
 *
 * Defines the immutable checkout delivery snapshot (order.delivery).
 * Preserves checkout-time facts (pricing, customer fee, subsidy, free delivery,
 * route evidence, prep estimate, ETA estimate, provider quote reference) as an immutable agreement.
 *
 * Rules:
 *  - Uses existing canonical types from deliveryIntelligenceTypes.ts.
 *  - Must NEVER contain secrets (API keys, client secrets, access tokens).
 *  - Deeply frozen to prevent runtime mutation.
 *  - Provides deterministic serialization and safe deserialization.
 */

import type {
  DeliveryDecision,
  DeliveryPricing,
  EtaEstimate,
  PrepEstimate,
  RouteResult,
  ProviderQuoteResult,
  FreeDeliveryDecision,
  SubsidyDecision,
  ServiceabilityDecision,
} from './deliveryIntelligenceTypes.js';
import type { DeliveryProviderId } from './providerCapabilityMatrix.js';

export const CURRENT_SNAPSHOT_ENGINE_VERSION = '1.0.0';

export interface ProviderReference {
  readonly providerId: DeliveryProviderId;
  readonly merchantAccountId?: string;
}

export interface OrderDeliverySnapshot {
  readonly schemaVersion: '1.0';
  readonly engineVersion: string;
  readonly snapshotId: string;
  readonly tenantId: string;
  readonly orderId: string;
  readonly createdAt: string; // ISO 8601 timestamp
  readonly pricing: DeliveryPricing;
  readonly eta: EtaEstimate;
  readonly prep: PrepEstimate;
  readonly route: RouteResult;
  readonly serviceability: ServiceabilityDecision;
  readonly freeDelivery: FreeDeliveryDecision;
  readonly subsidy: SubsidyDecision;
  readonly providerQuote: ProviderQuoteResult | null;
  readonly providerReference: ProviderReference | null;
}

/**
 * Deep freezes an object recursively to guarantee runtime immutability.
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  Object.freeze(obj);

  for (const key of Object.getOwnPropertyNames(obj)) {
    const prop = (obj as Record<string, unknown>)[key];
    if (prop !== null && typeof prop === 'object' && !Object.isFrozen(prop)) {
      deepFreeze(prop);
    }
  }

  return obj as Readonly<T>;
}

/**
 * Scans object recursively for forbidden secret keywords.
 */
function checkForForbiddenSecrets(data: unknown, path = ''): void {
  if (!data || typeof data !== 'object') return;

  const FORBIDDEN_KEYS = [
    'apikey',
    'secretkey',
    'clientsecret',
    'accesstoken',
    'bearertoken',
    'privatekey',
    'password',
    'ciphertext',
  ];

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (FORBIDDEN_KEYS.some((f) => lowerKey.includes(f))) {
      throw new Error(`Secret safety violation: snapshot contains sensitive field '${path ? path + '.' : ''}${key}'`);
    }

    if (value && typeof value === 'object') {
      checkForForbiddenSecrets(value, path ? `${path}.${key}` : key);
    }
  }
}

/**
 * Creates an immutable OrderDeliverySnapshot from a server-authoritative DeliveryDecision.
 */
export function createDeliverySnapshot(
  decision: DeliveryDecision,
  params: {
    readonly tenantId: string;
    readonly orderId: string;
    readonly engineVersion?: string;
    readonly clock?: () => Date;
  },
): OrderDeliverySnapshot {
  if (!params.tenantId || typeof params.tenantId !== 'string') {
    throw new Error('createDeliverySnapshot requires a valid tenantId string');
  }

  if (!params.orderId || typeof params.orderId !== 'string') {
    throw new Error('createDeliverySnapshot requires a valid orderId string');
  }

  if (!decision || typeof decision !== 'object') {
    throw new Error('createDeliverySnapshot requires a valid DeliveryDecision object');
  }

  const nowIso = (params.clock ? params.clock() : new Date()).toISOString();
  const snapshotId = `snap_${params.tenantId}_${params.orderId}_${Date.now()}`;

  const rawSnapshot: OrderDeliverySnapshot = {
    schemaVersion: '1.0',
    engineVersion: params.engineVersion || CURRENT_SNAPSHOT_ENGINE_VERSION,
    snapshotId,
    tenantId: params.tenantId,
    orderId: params.orderId,
    createdAt: nowIso,
    pricing: decision.pricing,
    eta: decision.eta,
    prep: decision.prep,
    route: decision.route,
    serviceability: decision.serviceability,
    freeDelivery: decision.freeDelivery,
    subsidy: decision.subsidy,
    providerQuote: decision.providerQuote ?? null,
    providerReference: decision.providerQuote
      ? {
          providerId: decision.providerQuote.provider,
          merchantAccountId: decision.providerQuote.merchantAccountId,
        }
      : null,
  };

  checkForForbiddenSecrets(rawSnapshot);
  return deepFreeze(rawSnapshot);
}

/**
 * Serializes an OrderDeliverySnapshot cleanly for storage or transmission.
 */
export function serializeDeliverySnapshot(snapshot: OrderDeliverySnapshot): Record<string, unknown> {
  if (!snapshot || snapshot.schemaVersion !== '1.0') {
    throw new Error('Invalid delivery snapshot provided for serialization');
  }
  checkForForbiddenSecrets(snapshot);
  return JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>;
}

/**
 * Parses and validates an OrderDeliverySnapshot from JSON or database document.
 */
export function parseDeliverySnapshot(input: unknown): OrderDeliverySnapshot {
  if (!input || typeof input !== 'object') {
    throw new Error('Malformed delivery snapshot: input is not an object');
  }

  const data = input as Record<string, unknown>;

  if (data.schemaVersion !== '1.0') {
    throw new Error(`Unsupported snapshot schema version: ${String(data.schemaVersion)}`);
  }

  if (typeof data.tenantId !== 'string' || !data.tenantId.trim()) {
    throw new Error('Malformed delivery snapshot: missing or invalid tenantId');
  }

  if (typeof data.orderId !== 'string' || !data.orderId.trim()) {
    throw new Error('Malformed delivery snapshot: missing or invalid orderId');
  }

  if (typeof data.engineVersion !== 'string' || !data.engineVersion.trim()) {
    throw new Error('Malformed delivery snapshot: missing engineVersion');
  }

  if (!data.pricing || typeof data.pricing !== 'object') {
    throw new Error('Malformed delivery snapshot: missing or invalid pricing');
  }

  const pricing = data.pricing as Record<string, unknown>;
  if (typeof pricing.customerDeliveryFee !== 'number' || isNaN(pricing.customerDeliveryFee)) {
    throw new Error('Malformed delivery snapshot: invalid customerDeliveryFee in pricing');
  }

  if (!data.eta || typeof data.eta !== 'object') {
    throw new Error('Malformed delivery snapshot: missing or invalid eta');
  }

  checkForForbiddenSecrets(data);

  return deepFreeze(data as unknown as OrderDeliverySnapshot);
}
