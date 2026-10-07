/**
 * Phase A / E — Durable order outbox dispatcher.
 *
 * Consumes the `outbox` collection written atomically by the order Command API
 * and drives downstream projections / notifications.
 *
 * Guarantees:
 *  - At-least-once delivery. Handlers must be idempotent; the dispatcher
 *    records a receipt per (eventId, handler) so a duplicate delivery is a
 *    no-op rather than a repeated side effect.
 *  - Out-of-order tolerance. Handlers receive the aggregate version and are
 *    expected to ignore events older than what they have already applied.
 *  - Bounded retries with exponential backoff, then a dead-letter collection
 *    that operators can inspect and replay.
 *  - Lag metrics: `oldestPendingAgeMs` and per-batch dispatch counts.
 */

import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import { METRIC, logStructured, recordCounter, recordValue } from './orderObservability';

export const OUTBOX_COLLECTION = 'outbox';
export const OUTBOX_RECEIPTS_COLLECTION = 'outbox_receipts';
export const OUTBOX_DEAD_LETTER_COLLECTION = 'outbox_dead_letter';
export const REBUILD_JOBS_COLLECTION = 'rebuild_jobs';

export const MAX_DELIVERY_ATTEMPTS = 8;
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 15 * 60_000;

export interface OrderOutboxEvent {
  eventId: string;
  type: string;
  tenantId: string;
  aggregateId: string;
  commandId?: string;
  correlationId?: string;
  occurredAt: string;
  /** Earliest time this event may be attempted again after a failed delivery. */
  availableAt?: string;
  attempts: number;
  payload: Record<string, unknown>;
}

export type OrderOutboxHandler = (
  db: Firestore,
  fieldValue: typeof FieldValue,
  event: OrderOutboxEvent
) => Promise<void>;

/**
 * A subscriber plus the identity used for its delivery receipt.
 *
 * The name is part of the dedupe key, so it must be explicit and unique per
 * event type: two anonymous handlers would otherwise share one receipt id and
 * the second subscriber would be skipped forever as a "duplicate" of the first.
 */
export interface OrderOutboxSubscription {
  name: string;
  handler: OrderOutboxHandler;
}

const handlers = new Map<string, OrderOutboxSubscription[]>();

export const subscribeOrderOutbox = (
  eventType: string | '*',
  handler: OrderOutboxHandler,
  name?: string
): (() => void) => {
  const resolvedName = String(name ?? handler.name ?? '').trim();
  if (!resolvedName) {
    throw new Error(
      `subscribeOrderOutbox('${eventType}') requires a handler name: the delivery receipt is keyed by it.`
    );
  }
  const subscription: OrderOutboxSubscription = { name: resolvedName, handler };
  const list = handlers.get(eventType) ?? [];
  if (list.some((entry) => entry.name === resolvedName)) {
    throw new Error(
      `A handler named '${resolvedName}' is already subscribed to '${eventType}'. Receipt ids would collide.`
    );
  }
  list.push(subscription);
  handlers.set(eventType, list);
  return () => {
    handlers.set(eventType, (handlers.get(eventType) ?? []).filter((entry) => entry !== subscription));
  };
};

export const clearOrderOutboxSubscriptions = (): void => {
  handlers.clear();
};

/**
 * Current registry contents.
 *
 * Boot-time verification needs to assert that a handler is actually registered
 * rather than assume the registration call succeeded. Reading the map directly
 * is the only way to tell "registered" from "registered under a different name
 * because a bundler renamed the function".
 */
export const listOrderOutboxSubscriptions = (): Array<{ eventType: string; name: string }> => {
  const out: Array<{ eventType: string; name: string }> = [];
  for (const [eventType, list] of handlers) {
    for (const entry of list) out.push({ eventType, name: entry.name });
  }
  return out;
};

/** True when at least one handler is subscribed for the given type or the wildcard. */
export const hasOrderOutboxHandler = (eventType: string): boolean => handlersFor(eventType).length > 0;

