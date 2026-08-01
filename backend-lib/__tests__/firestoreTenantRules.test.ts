import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Firestore Rules - Tenants IDOR Mitigation', () => {
  let testEnv: RulesTestEnvironment;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'bhojanos-test-tenant-rules',
      firestore: {
        rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
      },
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  it('prevents User A from mutating User B\'s tenant document, even if they leave ownerId and createdAt unmodified', async () => {
    // Setup the db with a tenant owned by User B
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection('tenants').doc('tenant-b').set({
        name: 'User B Tenant',
        ownerId: 'user-b-id',
        createdAt: 1234567890
      });
      // Setup User B's user doc with ownership
      await db.collection('users').doc('user-b-id').set({
        ownedTenantIds: ['tenant-b']
      });
      // Setup User A's user doc
      await db.collection('users').doc('user-a-id').set({
        ownedTenantIds: []
      });
    });

    // Authenticate as User A
    const userAContext = testEnv.authenticatedContext('user-a-id', { email: 'usera@example.com' });
    const userADb = userAContext.firestore();

    // User A tries to modify User B's tenant (leaving createdAt and ownerId untouched)
    // Previously this worked due to the isUnmodified bypass
    await assertFails(
      userADb.collection('tenants').doc('tenant-b').update({
        name: 'Hacked by User A',
      })
    );
  });

  it('allows User B to mutate their own tenant', async () => {
    const userBContext = testEnv.authenticatedContext('user-b-id', { email: 'userb@example.com' });
    const userBDb = userBContext.firestore();

    await assertSucceeds(
      userBDb.collection('tenants').doc('tenant-b').update({
        name: 'User B Renamed Tenant',
      })
    );
  });
});
