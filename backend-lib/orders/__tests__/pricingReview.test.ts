/**
 * The unverified-pricing policy, exercised end to end.
 *
 * `CreateOrder` → `order.placed` outbox → intake ledger flags the hold →
 * an authorized manager approves or rejects → the order and the audit trail
 * reflect the decision. Everything here runs against the fake Firestore the
 * command path already uses, so the pricing hold is proven against the same
 * transaction semantics production runs with.
 */

import { it, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'crypto';

import { createFakeFirestore } from './fakeFirestore';
import {
  processOrderCommand,
  type OrderCommandEnvelope,
} from '../orderCommandProcessor';
import type { CommandActor } from '../orderCommandContract';
import { dispatchOutboxBatch, clearOrderOutboxSubscriptions } from '../orderOutboxDispatcher';
import {
  ORDER_INTAKE_COLLECTION,
  registerRequiredOrderOutboxHandlers,
} from '../orderOutboxHandlers';
import {
  resolvePricingReview,
  listPendingPricingReviews,
  PRICING_REVIEW_AUDIT_COLLECTION,
} from '../pricingReviewService';
import { setSupervisorCredential } from '../supervisorVerification';
import { consumeSupervisorGrant } from '../supervisorVerification';

const TENANT = 'tenant_alpha';
const OTHER_TENANT = 'tenant_beta';
const WALK_IN_ID = 'walk_in_4';

const owner: CommandActor = { uid: 'owner_1', role: 'owner', tenantIds: [TENANT, OTHER_TENANT] };
const manager: CommandActor = { uid: 'mgr_1', role: 'manager', tenantIds: [TENANT] };
const cashier: CommandActor = { uid: 'cash_1', role: 'cashier', tenantIds: [TENANT] };

const mockFieldValue = {
  serverTimestamp: () => 'SERVER_TIMESTAMP',
} as never;

/**
 * Creates a valid supervisor grant for RESOLVE_PRICING_REVIEW in the fake Firestore.
 * Returns the grant token that can be used in tests.
 */
const createTestSupervisorGrant = async (
  db: ReturnType<typeof createFakeFirestore>,
  tenantId: string,
  actorUid: string
): Promise<string> => {
  const token = `test_grant_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  await db.writeDoc('supervisor_grants', tokenHash, {
    token,
    tenantId,
    actorUid,  // Use the passed actorUid
    operation: 'RESOLVE_PRICING_REVIEW',
    expiresAt,
    consumedAt: null,
    createdAt: 'SERVER_TIMESTAMP',
  });

  return token;
};

/**
 * A tenant with one published menu item priced at 250. `CreateOrder` reads prices inside the
 * transaction, so an order can only be priced from the menu when the document is present.
 */
const dbWithMenu = () =>
  createFakeFirestore({
    seed: {
      'menu/menu_biryani': { tenantId: TENANT, name: 'Biryani', price: 250, isPublished: true },
    },
  });

const createCommand = (over: Partial<OrderCommandEnvelope> = {}): OrderCommandEnvelope => ({
  commandId: 'sync_create_1',
  type: 'CreateOrder',
  tenantId: TENANT,
  orderId: WALK_IN_ID,
  actorUid: 'cash_1',
  payload: {
    orderId: WALK_IN_ID,
    orderType: 'DINE_IN',
    paymentMethod: 'CASH',
    customer: { name: 'Walk-in Customer' },
    items: [{ itemId: 'menu_ghost', name: 'Off-menu special', unitPrice: 310, quantity: 2 }],
    discountPercent: 0,
    gstPercent: 0,
  },
  ...over,
} as OrderCommandEnvelope);

type TestDb = ReturnType<typeof createFakeFirestore>;

/** Create an order that cannot be priced from the menu and dispatch its event. */
const flagUnverifiedPricing = async (
  db: TestDb,
  command: OrderCommandEnvelope = createCommand()
): Promise<{ eventId: string; orderId: string }> => {
  const result = await processOrderCommand(db as never, mockFieldValue, command, owner, 'corr_review');
  assert.equal(result.success, true, 'the order itself is still created');
  await dispatchOutboxBatch(db as never, mockFieldValue);
  const eventId = `${TENANT}__sync_create_1`;
  const intake = db.read(ORDER_INTAKE_COLLECTION, eventId);
  assert.equal(intake?.requiresPricingReview, true);
  return { eventId, orderId: WALK_IN_ID };
};

describe('unverified pricing policy', () => {
  beforeEach(() => {
    registerRequiredOrderOutboxHandlers();
  });

  afterEach(() => {
    clearOrderOutboxSubscriptions();
  });

  describe('holding an order that could not be priced', () => {
    it('flags the hold and keeps the payment untouched', async () => {
      const db = dbWithMenu();
      const { eventId, orderId } = await flagUnverifiedPricing(db);

      const intake = db.read(ORDER_INTAKE_COLLECTION, eventId);
      assert.equal(intake?.pricingSource, 'client_unverified');
      assert.equal(intake?.holdsFulfillment, true);
      assert.equal(intake?.total, 620, 'the unverified total is recorded for review');

      const order = db.read('orders', orderId);
      assert.equal(order?.paymentStatus, 'PENDING', 'flagging a price never settles a payment');
      assert.deepEqual(order?.payments, [], 'no payment was created by the hold');
      assert.equal(order?.pricingSource, 'client_unverified');
    });

    it('does not flag an order the tenant menu could price', async () => {
      const db = dbWithMenu();
      await processOrderCommand(
        db as never,
        mockFieldValue,
        createCommand({
          payload: {
            orderId: WALK_IN_ID,
            orderType: 'DINE_IN',
            paymentMethod: 'CASH',
            customer: { name: 'Walk-in Customer' },
            items: [{ itemId: 'menu_biryani', name: 'Biryani', unitPrice: 999, quantity: 1 }],
            discountPercent: 0,
            gstPercent: 0,
          },
        }),
        owner,
        'corr_menu'
      );
      await dispatchOutboxBatch(db as never, mockFieldValue);

      const intake = db.read(ORDER_INTAKE_COLLECTION, `${TENANT}__sync_create_1`);
      assert.equal(intake?.pricingSource, 'menu');
      assert.equal(intake?.requiresPricingReview, false);
      assert.equal(intake?.holdsFulfillment, false);

      // The terminal asked for 999; the published price won.
      assert.equal(db.read('orders', WALK_IN_ID)?.total, 250);
    });

    it('lists only unresolved reviews for the requesting tenant', async () => {
      const db = dbWithMenu();
      await flagUnverifiedPricing(db);
      db.writeDoc(ORDER_INTAKE_COLLECTION, `${OTHER_TENANT}__x`, {
        tenantId: OTHER_TENANT,
        orderId: 'other_order',
        requiresPricingReview: true,
      });

      const pending = await listPendingPricingReviews({ db: db as never, tenantId: TENANT });
      assert.equal(pending.length, 1);
      assert.equal(pending[0]?.orderId, WALK_IN_ID);
      assert.equal(pending[0]?.decision, null);
    });
  });

  describe('approving a review', () => {
    it('releases the hold, stamps the order and records an audit entry', async () => {
      const db = dbWithMenu();
      const { eventId, orderId } = await flagUnverifiedPricing(db);
      const grantToken = await createTestSupervisorGrant(db, TENANT, 'mgr_1');

      const resolution = await resolvePricingReview({
        db: db as never,
        fieldValue: mockFieldValue,
        tenantId: TENANT,
        eventId,
        decision: 'APPROVE',
        reason: 'Off-menu special confirmed against today rate card',
        actor: { uid: 'mgr_1', role: 'manager' },
        correlationId: 'corr_approve',
        supervisorGrantToken: grantToken,
      });

      assert.equal(resolution.ok, true);
      assert.equal(resolution.ok && resolution.outcome, 'resolved');

      const intake = db.read(ORDER_INTAKE_COLLECTION, eventId);
      assert.equal(intake?.requiresPricingReview, false);
      assert.equal(intake?.holdsFulfillment, false, 'an approved order may reach the kitchen');
      assert.equal(
        (intake?.resolution as Record<string, unknown>)?.resolvedBy,
        'mgr_1',
        'the decision is attributable'
      );

      const order = db.read('orders', orderId);
      assert.ok(order?.pricingVerifiedAt, 'the order is stamped as verified');
      assert.equal(
        (order?.pricingOverride as Record<string, unknown>)?.decision,
        'APPROVE',
        'the override is recorded on the order, not only in the review ledger'
      );
      assert.equal(order?.orderStatus, 'PLACED', 'approval does not change order state');
      assert.deepEqual(order?.payments, [], 'approval still touches no payment');

      const audit = db.read(PRICING_REVIEW_AUDIT_COLLECTION, `${eventId}__APPROVE`);
      assert.equal(audit?.action, 'order.pricing_review.approve');
      assert.equal(audit?.orderId, orderId);
      assert.equal(audit?.actorUid, 'mgr_1');
      assert.equal(audit?.unverifiedTotal, 620);
    });

    it('answers a repeat call with the first decision instead of re-applying it', async () => {
      const db = dbWithMenu();
      const { eventId } = await flagUnverifiedPricing(db);
      const grantToken = await createTestSupervisorGrant(db, TENANT, 'mgr_1');

      const first = await resolvePricingReview({
        db: db as never,
        fieldValue: mockFieldValue,
        tenantId: TENANT,
        eventId,
        decision: 'APPROVE',
        reason: 'Confirmed against the printed rate card',
        actor: { uid: 'mgr_1', role: 'manager' },
        correlationId: 'corr_a',
        supervisorGrantToken: grantToken,
      });
      assert.equal(first.ok && first.outcome, 'resolved');

      const second = await resolvePricingReview({
        db: db as never,
        fieldValue: mockFieldValue,
        tenantId: TENANT,
        eventId,
        decision: 'REJECT',
        reason: 'Second opinion says the price is wrong',
        actor: { uid: 'owner_1', role: 'owner' },
        correlationId: 'corr_b',
        supervisorGrantToken: grantToken,
      });

      assert.equal(second.ok, true);
      assert.equal(second.ok && second.outcome, 'already_resolved');
      assert.equal(
        second.ok && second.decision,
        'APPROVE',
        'the first decision stands and is not overwritten'
      );

      const audits = db.readAll(PRICING_REVIEW_AUDIT_COLLECTION);
      assert.equal(
        Object.keys(audits).length,
        1,
        'a repeat decision writes no second audit record'
      );
      assert.equal(db.read(ORDER_INTAKE_COLLECTION, eventId)?.holdsFulfillment, false);
    });
  });

  describe('rejecting a review', () => {
    it('keeps the hold and rejects the order', async () => {
      const db = dbWithMenu();
      const { eventId, orderId } = await flagUnverifiedPricing(db);
      const grantToken = await createTestSupervisorGrant(db, TENANT, 'owner_1');

      const resolution = await resolvePricingReview({
        db: db as never,
        fieldValue: mockFieldValue,
        tenantId: TENANT,
        eventId,
        decision: 'REJECT',
        reason: 'Price not in the menu and not authorised for this day',
        actor: { uid: 'owner_1', role: 'owner' },
        correlationId: 'corr_reject',
        supervisorGrantToken: grantToken,
      });

      assert.equal(resolution.ok, true);

      const intake = db.read(ORDER_INTAKE_COLLECTION, eventId);
      assert.equal(intake?.requiresPricingReview, false);
      assert.equal(intake?.holdsFulfillment, true, 'a rejected order never reaches the kitchen');

      const order = db.read('orders', orderId);
      assert.equal(order?.orderStatus, 'REJECTED');
      assert.equal(order?.status, 'REJECTED');
      assert.equal(order?.pricingVerifiedAt, null, 'a rejected price is not stamped verified');
      assert.deepEqual(order?.payments, [], 'rejection does not touch the payment');

      const audit = db.read(PRICING_REVIEW_AUDIT_COLLECTION, `${eventId}__REJECT`);
      assert.equal(audit?.action, 'order.pricing_review.reject');
    });
  });

  describe('authorization and input rules', () => {
    it('refuses a staff role that is not owner or manager', async () => {
      const db = dbWithMenu();
      const { eventId } = await flagUnverifiedPricing(db);
      const grantToken = await createTestSupervisorGrant(db, TENANT, 'cash_1');

      const resolution = await resolvePricingReview({
        db: db as never,
        fieldValue: mockFieldValue,
        tenantId: TENANT,
        eventId,
        decision: 'APPROVE',
        reason: 'Looks fine to me as the cashier on shift',
        actor: { uid: 'cash_1', role: 'cashier' },
        correlationId: 'corr_cashier',
        supervisorGrantToken: grantToken,
      });

      assert.equal(resolution.ok, false);
      assert.equal(!resolution.ok && resolution.code, 'FORBIDDEN_ROLE');
      assert.equal(
        db.read(ORDER_INTAKE_COLLECTION, eventId)?.holdsFulfillment,
        true,
        'the hold survives a refused attempt'
      );
      assert.deepEqual(db.readAll(PRICING_REVIEW_AUDIT_COLLECTION), {});
    });

    it('requires a reason long enough to be attributable', async () => {
      const db = dbWithMenu();
      const { eventId } = await flagUnverifiedPricing(db);
      const grantToken = await createTestSupervisorGrant(db, TENANT, 'mgr_1');

      const resolution = await resolvePricingReview({
        db: db as never,
        fieldValue: mockFieldValue,
        tenantId: TENANT,
        eventId,
        decision: 'APPROVE',
        reason: 'ok',
        actor: { uid: 'mgr_1', role: 'manager' },
        correlationId: 'corr_short',
        supervisorGrantToken: grantToken,
      });

      assert.equal(resolution.ok, false);
      assert.equal(!resolution.ok && resolution.code, 'REASON_REQUIRED');
      assert.equal(db.read(ORDER_INTAKE_COLLECTION, eventId)?.requiresPricingReview, true);
    });

    it('refuses an unknown decision instead of defaulting to approval', async () => {
      const db = dbWithMenu();
      const { eventId } = await flagUnverifiedPricing(db);
      const grantToken = await createTestSupervisorGrant(db, TENANT, 'mgr_1');

      const resolution = await resolvePricingReview({
        db: db as never,
        fieldValue: mockFieldValue,
        tenantId: TENANT,
        eventId,
        decision: 'MAYBE',
        reason: 'Undecided about this one for now',
        actor: { uid: 'mgr_1', role: 'manager' },
        correlationId: 'corr_maybe',
        supervisorGrantToken: grantToken,
      });

      assert.equal(resolution.ok, false);
      assert.equal(!resolution.ok && resolution.code, 'INVALID_DECISION');
      assert.equal(db.read(ORDER_INTAKE_COLLECTION, eventId)?.holdsFulfillment, true);
    });

    it('will not resolve a review that belongs to another tenant', async () => {
      const db = dbWithMenu();
      const { eventId } = await flagUnverifiedPricing(db);
      const grantToken = await createTestSupervisorGrant(db, TENANT, 'owner_1');

      const resolution = await resolvePricingReview({
        db: db as never,
        fieldValue: mockFieldValue,
        tenantId: OTHER_TENANT,
        eventId,
        decision: 'APPROVE',
        reason: 'Approving this from the wrong tenant entirely',
        actor: { uid: 'owner_1', role: 'owner' },
        correlationId: 'corr_cross',
        supervisorGrantToken: grantToken,
      });

      assert.equal(resolution.ok, false);
      assert.equal(!resolution.ok && resolution.code, 'TENANT_MISMATCH');
      assert.equal(db.read(ORDER_INTAKE_COLLECTION, eventId)?.holdsFulfillment, true);
    });

    it('reports a missing review rather than inventing one', async () => {
      const db = dbWithMenu();
      await flagUnverifiedPricing(db);
      const grantToken = await createTestSupervisorGrant(db, TENANT, 'mgr_1');

      const resolution = await resolvePricingReview({
        db: db as never,
        fieldValue: mockFieldValue,
        tenantId: TENANT,
        eventId: 'tenant_alpha__no_such_event',
        decision: 'APPROVE',
        reason: 'Approving something that was never flagged',
        actor: { uid: 'mgr_1', role: 'manager' },
        correlationId: 'corr_missing',
        supervisorGrantToken: grantToken,
      });

      assert.equal(resolution.ok, false);
      assert.equal(!resolution.ok && resolution.code, 'NOT_FOUND');
    });

    it('requires an authenticated actor', async () => {
      const db = dbWithMenu();
      const { eventId } = await flagUnverifiedPricing(db);
      const grantToken = await createTestSupervisorGrant(db, TENANT, 'mgr_1');

      const resolution = await resolvePricingReview({
        db: db as never,
        fieldValue: mockFieldValue,
        tenantId: TENANT,
        eventId,
        decision: 'APPROVE',
        reason: 'Approving with no verified identity attached',
        actor: { uid: '', role: 'manager' },
        correlationId: 'corr_anon',
        supervisorGrantToken: grantToken,
      });

      assert.equal(resolution.ok, false);
      assert.equal(!resolution.ok && resolution.code, 'UNAUTHENTICATED');
    });
  });

  describe('payments stay out of the decision', () => {
    it('leaves an existing payment and its settlement untouched', async () => {
      const db = dbWithMenu();
      const { eventId, orderId } = await flagUnverifiedPricing(db);

      // A payment recorded against the order before the review was decided.
      db.writeDoc('orders', orderId, {
        paymentStatus: 'PAID',
        payments: [{ id: 'pay_1', amount: 620, status: 'CAPTURED', method: 'CASH' }],
      });

      await resolvePricingReview({
        db: db as never,
        fieldValue: mockFieldValue,
        tenantId: TENANT,
        eventId,
        decision: 'APPROVE',
        reason: 'Rate card checked, the recorded payment is correct',
        actor: { uid: 'mgr_1', role: 'manager' },
        correlationId: 'corr_paid',
        supervisorGrantToken: await createTestSupervisorGrant(db, TENANT, 'mgr_1'),
      });

      const order = db.read('orders', orderId);
      assert.equal(order?.paymentStatus, 'PAID', 'a pricing decision never rewrites settlement');
      assert.equal((order?.payments as unknown[])?.length, 1);
      assert.deepEqual(db.read('payments', 'pay_1'), undefined, 'no payment document was written');
    });
  });

  describe('grant consumption is atomic with the resolution', () => {
    it('consumes the grant only after the review is resolved', async () => {
      const db = dbWithMenu();
      const { eventId } = await flagUnverifiedPricing(db);
      const grantToken = await createTestSupervisorGrant(db, TENANT, 'mgr_1');
      const tokenHash = createHash('sha256').update(grantToken).digest('hex');

      const resolution = await resolvePricingReview({
        db: db as never,
        fieldValue: mockFieldValue,
        tenantId: TENANT,
        eventId,
        decision: 'APPROVE',
        reason: 'Grant consumption test — rate card verified',
        actor: { uid: 'mgr_1', role: 'manager' },
        correlationId: 'corr_grant_atomic',
        supervisorGrantToken: grantToken,
      });

      assert.equal(resolution.ok, true);
      assert.equal(resolution.ok && resolution.outcome, 'resolved');

      const grantDoc = db.read('supervisor_grants', tokenHash);
      assert.ok(grantDoc?.consumedAt, 'the grant is consumed after a successful resolution');
      assert.equal(grantDoc?.consumedBy, 'mgr_1');
      assert.equal(db.read(ORDER_INTAKE_COLLECTION, eventId)?.requiresPricingReview, false);
    });

    it('does not consume the grant on an already-resolved repeat', async () => {
      const db = dbWithMenu();
      const { eventId } = await flagUnverifiedPricing(db);
      const grantToken = await createTestSupervisorGrant(db, TENANT, 'mgr_1');
      const tokenHash = createHash('sha256').update(grantToken).digest('hex');

      const first = await resolvePricingReview({
        db: db as never,
        fieldValue: mockFieldValue,
        tenantId: TENANT,
        eventId,
        decision: 'APPROVE',
        reason: 'First resolution — rate card verified',
        actor: { uid: 'mgr_1', role: 'manager' },
        correlationId: 'corr_first',
        supervisorGrantToken: grantToken,
      });
      assert.equal(first.ok && first.outcome, 'resolved');

      const second = await resolvePricingReview({
        db: db as never,
        fieldValue: mockFieldValue,
        tenantId: TENANT,
        eventId,
        decision: 'REJECT',
        reason: 'Second opinion — different decision',
        actor: { uid: 'owner_1', role: 'owner' },
        correlationId: 'corr_second',
        supervisorGrantToken: grantToken,
      });

      assert.equal(second.ok, true);
      assert.equal(second.ok && second.outcome, 'already_resolved');
      assert.equal(second.ok && second.decision, 'APPROVE', 'first decision stands');

      const grantDoc = db.read('supervisor_grants', tokenHash);
      assert.equal(grantDoc?.consumedAt, 'SERVER_TIMESTAMP', 'grant was consumed by the first resolution, not the repeat');
      assert.equal(grantDoc?.consumedBy, 'mgr_1', 'repeat read does not overwrite the original consumer');
      assert.equal(Object.keys(db.readAll(PRICING_REVIEW_AUDIT_COLLECTION)).length, 1, 'only one audit record');
    });
  });
});