/**
 * Phase B groundwork (activated behind flags) — order lifecycle projection.
 *
 * Reads are served from `order_lifecycle/{orderId}` instead of the hot `orders`
 * collection once `FF_ORDER_LIFECYCLE_PROJECTION_READS` is enabled. The
 * authoritative source remains `orders`; this projection can be rebuilt with
 * `rebuildOrderProjection`.
 *
 * Shadow reads (`FF_ORDER_LIFECYCLE_SHADOW_READS`): when enabled, reads from
 * the projection are compared against the authoritative `orders` collection,
 * and semantic mismatches plus projection lag are recorded as metrics.
 *
 * Backfill protection (`FF_ORDER_LIFECYCLE_BACKFILL_PROTECTION`): when enabled,
 * `rebuildOrderProjection` will not overwrite a projection that has been
 * updated by live events after the backfill started.
 *
 * Consumer guarantees:
 *  - Idempotent: the receipt in the dispatcher plus a version comparison means a
 *    duplicate or out-of-order delivery never moves the projection backwards.
 */

import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import { subscribeOrderOutbox, type OrderOutboxEvent } from './orderOutboxDispatcher';
import { METRIC, logStructured, recordCounter, recordValue } from './orderObservability';

export const ORDER_LIFECYCLE_COLLECTION = 'order_lifecycle';

