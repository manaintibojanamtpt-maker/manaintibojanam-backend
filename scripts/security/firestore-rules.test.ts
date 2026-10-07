/**
 * M0 PR-6 — Firestore security rules tests (emulator-backed).
 * Run: npm run test:rules
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { after, afterEach, before, describe, it } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

const RULES_PATH = resolve(process.cwd(), 'firestore.rules');
const PROJECT_ID = 'bhojanos-m0-rules-test';

let testEnv: RulesTestEnvironment;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

interface SeedableFirestore {
  collection: (path: string) => {
    doc: (id: string) => {
      set: (data: Record<string, unknown>) => Promise<unknown>;
    };
  };
}

async function seedFirestore(seed: (db: SeedableFirestore) => Promise<void>) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await seed(context.firestore());
  });
}

describe('M0 firestore rules', () => {
  it('denies public access to _connection_test_', async () => {
    const unauthed = testEnv.unauthenticatedContext();
    await assertFails(
      unauthed.firestore().collection('_connection_test_').doc('init').get()
    );
  });

  it('denies public access to _admin_test_', async () => {
    const unauthed = testEnv.unauthenticatedContext();
    await assertFails(
      unauthed.firestore().collection('_admin_test_').doc('connection').set({ ok: true })
    );
  });

  it('allows order owner read and denies cross-user read', async () => {
    await seedFirestore(async (db) => {
      await db.collection('orders').doc('order-1').set({
        userId: 'alice',
        tenantId: 'tenant-1',
        status: 'PLACED',
        createdAt: new Date(),
      });
    });

    const alice = testEnv.authenticatedContext('alice');
    const bob = testEnv.authenticatedContext('bob');

    await assertSucceeds(alice.firestore().collection('orders').doc('order-1').get());
    await assertFails(bob.firestore().collection('orders').doc('order-1').get());
  });

  it('scopes subscriptions to owner or admin', async () => {
    await seedFirestore(async (db) => {
      await db.collection('subscriptions').doc('sub-alice').set({
        userId: 'alice',
        tenantId: 'tenant-1',
        status: 'active',
      });
    });

    const alice = testEnv.authenticatedContext('alice');
    const bob = testEnv.authenticatedContext('bob');
    const admin = testEnv.authenticatedContext('admin', { admin: true });

    await assertSucceeds(alice.firestore().collection('subscriptions').doc('sub-alice').get());
    await assertFails(bob.firestore().collection('subscriptions').doc('sub-alice').get());
    await assertSucceeds(admin.firestore().collection('subscriptions').doc('sub-alice').get());
  });

  it('denies cross-user subscription updates', async () => {
    await seedFirestore(async (db) => {
      await db.collection('subscriptions').doc('sub-alice').set({
        userId: 'alice',
        tenantId: 'tenant-1',
        status: 'active',
        pendingDiscount: 0,
      });
    });

    const bob = testEnv.authenticatedContext('bob');
    await assertFails(
      bob.firestore().collection('subscriptions').doc('sub-alice').update({
        pendingDiscount: 100,
      })
    );
  });

  it('allows referral owner create and referral redemption update', async () => {
    await seedFirestore(async (db) => {
      await db.collection('referrals').doc('referrer').set({
        userId: 'referrer',
        referralCode: 'REF123',
        referredUsers: [],
        totalEarnings: 0,
        discountGiven: 0,
      });
    });

    const referrer = testEnv.authenticatedContext('referrer');
    const referee = testEnv.authenticatedContext('referee');

    await assertSucceeds(
      referee.firestore().collection('referrals').doc('referrer').update({
        referredUsers: ['referee'],
        totalEarnings: 100,
        discountGiven: 100,
      })
    );

    await assertFails(
      referee.firestore().collection('referrals').doc('referrer').update({
        referralCode: 'HACKED',
      })
    );

    await assertSucceeds(
      referrer.firestore().collection('referrals').doc('referrer').update({
        totalEarnings: 200,
      })
    );
  });

  it('requires authenticated aiAnalytics writes bound to uid', async () => {
    const unauthed = testEnv.unauthenticatedContext();
    await assertFails(
      unauthed.firestore().collection('aiAnalytics').add({
        eventName: 'spam',
        userId: 'anonymous',
      })
    );

    const alice = testEnv.authenticatedContext('alice');
    await assertSucceeds(
      alice.firestore().collection('aiAnalytics').add({
        eventName: 'ai_message_sent',
        userId: 'alice',
      })
    );
    await assertFails(
      alice.firestore().collection('aiAnalytics').add({
        eventName: 'ai_message_sent',
        userId: 'bob',
      })
    );
  });

  it('denies client writes to payment_verifications', async () => {
    await seedFirestore(async (db) => {
      await db.collection('payment_verifications').doc('pv-1').set({
        tenantId: 'tenant-1',
        orderId: 'order-1',
      });
    });

    const admin = testEnv.authenticatedContext('admin', { admin: true });
    const alice = testEnv.authenticatedContext('alice');

    await assertFails(
      alice.firestore().collection('payment_verifications').doc('pv-1').set({
        tenantId: 'tenant-1',
      })
    );
    await assertSucceeds(
      admin.firestore().collection('payment_verifications').doc('pv-1').get()
    );
  });

  describe('order command receipt trail is server-owned', () => {
    it('denies any client write to order_commands, including a tenant owner', async () => {
      await seedFirestore(async (db) => {
        await db.collection('users').doc('staff-1').set({
          restaurantId: 'tenant-1',
          role: 'owner',
        });
        await db.collection('order_commands').doc('tenant-1__cmd-1').set({
          tenantId: 'tenant-1',
          success: true,
          version: 4,
        });
      });

      const staff = testEnv.authenticatedContext('staff-1');
      await assertFails(
        staff.firestore().collection('order_commands').doc('tenant-1__cmd-1').set({
          success: false,
        })
      );
      await assertFails(
        staff.firestore().collection('order_commands').doc('forged').set({
          tenantId: 'tenant-1',
          success: true,
        })
      );
      await assertFails(
        staff.firestore().collection('order_commands').doc('tenant-1__cmd-1').delete()
      );
    });

    it('denies any client write to outbox, receipts and dead letters', async () => {
      await seedFirestore(async (db) => {
        await db.collection('users').doc('staff-1').set({
          restaurantId: 'tenant-1',
          role: 'owner',
        });
        await db.collection('outbox').doc('evt-1').set({ tenantId: 'tenant-1', status: 'PENDING' });
      });

      const staff = testEnv.authenticatedContext('staff-1');
      await assertFails(
        staff.firestore().collection('outbox').doc('evt-1').set({ status: 'DISPATCHED' })
      );
      await assertFails(
        staff.firestore().collection('outbox_receipts').doc('evt-1__handler').set({ ok: true })
      );
      await assertFails(
        staff.firestore().collection('outbox_dead_letter').doc('evt-1').set({ resolvedAt: new Date() })
      );
    });

    it('denies an unauthenticated write to the projection', async () => {
      const unauthed = testEnv.unauthenticatedContext();
      await assertFails(
        unauthed.firestore().collection('order_lifecycle_projection').doc('order-1').set({
          tenantId: 'tenant-1',
          orderStatus: 'ACCEPTED',
        })
      );
    });
  });

  describe('order settlement is server-only', () => {
    it('denies staff declaring a payment verified by writing the field', async () => {
      await seedFirestore(async (db) => {
        await db.collection('users').doc('staff-1').set({
          restaurantId: 'tenant-1',
          role: 'owner',
        });
        await db.collection('orders').doc('order-1').set({
          tenantId: 'tenant-1',
          status: 'ACCEPTED',
          paymentStatus: 'PENDING',
          total: 250,
          createdAt: new Date(),
        });
      });

      const staff = testEnv.authenticatedContext('staff-1');
      await assertFails(
        staff.firestore().collection('orders').doc('order-1').update({
          paymentStatus: 'VERIFIED',
        })
      );
      await assertFails(
        staff.firestore().collection('orders').doc('order-1').update({
          paymentStatus: 'PAID',
          paymentVerifiedAt: new Date(),
        })
      );
      await assertFails(
        staff.firestore().collection('orders').doc('order-1').update({
          razorpayPaymentId: 'pay_forged',
        })
      );
    });

    it('allows staff to move lifecycle without touching money', async () => {
      await seedFirestore(async (db) => {
        await db.collection('users').doc('staff-1').set({
          restaurantId: 'tenant-1',
          role: 'owner',
        });
        await db.collection('orders').doc('order-1').set({
          tenantId: 'tenant-1',
          status: 'ACCEPTED',
          paymentStatus: 'PENDING',
          total: 250,
          createdAt: new Date(),
        });
      });

      const staff = testEnv.authenticatedContext('staff-1');
      await assertSucceeds(
        staff.firestore().collection('orders').doc('order-1').update({
          status: 'PREPARING',
          updatedAt: new Date(),
        })
      );
    });

    it('denies staff from writing order ownership fields', async () => {
      await seedFirestore(async (db) => {
        await db.collection('users').doc('staff-1').set({
          restaurantId: 'tenant-1',
          role: 'owner',
        });
        await db.collection('orders').doc('order-1').set({
          tenantId: 'tenant-1',
          status: 'ACCEPTED',
          paymentStatus: 'PENDING',
          total: 250,
          createdAt: new Date(),
        });
      });

      const staff = testEnv.authenticatedContext('staff-1');
      await assertFails(
        staff.firestore().collection('orders').doc('order-1').update({
          total: 1,
        })
      );
      await assertFails(
        staff.firestore().collection('orders').doc('order-1').update({
          tenantId: 'tenant-2',
        })
      );
    });

    it('denies cross-tenant staff from reading or updating an order', async () => {
      await seedFirestore(async (db) => {
        await db.collection('users').doc('staff-2').set({
          restaurantId: 'tenant-2',
          role: 'owner',
        });
        await db.collection('orders').doc('order-1').set({
          tenantId: 'tenant-1',
          status: 'ACCEPTED',
          paymentStatus: 'PENDING',
          total: 250,
          createdAt: new Date(),
        });
      });

      const intruder = testEnv.authenticatedContext('staff-2');
      await assertFails(intruder.firestore().collection('orders').doc('order-1').get());
      await assertFails(
        intruder.firestore().collection('orders').doc('order-1').update({
          status: 'CANCELLED',
          updatedAt: new Date(),
        })
      );
    });

    it('denies staff from declaring settlement on a POS payment record', async () => {
      await seedFirestore(async (db) => {
        await db.collection('users').doc('staff-1').set({
          restaurantId: 'tenant-1',
          role: 'owner',
        });
        await db.collection('payments').doc('pay-1').set({
          tenantId: 'tenant-1',
          orderId: 'order-1',
          amount: 250,
          status: 'RECORDED',
        });
      });

      const staff = testEnv.authenticatedContext('staff-1');
      await assertFails(
        staff.firestore().collection('payments').doc('pay-1').update({
          status: 'VERIFIED',
        })
      );
    });
  });
});

/**
 * Phase A rules integration.
 *
 * These cover the gaps found when the earlier "rules hardened" report was
 * reconciled against the actual file. The previous suite passed while the
 * `/payments` block was refusing *everything* through a rule type error, so its
 * one payment assertion was passing for the wrong reason. The cases below pin
 * the behaviour that was actually intended, and the positive cases exist to
 * catch a future tightening that denies legitimate access.
 */