/**
 * Event types the server declares a hard dependency on.
 *
 * Kept here rather than imported from `orderOutboxHandlers` so the dispatcher
 * has no dependency on its own subscribers: that module imports this one, and a
 * reverse import would be a cycle.
 */
const REQUIRED_OUTBOX_EVENT_TYPES = new Set<string>(['order.placed']);

export const isRequiredOutboxEventType = (eventType: string): boolean =>
  REQUIRED_OUTBOX_EVENT_TYPES.has(eventType);

/** Lets a boot check assert the dispatcher and the subscriber module agree. */
export const listRequiredOutboxEventTypes = (): string[] => [...REQUIRED_OUTBOX_EVENT_TYPES];

const handlersFor = (eventType: string): OrderOutboxSubscription[] => [
  ...(handlers.get(eventType) ?? []),
  ...(handlers.get('*') ?? []),
];

/**
 * Exponential backoff with full jitter, bounded by MAX_BACKOFF_MS.
 * Exported so the dispatcher and its tests share one implementation.
 */
export const nextAttemptDelayMs = (attempts: number, random = Math.random): number => {
  const exponential = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1));
  // Full jitter avoids synchronized retry storms across tenants.
  return Math.round(exponential * (0.5 + 0.5 * random()));
};

export const isEventReady = (
  event: { attempts?: number; availableAt?: unknown },
  nowMs: number
): boolean => {
  if (typeof event.availableAt !== 'string') return true;
  const available = Date.parse(event.availableAt);
  return Number.isFinite(available) ? available <= nowMs : true;
};

/**
 * Receipt id makes handler execution idempotent across duplicate deliveries.
 * Keyed by event + handler name so adding a new subscriber reprocesses history.
 */
export const receiptId = (eventId: string, handlerName: string): string =>
  `${eventId}__${handlerName}`;

export interface DispatchBatchResult {
  scanned: number;
  dispatched: number;
  skippedDuplicate: number;
  failed: number;
  deadLettered: number;
  oldestPendingAgeMs: number;
  /**
   * Pending events whose type is declared required but had no subscriber this
   * pass. Non-zero means the registry lost a handler the server depends on.
   */
  unhandledRequired: number;
}

const toEvent = (docId: string, data: Record<string, unknown>): OrderOutboxEvent => ({
  eventId: String(data.eventId ?? docId),
  type: String(data.type ?? 'unknown'),
  tenantId: String(data.tenantId ?? ''),
  aggregateId: String(data.aggregateId ?? ''),
  commandId: typeof data.commandId === 'string' ? data.commandId : undefined,
  correlationId: typeof data.correlationId === 'string' ? data.correlationId : undefined,
  occurredAt: String(data.occurredAt ?? new Date(0).toISOString()),
  /**
   * `availableAt` carries the backoff window written after a failed attempt. It
   * has to survive the mapping: without it every pass treats a backed-off event
   * as ready and the retry storm the backoff exists to prevent happens anyway.
   */
  availableAt: typeof data.availableAt === 'string' ? data.availableAt : undefined,
  attempts: Number(data.attempts ?? 0) || 0,
  payload: (data.payload as Record<string, unknown>) ?? {},
});

/**
 * Dispatch a single batch. Safe to call concurrently on separate shards only if
 * `runAtMostOnce` guards are respected; callers normally run one timer.
 */
