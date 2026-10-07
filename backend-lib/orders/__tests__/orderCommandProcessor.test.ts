import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  processOrderCommand,
  commandRecordId,
  outboxEventId,
  type OrderCommandEnvelope,
} from '../orderCommandProcessor.js';
import type { CommandActor } from '../orderCommandContract.js';
import { resolveActorForTenant } from '../registerOrderCommandRoutes.js';
import { createFakeFirestore, mockFieldValue, SERVER_TIMESTAMP } from './fakeFirestore.js';

const TENANT = 'tenant_alpha';
const OTHER_TENANT = 'tenant_beta';
const ORDER = 'order_1';

const owner: CommandActor = { uid: 'user_owner', role: 'owner', tenantIds: [TENANT] };
const otherOwner: CommandActor = { uid: 'user_other', role: 'owner', tenantIds: [OTHER_TENANT] };
const kitchen: CommandActor = { uid: 'user_kitchen', role: 'kitchen', tenantIds: [TENANT] };

/**
 * Default fixture is a COD order. The pre-existing payment gate only lets an
 * order into the kitchen once payment is verified, and COD is the one case where
 * that is true without a gateway — so the happy path uses COD rather than
 * weakening the gate.
 */
const seedOrder = (over: Record<string, unknown> = {}) => ({
  [`orders/${ORDER}`]: {
    tenantId: TENANT,
    orderStatus: 'NEW',
    paymentMethod: 'COD',
    isCOD: true,
    paymentStatus: 'PENDING',
    version: 3,
    total: 250,
    totalAmount: 250,
    pricing: { total: 250 },
    items: [{ itemId: 'i1', name: 'Meals', quantity: 2, price: 125 }],
    ...over,
  },
});

const envelope = (over: Partial<OrderCommandEnvelope> = {}): OrderCommandEnvelope => ({
  commandId: 'cmd_1',
  type: 'AcceptOrder',
  tenantId: TENANT,
  orderId: ORDER,
  deviceId: 'pos_1',
  clientSequence: 1,
  payload: {},
  ...over,
});

const run = (
  db: ReturnType<typeof createFakeFirestore>,
  command: OrderCommandEnvelope,
  actor: CommandActor = owner
) => processOrderCommand(db as never, mockFieldValue, command, actor, 'corr_test');

describe('order command processing â€” envelope and authorization', () => {
  it('rejects an envelope with no commandId or type before touching Firestore', async () => {
    const db = createFakeFirestore({ seed: seedOrder() });
    const result = await run(db, envelope({ commandId: '' }));
    assert.equal(result.success, false);
    assert.equal(result.error?.code, 'INVALID_ENVELOPE');
    assert.equal(db.lastAttemptedWrites().size, 0, 'nothing may be written for an invalid envelope');
  });

  it('refuses a command from a user who is not a member of the tenant', async () => {
    const db = createFakeFirestore({ seed: seedOrder() });
    const result = await run(db, envelope(), otherOwner);
    assert.equal(result.success, false);
    assert.equal(result.error?.code, 'FORBIDDEN_TENANT');
    assert.equal(db.read('orders', ORDER)?.version, 3, 'order must be untouched');
  });

  it('refuses an order that belongs to another tenant', async () => {
    const db = createFakeFirestore({
      seed: seedOrder({ tenantId: OTHER_TENANT }),
    });
    const result = await run(db, envelope());
    assert.equal(result.success, false);
    assert.equal(result.error?.code, 'TENANT_MISMATCH');
    assert.equal(db.read('orders', ORDER)?.version, 3);
  });

  it('lets a platform admin act on any tenant', async () => {
    const db = createFakeFirestore({ seed: seedOrder({ tenantId: OTHER_TENANT }) });
    const admin: CommandActor = { uid: 'root', role: 'admin', tenantIds: [] };
    const result = await run(db, envelope(), admin);
    // The order is owned by another tenant, so it is rejected on ownership, not authority.
    assert.equal(result.success, false);
    assert.equal(result.error?.code, 'TENANT_MISMATCH');
  });

  it('keeps kitchen staff out of payment commands', async () => {
    const db = createFakeFirestore({ seed: seedOrder() });
    const result = await run(
      db,
      envelope({ type: 'RecordPayment', payload: { method: 'CASH', amount: 250 } }),
      kitchen
    );
    assert.equal(result.success, false);
    assert.equal(result.error?.code, 'FORBIDDEN_ROLE');
    assert.equal(db.read('payments', `${TENANT}__${ORDER}`), undefined);
  });
});

