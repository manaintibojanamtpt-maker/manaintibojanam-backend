/**
 * Required order-outbox subscribers, and the `order.placed` intake handler.
 *
 * Why this module exists
 * ---------------------
 * The dispatcher timer has always started with the server, but nothing ever
 * called `subscribeOrderOutbox` on the way to boot. The registry was therefore
 * empty in every real process: each pass scanned the pending events, found no
 * subscriber, logged `outbox.no_handler`, and moved on. The events stayed
 * `PENDING` (correct) but nothing consumed them (not correct), and because
 * `dispatched` stayed 0 even the summary log never fired — so the failure was
 * invisible in normal operation.
 *
 * Two things prevent a repeat:
 *
 *  1. `registerRequiredOrderOutboxHandlers` is called during boot, before the
 *     dispatch timer can tick, so the registry is never empty in a live process.
 *  2. `verifyOrderOutboxRegistration` throws when a required subscription is
 *     absent. A required event type with no handler is a deployment fault, not a
 *     backlog, so it fails the boot rather than accumulating silently.
 *
 * Handler names are constants, not derived from `handler.name`. The name is part
 * of the delivery-receipt id, so an incidental rename (a bundler, a refactor)
 * would silently re-run every handler against all history. Deriving it from
 * source text makes that a code review question; pinning it makes it a test.
 */

import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import {
  listOrderOutboxSubscriptions,
  subscribeOrderOutbox,
  type OrderOutboxEvent,
  type OrderOutboxHandler,
} from './orderOutboxDispatcher';
import {
  ORDER_LIFECYCLE_HANDLER_NAME,
  registerOrderLifecycleProjection,
} from './orderLifecycleProjection';
import { METRIC, logStructured, recordCounter } from './orderObservability';

/** Collection the `order.placed` intake ledger is written to. */
export const ORDER_INTAKE_COLLECTION = 'order_intake';

/**
 * Handler names. Part of the `outbox_receipts` document id, so these are a
 * durable contract: changing one re-delivers that handler over existing history.
 * Re-exported from the lifecycle module so both halves of the contract live next
 * to the handler they name.
 */
export const ORDER_INTAKE_HANDLER_NAME = 'order-intake-ledger';
export { ORDER_LIFECYCLE_HANDLER_NAME };

export interface RequiredOrderOutboxSubscription {
  eventType: string | '*';
  handlerName: string;
  /**
   * When true the dispatcher treats an absent handler for this event type as a
   * fault worth surfacing loudly, rather than as a type nobody consumes yet.
   */
  required: boolean;
}

/**
 * The subscriptions a running server must have.
 *
 * `order.placed` is required because an offline POS creates its order through
 * this path: if the intake ledger does not run, the order exists in `orders` but
 * nothing records that it originated from a queued offline command, and
 * unverified pricing is never surfaced for review.
 */
export const REQUIRED_ORDER_OUTBOX_SUBSCRIPTIONS: readonly RequiredOrderOutboxSubscription[] = [
  { eventType: 'order.placed', handlerName: ORDER_INTAKE_HANDLER_NAME, required: true },
  { eventType: '*', handlerName: ORDER_LIFECYCLE_HANDLER_NAME, required: true },
] as const;

/** Raised when a running server is missing a subscription it depends on. */
export class OrderOutboxRegistrationError extends Error {
  constructor(readonly missing: ReadonlyArray<{ eventType: string; handlerName: string }>) {
    super(
      `Order outbox handlers are not registered: ${missing
        .map((m) => `${m.handlerName} for '${m.eventType}'`)
        .join(', ')}. ` +
        'Events for these types would stay PENDING forever. Call registerRequiredOrderOutboxHandlers() during boot.'
    );
    this.name = 'OrderOutboxRegistrationError';
  }
}

/**
 * Record that an order was created by a client, so an offline-originated order is
 * distinguishable from one the platform created.
 *
 * This is the downstream state the `order.placed` path must produce. It is
 * keyed by the outbox event id, which is itself derived from the command, so a
 * duplicate delivery rewrites the same document with the same values instead of
 * appending a second intake row.
 *
 * `requiresPricingReview` is the durable surface for the unverified-pricing
 * policy: an order whose totals could not be confirmed against a published menu
 * price is created but marked here, and `holdsFulfillment` keeps it out of the
 * kitchen until a supervisor clears it.
 */