export const dispatchOutboxBatch = async (
  db: Firestore,
  fieldValue: typeof FieldValue,
  limit = 50
): Promise<DispatchBatchResult> => {
  const now = new Date();
  const nowMs = now.getTime();
  const result: DispatchBatchResult = {
    scanned: 0,
    dispatched: 0,
    skippedDuplicate: 0,
    failed: 0,
    deadLettered: 0,
    oldestPendingAgeMs: 0,
    unhandledRequired: 0,
  };

  const pending = await db
    .collection(OUTBOX_COLLECTION)
    .where('status', '==', 'PENDING')
    .orderBy('occurredAt', 'asc')
    .limit(limit)
    .get();

  result.scanned = pending.size;
  if (pending.empty) return result;

  const ages = pending.docs
    .map((doc) => nowMs - Date.parse(String(doc.data().occurredAt ?? '')))
    .filter((age) => Number.isFinite(age) && age >= 0);
  result.oldestPendingAgeMs = ages.length ? Math.max(...ages) : 0;
  recordValue(METRIC.outboxLag, result.oldestPendingAgeMs);

  for (const doc of pending.docs) {
    const event = toEvent(doc.id, doc.data() as Record<string, unknown>);
    if (!isEventReady(event, nowMs)) continue;

    const subscribers = handlersFor(event.type);
    if (subscribers.length === 0) {
      /**
       * Nothing consumes this type. The event stays PENDING and is never marked
       * delivered, which is the important part: a silently-dropped order event
       * reads as "processed" everywhere downstream.
       *
       * A *required* type with no subscriber is different in kind. It means the
       * process is running without a handler it depends on, so it is logged as
       * an error and counted separately rather than as routine backlog.
       * Boot-time `verifyOrderOutboxRegistration` is the real guard; this is the
       * signal that makes the condition visible if it is ever reached.
       */
      const isRequired = isRequiredOutboxEventType(event.type);
      logStructured(isRequired ? 'error' : 'warn', 'outbox.no_handler', {
        correlationId: event.correlationId,
        eventId: event.eventId,
        type: event.type,
        required: isRequired,
      });
      if (isRequired) result.unhandledRequired += 1;
      continue;
    }

    let failedForEvent = false;
    let failureMessage: string | null = null;
    for (const { name, handler } of subscribers) {
      const receiptRef = db.collection(OUTBOX_RECEIPTS_COLLECTION).doc(receiptId(event.eventId, name));
      const receipt = await receiptRef.get();
      if (receipt.exists) {
        result.skippedDuplicate += 1;
        continue;
      }
      try {
        await handler(db, fieldValue, event);
        await receiptRef.set(
          {
            eventId: event.eventId,
            handler: name,
            type: event.type,
            tenantId: event.tenantId,
            aggregateId: event.aggregateId,
            processedAt: now.toISOString(),
            createdAt: fieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        result.dispatched += 1;
        recordCounter(METRIC.outboxDispatched, 1, { type: event.type });
      } catch (error: unknown) {
        failedForEvent = true;
        result.failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        failureMessage = message;
        logStructured('error', 'outbox.handler_failed', {
          correlationId: event.correlationId,
          eventId: event.eventId,
          type: event.type,
          handler: name,
          attempt: event.attempts + 1,
          error: message,
        });
        break; // Remaining handlers will also see an unprocessed event.
      }
    }

    if (failedForEvent) {
      const attempts = event.attempts + 1;
      /**
       * The most recent handler error is carried forward. Without it a
       * dead-lettered event is a payload with no explanation, and the operator
       * replaying it has to guess what was broken downstream.
       */
      const lastError = failureMessage ?? 'handler failed';
      if (attempts >= MAX_DELIVERY_ATTEMPTS) {
        await doc.ref.set(
          {
            status: 'DEAD_LETTER',
            attempts,
            deadLetteredAt: now.toISOString(),
            lastError,
          },
          { merge: true }
        );
        await db.collection(OUTBOX_DEAD_LETTER_COLLECTION).doc(event.eventId).set(
          {
            eventId: event.eventId,
            type: event.type,
            tenantId: event.tenantId,
            aggregateId: event.aggregateId,
            commandId: event.commandId ?? null,
            correlationId: event.correlationId ?? null,
            attempts,
            payload: event.payload,
            occurredAt: event.occurredAt,
            lastError,
            deadLetteredAt: now.toISOString(),
            createdAt: fieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        result.deadLettered += 1;
        recordCounter(METRIC.outboxDeadLettered, 1, { type: event.type });
      } else {
        await doc.ref.set(
          {
            attempts,
            lastAttemptAt: now.toISOString(),
            availableAt: new Date(nowMs + nextAttemptDelayMs(attempts)).toISOString(),
            lastError,
          },
          { merge: true }
        );
      }
      continue;
    }

    await doc.ref.set(
      {
        status: 'DISPATCHED',
        attempts: event.attempts + 1,
        dispatchedAt: now.toISOString(),
      },
      { merge: true }
    );
    recordValue(METRIC.lifecyclePropagation, nowMs - Date.parse(event.occurredAt), {
      type: event.type,
    });
  }

  return result;
};

/**
 * Replay dead-lettered events. Operators use this after fixing a downstream
 * dependency; receipts are preserved so already-applied handlers stay skipped.
 */
export const replayDeadLetter = async (
  db: Firestore,
  fieldValue: typeof FieldValue,
  options: { limit?: number; eventIds?: string[] } = {}
): Promise<{ replayed: number }> => {
  const limit = Math.min(options.limit ?? 100, 500);
  const query = db.collection(OUTBOX_DEAD_LETTER_COLLECTION).orderBy('deadLetteredAt', 'asc').limit(limit);
  const snapshot = await query.get();
  const wanted = options.eventIds ? new Set(options.eventIds) : null;
  let replayed = 0;

  for (const doc of snapshot.docs) {
    const eventId = doc.id;
    if (wanted && !wanted.has(eventId)) continue;
    await db.collection(OUTBOX_COLLECTION).doc(eventId).set(
      {
        status: 'PENDING',
        attempts: 0,
        availableAt: null,
        replayedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    await doc.ref.set({ resolvedAt: new Date().toISOString(), resolvedBy: 'replayDeadLetter' }, { merge: true });
    replayed += 1;
  }

  logStructured('info', 'outbox.dead_letter_replayed', { replayed, createdAt: undefined });
  void fieldValue;
  return { replayed };
};

/**
 * Rebuild projection from authoritative orders. Documented source of truth is
 * `orders`; every read is stamped with the order version so the projection can
 * be compared against the source after a rebuild.
 *
 * When `FF_ORDER_LIFECYCLE_BACKFILL_PROTECTION` is enabled, the rebuild will
 * not overwrite a projection that has been updated by live events after the
 * backfill started (based on the projection's `updatedAt` timestamp).
 */
export const rebuildOrderProjection = async (
  db: Firestore,
  fieldValue: typeof FieldValue,
  target: string,
  options: { tenantId?: string; batchSize?: number; limit?: number; resumeJobId?: string } = {}
): Promise<{ written: number; scanned: number; jobId: string }> => {
  const batchSize = Math.min(options.batchSize ?? 400, 500);
  const hardLimit = options.limit ?? Number.MAX_SAFE_INTEGER;
  const nowIso = new Date().toISOString();

  let resumeJob: { id: string; cursor: string; status: string } | null = null;
  if (options.resumeJobId) {
    const jobDoc = await db.collection(REBUILD_JOBS_COLLECTION).doc(options.resumeJobId).get();
    if (jobDoc.exists) {
      const data = jobDoc.data() as Record<string, unknown>;
      if (String(data.target ?? '') === target && String(data.tenantId ?? '') === (options.tenantId ?? '')) {
        resumeJob = {
          id: jobDoc.id,
          cursor: String(data.cursor ?? ''),
          status: String(data.status ?? ''),
        };
      }
    }
  }

  const jobId = resumeJob?.id ?? `rebuild_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const jobRef = db.collection(REBUILD_JOBS_COLLECTION).doc(jobId);

  if (!resumeJob) {
    await jobRef.set({
      target,
      tenantId: options.tenantId ?? null,
      schemaVersion: 1,
      backfillStartTime: Date.now(),
      status: 'running',
      cursor: '',
      scanned: 0,
      written: 0,
      protectedSkipped: 0,
      startedAt: nowIso,
      completedAt: null,
    });
  } else if (resumeJob.status === 'completed') {
    logStructured('info', 'projection.rebuild.already_completed', { jobId, target, written: resumeJob.cursor });
    return { written: 0, scanned: 0, jobId };
  }

  const workerId = `worker_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const claimed = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(jobRef);
    if (!snap.exists) return false;
    const data = snap.data() as Record<string, unknown>;
    if (String(data.status ?? '') === 'completed') return false;
    if (String(data.workerId ?? '') && String(data.workerId ?? '') !== workerId) return false;
    transaction.update(jobRef, {
      workerId,
      heartbeatAt: new Date().toISOString(),
    });
    return true;
  });

  if (!claimed) {
    logStructured('warn', 'projection.rebuild.job_claimed', { jobId });
    return { written: 0, scanned: 0, jobId };
  }

  let lastDocId: string | null = resumeJob?.cursor || null;
  let scanned = resumeJob ? Number(resumeJob.scanned ?? 0) : 0;
  let written = resumeJob ? Number(resumeJob.written ?? 0) : 0;
  let protectedSkipped = resumeJob ? Number(resumeJob.protectedSkipped ?? 0) : 0;

  const backfillProtectionEnabled = (() => {
    const raw = (process.env.FF_ORDER_LIFECYCLE_BACKFILL_PROTECTION ?? '').trim().toLowerCase();
    return raw === '1' || raw === 'true' || raw === 'on' || raw === 'enabled';
  })();

  const backfillStartTime = Date.now();

  for (;;) {
    let query = db.collection('orders').orderBy('__name__').limit(batchSize);
    if (options.tenantId) query = query.where('tenantId', '==', options.tenantId) as typeof query;
    if (lastDocId) query = query.startAfter(lastDocId) as typeof query;
    const page = await query.get();
    if (page.empty) break;

    const batch = db.batch();
    let batchCount = 0;
    for (const doc of page.docs) {
      lastDocId = doc.id;
      scanned += 1;
      if (scanned > hardLimit) break;

      const data = doc.data() as Record<string, unknown>;
      const targetRef = db.collection(target).doc(doc.id);

      if (backfillProtectionEnabled) {
        await db.runTransaction(async (transaction) => {
          const existingProj = await transaction.get(targetRef);
          if (existingProj.exists) {
            const existingUpdatedAt = existingProj.get('updatedAt');
            if (existingUpdatedAt) {
              const existingTime =
                existingUpdatedAt instanceof Date
                  ? existingUpdatedAt.getTime()
                  : Date.parse(String(existingUpdatedAt));
              if (Number.isFinite(existingTime) && existingTime > backfillStartTime) {
                protectedSkipped += 1;
                return;
              }
            }
          }
          transaction.set(
            targetRef,
            {
              orderId: doc.id,
              tenantId: data.tenantId ?? data.restaurantId ?? null,
              orderStatus: data.orderStatus ?? data.status ?? null,
              paymentStatus: data.paymentStatus ?? null,
              version: Number(data.version ?? 1) || 1,
              totalAmount:
                Number(data.totalAmount ?? (data.pricing as Record<string, unknown>)?.total ?? 0) || 0,
              rebuiltAt: new Date().toISOString(),
              source: 'orders',
              createdAt: fieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          written += 1;
        });
        continue;
      }

      batch.set(
        targetRef,
        {
          orderId: doc.id,
          tenantId: data.tenantId ?? data.restaurantId ?? null,
          orderStatus: data.orderStatus ?? data.status ?? null,
          paymentStatus: data.paymentStatus ?? null,
          version: Number(data.version ?? 1) || 1,
          totalAmount:
            Number(data.totalAmount ?? (data.pricing as Record<string, unknown>)?.total ?? 0) || 0,
          rebuiltAt: new Date().toISOString(),
          source: 'orders',
          createdAt: fieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      batchCount += 1;
    }
    if (batchCount > 0) {
      await batch.commit();
      written += batchCount;
    }

    await jobRef.set({
      status: 'running',
      cursor: lastDocId || '',
      scanned,
      written,
      protectedSkipped,
      heartbeatAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    if (page.size < batchSize || scanned > hardLimit) break;
  }

  await jobRef.set({
    status: 'completed',
    cursor: lastDocId || '',
    scanned,
    written,
    protectedSkipped,
    completedAt: new Date().toISOString(),
  }, { merge: true });

  logStructured('info', 'projection.rebuilt', { target, written, scanned, protectedSkipped, jobId });
  return { written, scanned, jobId };
};