describe('order command processing â€” idempotency', () => {
  it('scopes the receipt by tenant so one tenant cannot read another tenant outcome', async () => {
    assert.equal(commandRecordId(TENANT, 'cmd_1'), `${TENANT}__cmd_1`);
    assert.notEqual(commandRecordId(TENANT, 'cmd_1'), commandRecordId(OTHER_TENANT, 'cmd_1'));
  });

  it('applies a command once and replays the original outcome on retry', async () => {
    const db = createFakeFirestore({ seed: seedOrder() });
    const first = await run(db, envelope({ commandId: 'cmd_accept' }));
    assert.equal(first.success, true);
    assert.equal(first.version, 4);

    const replay = await run(db, envelope({ commandId: 'cmd_accept' }));
    assert.equal(replay.success, true);
    assert.equal(replay.replayed, true);
    assert.equal(replay.version, 4, 'the replay reports the committed version');
    assert.equal(db.read('orders', ORDER)?.orderStatus, 'ACCEPTED');
    assert.equal(db.read('orders', ORDER)?.version, 4, 'no second version bump');
  });

  it('does not re-emit an outbox event on replay', async () => {
    const db = createFakeFirestore({ seed: seedOrder() });
    await run(db, envelope({ commandId: 'cmd_accept' }));
    const outboxId = outboxEventId(TENANT, 'cmd_accept');
    const firstEvent = db.read('outbox', outboxId);
    assert.ok(firstEvent, 'an outbox event is written on apply');

    await run(db, envelope({ commandId: 'cmd_accept' }));
    const afterReplay = db.read('outbox', outboxId);
    assert.deepEqual(afterReplay, firstEvent, 'the event is unchanged, not duplicated');
    assert.equal(Object.keys(db.readAll('outbox')).length, 1);
  });

  it('rejects the same key reused for a different payload', async () => {
    const db = createFakeFirestore({ seed: seedOrder() });
    await run(db, envelope({ commandId: 'cmd_reuse', type: 'AcceptOrder' }));
    const conflict = await run(
      db,
      envelope({ commandId: 'cmd_reuse', type: 'RejectOrder', payload: { rejectionReason: 'x' } })
    );
    assert.equal(conflict.success, false);
    assert.equal(conflict.error?.code, 'IDEMPOTENCY_KEY_CONFLICT');
    assert.equal(db.read('orders', ORDER)?.orderStatus, 'ACCEPTED', 'the second payload never applied');
  });

  it('treats a changed expectedVersion on the same key as a conflict, not a retry', async () => {
    const db = createFakeFirestore({ seed: seedOrder() });
    await run(db, envelope({ commandId: 'cmd_ver', expectedVersion: 3 }));
    const conflict = await run(db, envelope({ commandId: 'cmd_ver', expectedVersion: 9 }));
    assert.equal(conflict.success, false);
    assert.equal(conflict.error?.code, 'IDEMPOTENCY_KEY_CONFLICT');
  });

  it('leaves no receipt for a concurrency conflict so the same command can be retried', async () => {
    const db = createFakeFirestore({ seed: seedOrder() });
    const stale = await run(db, envelope({ commandId: 'cmd_stale', expectedVersion: 1 }));
    assert.equal(stale.success, false);
    assert.equal(stale.error?.code, 'CONCURRENCY_CONFLICT');
    assert.equal(stale.error?.retryable, true);
    assert.equal(stale.error?.currentVersion, 3);
    assert.equal(
      db.read('order_commands', `${TENANT}__cmd_stale`),
      undefined,
      'an optimistic failure must not pin the key'
    );

    const retried = await run(db, envelope({ commandId: 'cmd_stale', expectedVersion: 3 }));
    assert.equal(retried.success, true, 'retrying the same command id succeeds after re-reading state');
    assert.equal(db.read('orders', ORDER)?.orderStatus, 'ACCEPTED');
  });

  it('leaves no receipt for a missing order, so a late-created order can still be commanded', async () => {
    const db = createFakeFirestore();
    const missing = await run(db, envelope({ commandId: 'cmd_missing' }));
    assert.equal(missing.success, false);
    assert.equal(missing.error?.code, 'ORDER_NOT_FOUND');
    assert.equal(db.read('order_commands', `${TENANT}__cmd_missing`), undefined);
  });

  it('pins a deterministic payload rejection so the client sees a stable answer', async () => {
    const db = createFakeFirestore({ seed: seedOrder() });
    const bad = await run(
      db,
      envelope({ commandId: 'cmd_bad_pay', type: 'RecordPayment', payload: { method: 'CASH', amount: 9999 } })
    );
    assert.equal(bad.success, false);
    assert.equal(bad.error?.code, 'PAYMENT_AMOUNT_MISMATCH');
    const receipt = db.read('order_commands', `${TENANT}__cmd_bad_pay`);
    assert.ok(receipt, 'a deterministic rejection is durable');
    assert.equal(receipt?.success, false);
  });
});

