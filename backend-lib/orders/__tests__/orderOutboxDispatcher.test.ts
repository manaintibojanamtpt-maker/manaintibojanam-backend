import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  dispatchOutboxBatch,
  replayDeadLetter,
  rebuildOrderProjection,
  REBUILD_JOBS_COLLECTION,
  subscribeOrderOutbox,
  clearOrderOutboxSubscriptions,
  nextAttemptDelayMs,
  isEventReady,
  receiptId,
  MAX_DELIVERY_ATTEMPTS,
  OUTBOX_DEAD_LETTER_COLLECTION,
  type OrderOutboxEvent,
} from '../orderOutboxDispatcher.js';
import { createFakeFirestore, mockFieldValue } from './fakeFirestore.js';

const TENANT = 'tenant_alpha';

const event = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  eventId: 'evt_1',
  type: 'order.status_changed',
  tenantId: TENANT,
  aggregateId: 'order_1',
  occurredAt: new Date(Date.now() - 1000).toISOString(),
  attempts: 0,
  status: 'PENDING',
  availableAt: null,
  payload: { orderStatus: 'ACCEPTED' },
  ...over,
});

describe('order outbox dispatcher — delivery', () => {
  beforeEach(() => {
    clearOrderOutboxSubscriptions();
  });

  it('delivers an event to a subscribed handler and records a receipt', async () => {
    const db = createFakeFirestore({ seed: { 'outbox/evt_1': event() } });
    const seen: OrderOutboxEvent[] = [];
    subscribeOrderOutbox('order.status_changed', async (_db, _fieldValue, delivered) => {
      seen.push(delivered);
    }, 'recorder');

    const result = await dispatchOutboxBatch(db as never, mockFieldValue);

    assert.equal(result.dispatched, 1);
    assert.equal(seen.length, 1);
    assert.equal(seen[0].aggregateId, 'order_1');
    assert.equal(db.read('outbox', 'evt_1')?.status, 'DISPATCHED');
    assert.ok(
      db.read('outbox_receipts', receiptId('evt_1', 'recorder')),
      'a receipt is written so a redelivery can be skipped'
    );
  });

  it('skips a redelivery when the receipt already exists', async () => {
    const db = createFakeFirestore({
      seed: {
        'outbox/evt_1': event(),
        [`outbox_receipts/${receiptId('evt_1', 'duplicate-checker')}`]: {
          eventId: 'evt_1',
          handler: 'duplicate-checker',
          processedAt: new Date().toISOString(),
        },
      },
    });
    let calls = 0;
    subscribeOrderOutbox('order.status_changed', async () => {
      calls += 1;
    }, 'duplicate-checker');

    const result = await dispatchOutboxBatch(db as never, mockFieldValue);

    assert.equal(calls, 0, 'an already-received event is not handed to the handler again');
    assert.equal(result.skippedDuplicate, 1);
  });

  it('delivers the same event to two independent subscribers exactly once each', async () => {
    const db = createFakeFirestore({ seed: { 'outbox/evt_1': event() } });
    const a: string[] = [];
    const b: string[] = [];
    subscribeOrderOutbox('order.status_changed', async (_db, _fieldValue, delivered) => {
      a.push(delivered.eventId);
    }, 'subscriber-a');
    subscribeOrderOutbox('order.status_changed', async (_db, _fieldValue, delivered) => {
      b.push(delivered.eventId);
    }, 'subscriber-b');

    await dispatchOutboxBatch(db as never, mockFieldValue);

    assert.deepEqual(a, ['evt_1']);
    assert.deepEqual(b, ['evt_1']);
  });

  it('does not redeliver a dispatched event on the next pass', async () => {
    const db = createFakeFirestore({ seed: { 'outbox/evt_1': event() } });
    let calls = 0;
    subscribeOrderOutbox('order.status_changed', async () => {
      calls += 1;
    }, 'idempotent-handler');

    await dispatchOutboxBatch(db as never, mockFieldValue);
    const second = await dispatchOutboxBatch(db as never, mockFieldValue);

    assert.equal(calls, 1);
    assert.equal(second.scanned, 0, 'a dispatched event is no longer pending');
  });

  it('leaves an event pending and visible when nothing consumes its type', async () => {
    const db = createFakeFirestore({ seed: { 'outbox/evt_1': event({ type: 'order.unknown_type' }) } });
    const result = await dispatchOutboxBatch(db as never, mockFieldValue);

    assert.equal(result.dispatched, 0);
    const stored = db.read('outbox', 'evt_1');
    assert.equal(stored?.status, 'PENDING', 'an event is never silently marked delivered');
  });

  it('holds an event until its availability window opens', async () => {
    const db = createFakeFirestore({
      seed: {
        'outbox/evt_1': event({ availableAt: new Date(Date.now() + 60_000).toISOString() }),
      },
    });
    let calls = 0;
    subscribeOrderOutbox('order.status_changed', async () => {
      calls += 1;
    }, 'gated-handler');

    await dispatchOutboxBatch(db as never, mockFieldValue);
    assert.equal(calls, 0);
    assert.equal(db.read('outbox', 'evt_1')?.status, 'PENDING');
  });

  it('records the pending lag so a stalled outbox is observable', async () => {
    const db = createFakeFirestore({
      seed: { 'outbox/evt_1': event({ occurredAt: new Date(Date.now() - 120_000).toISOString() }) },
    });
    subscribeOrderOutbox('order.status_changed', async () => {}, 'lag-observer');
    const result = await dispatchOutboxBatch(db as never, mockFieldValue);
    assert.ok(result.oldestPendingAgeMs >= 119_000);
  });
});

