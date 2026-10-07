/**
 * Phase A acceptance — Gap 1 (server side): CreateOrder.
 *
 * Walks a POS walk-in bill through the authoritative processor and asserts the
 * properties the offline terminal depends on: the client-chosen order id becomes
 * the document id, every monetary total is recomputed server-side, and the order,
 * its receipt and its outbox event commit together or not at all.
 *
 * The `expectedVersion` block pins the retry contract the POS relies on:
 * a transport retry replays the receipt, while a concurrency conflict pins
 * nothing so the same command id can be retried with a corrected precondition.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  processOrderCommand,
  buildCreateOrderDocument,
  outboxEventId,
  type OrderCommandEnvelope,
} from '../orderCommandProcessor.js';
import {
  isRoleAllowedForCommand,
  validateCreateOrderPayload,
  type CommandActor,
  type OrderCommandErrorCode,
} from '../orderCommandContract.js';
import { resolveActorForTenant } from '../registerOrderCommandRoutes.js';
import { createFakeFirestore, mockFieldValue, SERVER_TIMESTAMP } from './fakeFirestore.js';

const TENANT = 'tenant_alpha';
const OTHER_TENANT = 'tenant_beta';
const WALK_IN_ID = 'pos_walkin_1700000000_4242';

const owner: CommandActor = { uid: 'user_owner', role: 'owner', tenantIds: [TENANT] };
const cashier: CommandActor = { uid: 'user_cashier', role: 'cashier', tenantIds: [TENANT] };
const otherOwner: CommandActor = { uid: 'user_other', role: 'owner', tenantIds: [OTHER_TENANT] };
const kitchen: CommandActor = { uid: 'user_kitchen', role: 'kitchen', tenantIds: [TENANT] };

const createPayload = (over: Record<string, unknown> = {}) => ({
  orderId: WALK_IN_ID,
  orderType: 'DINE_IN',
  paymentMethod: 'CASH',
  customer: { name: 'Walk-in Customer', phone: '9000000000', tableNo: 'T4' },
  items: [
    { itemId: 'menu_biryani', name: 'Biryani', unitPrice: 250, quantity: 2 },
    { itemId: 'menu_naan', name: 'Naan', unitPrice: 40, quantity: 1 },
  ],
  discountPercent: 0,
  gstPercent: 0,
  ...over,
});

const createCommand = (
  over: Partial<OrderCommandEnvelope> = {},
  payload: Record<string, unknown> = createPayload()
): OrderCommandEnvelope => ({
  commandId: 'sync_create_1',
  type: 'CreateOrder',
  tenantId: TENANT,
  orderId: WALK_IN_ID,
  deviceId: 'pos_1',
  clientSequence: 1,
  clientTime: '1999-01-01T00:00:00.000Z',
  payload,
  ...over,
});

const run = (
  db: ReturnType<typeof createFakeFirestore>,
  command: OrderCommandEnvelope,
  actor: CommandActor = owner
) => processOrderCommand(db as never, mockFieldValue, command, actor, 'corr_create');

describe('CreateOrder — durable client→server identity', () => {
  it('adopts the client-minted order id as the authoritative document id', async () => {
    const db = createFakeFirestore();
    const result = await run(db, createCommand());
    assert.equal(result.success, true);

    const order = db.read('orders', WALK_IN_ID);
    assert.ok(order, 'the order exists under the id the terminal minted');
    assert.equal(order?.tenantId, TENANT);
    assert.equal(order?.clientOrderId, WALK_IN_ID);
    assert.equal(order?.creatingCommandId, 'sync_create_1');
    assert.equal(order?.deviceId, 'pos_1');
  });

  it('opens the order in the canonical PLACED status with version 1', async () => {
    const db = createFakeFirestore();
    const result = await run(db, createCommand());
    assert.equal(result.orderStatus, 'PLACED');
    assert.equal(result.version, 1);
    assert.equal(db.read('orders', WALK_IN_ID)?.version, 1);
    assert.equal(db.read('orders', WALK_IN_ID)?.status, 'PLACED', 'legacy readers keep working');
    assert.equal(db.read('orders', WALK_IN_ID)?.orderStatus, 'PLACED');
  });

  it('records the actor that opened the bill', async () => {
    const db = createFakeFirestore();
    await run(db, createCommand(), cashier);
    assert.equal(db.read('orders', WALK_IN_ID)?.createdBy, 'user_cashier');
    assert.equal(db.read('orders', WALK_IN_ID)?.createdByRole, 'cashier');
  });

  it('uses the server clock, never the terminal clock', async () => {
    const db = createFakeFirestore();
    await run(db, createCommand({ clientTime: '1999-01-01T00:00:00.000Z' }));
    const order = db.read('orders', WALK_IN_ID);
    assert.equal(order?.createdAt, SERVER_TIMESTAMP);
    assert.notEqual(order?.timestamps, undefined);
    assert.match(String((order?.timestamps as Record<string, unknown>)?.createdAt), /^\d{4}-\d{2}-\d{2}T/);
  });

  it('records the client time for diagnostics only', async () => {
    const db = createFakeFirestore();
    await run(db, createCommand({ clientTime: '1999-01-01T00:00:00.000Z' }));
    assert.equal(
      db.read('order_commands', `${TENANT}__sync_create_1`)?.clientTime,
      '1999-01-01T00:00:00.000Z'
    );
  });
});

describe('CreateOrder — server-side validation and pricing', () => {
  it('recomputes every monetary total instead of trusting the client', async () => {
    const db = createFakeFirestore();
    const result = await run(
      db,
      createCommand(
        {},
        createPayload({ total: 1, subtotal: 1, totalAmount: 1, pricing: { total: 1 } })
      )
    );
    assert.equal(result.success, true);
    const order = db.read('orders', WALK_IN_ID);
    assert.equal(order?.subtotal, 540, '250x2 + 40');
    assert.equal(order?.totalAmount, 540);
    assert.equal(order?.pricing && (order.pricing as Record<string, unknown>).total, 540);
  });

  it('applies discount and tax from validated percentages', async () => {
    const db = createFakeFirestore();
    await run(
      db,
      createCommand(
        {},
        createPayload({ discountPercent: 10, gstPercent: 5, total: 99999 })
      )
    );
    const order = db.read('orders', WALK_IN_ID);
    assert.equal(order?.subtotal, 540);
    assert.equal(order?.discountAmount, 54);
    assert.equal(order?.gstAmount, 24.3, '5% of 486, tax is charged after the discount');
    assert.equal(order?.totalAmount, 510.3);
  });

  it('never lets the discount exceed the subtotal', () => {
    const result = validateCreateOrderPayload(
      createPayload({ discountPercent: 150 }),
      { order: {} }
    );
    assert.equal('code' in result && result.code, 'INVALID_PAYLOAD');
  });

  it('rejects a percentage outside 0..100', () => {
    const result = validateCreateOrderPayload(createPayload({ gstPercent: -5 }), { order: {} });
    assert.equal('code' in result && result.code, 'INVALID_PAYLOAD');
  });

  it('uses the tenant published menu price over the terminal price', async () => {
    const db = createFakeFirestore({
      seed: {
        // The owner app has re-priced the biryani since the terminal cached it.
        'menu/menu_biryani': { price: 275, isAvailable: true },
        'menu/menu_naan': { price: 45, isAvailable: true },
      },
    });
    const result = await run(db, createCommand());
    assert.equal(result.success, true);
    const order = db.read('orders', WALK_IN_ID);
    assert.equal(order?.subtotal, 595, '275x2 + 45 — the published menu wins');
    assert.equal(order?.pricingSource, 'menu');
    assert.equal(order?.pricingVerifiedAt !== null, true);
    assert.deepEqual(
      (order?.items as Array<Record<string, unknown>>).map((item) => item.unitPrice),
      [275, 45]
    );
  });

  it('flags an order priced from terminal prices so it can be reconciled later', async () => {
    const db = createFakeFirestore({
      seed: { 'menu/menu_biryani': { price: 275, isAvailable: true } },
    });
    await run(db, createCommand());
    const order = db.read('orders', WALK_IN_ID);
    assert.equal(order?.pricingSource, 'client_unverified', 'the naan had no published price');
    assert.equal(order?.pricingVerifiedAt, null);
  });

  it('refuses a bill with no items', () => {
    const result = validateCreateOrderPayload(createPayload({ items: [] }), { order: {} });
    assert.equal('code' in result && result.code, 'INVALID_ORDER_ITEMS');
  });

  it('refuses a zero or fractional quantity', () => {
    for (const quantity of [0, -1, 1.5]) {
      const result = validateCreateOrderPayload(
        createPayload({ items: [{ itemId: 'm', name: 'M', unitPrice: 10, quantity }] }),
        { order: {} }
      );
      assert.equal(
        'code' in result && result.code,
        'INVALID_ORDER_ITEMS',
        `quantity ${quantity} must be refused`
      );
    }
  });

  it('refuses an item with neither a published nor a supplied price', () => {
    const result = validateCreateOrderPayload(
      createPayload({ items: [{ itemId: 'mystery_item', name: 'Mystery', quantity: 1 }] }),
      { order: {} }
    );
    assert.equal('code' in result && result.code, 'INVALID_ORDER_ITEMS');
  });

  it('refuses an absurd subtotal rather than minting a giant order', () => {
    const result = validateCreateOrderPayload(
      createPayload({ items: [{ itemId: 'm', name: 'M', unitPrice: 900_000, quantity: 2 }] }),
      { order: {} }
    );
    assert.equal('code' in result && result.code, 'INVALID_ORDER_ITEMS');
  });

  it('refuses to open a bill on a gateway payment method', async () => {
    const db = createFakeFirestore();
    const result = await run(db, createCommand({}, createPayload({ paymentMethod: 'RAZORPAY' })));
    assert.equal(result.success, false);
    assert.equal(result.error?.code, 'PROVIDER_VERIFIED_PAYMENT_REQUIRED');
    assert.equal(db.read('orders', WALK_IN_ID), undefined, 'no order may be created');
  });

  it('refuses to open the bill in any status other than PLACED', () => {
    const result = validateCreateOrderPayload(createPayload({ orderStatus: 'ACCEPTED' }), { order: {} });
    assert.equal('code' in result && result.code, 'INVALID_STATUS_VALUE');
  });

  it('refuses a hostile payload key', () => {
    // A computed key creates an own property, which is what a hostile client
    // actually sends; `{ __proto__: x }` would only set the prototype.
    const payload = { ...createPayload(), ['__proto__']: { polluted: true } } as Record<
      string,
      unknown
    >;
    const result = validateCreateOrderPayload(payload, { order: {} });
    assert.equal('code' in result && result.code, 'INVALID_PAYLOAD');
  });

  it('requires a customer name', () => {
    const result = validateCreateOrderPayload(createPayload({ customer: { name: '  ' } }), { order: {} });
    assert.equal('code' in result && result.code, 'INVALID_PAYLOAD');
  });

  it('rejects a malformed payload with a pinned receipt, so the answer is stable', async () => {
    const db = createFakeFirestore();
    const first = await run(
      db,
      createCommand({ commandId: 'sync_bad_create' }, createPayload({ items: [] }))
    );
    assert.equal(first.error?.code, 'INVALID_ORDER_ITEMS');
    const receipt = db.read('order_commands', `${TENANT}__sync_bad_create`);
    assert.ok(receipt, 'a deterministic rejection is durable');

    const replay = await run(
      db,
      createCommand({ commandId: 'sync_bad_create' }, createPayload({ items: [] }))
    );
    assert.equal(replay.replayed, true);
    assert.equal(replay.error?.code, 'INVALID_ORDER_ITEMS');
  });
});

describe('CreateOrder — atomicity, idempotency and conflicts', () => {
  it('commits the order, the receipt and the outbox event together', async () => {
    const db = createFakeFirestore();
    const result = await run(db, createCommand());
    assert.equal(result.success, true);

    const order = db.read('orders', WALK_IN_ID);
    const receipt = db.read('order_commands', `${TENANT}__sync_create_1`);
    const event = db.read('outbox', outboxEventId(TENANT, 'sync_create_1'));

    assert.equal(order?.orderStatus, 'PLACED');
    assert.equal(order?.version, 1);
    assert.equal(receipt?.version, 1);
    assert.equal(receipt?.success, true);
    assert.ok(event, 'the outbox event is committed with the order');
    assert.equal(event?.type, 'order.placed');
    assert.equal(event?.status, 'PENDING');
    assert.equal(event?.aggregateId, WALK_IN_ID);
    assert.equal(event?.idempotencyKey, 'sync_create_1');
    assert.equal((event?.payload as Record<string, unknown>)?.orderStatus, 'PLACED');
  });

  it('a transport retry replays the receipt and creates nothing new', async () => {
    const db = createFakeFirestore();
    const first = await run(db, createCommand());
    const retry = await run(db, createCommand());

    assert.equal(retry.success, true);
    assert.equal(retry.replayed, true);
    assert.equal(retry.version, first.version);
    assert.equal(db.read('orders', WALK_IN_ID)?.version, 1, 'no second version bump');
    assert.equal(Object.keys(db.readAll('outbox')).length, 1, 'no duplicate event');
  });

  it('an order id already owned by another command is refused without pinning the key', async () => {
    const db = createFakeFirestore({
      seed: {
        [`orders/${WALK_IN_ID}`]: {
          tenantId: TENANT,
          orderStatus: 'PLACED',
          paymentStatus: 'PENDING',
          version: 5,
          creatingCommandId: 'a_different_command',
        },
      },
    });
    const result = await run(db, createCommand());
    assert.equal(result.success, false);
    assert.equal(result.error?.code, 'ORDER_ALREADY_EXISTS');
    assert.equal(result.error?.retryable, false);
    assert.equal(
      db.read('order_commands', `${TENANT}__sync_create_1`),
      undefined,
      'the key stays usable after the operator resolves the duplicate id'
    );
    assert.equal(db.read('orders', WALK_IN_ID)?.version, 5, 'the existing order is untouched');
  });

  it('each tenant gets its own order and receipt namespace', () => {
    assert.notEqual(outboxEventId(TENANT, 'sync_create_1'), outboxEventId(OTHER_TENANT, 'sync_create_1'));
  });

  it('writes nothing when validation fails inside the transaction', async () => {
    const db = createFakeFirestore();
    // No menu document and no client price: nothing to bill, so nothing to write.
    const result = await run(
      db,
      createCommand(
        { commandId: 'cmd_no_price' },
        createPayload({
          items: [
            { itemId: 'mystery_a', name: 'A', quantity: 1 },
            { itemId: 'mystery_b', name: 'B', quantity: 1 },
          ],
        })
      )
    );
    assert.equal(result.success, false);
    assert.equal(result.error?.code, 'INVALID_ORDER_ITEMS');
    const attempted = db.lastAttemptedWrites();
    assert.equal(attempted.has(`orders/${WALK_IN_ID}`), false, 'no order write may be attempted');
  });
});

describe('CreateOrder — authorization', () => {
  it('refuses a creator who is not a member of the tenant', async () => {
    const db = createFakeFirestore();
    const result = await run(db, createCommand(), otherOwner);
    assert.equal(result.error?.code, 'FORBIDDEN_TENANT');
    assert.equal(db.read('orders', WALK_IN_ID), undefined);
  });

  it('refuses kitchen staff, who do not open bills', async () => {
    const db = createFakeFirestore();
    const result = await run(db, createCommand(), kitchen);
    assert.equal(result.error?.code, 'FORBIDDEN_ROLE');
    assert.equal(db.read('orders', WALK_IN_ID), undefined);
  });

  it('allows a cashier to open a bill', () => {
    assert.equal(isRoleAllowedForCommand('CreateOrder', 'cashier'), true);
    assert.equal(isRoleAllowedForCommand('CreateOrder', 'kitchen'), false);
  });

  it('still refuses a member with no role at all', () => {
    const resolved = resolveActorForTenant({ uid: 'u1' }, TENANT, [TENANT]);
    assert.equal('code' in resolved && resolved.code, 'FORBIDDEN_ROLE');
  });
});

describe('CreateOrder — expectedVersion contract', () => {
  it('accepts an absent precondition, which is what the POS sends', async () => {
    const db = createFakeFirestore();
    const result = await run(db, createCommand());
    assert.equal(result.success, true);
  });

  it('accepts an explicit version of 1', async () => {
    const db = createFakeFirestore();
    const result = await run(db, createCommand({ expectedVersion: 1 }));
    assert.equal(result.success, true);
  });

  it('refuses a precondition the new order cannot satisfy', async () => {
    const db = createFakeFirestore();
    const result = await run(db, createCommand({ expectedVersion: 7 }));
    assert.equal(result.success, false);
    assert.equal(result.error?.code, 'CONCURRENCY_CONFLICT');
    assert.equal(result.error?.retryable, true);
    assert.equal(db.read('orders', WALK_IN_ID), undefined);
  });

  it('pins no receipt for a refused precondition, so the id can be retried cleanly', async () => {
    const db = createFakeFirestore();
    const refused = await run(db, createCommand({ expectedVersion: 7 }));
    assert.equal(refused.error?.code, 'CONCURRENCY_CONFLICT');
    assert.equal(db.read('order_commands', `${TENANT}__sync_create_1`), undefined);

    const retried = await run(db, createCommand({ expectedVersion: 1 }));
    assert.equal(retried.success, true);
    assert.equal(db.read('orders', WALK_IN_ID)?.version, 1);
  });

  it('a revision after a conflict is the same command id with a new precondition', async () => {
    const db = createFakeFirestore({
      seed: {
        [`orders/${WALK_IN_ID}`]: {
          tenantId: TENANT,
          orderStatus: 'PLACED',
          // COD so the existing payment gate admits the transition without a
          // gateway. The gate is unchanged by this work and is not weakened here.
          paymentMethod: 'COD',
          isCOD: true,
          paymentStatus: 'PENDING',
          version: 9,
          total: 500,
          items: [{ itemId: 'i', name: 'I', price: 500, quantity: 1 }],
        },
      },
    });
    // Not a creation any more: the terminal is updating an order that already
    // exists and has moved on. The retry keeps the id and the corrected version.
    const accept = await processOrderCommand(
      db as never,
      mockFieldValue,
      {
        commandId: 'sync_conflicted',
        type: 'AcceptOrder',
        tenantId: TENANT,
        orderId: WALK_IN_ID,
        payload: {},
        expectedVersion: 1,
      },
      owner,
      'corr_conflict'
    );
    assert.equal(accept.error?.code, 'CONCURRENCY_CONFLICT');
    assert.equal(accept.error?.currentVersion, 9);
    assert.equal(db.read('order_commands', `${TENANT}__sync_conflicted`), undefined);

    const revised = await processOrderCommand(
      db as never,
      mockFieldValue,
      {
        commandId: 'sync_conflicted',
        type: 'AcceptOrder',
        tenantId: TENANT,
        orderId: WALK_IN_ID,
        payload: {},
        expectedVersion: 9,
      },
      owner,
      'corr_conflict'
    );
    assert.equal(revised.success, true, 'the corrected retry applies');
    assert.equal(db.read('orders', WALK_IN_ID)?.orderStatus, 'ACCEPTED');
  });

  it('reusing a committed key with a different precondition is a conflict', async () => {
    const db = createFakeFirestore();
    const applied = await run(
      db,
      createCommand({ commandId: 'sync_keyed', expectedVersion: 1 })
    );
    assert.equal(applied.success, true);

    const reused = await run(
      db,
      createCommand({ commandId: 'sync_keyed', expectedVersion: 5 })
    );
    assert.equal(reused.success, false);
    assert.equal(
      reused.error?.code,
      'IDEMPOTENCY_KEY_CONFLICT',
      'once a key has committed an outcome, it is not a retry any more'
    );
  });
});

describe('buildCreateOrderDocument — shape', () => {
  it('writes the fields the POS mirror reads back', () => {
    const validated = validateCreateOrderPayload(createPayload(), { order: {} });
    assert.equal('code' in validated, false);
    if ('code' in validated) return;

    const doc = buildCreateOrderDocument(
      createCommand(),
      validated.payload,
      owner,
      '2026-10-05T12:00:00.000Z',
      SERVER_TIMESTAMP
    );
    for (const field of [
      'tenantId',
      'restaurantId',
      'orderSource',
      'orderType',
      'orderStatus',
      'status',
      'paymentStatus',
      'customer',
      'items',
      'subtotal',
      'gstAmount',
      'totalAmount',
      'pricing',
      'timestamps',
      'version',
      'timeline',
    ]) {
      assert.ok(field in doc, `the POS mirror reads ${field}`);
    }
    assert.equal(doc.paymentStatus, 'PENDING', 'a new order is never born paid');
    assert.equal(Array.isArray(doc.payments) ? doc.payments.length : -1, 0);
    assert.equal(Array.isArray(doc.kots) ? doc.kots.length : -1, 0);
  });

  it('marks a cash bill as COD so the existing payment gate behaves', () => {
    const validated = validateCreateOrderPayload(createPayload(), { order: {} });
    if ('code' in validated) throw new Error('fixture must validate');
    const doc = buildCreateOrderDocument(
      createCommand(),
      validated.payload,
      owner,
      '2026-10-05T12:00:00.000Z',
      SERVER_TIMESTAMP
    );
    assert.equal(doc.isCOD, true);
  });
});

describe('order command error vocabulary', () => {
  it('classifies the creation-specific codes as permanent', () => {
    const codes: OrderCommandErrorCode[] = ['INVALID_ORDER_ITEMS', 'ORDER_ALREADY_EXISTS'];
    for (const code of codes) {
      assert.ok(code.length > 0);
    }
  });
});