describe('order command processing â€” atomicity and outbox', () => {
  it('commits the order change, the receipt and the outbox event together', async () => {
    const db = createFakeFirestore({ seed: seedOrder() });
    const result = await run(db, envelope({ commandId: 'cmd_atomic' }));
    assert.equal(result.success, true);

    const order = db.read('orders', ORDER);
    const receipt = db.read('order_commands', `${TENANT}__cmd_atomic`);
    const event = db.read('outbox', outboxEventId(TENANT, 'cmd_atomic'));

    assert.equal(order?.orderStatus, 'ACCEPTED');
    assert.equal(order?.version, 4);
    assert.equal(receipt?.version, 4);
    assert.ok(event, 'outbox event committed');
    assert.equal(event?.status, 'PENDING');
    assert.equal((event?.payload as Record<string, unknown>)?.orderStatus, 'ACCEPTED');
    assert.equal(event?.idempotencyKey, 'cmd_atomic', 'the receipt key travels with the event');
  });

  it('writes nothing to the order when validation fails inside the transaction', async () => {
    const db = createFakeFirestore({ seed: seedOrder() });
    const result = await run(
      db,
      envelope({ commandId: 'cmd_kot_bad', type: 'CreateKot', payload: { kotNumber: 1, items: [] } }),
      kitchen
    );
    assert.equal(result.success, false);
    const attempted = db.lastAttemptedWrites();
    assert.equal(attempted.has(`orders/${ORDER}`), false, 'no order write may be attempted');
  });

  it('stamps the receipt with the server, not the client, time', async () => {
    const db = createFakeFirestore({ seed: seedOrder() });
    await run(db, envelope({ commandId: 'cmd_time', clientTime: '1999-01-01T00:00:00.000Z' }));
    const receipt = db.read('order_commands', `${TENANT}__cmd_time`);
    assert.equal(receipt?.recordedAt, SERVER_TIMESTAMP);
    assert.equal(receipt?.clientTime, '1999-01-01T00:00:00.000Z', 'client time is kept for diagnostics only');
  });

  it('gives each tenant its own outbox namespace', async () => {
    assert.notEqual(outboxEventId(TENANT, 'cmd_1'), outboxEventId(OTHER_TENANT, 'cmd_1'));
  });
});

