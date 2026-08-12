/**
 * Phase 5 — Step 10: Runtime Engine & Operational Model
 *
 * Manages mutable operational delivery state (order.deliveryRuntime).
 * Recomputes dynamic ETA updates using the SINGLE authoritative ETA engine (createEtaEngine from etaEngine.ts).
 *
 * Rules:
 *  - Does NOT implement a second or competing ETA formula.
 *  - NEVER mutates the historical OrderDeliverySnapshot (customer fee, pricing mode, subsidy, etc.).
 *  - Tenant-isolated and free of secrets.
 *  - Generates legacy mirror fields for backwards compatibility.
 */

import { createEtaEngine, type EtaLifecycleEvidence, type EtaEngineRequest } from './etaEngine.js';
import { createPrepEngine } from './prepEngine.js';
import type { EtaEstimate } from './deliveryIntelligenceTypes.js';
import type { OrderDeliverySnapshot } from './deliverySnapshotModel.js';
import type { DeliveryProviderId } from './providerCapabilityMatrix.js';

export const CURRENT_RUNTIME_ENGINE_VERSION = '1.0.0';

export type OrderLifecyclePhase =
  | 'CREATED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface RuntimeProviderInfo {
  readonly providerId: DeliveryProviderId;
  readonly trackingUrl?: string;
  readonly partnerAssignedAt?: string;
  readonly riderName?: string;
  readonly riderPhone?: string;
}

export interface OrderDeliveryRuntime {
  readonly schemaVersion: '1.0';
  readonly runtimeEngineVersion: string;
  readonly tenantId: string;
  readonly orderId: string;
  readonly lifecyclePhase: OrderLifecyclePhase;
  readonly currentEta: EtaEstimate;
  readonly currentProvider: RuntimeProviderInfo | null;
  readonly evidence: EtaLifecycleEvidence;
  readonly lastRecomputedAt: string;
  readonly updatedAt: string;
}

export interface LegacyOrderDeliveryMirrors {
  readonly eta: string;
  readonly etaMinutes: number;
  readonly deliveryPartner: string;
  readonly trackingUrl: string | null;
  readonly deliveryAssignedAt: string | null;
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
      throw new Error(`Secret safety violation: runtime contains sensitive field '${path ? path + '.' : ''}${key}'`);
    }

    if (value && typeof value === 'object') {
      checkForForbiddenSecrets(value, path ? `${path}.${key}` : key);
    }
  }
}

/**
 * Maps lifecycle phase string to evidence timestamp keys.
 */
function mapPhaseToLifecycleEvidence(
  phase: OrderLifecyclePhase | undefined,
  nowIso: string,
  existing: EtaLifecycleEvidence,
): EtaLifecycleEvidence {
  const updated = { ...existing };
  if (!phase) return updated;

  switch (phase) {
    case 'ACCEPTED':
      if (!updated.orderAcceptedAt) updated.orderAcceptedAt = nowIso;
      break;
    case 'PREPARING':
      if (!updated.preparationStartedAt) updated.preparationStartedAt = nowIso;
      break;
    case 'READY_FOR_PICKUP':
      if (!updated.preparationCompletedAt) updated.preparationCompletedAt = nowIso;
      break;
    case 'DISPATCHED':
      if (!updated.onRouteAt) updated.onRouteAt = nowIso;
      break;
    case 'DELIVERED':
      if (!updated.deliveredAt) updated.deliveredAt = nowIso;
      break;
  }
  return updated;
}

/**
 * Initializes OrderDeliveryRuntime for an active order based on an immutable checkout snapshot.
 */
export function createDeliveryRuntime(
  snapshot: OrderDeliverySnapshot,
  initialEvidence: Partial<EtaLifecycleEvidence> = {},
  clock?: () => Date,
): OrderDeliveryRuntime {
  if (!snapshot || snapshot.schemaVersion !== '1.0') {
    throw new Error('createDeliveryRuntime requires a valid OrderDeliverySnapshot');
  }

  const nowIso = (clock ? clock() : new Date()).toISOString();

  const providerInfo: RuntimeProviderInfo | null = snapshot.providerReference
    ? { providerId: snapshot.providerReference.providerId }
    : null;

  const rawRuntime: OrderDeliveryRuntime = {
    schemaVersion: '1.0',
    runtimeEngineVersion: CURRENT_RUNTIME_ENGINE_VERSION,
    tenantId: snapshot.tenantId,
    orderId: snapshot.orderId,
    lifecyclePhase: 'CREATED',
    currentEta: snapshot.eta,
    currentProvider: providerInfo,
    evidence: { ...initialEvidence },
    lastRecomputedAt: nowIso,
    updatedAt: nowIso,
  };

  checkForForbiddenSecrets(rawRuntime);
  return rawRuntime;
}

/**
 * Updates runtime operational state and recomputes live ETA using the authoritative etaEngine.
 * Leaves the snapshot parameter 100% UNMUTATED.
 */
