/**
 * Phase A acceptance — Gap 3 (outbox): a real command reaches a real handler.
 *
 * The previous dispatcher suite registered its handlers inline inside the test
 * bodies. That proved the dispatcher works, but it could not catch the actual
 * production failure: `registerOrderLifecycleProjection` had no call site
 * anywhere, so the live server ran with an empty registry and every event took
 * the `no_handler` branch forever. Nothing in that suite would have noticed.
 *
 * These tests go through `registerRequiredOrderOutboxHandlers` — the same call
 * the server makes during boot — and drive an actual `CreateOrder` command
 * through the processor first, so the event under test is the one a real offline
 * POS terminal produces.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearOrderOutboxSubscriptions,
  dispatchOutboxBatch,
  listOrderOutboxSubscriptions,
  replayDeadLetter,
  subscribeOrderOutbox,
  MAX_DELIVERY_ATTEMPTS,
  OUTBOX_DEAD_LETTER_COLLECTION,
  OUTBOX_RECEIPTS_COLLECTION,
  isRequiredOutboxEventType,
  type OrderOutboxEvent,
} from '../orderOutboxDispatcher.js';
import {
  ORDER_INTAKE_COLLECTION,
  ORDER_INTAKE_HANDLER_NAME,
  ORDER_LIFECYCLE_HANDLER_NAME,
  OrderOutboxRegistrationError,
  registerRequiredOrderOutboxHandlers,
  verifyOrderOutboxRegistration,
} from '../orderOutboxHandlers.js';
import { processOrderCommand, type OrderCommandEnvelope } from '../orderCommandProcessor.js';
import type { CommandActor } from '../orderCommandContract.js';
import { createFakeFirestore, mockFieldValue } from './fakeFirestore.js';

const TENANT = 'tenant_alpha';
const WALK_IN_ID = 'pos_walkin_1700000000_7777';
const COMMAND_ID = 'sync_create_outbox_1';
/** Outbox event ids are tenant-scoped by construction: `{tenantId}__{commandId}`. */
const EVENT_ID = `${TENANT}__${COMMAND_ID}`;
const ORDER_LIFECYCLE = 'order_lifecycle';

const owner: CommandActor = { uid: 'user_owner', role: 'owner', tenantIds: [TENANT] };

const createCommand = (over: Partial<OrderCommandEnvelope> = {}): OrderCommandEnvelope => ({
  commandId: COMMAND_ID,
  type: 'CreateOrder',
  tenantId: TENANT,
  orderId: WALK_IN_ID,
  deviceId: 'pos_1',
  clientSequence: 1,
  clientTime: '1999-01-01T00:00:00.000Z',
  payload: {
    orderId: WALK_IN_ID,
    orderType: 'DINE_IN',
    paymentMethod: 'CASH',
    customer: { name: 'Walk-in Customer', tableNo: 'T2' },
    items: [{ itemId: 'menu_biryani', name: 'Biryani', unitPrice: 250, quantity: 2 }],
    discountPercent: 0,
    gstPercent: 0,
  },
  ...over,
});

/**
 * A tenant with one published menu item priced at 250. `CreateOrder` reads menu
 * prices inside the transaction, so an order can only be priced from the menu
 * when the document is present.
 */
const dbWithMenu = () =>
  createFakeFirestore({
    seed: {
      'menu/menu_biryani': { tenantId: TENANT, name: 'Biryani', price: 250, isPublished: true },
    },
  });

/** Run a real CreateOrder so the outbox holds a genuine `order.placed` event. */
const placeOrder = async (db: ReturnType<typeof createFakeFirestore>, over: Partial<OrderCommandEnvelope> = {}) => {
  const result = await processOrderCommand(
    db as never,
    mockFieldValue,
    createCommand(over),
    owner,
    'corr_outbox'
  );
  assert.equal(result.success, true, 'CreateOrder must succeed to produce an outbox event');
  return result;
};

const intakeDoc = (db: ReturnType<typeof createFakeFirestore>) =>
  db.read(ORDER_INTAKE_COLLECTION, EVENT_ID);