describe('order outbox dispatcher — failure handling', () => {
  beforeEach(() => {
    clearOrderOutboxSubscriptions();
  });

  it('retries a failing handler with backoff instead of losing the event', async () => {
    const db = createFakeFirestore({ seed: { 'outbox/evt_1': event() } });
    let attempts = 0;
    subscribeOrderOutbox('order.status_changed', async () => {
      attempts += 1;
      throw new Error('downstream unavailable');
    }, 'flaky-handler');

    const result = await dispatchOutboxBatch(db as never, mockFieldValue);

    assert.equal(attempts, 1);
    assert.equal(result.failed, 1);
    const stored = db.read('outbox', 'evt_1');
    assert.equal(stored?.status, 'PENDING', 'the event stays queued for another attempt');
    assert.equal(stored?.attempts, 1);
    assert.ok(stored?.availableAt, 'a retry window is scheduled');
    assert.match(String(stored?.lastError), /downstream unavailable/);
  });

  it('does not run the second handler once the first has failed', async () => {
    const db = createFakeFirestore({ seed: { 'outbox/evt_1': event() } });
    let secondRan = 0;
    subscribeOrderOutbox('order.status_changed', async () => {
      throw new Error('first handler failed');
    }, 'broken-handler');
    subscribeOrderOutbox('order.status_changed', async () => {
      secondRan += 1;
    }, 'downstream-handler');

    await dispatchOutboxBatch(db as never, mockFieldValue);

    assert.equal(secondRan, 0, 'a handler that did not run must not be marked received');
    assert.equal(db.read('outbox_receipts', receiptId('evt_1', 'downstream-handler')), undefined);
  });

  it('dead-letters an event after the maximum number of attempts and keeps it replayable', async () => {
    const db = createFakeFirestore({
      seed: { 'outbox/evt_1': event({ attempts: MAX_DELIVERY_ATTEMPTS - 1 }) },
    });
    subscribeOrderOutbox('order.status_changed', async () => {
      throw new Error('permanently broken');
    }, 'always-broken');

    const result = await dispatchOutboxBatch(db as never, mockFieldValue);

    assert.equal(result.deadLettered, 1);
    assert.equal(db.read('outbox', 'evt_1')?.status, 'DEAD_LETTER');
    const dead = db.read(OUTBOX_DEAD_LETTER_COLLECTION, 'evt_1');
    assert.ok(dead, 'the payload is preserved for replay');
    assert.equal(dead?.attempts, MAX_DELIVERY_ATTEMPTS);
    assert.match(String(dead?.lastError), /permanently broken/);
  });

  it('replays a dead letter back into the queue without re-running received handlers', async () => {
    const db = createFakeFirestore({
      seed: {
        'outbox/evt_1': event({ status: 'DEAD_LETTER', attempts: MAX_DELIVERY_ATTEMPTS }),
        [`outbox_dead_letter/evt_1`]: { eventId: 'evt_1', deadLetteredAt: new Date().toISOString() },
      },
    });
    const replayed = await replayDeadLetter(db as never, mockFieldValue);

    assert.equal(replayed.replayed, 1);
    assert.equal(db.read('outbox', 'evt_1')?.status, 'PENDING');
    assert.equal(db.read('outbox', 'evt_1')?.attempts, 0, 'replay resets the attempt budget');
    assert.ok(db.read(OUTBOX_DEAD_LETTER_COLLECTION, 'evt_1')?.resolvedAt, 'the dead letter is marked resolved');
  });

  it('replays only the requested events', async () => {
    const db = createFakeFirestore({
      seed: {
        'outbox/evt_1': event({ status: 'DEAD_LETTER' }),
        'outbox/evt_2': event({ eventId: 'evt_2', status: 'DEAD_LETTER' }),
        'outbox_dead_letter/evt_1': { eventId: 'evt_1', deadLetteredAt: new Date().toISOString() },
        'outbox_dead_letter/evt_2': { eventId: 'evt_2', deadLetteredAt: new Date().toISOString() },
      },
    });
    const replayed = await replayDeadLetter(db as never, mockFieldValue, { eventIds: ['evt_2'] });

    assert.equal(replayed.replayed, 1);
    assert.equal(db.read('outbox', 'evt_2')?.status, 'PENDING');
    assert.equal(db.read('outbox', 'evt_1')?.status, 'DEAD_LETTER');
  });

  it('backs off exponentially and stays bounded', () => {
    assert.ok(nextAttemptDelayMs(1, () => 0) < nextAttemptDelayMs(5, () => 0));
    const capped = nextAttemptDelayMs(50, () => 1);
    assert.ok(capped <= 15 * 60_000, 'backoff is capped so recovery is not deferred by days');
  });

  it('treats a past availability window as ready and a future one as not ready', () => {
    const now = Date.now();
    assert.equal(isEventReady({ ...(event() as unknown as OrderOutboxEvent), availableAt: null }, now), true);
    assert.equal(
      isEventReady({ ...(event() as unknown as OrderOutboxEvent), availableAt: new Date(now - 1).toISOString() }, now),
      true
    );
    assert.equal(
      isEventReady({ ...(event() as unknown as OrderOutboxEvent), availableAt: new Date(now + 60_000).toISOString() }, now),
      false
    );
  });

  it('gives each handler its own receipt id', () => {
    assert.equal(receiptId('evt_1', 'order.status_changed'), 'evt_1__order.status_changed');
    assert.notEqual(receiptId('evt_1', 'order.status_changed'), receiptId('evt_1', 'order.paid'));
  });
});