const isProjectionReadsEnabled = (): boolean => {
  const raw = (process.env.FF_ORDER_LIFECYCLE_PROJECTION_READS ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'on' || raw === 'enabled';
};

const isShadowReadsEnabled = (): boolean => {
  const raw = (process.env.FF_ORDER_LIFECYCLE_SHADOW_READS ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'on' || raw === 'enabled';
};

const isBackfillProtectionEnabled = (): boolean => {
  const raw = (process.env.FF_ORDER_LIFECYCLE_BACKFILL_PROTECTION ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'on' || raw === 'enabled';
};

export const applyLifecycleEvent = async (
  db: Firestore,
  fieldValue: typeof FieldValue,
  event: OrderOutboxEvent
): Promise<void> => {
  const payload = event.payload ?? {};
  const orderId = String(payload.orderId ?? event.aggregateId ?? '');
  if (!orderId) return;

  const eventVersion = Number(payload.version ?? 0) || 0;
  const projectionRef = db.collection(ORDER_LIFECYCLE_COLLECTION).doc(orderId);

  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(projectionRef);
    const existingVersion = existing.exists ? Number(existing.get('version') ?? 0) || 0 : 0;

    if (eventVersion > 0 && existingVersion >= eventVersion) {
      recordCounter('order_lifecycle_projection_stale_total', 1, { type: event.type });
      return;
    }

    transaction.set(
      projectionRef,
      {
        orderId,
        tenantId: event.tenantId,
        orderStatus: payload.orderStatus ?? null,
        paymentStatus: payload.paymentStatus ?? null,
        commandType: payload.commandType ?? null,
        version: eventVersion || existingVersion || 1,
        correlationId: event.correlationId ?? null,
        commandId: event.commandId ?? null,
        lastEventId: event.eventId,
        lastEventType: event.type,
        occurredAt: event.occurredAt,
        updatedAt: fieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  recordValue(METRIC.projectionLag, Date.now() - Date.parse(event.occurredAt), { type: event.type });
  logStructured('info', 'order_lifecycle.projected', {
    correlationId: event.correlationId,
    orderId,
    tenantId: event.tenantId,
    eventId: event.eventId,
    type: event.type,
    version: eventVersion,
  });
};

/**
 * Shadow read: compares a projected read against the authoritative order state.
 * Records semantic mismatch and lag metrics when `FF_ORDER_LIFECYCLE_SHADOW_READS` is enabled.
 * Returns the authoritative data (source of truth) to the caller.
 */
export const shadowReadOrder = async (
  db: Firestore,
  orderId: string,
  tenantId: string
): Promise<{ data: Record<string, unknown> | null; fromProjection: boolean }> => {
  if (!isShadowReadsEnabled()) {
    // Shadow reads disabled: read directly from authoritative source
    const doc = await db.collection('orders').doc(orderId).get();
    return { data: doc.exists ? doc.data() ?? null : null, fromProjection: false };
  }

  const [sourceSnap, projSnap] = await Promise.all([
    db.collection('orders').doc(orderId).get(),
    db.collection(ORDER_LIFECYCLE_COLLECTION).doc(orderId).get(),
  ]);

  const sourceData = sourceSnap.exists ? (sourceSnap.data() as Record<string, unknown>) : null;
  const projData = projSnap.exists ? (projSnap.data() as Record<string, unknown>) : null;

  // Record lag metric: how far behind the projection is
  if (projData && typeof projData.occurredAt === 'string') {
    const lagMs = Date.now() - Date.parse(projData.occurredAt);
    if (Number.isFinite(lagMs) && lagMs >= 0) {
      recordValue(METRIC.projectionShadowLag, lagMs, { tenantId });
    }
  }

  // Record semantic mismatch metrics
  if (sourceData && projData) {
    const sourceStatus = String(sourceData.orderStatus ?? sourceData.status ?? '');
    const sourceVersion = Number(sourceData.version ?? 1) || 1;
    const projStatus = String(projData.orderStatus ?? '');
    const projVersion = Number(projData.version ?? 1) || 1;

    if (sourceStatus !== projStatus) {
      recordCounter('order_lifecycle_shadow_mismatch_total', 1, {
        tenantId,
        reason: 'status_mismatch',
        source: sourceStatus,
        projection: projStatus,
      });
    } else if (sourceVersion !== projVersion) {
      recordCounter('order_lifecycle_shadow_mismatch_total', 1, {
        tenantId,
        reason: 'version_mismatch',
        source: String(sourceVersion),
        projection: String(projVersion),
      });
    }
  }

  // Return authoritative data (source of truth) to caller
  return { data: sourceData, fromProjection: false };
};

/**
 * Read order from projection when reads are enabled, otherwise from authoritative source.
 * Used by the read path when `FF_ORDER_LIFECYCLE_PROJECTION_READS` is enabled.
 */
export const readOrderLifecycle = async (
  db: Firestore,
  orderId: string,
  tenantId: string
): Promise<Record<string, unknown> | null> => {
  if (!isProjectionReadsEnabled()) {
    const doc = await db.collection('orders').doc(orderId).get();
    return doc.exists ? doc.data() ?? null : null;
  }

  const projDoc = await db.collection(ORDER_LIFECYCLE_COLLECTION).doc(orderId).get();
  if (!projDoc.exists) {
    // Fallback to authoritative source if projection is missing
    const sourceDoc = await db.collection('orders').doc(orderId).get();
    return sourceDoc.exists ? sourceDoc.data() ?? null : null;
  }
  return projDoc.data() ?? null;
};

/**
 * Registration name. Pinned rather than derived from `applyLifecycleEvent.name`
 * because this string is half of the `outbox_receipts` document id: if a bundler
 * or refactor changed the function name, every historical event would be
 * re-projected with no visible error. Required registration verification checks
 * for exactly this value.
 */
export const ORDER_LIFECYCLE_HANDLER_NAME = 'order-lifecycle-projection';

/**
 * Register the lifecycle projection consumer.
 *
 * Passing an explicit name also makes a duplicate registration throw (the
 * dispatcher's receipt-collision guard), so a double call is a loud boot fault
 * rather than two handlers racing on the same document.
 */
export const registerOrderLifecycleProjection = (): (() => void) =>
  subscribeOrderOutbox('*', applyLifecycleEvent, ORDER_LIFECYCLE_HANDLER_NAME);

/**
 * Compare a projected read against authoritative order state. Used before and
 * after enabling projection reads to prove equivalence.
 */
export const verifyProjectionParity = async (
  db: Firestore,
  options: { limit?: number; tenantId?: string } = {}
): Promise<{ checked: number; mismatches: number; details: Array<Record<string, unknown>> }> => {
  const limit = Math.min(options.limit ?? 200, 1000);
  let query = db.collection('orders').orderBy('__name__').limit(limit);
  if (options.tenantId) query = query.where('tenantId', '==', options.tenantId) as typeof query;
  const snapshot = await query.get();

  const mismatches: Array<Record<string, unknown>> = [];
  for (const doc of snapshot.docs) {
    const projected = await db.collection(ORDER_LIFECYCLE_COLLECTION).doc(doc.id).get();
    if (!projected.exists) {
      mismatches.push({ orderId: doc.id, reason: 'missing_projection' });
      continue;
    }
    const source = doc.data() as Record<string, unknown>;
    const target = projected.data() as Record<string, unknown>;
    const sourceStatus = String(source.orderStatus ?? source.status ?? '');
    const sourceVersion = Number(source.version ?? 1) || 1;
    if (sourceStatus !== String(target.orderStatus ?? '')) {
      mismatches.push({
        orderId: doc.id,
        reason: 'status_mismatch',
        source: sourceStatus,
        projection: target.orderStatus ?? null,
      });
    } else if (sourceVersion !== (Number(target.version ?? 1) || 1)) {
      mismatches.push({
        orderId: doc.id,
        reason: 'version_mismatch',
        source: sourceVersion,
        projection: target.version ?? null,
      });
    }
  }

  logStructured('info', 'order_lifecycle.parity_checked', {
    checked: snapshot.size,
    mismatches: mismatches.length,
    projectionReadsEnabled: isProjectionReadsEnabled(),
  });
  return { checked: snapshot.size, mismatches: mismatches.length, details: mismatches };
};

export { isProjectionReadsEnabled, isShadowReadsEnabled, isBackfillProtectionEnabled };