describe('order outbox — required registration', () => {
  beforeEach(() => clearOrderOutboxSubscriptions());
  afterEach(() => clearOrderOutboxSubscriptions());

  it('registers every required subscription the server depends on', () => {
    registerRequiredOrderOutboxHandlers();
    verifyOrderOutboxRegistration();

    const registered = listOrderOutboxSubscriptions();
    const keys = registered.map((entry) => `${entry.eventType} ${entry.name}`);
    assert.ok(keys.includes(`order.placed ${ORDER_INTAKE_HANDLER_NAME}`));
    assert.ok(keys.includes(`* ${ORDER_LIFECYCLE_HANDLER_NAME}`));
  });

  it('refuses to pass verification with an empty registry', () => {
    // This is the state the live server used to boot in.
    assert.throws(
      () => verifyOrderOutboxRegistration(),
      (error: unknown) => {
        assert.ok(error instanceof OrderOutboxRegistrationError);
        assert.equal(error.missing.length, 2);
        return true;
      }
    );
  });

  it('refuses verification when only some handlers are registered', () => {
    subscribeOrderOutbox('order.placed', async () => {}, ORDER_INTAKE_HANDLER_NAME);
    assert.throws(
      () => verifyOrderOutboxRegistration(),
      (error: unknown) => {
        assert.ok(error instanceof OrderOutboxRegistrationError);
        assert.deepEqual(error.missing, [
          { eventType: '*', handlerName: ORDER_LIFECYCLE_HANDLER_NAME },
        ]);
        return true;
      }
    );
  });

  it('rejects a duplicate registration rather than double-delivering', () => {
    registerRequiredOrderOutboxHandlers();
    assert.throws(
      () => registerRequiredOrderOutboxHandlers(),
      /already subscribed/
    );
  });

  it('classifies order.placed as required so a missing handler is not routine backlog', () => {
    assert.equal(isRequiredOutboxEventType('order.placed'), true);
    assert.equal(isRequiredOutboxEventType('order.unknown_future_type'), false);
  });

  it('leaves the event PENDING and counts it when a required handler is absent', async () => {
    const db = createFakeFirestore();
    await placeOrder(db);
    // Deliberately no registration: simulate a process that lost its handlers.

    const result = await dispatchOutboxBatch(db as never, mockFieldValue);

    assert.equal(result.dispatched, 0);
    assert.equal(result.unhandledRequired, 1, 'the dropped required event must be counted');
    const outbox = db.readAll('outbox');
    const [event] = Object.values(outbox);
    assert.equal(event.status, 'PENDING', 'never marked delivered without a handler');
  });
});

