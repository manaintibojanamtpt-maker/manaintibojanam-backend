import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FirestoreRetryPolicy, isFirestoreQuotaError } from '../firestoreRetryPolicy';

describe('firestoreRetryPolicy', () => {
  let policy: FirestoreRetryPolicy;

  beforeEach(() => {
    policy = new FirestoreRetryPolicy({
      maxAttempts: 3,
      baseDelayMs: 1,
      maxDelayMs: 5,
      circuitFailureThreshold: 2,
      circuitOpenMs: 50,
    });
  });

  it('detects quota-style errors', () => {
    assert.equal(isFirestoreQuotaError({ code: 8, message: 'Quota exceeded' }), true);
    assert.equal(isFirestoreQuotaError(new Error('resource_exhausted')), true);
    assert.equal(isFirestoreQuotaError(new Error('permission denied')), false);
  });

  it('retries quota errors with exponential backoff', async () => {
    let attempts = 0;
    const result = await policy.executeRead('doc:test', async () => {
      attempts += 1;
      if (attempts < 3) {
        throw Object.assign(new Error('Quota exceeded'), { code: 8 });
      }
      return 'ok';
    });

    assert.equal(result, 'ok');
    assert.equal(attempts, 3);
  });

  it('opens circuit after repeated quota failures', async () => {
    const fail = () => {
      throw Object.assign(new Error('Quota exceeded'), { code: 8 });
    };

    await assert.rejects(() => policy.executeRead('doc:a', fail));
    await assert.rejects(() => policy.executeRead('doc:b', fail));
    assert.equal(policy.isCircuitOpen, true);

    await assert.rejects(
      () => policy.executeRead('doc:c', async () => 'should-not-run'),
      /circuit open/i,
    );
  });

  it('coalesces concurrent reads for the same key', async () => {
    let reads = 0;
    const op = async () => {
      reads += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { id: '1' };
    };

    const [a, b] = await Promise.all([
      policy.executeRead('doc:shared', op),
      policy.executeRead('doc:shared', op),
    ]);

    assert.deepEqual(a, { id: '1' });
    assert.deepEqual(b, { id: '1' });
    assert.equal(reads, 1);
  });
});
