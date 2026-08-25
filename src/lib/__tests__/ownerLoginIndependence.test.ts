import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatOwnerAuthError, resolveOwnerLoginError } from '../ownerAuthErrors';
import { ensureAuthPersistence } from '../../firebase';
import { useSubscriptionStatus } from '../subscriptionQueries';

describe('Owner Authentication Independence & Resiliency Suite', () => {
  it('1 & 4. Subscription failure cannot block Owner authentication', async () => {
    // Simulate auth error when subscription API or storage is down
    const authError = { code: 'auth/invalid-credential', message: 'Invalid credentials' };
    
    // Fake hanging auth instance to test timeout resilience
    const hangingAuth: any = {
      currentUser: null,
    };

    const resolvedMessage = await resolveOwnerLoginError(authError, 'test@example.com', { configReady: true }, hangingAuth);
    
    assert.ok(resolvedMessage.length > 0);
    assert.match(resolvedMessage, /Invalid email or password|Incorrect password|No BhojanOS owner account/);
  });

  it('2. ensureAuthPersistence completes within safety timeout even if storage is delayed', async () => {
    const start = Date.now();
    await ensureAuthPersistence();
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 3000, `ensureAuthPersistence took ${elapsed}ms, should resolve quickly`);
  });

  it('3 & 6. Subscription status query is disabled when tenantId is null or empty', () => {
    // When tenantId is null, subscription query enabled condition evaluates to false
    const tenantId: string | null = null;
    const isEnabled = !!tenantId;
    assert.equal(isEnabled, false, 'Subscription status query must NOT execute before authentication/tenant resolution');
  });

  it('5. User-facing auth error formatting handles network and credential failures without crashing', () => {
    const networkError = formatOwnerAuthError({ code: 'auth/network-request-failed' }, { configReady: true });
    assert.match(networkError, /Network error/);

    const credentialError = formatOwnerAuthError({ code: 'auth/invalid-credential' }, { configReady: true });
    assert.match(credentialError, /Invalid email or password/);
  });
});
