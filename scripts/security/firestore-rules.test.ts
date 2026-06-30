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
});