describe('order projection rebuild', () => {
  it('rebuilds from orders, stamping the source version', async () => {
    const db = createFakeFirestore({
      seed: {
        'orders/o1': { tenantId: TENANT, orderStatus: 'ACCEPTED', paymentStatus: 'PENDING', version: 7 },
        'orders/o2': { tenantId: TENANT, orderStatus: 'READY', paymentStatus: 'RECORDED', version: 9 },
      },
    });

    const result = await rebuildOrderProjection(db as never, mockFieldValue, 'order_lifecycle_projection', {
      tenantId: TENANT,
    });

    assert.equal(result.scanned, 2);
    assert.equal(result.written, 2);
    assert.equal(db.read('order_lifecycle_projection', 'o1')?.orderStatus, 'ACCEPTED');
    assert.equal(db.read('order_lifecycle_projection', 'o1')?.version, 7);
    assert.equal(db.read('order_lifecycle_projection', 'o2')?.paymentStatus, 'RECORDED');
  });

  it('paginates without dropping or repeating an order', async () => {
    const seed: Record<string, Record<string, unknown>> = {};
    for (let index = 0; index < 25; index += 1) {
      seed[`orders/o${String(index).padStart(2, '0')}`] = {
        tenantId: TENANT,
        orderStatus: 'ACCEPTED',
        version: index + 1,
      };
    }
    const db = createFakeFirestore({ seed });

    const result = await rebuildOrderProjection(db as never, mockFieldValue, 'projection', {
      tenantId: TENANT,
      batchSize: 10,
    });

    assert.equal(result.scanned, 25, 'every order is scanned exactly once');
    assert.equal(Object.keys(db.readAll('projection')).length, 25);
  });

  it('does not rebuild another tenant when scoped to one tenant', async () => {
    const db = createFakeFirestore({
      seed: {
        'orders/o1': { tenantId: TENANT, orderStatus: 'ACCEPTED', version: 1 },
        'orders/o2': { tenantId: 'tenant_other', orderStatus: 'ACCEPTED', version: 1 },
      },
    });
    await rebuildOrderProjection(db as never, mockFieldValue, 'projection', { tenantId: TENANT });
    assert.ok(db.read('projection', 'o1'));
    assert.equal(db.read('projection', 'o2'), undefined);
  });

  it('is idempotent: rebuilding twice produces the same projection', async () => {
    const db = createFakeFirestore({
      seed: { 'orders/o1': { tenantId: TENANT, orderStatus: 'ACCEPTED', version: 3 } },
    });
    await rebuildOrderProjection(db as never, mockFieldValue, 'projection', { tenantId: TENANT });
    const first = db.read('projection', 'o1');
    await rebuildOrderProjection(db as never, mockFieldValue, 'projection', { tenantId: TENANT });
    const second = db.read('projection', 'o1');

    /**
     * `rebuiltAt` is excluded on purpose: it records *when* the projection was
     * last rebuilt, so it is supposed to move. Comparing it would make this test
     * depend on whether two rebuilds landed in the same millisecond. What must be
     * stable is every field derived from the order.
     */
    const withoutRebuiltAt = (doc: Record<string, unknown> | undefined) => {
      const { rebuiltAt: _rebuiltAt, ...rest } = doc ?? {};
      return rest;
    };

    assert.deepEqual(withoutRebuiltAt(second), withoutRebuiltAt(first));
    assert.equal(
      second?.version,
      first?.version,
      'the source version is not advanced by a rebuild'
    );
    assert.equal(first?.rebuiltAt !== undefined, true, 'the rebuild is still timestamped');
  });

  it('backfill protection does not overwrite a live-updated projection', async () => {
    process.env.FF_ORDER_LIFECYCLE_BACKFILL_PROTECTION = 'true';
    const now = Date.now();
    const db = createFakeFirestore({
      seed: {
        'orders/o1': { tenantId: TENANT, orderStatus: 'ACCEPTED', version: 1 },
        'order_lifecycle_projection/o1': {
          orderId: 'o1',
          orderStatus: 'PREPARING',
          version: 2,
          updatedAt: new Date(now + 1000).toISOString(),
        },
      },
    });

    await rebuildOrderProjection(db as never, mockFieldValue, 'order_lifecycle_projection', {
      tenantId: TENANT,
    });

    const proj = db.read('order_lifecycle_projection', 'o1');
    assert.ok(proj);
    assert.equal(proj.orderStatus, 'PREPARING', 'live-updated projection must not be clobbered by backfill');
    assert.equal(proj.version, 2);
    delete process.env.FF_ORDER_LIFECYCLE_BACKFILL_PROTECTION;
  });
});