describe('order command processing â€” lifecycle and payment integrity', () => {
  it('refuses a status change the client may not make', async () => {
    const db = createFakeFirestore({ seed: seedOrder({ isCOD: false }) });
    const result = await run(
      db,
      envelope({
        commandId: 'cmd_paid_status',
        type: 'UpdateOrderStatus',
        payload: { orderStatus: 'ACCEPTED', paymentStatus: 'PAID' },
      })
    );
    assert.equal(result.success, false);
    assert.equal(
      result.error?.code,
      'PAYMENT_STATUS_NOT_WRITABLE',
      'a command may never set paymentStatus'
    );
    assert.equal(db.read('orders', ORDER)?.paymentStatus, 'PENDING');
  });

  it('refuses a provider method claimed as a staff collection', async () => {
    const db = createFakeFirestore({ seed: seedOrder() });
    const result = await run(
      db,
      envelope({
        commandId: 'cmd_razor',
        type: 'RecordPayment',
        payload: { method: 'RAZORPAY', amount: 250, providerPaymentId: 'pay_razor_1' },
      })
    );
    assert.equal(result.success, false);
    assert.equal(result.error?.code, 'PROVIDER_VERIFIED_PAYMENT_REQUIRED');
    assert.equal(db.read('orders', ORDER)?.paymentStatus, 'PENDING');
  });

  it('records a staff cash collection without claiming gateway verification', async () => {
    const db = createFakeFirestore({ seed: seedOrder({ orderStatus: 'READY', isCOD: false, paymentMethod: 'RAZORPAY' }) });
    const result = await run(
      db,
      envelope({ commandId: 'cmd_cash', type: 'RecordPayment', payload: { method: 'CASH', amount: 250 } })
    );
    assert.equal(result.success, true);
    assert.equal(result.paymentStatus, 'RECORDED');
    const order = db.read('orders', ORDER);
    assert.equal(order?.paymentStatus, 'RECORDED');
    assert.notEqual(order?.paymentStatus, 'VERIFIED');
  });

  it('rejects a payment for more than the order total', async () => {
    const db = createFakeFirestore({ seed: seedOrder({ orderStatus: 'READY', isCOD: false, paymentMethod: 'RAZORPAY' }) });
    const result = await run(
      db,
      envelope({ commandId: 'cmd_over', type: 'RecordPayment', payload: { method: 'CASH', amount: 400 } })
    );
    assert.equal(result.success, false);
    assert.equal(result.error?.code, 'PAYMENT_AMOUNT_MISMATCH');
  });

  it('refuses an unknown lifecycle value', async () => {
    const db = createFakeFirestore({ seed: seedOrder() });
    const result = await run(
      db,
      envelope({
        commandId: 'cmd_unknown_status',
        type: 'UpdateOrderStatus',
        payload: { orderStatus: 'TELEPORTED' },
      })
    );
    assert.equal(result.success, false);
    assert.equal(result.error?.code, 'INVALID_STATUS_VALUE');
  });

  it('refuses a transition out of a terminal status', async () => {
    const db = createFakeFirestore({ seed: seedOrder({ orderStatus: 'CANCELLED' }) });
    const result = await run(db, envelope({ commandId: 'cmd_terminal' }));
    assert.equal(result.success, false);
    assert.equal(result.error?.code, 'TERMINAL_ORDER');
  });

  it('accepts a legacy stored status and writes the canonical value', async () => {
    const db = createFakeFirestore({ seed: seedOrder({ orderStatus: 'order_received' }) });
    const result = await run(db, envelope({ commandId: 'cmd_legacy' }));
    assert.equal(result.success, true);
    assert.equal(result.orderStatus, 'ACCEPTED');
    assert.equal(db.read('orders', ORDER)?.orderStatus, 'ACCEPTED');
  });

  it('requires a rejection reason', async () => {
    const db = createFakeFirestore({ seed: seedOrder() });
    const result = await run(db, envelope({ commandId: 'cmd_reject', type: 'RejectOrder', payload: {} }));
    assert.equal(result.success, false);
    assert.equal(result.error?.code, 'INVALID_PAYLOAD');
  });
});

describe('resolveActorForTenant', () => {
  it('rejects a non-member', () => {
    const result = resolveActorForTenant({ uid: 'u1' }, TENANT, [OTHER_TENANT]);
    assert.equal('code' in result && result.code, 'FORBIDDEN_TENANT');
  });

  it('refuses to invent a role for a member with no claim or membership role', () => {
    const result = resolveActorForTenant({ uid: 'u1' }, TENANT, [TENANT]);
    assert.equal('code' in result && result.code, 'FORBIDDEN_ROLE');
  });

  it('uses the role recorded on the tenant membership', () => {
    const result = resolveActorForTenant({ uid: 'u1' }, TENANT, [TENANT], 'CASHIER');
    assert.equal('actor' in result && result.actor.role, 'cashier');
  });

  it('maps a token role claim when no membership role exists', () => {
    const result = resolveActorForTenant({ uid: 'u1', role: 'kitchen' }, TENANT, [TENANT]);
    assert.equal('actor' in result && result.actor.role, 'kitchen');
  });

  it('prefers platform admin over tenant membership', () => {
    const result = resolveActorForTenant({ uid: 'root', admin: true }, TENANT, []);
    assert.equal('actor' in result && result.actor.role, 'admin');
  });

  it('does not let a membership role escalate a kitchen-only member to owner', () => {
    const result = resolveActorForTenant({ uid: 'u1' }, TENANT, [TENANT], 'kitchen');
    assert.equal('actor' in result && result.actor.role, 'kitchen');
  });
});