describe('order commerce rules integration', () => {
  describe('client settlement forgery', () => {
    it('denies a tenant owner writing paymentStatus PAID on an order', async () => {
      await seedFirestore(async (db) => {
        await db.collection('users').doc('owner-1').set({
          restaurantId: 'tenant-1',
          role: 'owner',
        });
        await db.collection('orders').doc('order-1').set({
          tenantId: 'tenant-1',
          status: 'ACCEPTED',
          orderStatus: 'ACCEPTED',
          total: 250,
        });
      });

      const owner = testEnv.authenticatedContext('owner-1');
      await assertFails(
        owner.firestore().collection('orders').doc('order-1').update({
          paymentStatus: 'PAID',
        })
      );
    });

    it('denies a tenant owner combining a valid transition with paymentStatus PAID', async () => {
      await seedFirestore(async (db) => {
        await db.collection('users').doc('owner-1').set({
          restaurantId: 'tenant-1',
          role: 'owner',
        });
        await db.collection('orders').doc('order-1').set({
          tenantId: 'tenant-1',
          status: 'ACCEPTED',
          orderStatus: 'ACCEPTED',
          total: 250,
        });
      });

      const owner = testEnv.authenticatedContext('owner-1');
      // ACCEPTED -> PREPARING is a legal transition, so the update is only
      // refused because it smuggles a settled payment status alongside it.
      await assertFails(
        owner.firestore().collection('orders').doc('order-1').update({
          status: 'PREPARING',
          paymentStatus: 'PAID',
        })
      );
    });

    it('denies writing paymentStatus PAID on a payment document', async () => {
      await seedFirestore(async (db) => {
        await db.collection('users').doc('staff-1').set({
          restaurantId: 'tenant-1',
          role: 'owner',
        });
        await db.collection('payments').doc('pay-1').set({
          tenantId: 'tenant-1',
          orderId: 'order-1',
          amount: 250,
          status: 'PENDING',
        });
      });

      const staff = testEnv.authenticatedContext('staff-1');
      await assertFails(
        staff.firestore().collection('payments').doc('pay-1').update({
          paymentStatus: 'PAID',
        })
      );
    });

    it('denies creating a payment that asserts settlement up front', async () => {
      await seedFirestore(async (db) => {
        await db.collection('users').doc('staff-1').set({
          restaurantId: 'tenant-1',
          role: 'owner',
        });
      });

      const staff = testEnv.authenticatedContext('staff-1');
      await assertFails(
        staff.firestore().collection('payments').doc('pay-forged').set({
          tenantId: 'tenant-1',
          orderId: 'order-1',
          amount: 250,
          status: 'VERIFIED',
        })
      );
    });

    it('denies creating a payment with provider verification provenance', async () => {
      await seedFirestore(async (db) => {
        await db.collection('users').doc('staff-1').set({
          restaurantId: 'tenant-1',
          role: 'owner',
        });
      });

      const staff = testEnv.authenticatedContext('staff-1');
      await assertFails(
        staff.firestore().collection('payments').doc('pay-forged').set({
          tenantId: 'tenant-1',
          orderId: 'order-1',
          amount: 250,
          status: 'PENDING',
          razorpayPaymentId: 'pay_forged_1',
          paymentVerifiedAt: new Date().toISOString(),
        })
      );
    });

    it('still allows staff to record a non-settled payment status', async () => {
      await seedFirestore(async (db) => {
        await db.collection('users').doc('staff-1').set({
          restaurantId: 'tenant-1',
          role: 'owner',
        });
        await db.collection('payments').doc('pay-1').set({
          tenantId: 'tenant-1',
          orderId: 'order-1',
          amount: 250,
          status: 'PENDING',
        });
      });

      const staff = testEnv.authenticatedContext('staff-1');
      await assertSucceeds(
        staff.firestore().collection('payments').doc('pay-1').update({
          status: 'FAILED',
        })
      );
    });
  });

  describe('authorized payment access is not broken', () => {
    it('allows a tenant staff member to read a payment in their own tenant', async () => {
      // Regression guard. This block used to deny every read through a rule type
      // error, which the old suite could not see because it only asserted denials.
      await seedFirestore(async (db) => {
        await db.collection('users').doc('staff-1').set({
          restaurantId: 'tenant-1',
          role: 'cashier',
        });
        await db.collection('payments').doc('pay-1').set({
          tenantId: 'tenant-1',
          orderId: 'order-1',
          amount: 250,
          status: 'RECORDED',
        });
      });

      const staff = testEnv.authenticatedContext('staff-1');
      await assertSucceeds(staff.firestore().collection('payments').doc('pay-1').get());
    });

    it('allows a tenant staff member to read a POS order in their own tenant', async () => {
      await seedFirestore(async (db) => {
        await db.collection('users').doc('staff-1').set({
          restaurantId: 'tenant-1',
          role: 'cashier',
        });
        await db.collection('pos_orders').doc('pos-1').set({
          tenantId: 'tenant-1',
          orderStatus: 'ACCEPTED',
        });
      });

      const staff = testEnv.authenticatedContext('staff-1');
      await assertSucceeds(staff.firestore().collection('pos_orders').doc('pos-1').get());
    });

    it('denies a platform admin who is not tenant staff from reading a payment', async () => {
      // Documents the existing policy rather than changing it: /payments is
      // tenant-scoped only, so a platform admin with no membership in the
      // tenant is refused. Widening this to isAdmin() is a deliberate policy
      // decision, not a bug fix, and is left for a separate change.
      await seedFirestore(async (db) => {
        await db.collection('users').doc('admin-1').set({ role: 'admin' });
        await db.collection('payments').doc('pay-1').set({
          tenantId: 'tenant-1',
          orderId: 'order-1',
          amount: 250,
          status: 'RECORDED',
        });
      });

      // No `admin` and no `role` claim: authority comes from the user document.
      const admin = testEnv.authenticatedContext('admin-1');
      await assertFails(admin.firestore().collection('payments').doc('pay-1').get());
    });

    it('allows a platform admin to read its own tenant admin surfaces without claims', async () => {
      // Regression guard for the unguarded `request.auth.token.admin` read, which
      // raised "Property admin is undefined" and denied the read outright.
      await seedFirestore(async (db) => {
        await db.collection('users').doc('admin-1').set({ role: 'admin' });
        await db.collection('outbox_dead_letter').doc('evt-1').set({
          type: 'order.placed',
          tenantId: 'tenant-1',
        });
      });

      const admin = testEnv.authenticatedContext('admin-1');
      await assertSucceeds(admin.firestore().collection('outbox_dead_letter').doc('evt-1').get());
    });
  });

  describe('cross-tenant isolation', () => {
    it('denies cross-tenant staff reading a payment', async () => {
      await seedFirestore(async (db) => {
        await db.collection('users').doc('staff-2').set({
          restaurantId: 'tenant-2',
          role: 'owner',
        });
        await db.collection('payments').doc('pay-1').set({
          tenantId: 'tenant-1',
          orderId: 'order-1',
          amount: 250,
          status: 'RECORDED',
        });
      });

      const staff = testEnv.authenticatedContext('staff-2');
      await assertFails(staff.firestore().collection('payments').doc('pay-1').get());
    });

    it('denies cross-tenant staff reading a POS order', async () => {
      await seedFirestore(async (db) => {
        await db.collection('users').doc('staff-2').set({
          restaurantId: 'tenant-2',
          role: 'owner',
        });
        await db.collection('pos_orders').doc('pos-1').set({
          tenantId: 'tenant-1',
          orderStatus: 'ACCEPTED',
        });
      });

      const staff = testEnv.authenticatedContext('staff-2');
      await assertFails(staff.firestore().collection('pos_orders').doc('pos-1').get());
    });

    it('does not grant staff access when neither the user nor the document declares a tenant', async () => {
      // The `data.tenantId || data.restaurantId` form resolved to null on both
      // sides here and compared equal, which was a cross-tenant bypass.
      await seedFirestore(async (db) => {
        await db.collection('users').doc('ghost-1').set({ displayName: 'no tenant' });
        await db.collection('payments').doc('pay-orphan').set({
          orderId: 'order-1',
          amount: 250,
          status: 'RECORDED',
        });
      });

      const ghost = testEnv.authenticatedContext('ghost-1');
      await assertFails(ghost.firestore().collection('payments').doc('pay-orphan').get());
    });
  });

  describe('absent claims', () => {
    it('denies an authenticated user with no user document and no claims', async () => {
      await seedFirestore(async (db) => {
        await db.collection('payments').doc('pay-1').set({
          tenantId: 'tenant-1',
          orderId: 'order-1',
          amount: 250,
          status: 'RECORDED',
        });
      });

      // No users/{uid} document and no claims at all.
      const stranger = testEnv.authenticatedContext('stranger-1');
      await assertFails(stranger.firestore().collection('payments').doc('pay-1').get());
    });

    it('denies escalating a user document role from the client', async () => {
      await seedFirestore(async (db) => {
        await db.collection('users').doc('staff-1').set({
          restaurantId: 'tenant-1',
          role: 'cashier',
        });
      });

      const staff = testEnv.authenticatedContext('staff-1');
      await assertFails(
        staff.firestore().collection('users').doc('staff-1').update({ role: 'admin' })
      );
    });

    it('denies adding ownedTenantIds from the client', async () => {
      await seedFirestore(async (db) => {
        await db.collection('users').doc('staff-1').set({
          restaurantId: 'tenant-1',
          role: 'cashier',
        });
      });

      const staff = testEnv.authenticatedContext('staff-1');
      await assertFails(
        staff.firestore().collection('users').doc('staff-1').update({
          ownedTenantIds: ['tenant-victim'],
        })
      );
    });
  });

  describe('server-owned receipt trail', () => {
    it('denies an admin writing a dead letter', async () => {
      // Dead letters drive `replayDeadLetter`. An admin-writable collection let a
      // client clear a real dead letter and have the event re-dispatched.
      await seedFirestore(async (db) => {
        await db.collection('users').doc('admin-1').set({ role: 'admin' });
      });

      const admin = testEnv.authenticatedContext('admin-1');
      await assertFails(
        admin.firestore().collection('outbox_dead_letter').doc('evt-1').set({
          type: 'order.placed',
          tenantId: 'tenant-1',
        })
      );
    });

    it('allows an admin to read a dead letter', async () => {
      await seedFirestore(async (db) => {
        await db.collection('users').doc('admin-1').set({ role: 'admin' });
        await db.collection('outbox_dead_letter').doc('evt-1').set({
          type: 'order.placed',
          tenantId: 'tenant-1',
        });
      });

      const admin = testEnv.authenticatedContext('admin-1');
      await assertSucceeds(admin.firestore().collection('outbox_dead_letter').doc('evt-1').get());
    });
  });

  describe('order creation', () => {
    it('denies an anonymous caller creating an order that claims to be paid', async () => {
      // The storefront's guest checkout creates orders with `userId: null`, so
      // that branch is open to anyone. It must still not be able to declare
      // settlement, or an anonymous caller could inject settled revenue into any
      // tenant they can name.
      await assertFails(
        testEnv
          .unauthenticatedContext()
          .firestore()
          .collection('orders')
          .doc('injected-1')
          .set({
            tenantId: 'tenant-victim',
            userId: null,
            status: 'PLACED',
            orderStatus: 'PLACED',
            total: 9999,
            paymentStatus: 'PAID',
          })
      );
    });

    it('denies an anonymous caller creating an order with provider provenance', async () => {
      await assertFails(
        testEnv
          .unauthenticatedContext()
          .firestore()
          .collection('orders')
          .doc('injected-3')
          .set({
            tenantId: 'tenant-victim',
            userId: null,
            status: 'PLACED',
            orderStatus: 'PLACED',
            total: 9999,
            razorpayPaymentId: 'pay_forged_1',
          })
      );
    });

    it('still allows the storefront guest checkout to create a pending order', async () => {
      // Preserves the authorized path: a guest order that asserts nothing about
      // settlement must still go through, or guest checkout breaks.
      await assertSucceeds(
        testEnv
          .unauthenticatedContext()
          .firestore()
          .collection('orders')
          .doc('guest-ok')
          .set({
            tenantId: 'tenant-1',
            userId: null,
            status: 'PLACED',
            orderStatus: 'PLACED',
            total: 450,
            paymentStatus: 'PENDING',
          })
      );
    });

    it('denies an anonymous caller reading an order it was not addressed by', async () => {
      await seedFirestore(async (db) => {
        await db.collection('orders').doc('order-secret').set({
          tenantId: 'tenant-1',
          orderStatus: 'ACCEPTED',
          total: 500,
        });
      });

      const anon = testEnv.unauthenticatedContext();
      await assertFails(anon.firestore().collection('orders').doc('order-secret').get());
    });
  });

  describe('legacy POS client behaviour', () => {
    it('allows the legacy client to move order lifecycle via a direct SDK write', async () => {
      // The legacy orderbhojan client wrote `orderStatus` straight to /orders.
      // That must keep working or the legacy tablet loses the ability to run an
      // order at all; the Command API is the target, not a reason to brick it.
      await seedFirestore(async (db) => {
        await db.collection('users').doc('staff-1').set({
          restaurantId: 'tenant-1',
          role: 'cashier',
        });
        await db.collection('orders').doc('order-1').set({
          tenantId: 'tenant-1',
          status: 'ACCEPTED',
          orderStatus: 'ACCEPTED',
          total: 250,
        });
      });

      const staff = testEnv.authenticatedContext('staff-1');
      await assertSucceeds(
        staff.firestore().collection('orders').doc('order-1').update({
          orderStatus: 'PREPARING',
        })
      );
    });

    it('denies the legacy client fallback that tried to set paymentStatus directly', async () => {
      // The same legacy fallback wrote `paymentStatus` and `timestamps` on API
      // failure. `timestamps` is outside the staff field allow-list and
      // `paymentStatus: PAID` is settlement, so this fallback can no longer
      // succeed. That is intended: the fallback is why the Command API exists.
      await seedFirestore(async (db) => {
        await db.collection('users').doc('staff-1').set({
          restaurantId: 'tenant-1',
          role: 'cashier',
        });
        await db.collection('orders').doc('order-1').set({
          tenantId: 'tenant-1',
          status: 'ACCEPTED',
          orderStatus: 'ACCEPTED',
          total: 250,
        });
      });

      const staff = testEnv.authenticatedContext('staff-1');
      await assertFails(
        staff.firestore().collection('orders').doc('order-1').update({
          paymentStatus: 'PAID',
        })
      );
      await assertFails(
        staff.firestore().collection('orders').doc('order-1').update({
          timestamps: { placedAt: new Date().toISOString() },
        })
      );
    });
  });
});