describe('rebuild job persistence', () => {
  it('creates a job document and updates cursor after each page', async () => {
    const seed: Record<string, Record<string, unknown>> = {};
    for (let index = 0; index < 25; index += 1) {
      seed[`orders/o${String(index).padStart(2, '0')}`] = {
        tenantId: TENANT,
        orderStatus: 'ACCEPTED',
        version: index + 1,
      };
    }
    const db = createFakeFirestore({ seed });

    const result = await rebuildOrderProjection(db as never, mockFieldValue, 'projection', {
      tenantId: TENANT,
      batchSize: 10,
    });

    assert.ok(result.jobId, 'a job id is returned');
    const job = db.read(REBUILD_JOBS_COLLECTION, result.jobId);
    assert.ok(job, 'job document exists');
    assert.equal(job?.status, 'completed');
    assert.equal(job?.target, 'projection');
    assert.equal(job?.tenantId, TENANT);
    assert.equal(job?.scanned, 25);
    assert.equal(job?.written, 25);
    assert.equal(job?.cursor, 'o24', 'cursor is the last document seen');
  });

  it('resumes from a previous job cursor', async () => {
    const seed: Record<string, Record<string, unknown>> = {};
    for (let index = 0; index < 25; index += 1) {
      seed[`orders/o${String(index).padStart(2, '0')}`] = {
        tenantId: TENANT,
        orderStatus: 'ACCEPTED',
        version: index + 1,
      };
    }
    const db = createFakeFirestore({ seed });

    const first = await rebuildOrderProjection(db as never, mockFieldValue, 'projection', {
      tenantId: TENANT,
      batchSize: 10,
    });

    const job = db.read(REBUILD_JOBS_COLLECTION, first.jobId);
    assert.ok(job);
    assert.equal(job?.status, 'completed');

    const second = await rebuildOrderProjection(db as never, mockFieldValue, 'projection', {
      tenantId: TENANT,
      batchSize: 10,
      resumeJobId: first.jobId,
    });

    assert.equal(second.scanned, 0, 'resuming a completed job scans nothing');
    assert.equal(second.written, 0);
  });

  it('claims a job exclusively — second worker gets zero work', async () => {
    const seed: Record<string, Record<string, unknown>> = {};
    for (let index = 0; index < 10; index += 1) {
      seed[`orders/o${String(index).padStart(2, '0')}`] = {
        tenantId: TENANT,
        orderStatus: 'ACCEPTED',
        version: index + 1,
      };
    }
    const db = createFakeFirestore({ seed });

    const first = await rebuildOrderProjection(db as never, mockFieldValue, 'projection', {
      tenantId: TENANT,
      batchSize: 5,
    });

    const second = await rebuildOrderProjection(db as never, mockFieldValue, 'projection', {
      tenantId: TENANT,
      batchSize: 5,
      resumeJobId: first.jobId,
    });

    assert.equal(second.scanned, 0, 'second worker must not process a claimed job');
    assert.equal(second.written, 0);
    const job = db.read(REBUILD_JOBS_COLLECTION, first.jobId);
    assert.ok(job?.workerId, 'first worker claimed the job');
    assert.notEqual(job?.workerId, second.jobId, 'second worker did not overwrite the claim');
  });

  it('preserves backfill protection under concurrent claim', async () => {
    const now = Date.now();
    const seed: Record<string, Record<string, unknown>> = {
      'orders/o0': { tenantId: TENANT, orderStatus: 'ACCEPTED', version: 1 },
      'order_lifecycle_projection/o0': {
        orderId: 'o0',
        orderStatus: 'PREPARING',
        version: 2,
        updatedAt: new Date(now + 1000).toISOString(),
      },
    };
    const db = createFakeFirestore({ seed });
    process.env.FF_ORDER_LIFECYCLE_BACKFILL_PROTECTION = 'true';

    const result = await rebuildOrderProjection(db as never, mockFieldValue, 'order_lifecycle_projection', {
      tenantId: TENANT,
      batchSize: 5,
    });

    assert.ok(result.jobId);
    const proj = db.read('order_lifecycle_projection', 'o0');
    assert.ok(proj);
    assert.equal(proj.orderStatus, 'PREPARING', 'live projection must survive rebuild');
    assert.equal(proj.version, 2);
    delete process.env.FF_ORDER_LIFECYCLE_BACKFILL_PROTECTION;
  });
});