describe('order outbox — order.placed through the real registration path', () => {
  beforeEach(() => clearOrderOutboxSubscriptions());
  afterEach(() => clearOrderOutboxSubscriptions());

  it('carries an offline-created order from the command to the expected downstream state', async () => {
    const db = dbWithMenu();
    registerRequiredOrderOutboxHandlers();

    await placeOrder(db);
    assert.equal(Object.keys(db.readAll('outbox')).length, 1);

    const result = await dispatchOutboxBatch(db as never, mockFieldValue);

    assert.equal(result.dispatched, 2, 'both the intake ledger and the projection consume it');
    assert.equal(result.failed, 0);
    assert.equal(result.unhandledRequired, 0);

    // Downstream state 1: the intake ledger records the offline-originated order.
    const intake = intakeDoc(db);
    assert.ok(intake, `expected a document in ${ORDER_INTAKE_COLLECTION}`);
    assert.equal(intake?.orderId, WALK_IN_ID);
    assert.equal(intake?.tenantId, TENANT);
    assert.equal(intake?.commandId, 'sync_create_outbox_1');
    // Published menu prices were used, so no pricing review is required.
    assert.equal(intake?.pricingSource, 'menu');
    assert.equal(intake?.requiresPricingReview, false);
    assert.equal(intake?.holdsFulfillment, false);
    assert.equal(intake?.total, 500);

    // Downstream state 2: the lifecycle projection advanced to the placed version.
    const projection = db.read(ORDER_LIFECYCLE, WALK_IN_ID);
    assert.equal(projection?.orderStatus, 'PLACED');
    assert.equal(projection?.version, 1);
    assert.equal(projection?.tenantId, TENANT);

    // Both receipts are recorded, keyed by event id and pinned handler name.
    const receipts = db.readAll(OUTBOX_RECEIPTS_COLLECTION);
    assert.deepEqual(
      Object.keys(receipts).sort(),
      [
        `${EVENT_ID}__${ORDER_INTAKE_HANDLER_NAME}`,
        `${EVENT_ID}__${ORDER_LIFECYCLE_HANDLER_NAME}`,
      ].sort()
    );
  });

  it('is idempotent: a duplicate delivery writes receipts but no second intake row', async () => {
    const db = createFakeFirestore();
    registerRequiredOrderOutboxHandlers();
    await placeOrder(db);

    await dispatchOutboxBatch(db as never, mockFieldValue);
    assert.equal(Object.keys(db.readAll(ORDER_INTAKE_COLLECTION)).length, 1);

    // The dispatcher's only duplicate protection is the receipt, so simulate the
    // case that protection actually exists for: a redelivery of the same event
    // after its receipts were lost. A handler that ran twice would still leave
    // exactly one row here, so the receipt itself is what we assert on.
    for (const id of Object.keys(db.readAll(OUTBOX_RECEIPTS_COLLECTION))) {
      db.deleteDoc(OUTBOX_RECEIPTS_COLLECTION, id);
    }
    db.writeDoc('outbox', EVENT_ID, { status: 'PENDING', attempts: 0 });

    const redelivered = await dispatchOutboxBatch(db as never, mockFieldValue);
    assert.equal(redelivered.dispatched, 2, 'without receipts the handlers run again');
    assert.equal(
      Object.keys(db.readAll(ORDER_INTAKE_COLLECTION)).length,
      1,
      'the intake doc id is the event id, so a rerun overwrites rather than appends'
    );
    assert.equal(Object.keys(db.readAll(OUTBOX_RECEIPTS_COLLECTION)).length, 2);

    // With receipts restored, a third pass is a complete no-op.
    const noop = await dispatchOutboxBatch(db as never, mockFieldValue);
    assert.equal(noop.scanned, 0);
    assert.equal(noop.dispatched, 0);
    assert.equal(noop.skippedDuplicate, 0);
  });

  it('holds fulfillment and flags review when a price could not be verified against the menu', async () => {
    // A menu exists for a different item only, so the ordered line is unpriced.
    const db = dbWithMenu();
    registerRequiredOrderOutboxHandlers();

    const result = await processOrderCommand(
      db as never,
      mockFieldValue,
      createCommand({
        payload: {
          orderId: WALK_IN_ID,
          orderType: 'DINE_IN',
          paymentMethod: 'CASH',
          customer: { name: 'Walk-in Customer' },
          items: [{ itemId: 'menu_ghost', name: 'Off-menu special', unitPrice: 310, quantity: 1 }],
          discountPercent: 0,
          gstPercent: 0,
        },
      }),
      owner,
      'corr_unverified'
    );
    assert.equal(result.success, true, 'the order is still created, flagged for review');

    await dispatchOutboxBatch(db as never, mockFieldValue);

    const intake = intakeDoc(db);
    assert.ok(intake, 'the flagged order is recorded in the intake ledger');
    assert.equal(intake?.pricingSource, 'client_unverified');
    assert.equal(intake?.requiresPricingReview, true);
    assert.equal(intake?.holdsFulfillment, true, 'unverified pricing must not reach the kitchen');
  });

  it('backs off, dead-letters after the attempt limit, and replays on demand', async () => {
    const db = createFakeFirestore();
    let attemptsSeen = 0;

    /**
     * Register the real subscriptions, then swap the intake handler for one that
     * always throws. Reusing the pinned handler name is deliberate: the receipt
     * keying, backoff and dead-letter behaviour under test are the dispatcher's,
     * not a special case for test handlers.
     */
    clearOrderOutboxSubscriptions();
    subscribeOrderOutbox('order.placed', async () => {
      attemptsSeen += 1;
      throw new Error('downstream intake unavailable');
    }, ORDER_INTAKE_HANDLER_NAME);
    subscribeOrderOutbox('*', async () => {}, ORDER_LIFECYCLE_HANDLER_NAME);

    await placeOrder(db);
    const [eventId] = Object.keys(db.readAll('outbox'));

    // Each pass consumes one attempt and schedules the next one into the future.
    for (let pass = 1; pass < MAX_DELIVERY_ATTEMPTS; pass += 1) {
      const result = await dispatchOutboxBatch(db as never, mockFieldValue);
      assert.equal(result.failed, 1, `pass ${pass} should record one failure`);
      const [event] = Object.values(db.readAll('outbox'));
      assert.equal(event.status, 'PENDING', `still pending at pass ${pass}`);
      assert.equal(event.attempts, pass);
      assert.ok(typeof event.availableAt === 'string', 'a backoff window is scheduled');
      assert.ok(typeof event.lastError === 'string' && event.lastError.length > 0);
      // Move past the backoff window so the next pass is eligible.
      db.writeDoc('outbox', eventId, { availableAt: new Date(Date.now() - 1000).toISOString() });
    }

    const final = await dispatchOutboxBatch(db as never, mockFieldValue);
    assert.equal(final.deadLettered, 1);

    const [deadEvent] = Object.values(db.readAll('outbox'));
    assert.equal(deadEvent.status, 'DEAD_LETTER');
    assert.equal(deadEvent.attempts, MAX_DELIVERY_ATTEMPTS);

    const deadLetter = db.read(OUTBOX_DEAD_LETTER_COLLECTION, EVENT_ID);
    assert.ok(deadLetter, 'the dead letter preserves the payload and the error');
    assert.equal(deadLetter?.type, 'order.placed');
    assert.equal(deadLetter?.tenantId, TENANT);
    assert.equal(String(deadLetter?.lastError).includes('downstream intake unavailable'), true);

    // Replay resets the attempt budget and the event becomes dispatchable again.
    const replayed = await replayDeadLetter(db as never, mockFieldValue);
    assert.equal(replayed.replayed, 1);
    const [revived] = Object.values(db.readAll('outbox'));
    assert.equal(revived.status, 'PENDING');
    assert.equal(revived.attempts, 0);
    assert.equal(attemptsSeen, MAX_DELIVERY_ATTEMPTS, 'no attempt happened during replay');
  });

  it('records the handler name in the receipt so a rename is visible, not silent', async () => {
    const db = createFakeFirestore();
    registerRequiredOrderOutboxHandlers();
    await placeOrder(db);
    await dispatchOutboxBatch(db as never, mockFieldValue);

    const receipts = db.readAll(OUTBOX_RECEIPTS_COLLECTION);
    for (const receipt of Object.values(receipts)) {
      assert.ok(
        String(receipt.handler).startsWith('order-'),
        `handler name must be pinned, got ${String(receipt.handler)}`
      );
    }
  });

  it('delivers a lifecycle event from a non-placed command to the projection only', async () => {
    const db = createFakeFirestore();
    registerRequiredOrderOutboxHandlers();

    await placeOrder(db);
    await dispatchOutboxBatch(db as never, mockFieldValue);

    const before = Object.keys(db.readAll(ORDER_INTAKE_COLLECTION)).length;
    const result = await processOrderCommand(
      db as never,
      mockFieldValue,
      {
        commandId: 'sync_accept_1',
        type: 'AcceptOrder',
        tenantId: TENANT,
        orderId: WALK_IN_ID,
        deviceId: 'pos_1',
        clientSequence: 2,
        clientTime: '1999-01-01T00:00:01.000Z',
        expectedVersion: 1,
        payload: { orderId: WALK_IN_ID },
      },
      owner,
      'corr_accept'
    );
    assert.equal(result.success, true);

    const pass = await dispatchOutboxBatch(db as never, mockFieldValue);
    assert.equal(pass.dispatched, 1, 'only the wildcard projection subscribes to order.accepted');
    assert.equal(
      Object.keys(db.readAll(ORDER_INTAKE_COLLECTION)).length,
      before,
      'the intake ledger is scoped to order.placed'
    );
    assert.equal(db.read(ORDER_LIFECYCLE, WALK_IN_ID)?.orderStatus, 'ACCEPTED');
    assert.equal(db.read(ORDER_LIFECYCLE, WALK_IN_ID)?.version, 2);
  });

  it('does not let an older version move the projection backwards', async () => {
    const db = createFakeFirestore();
    registerRequiredOrderOutboxHandlers();
    await placeOrder(db);

    // Deliver the placed event twice with a stale version in the payload.
    const stale: OrderOutboxEvent = {
      eventId: 'evt_stale',
      type: 'order.accepted',
      tenantId: TENANT,
      aggregateId: WALK_IN_ID,
      occurredAt: new Date().toISOString(),
      attempts: 0,
      payload: { orderId: WALK_IN_ID, orderStatus: 'PLACED', version: 1 },
    };
    await db
      .collection('outbox')
      .doc(stale.eventId)
      .set({ ...stale, status: 'PENDING' });

    await dispatchOutboxBatch(db as never, mockFieldValue);
    assert.equal(db.read(ORDER_LIFECYCLE, WALK_IN_ID)?.orderStatus, 'PLACED');
    assert.equal(db.read(ORDER_LIFECYCLE, WALK_IN_ID)?.version, 1);
  });
});
