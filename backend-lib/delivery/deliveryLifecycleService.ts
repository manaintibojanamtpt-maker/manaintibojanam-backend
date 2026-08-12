/**
 * Phase 5 — STEP 15: Delivery Lifecycle ETA Updates Service
 *
 * Orchestrates order status transitions for delivery intelligence orders.
 *
 * INVARIANTS:
 *  1. Exactly ONE authoritative ETA composition path: EtaEngine (via updateDeliveryRuntime).
 *  2. NO mutation of the immutable checkout snapshot (order.delivery).
 *  3. Updates target order.deliveryRuntime and legacy mirror fields.
 *  4. Strict tenant isolation (tenant A cannot modify tenant B orders).
 *  5. Rejects client-supplied fee, subsidy, projected cost, or distance overrides.
 */

import type { Firestore } from 'firebase-admin/firestore';
import {
  createDeliveryRuntime,
  updateDeliveryRuntime,
  toLegacyOrderDeliveryMirrors,
  type OrderDeliveryRuntime,
  type OrderLifecyclePhase,
  type RuntimeProviderInfo,
  type LegacyOrderDeliveryMirrors,
} from './deliveryRuntimeEngine.js';
import type { OrderDeliverySnapshot } from './deliverySnapshotModel.js';
import type { EtaLifecycleEvidence } from './etaEngine.js';

export interface TransitionDeliveryLifecycleParams {
  readonly db: Firestore;
  readonly tenantId: string;
  readonly orderId: string;
  readonly targetPhase: OrderLifecyclePhase;
  readonly newEvidence?: Partial<EtaLifecycleEvidence>;
  readonly providerInfo?: Partial<RuntimeProviderInfo>;
  readonly clock?: () => Date;
}

export interface TransitionDeliveryLifecycleResult {
  readonly success: boolean;
  readonly tenantId: string;
  readonly orderId: string;
  readonly previousPhase: OrderLifecyclePhase;
  readonly currentPhase: OrderLifecyclePhase;
  readonly runtime: OrderDeliveryRuntime;
  readonly legacyMirrors: LegacyOrderDeliveryMirrors;
}

/**
 * Normalizes string order status to canonical OrderLifecyclePhase.
 */
export function normalizeOrderLifecyclePhase(rawStatus: string): OrderLifecyclePhase {
  const upper = (rawStatus || '').trim().toUpperCase();
  if (['PENDING', 'CREATED', 'PLACED', 'PENDING_PAYMENT'].includes(upper)) return 'CREATED';
  if (upper === 'ACCEPTED' || upper === 'CONFIRMED') return 'ACCEPTED';
  if (upper === 'PREPARING' || upper === 'KITCHEN_PREPARING') return 'PREPARING';
  if (upper === 'READY_FOR_PICKUP' || upper === 'READY') return 'READY_FOR_PICKUP';
  if (['DISPATCHED', 'OUT_FOR_DELIVERY', 'PICKED_UP', 'IN_TRANSIT', 'COURIER_BOOKED'].includes(upper)) {
    return 'DISPATCHED';
  }
  if (upper === 'DELIVERED') return 'DELIVERED';
  if (['CANCELLED', 'REJECTED', 'EXPIRED', 'FAILED_DELIVERY'].includes(upper)) return 'CANCELLED';
  return 'CREATED';
}

/**
 * Transitions an order's delivery lifecycle operational state, recomputing ETA via EtaEngine
 * and updating order.deliveryRuntime and legacy mirrors in Firestore without mutating order.delivery.
 */
export async function transitionOrderDeliveryLifecycle(
  params: TransitionDeliveryLifecycleParams,
): Promise<TransitionDeliveryLifecycleResult> {
  const { db, tenantId, orderId, targetPhase, newEvidence, providerInfo, clock } = params;

  if (!tenantId || !orderId) {
    throw new Error('transitionOrderDeliveryLifecycle requires non-empty tenantId and orderId');
  }

  const orderRef = db.collection('tenants').doc(tenantId).collection('orders').doc(orderId);
  const doc = await orderRef.get();

  if (!doc.exists) {
    throw new Error(`Order '${orderId}' not found for tenant '${tenantId}'`);
  }

  const data = doc.data() as Record<string, unknown>;

  // Tenant isolation check
  const docTenantId = String(data.tenantId || tenantId);
  if (docTenantId !== tenantId) {
    throw new Error(`Tenant isolation violation: target tenant '${tenantId}' does not match order tenant '${docTenantId}'`);
  }

  // Ensure immutable snapshot exists
  const rawSnapshot = data.delivery as OrderDeliverySnapshot | undefined;
  if (!rawSnapshot || rawSnapshot.schemaVersion !== '1.0') {
    throw new Error(`Order '${orderId}' missing valid OrderDeliverySnapshot (order.delivery)`);
  }

  // Ensure current runtime exists (initialize from snapshot if missing)
  const currentRuntime = (data.deliveryRuntime as OrderDeliveryRuntime | undefined) || createDeliveryRuntime(rawSnapshot, {}, clock);

  const previousPhase = currentRuntime.lifecyclePhase;

  // Perform operational ETA recomputation via updateDeliveryRuntime -> EtaEngine
  const updatedRuntime = updateDeliveryRuntime({
    snapshot: rawSnapshot,
    currentRuntime,
    lifecyclePhase: targetPhase,
    newEvidence,
    providerInfo,
    clock,
  });

  // Derive legacy mirrors
  const legacyMirrors = toLegacyOrderDeliveryMirrors(rawSnapshot, updatedRuntime);

  // Atomic update to Firestore: writes runtime and legacy mirrors ONLY
  // order.delivery (snapshot) is preserved byte-for-byte / UNMUTATED
  await orderRef.update({
    deliveryRuntime: updatedRuntime,
    status: targetPhase,
    eta: legacyMirrors.eta,
    etaMinutes: legacyMirrors.etaMinutes,
    deliveryPartner: legacyMirrors.deliveryPartner,
    trackingUrl: legacyMirrors.trackingUrl,
    deliveryAssignedAt: legacyMirrors.deliveryAssignedAt,
    updatedAt: (clock ? clock() : new Date()).toISOString(),
  });

  return {
    success: true,
    tenantId,
    orderId,
    previousPhase,
    currentPhase: targetPhase,
    runtime: updatedRuntime,
    legacyMirrors,
  };
}