export const handleOrderPlaced: OrderOutboxHandler = async (
  db: Firestore,
  fieldValue: typeof FieldValue,
  event: OrderOutboxEvent
): Promise<void> => {
  const payload = event.payload ?? {};
  const orderId = String(payload.orderId ?? event.aggregateId ?? '');
  if (!orderId) {
    // Nothing to record. Throwing would dead-letter the event for a payload we
    // can never act on, so log and let the lifecycle projection proceed.
    logStructured('error', 'order_intake.missing_order_id', {
      correlationId: event.correlationId,
      eventId: event.eventId,
      tenantId: event.tenantId,
    });
    return;
  }

  const pricingSource = String(payload.pricingSource ?? 'unknown');
  const unverified = pricingSource !== 'menu';
  /**
   * Keyed by the outbox event id alone. That id is already tenant-scoped
   * (`{tenantId}__{commandId}`), so prefixing again would only produce a longer
   * key — and, more importantly, it stays stable if the event-id scheme ever
   * changes, which is what keeps a redelivery writing the same row.
   */
  const docId = event.eventId;

  await db
    .collection(ORDER_INTAKE_COLLECTION)
    .doc(docId)
    .set(
      {
        eventId: event.eventId,
        tenantId: event.tenantId,
        orderId,
        commandId: event.commandId ?? null,
        correlationId: event.correlationId ?? null,
        orderVersion: Number(payload.version ?? 0) || 0,
        pricingSource,
        requiresPricingReview: unverified,
        /**
         * An unverified price must not silently reach the kitchen. The order is
         * real and its payment is untouched, but fulfilment waits for a human.
         */
        holdsFulfillment: unverified,
        total: Number(payload.total ?? 0) || 0,
        occurredAt: event.occurredAt,
        deliveredAt: fieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  if (unverified) {
    recordCounter(METRIC.outboxDispatched, 1, { type: event.type, outcome: 'pricing_review' });
    logStructured('warn', 'order_intake.pricing_review_required', {
      correlationId: event.correlationId,
      eventId: event.eventId,
      tenantId: event.tenantId,
      orderId,
      pricingSource,
    });
  }
};

/**
 * Register every subscription the server depends on. Call once during boot,
 * before the dispatch timer is armed.
 *
 * Idempotent-safe by way of the dispatcher's own duplicate-name guard: calling
 * twice throws, which is the correct outcome for a boot-time registration (a
 * double call means the wiring is wrong and should be visible, not silently
 * tolerated).
 */
export const registerRequiredOrderOutboxHandlers = (): (() => void) => {
  const disposers: Array<() => void> = [];

  disposers.push(
    subscribeOrderOutbox('order.placed', handleOrderPlaced, ORDER_INTAKE_HANDLER_NAME)
  );
  disposers.push(registerOrderLifecycleProjection());

  return () => {
    for (const dispose of disposers) dispose();
  };
};

/**
 * Throws unless every required subscription is present.
 *
 * Call after registration and before the first dispatch. A missing handler must
 * stop the process rather than become a permanently growing `PENDING` backlog
 * that every 15-second pass walks and ignores.
 */
export const verifyOrderOutboxRegistration = (
  requirements: readonly RequiredOrderOutboxSubscription[] = REQUIRED_ORDER_OUTBOX_SUBSCRIPTIONS,
  list: () => ReadonlyArray<{ eventType: string; name: string }> = listOrderOutboxSubscriptions
): void => {
  const present = new Set(list().map((entry) => `${entry.eventType} ${entry.name}`));
  const missing = requirements
    .filter((requirement) => !present.has(`${requirement.eventType} ${requirement.handlerName}`))
    .map((requirement) => ({ eventType: requirement.eventType, handlerName: requirement.handlerName }));

  if (missing.length > 0) {
    logStructured('error', 'order_outbox.registration_incomplete', {
      missing: missing.map((m) => `${m.handlerName}@${m.eventType}`).join(','),
    });
    throw new OrderOutboxRegistrationError(missing);
  }

  logStructured('info', 'order_outbox.registration_verified', {
    subscriptions: requirements.length,
  });
};