export function updateDeliveryRuntime(params: {
  readonly snapshot: OrderDeliverySnapshot;
  readonly currentRuntime: OrderDeliveryRuntime;
  readonly lifecyclePhase?: OrderLifecyclePhase;
  readonly newEvidence?: Partial<EtaLifecycleEvidence>;
  readonly providerInfo?: Partial<RuntimeProviderInfo>;
  readonly clock?: () => Date;
}): OrderDeliveryRuntime {
  const { snapshot, currentRuntime, lifecyclePhase, newEvidence, providerInfo, clock } = params;

  if (!snapshot || snapshot.schemaVersion !== '1.0') {
    throw new Error('updateDeliveryRuntime requires a valid OrderDeliverySnapshot');
  }

  if (!currentRuntime || currentRuntime.schemaVersion !== '1.0') {
    throw new Error('updateDeliveryRuntime requires a valid OrderDeliveryRuntime');
  }

  if (currentRuntime.tenantId !== snapshot.tenantId) {
    throw new Error('Tenant mismatch: runtime tenantId does not match snapshot tenantId');
  }

  if (currentRuntime.orderId !== snapshot.orderId) {
    throw new Error('Order ID mismatch: runtime orderId does not match snapshot orderId');
  }

  const now = clock ? clock() : new Date();
  const nowIso = now.toISOString();

  const nextPhase = lifecyclePhase || currentRuntime.lifecyclePhase;

  let combinedEvidence: EtaLifecycleEvidence = {
    ...currentRuntime.evidence,
    ...(newEvidence || {}),
  };

  combinedEvidence = mapPhaseToLifecycleEvidence(nextPhase, nowIso, combinedEvidence);

  // Use the SINGLE authoritative etaEngine
  const etaEngine = createEtaEngine();

  // Use PrepEngine for canonical preparation time estimation
  const prepEngine = createPrepEngine();
  const prepResult = prepEngine.estimate({
    tenantId: snapshot.tenantId,
    tenantDeliveryConfig: { prepTime: snapshot.prep?.estimatedMinutes ?? 20 },
    preparationStartedAt: combinedEvidence.preparationStartedAt,
    preparationCompletedAt: combinedEvidence.preparationCompletedAt,
    now,
  });

  const etaRequest: EtaEngineRequest = {
    tenantId: snapshot.tenantId,
    pricingMode: snapshot.pricing.pricingMode,
    route: snapshot.route,
    prep: prepResult,
    lifecycle: combinedEvidence,
    now,
  };

  if (snapshot.providerQuote) {
    (etaRequest as any).providerEta = {
      provider: snapshot.providerQuote.provider,
      status: snapshot.providerQuote.status,
      expiresAt: snapshot.providerQuote.expiresAt,
      deliveryEtaMinutes: {
        min: snapshot.providerQuote.estimatedDeliveryMinutes,
        max: snapshot.providerQuote.estimatedDeliveryMinutes,
      },
    };
  }

  const updatedEtaResult = etaEngine.estimate(etaRequest);

  const currentEta: EtaEstimate = nextPhase === 'DELIVERED'
    ? {
        ...updatedEtaResult,
        status: 'AUTHORITATIVE',
        confidence: 'HIGH',
        minMinutes: 0,
        maxMinutes: 0,
      }
    : updatedEtaResult;

  const mergedProviderInfo: RuntimeProviderInfo | null = providerInfo
    ? {
        providerId: providerInfo.providerId || currentRuntime.currentProvider?.providerId || snapshot.providerReference?.providerId || 'self_pickup',
        trackingUrl: providerInfo.trackingUrl ?? currentRuntime.currentProvider?.trackingUrl,
        partnerAssignedAt: providerInfo.partnerAssignedAt ?? currentRuntime.currentProvider?.partnerAssignedAt,
        riderName: providerInfo.riderName ?? currentRuntime.currentProvider?.riderName,
        riderPhone: providerInfo.riderPhone ?? currentRuntime.currentProvider?.riderPhone,
      }
    : currentRuntime.currentProvider;

  const nextRuntime: OrderDeliveryRuntime = {
    schemaVersion: '1.0',
    runtimeEngineVersion: CURRENT_RUNTIME_ENGINE_VERSION,
    tenantId: snapshot.tenantId,
    orderId: snapshot.orderId,
    lifecyclePhase: nextPhase,
    currentEta,
    currentProvider: mergedProviderInfo,
    evidence: combinedEvidence,
    lastRecomputedAt: nowIso,
    updatedAt: nowIso,
  };

  checkForForbiddenSecrets(nextRuntime);
  return nextRuntime;
}

/**
 * Maps snapshot and runtime state to legacy order fields for backward compatibility.
 */
export function toLegacyOrderDeliveryMirrors(
  snapshot: OrderDeliverySnapshot,
  runtime: OrderDeliveryRuntime,
): LegacyOrderDeliveryMirrors {
  if (!snapshot || !runtime) {
    throw new Error('toLegacyOrderDeliveryMirrors requires both snapshot and runtime');
  }

  const partner =
    runtime.currentProvider?.providerId ||
    snapshot.providerReference?.providerId ||
    'manual';

  const min = runtime.currentEta.minMinutes ?? 0;
  const max = runtime.currentEta.maxMinutes ?? 0;
  const displayMins = (runtime.currentEta as any).displayMinutes ?? Math.round((min + max) / 2);
  const formatted = runtime.lifecyclePhase === 'DELIVERED'
    ? 'Delivered'
    : (runtime.currentEta as any).formattedDisplay ?? (min > 0 && max > 0 ? `${min}–${max} min` : 'Unavailable');

  return {
    eta: formatted,
    etaMinutes: displayMins,
    deliveryPartner: partner,
    trackingUrl: runtime.currentProvider?.trackingUrl || null,
    deliveryAssignedAt: runtime.currentProvider?.partnerAssignedAt || null,
  };
}
