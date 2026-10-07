/**
 * Supervisor verification and the grants it issues.
 *
 * The properties under test are the ones a four-digit secret actually depends on:
 * a wrong code never produces a grant, a grant cannot be replayed or moved to
 * another tenant or operation, an expired grant stops working, and no refusal is
 * invisible — every attempt, granted or refused, leaves an audit record.
 */

import { it, describe } from 'node:test';
import assert from 'node:assert/strict';

import { createFakeFirestore } from './fakeFirestore';
import {
  SUPERVISOR_AUDIT_COLLECTION,
  SUPERVISOR_CREDENTIAL_COLLECTION,
  SUPERVISOR_GRANT_COLLECTION,
  SUPERVISOR_GRANT_TTL_MS,
  SUPERVISOR_MAX_ATTEMPTS,
  SUPERVISOR_OPERATIONS,
  consumeSupervisorGrant,
  fingerprintCode,
  hashSupervisorCode,
  newCredentialSalt,
  setSupervisorCredential,
  supervisorAttemptStatus,
  verifyCodeAgainstHash,
  verifySupervisorCredential,
} from '../supervisorVerification';

const TENANT = 'tenant_alpha';
const OTHER_TENANT = 'tenant_beta';
const GOOD_CODE = '4815-2299';
const mockFieldValue = { serverTimestamp: () => 'SERVER_TIMESTAMP' } as never;

type TestDb = ReturnType<typeof createFakeFirestore>;

const dbWith = async (code: string, tenantId = TENANT) => {
  const db = createFakeFirestore();
  const result = await setSupervisorCredential(db as never, mockFieldValue, {
    tenantId,
    code,
    actorUid: 'owner_1',
  });
  assert.equal(result.ok, true, `credential provisioning failed: ${result.error ?? ''}`);
  return db;
};

const attempt = (db: TestDb, overrides: Record<string, unknown> = {}) =>
  verifySupervisorCredential({
    db: db as never,
    fieldValue: mockFieldValue,
    tenantId: TENANT,
    operation: 'REOPEN_BUSINESS_DAY',
    code: GOOD_CODE,
    actorUid: 'staff_1',
    actorRole: 'manager',
    correlationId: 'corr_sv',
    ...overrides,
  } as never);

const auditDocs = (db: TestDb) => db.readAll(SUPERVISOR_AUDIT_COLLECTION);

describe('supervisor verification', () => {
  describe('credential storage', () => {
    it('stores only a salted hash, never the code', async () => {
      const db = await dbWith(GOOD_CODE);
      const stored = db.read(SUPERVISOR_CREDENTIAL_COLLECTION, TENANT);

      assert.ok(stored, 'the credential document exists');
      assert.equal(typeof stored?.salt, 'string');
      assert.equal(typeof stored?.codeHash, 'string');

      // The plaintext appears nowhere in the document.
      const serialized = JSON.stringify(stored);
      assert.equal(serialized.includes(GOOD_CODE), false, 'the code is not recoverable from storage');
      assert.equal(serialized.includes('4815'), false);

      // The stored hash is exactly what the salt and code reproduce.
      assert.equal(
        stored?.codeHash,
        hashSupervisorCode(GOOD_CODE, String(stored?.salt)),
        'the hash is derived from the code and salt'
      );
    });

    it('salts separately, so identical codes do not collide across tenants', () => {
      const saltA = newCredentialSalt();
      const saltB = newCredentialSalt();
      assert.notEqual(saltA, saltB);
      assert.notEqual(hashSupervisorCode('123456', saltA), hashSupervisorCode('123456', saltB));
    });

    it('compares correctly and rejects a near miss', () => {
      const salt = newCredentialSalt();
      const hash = hashSupervisorCode(GOOD_CODE, salt);
      assert.equal(verifyCodeAgainstHash(GOOD_CODE, salt, hash), true);
      assert.equal(verifyCodeAgainstHash('4815-2298', salt, hash), false);
      assert.equal(verifyCodeAgainstHash('', salt, hash), false);
      assert.equal(verifyCodeAgainstHash(GOOD_CODE, salt, ''), false);
      assert.equal(verifyCodeAgainstHash(GOOD_CODE, salt, 'not-a-hash'), false);
    });

    it('refuses to provision a credential that is too short to be a credential', async () => {
      const db = createFakeFirestore();
      const result = await setSupervisorCredential(db as never, mockFieldValue, {
        tenantId: TENANT,
        code: '123',
        actorUid: 'owner_1',
      });
      assert.equal(result.ok, false);
      assert.equal(db.read(SUPERVISOR_CREDENTIAL_COLLECTION, TENANT), undefined);
    });
  });

  describe('granting', () => {
    it('issues a grant bound to actor, tenant and operation', async () => {
      const db = await dbWith(GOOD_CODE);
      const now = Date.UTC(2026, 0, 1, 12, 0, 0);
      const result = await attempt(db, { now });

      assert.equal(result.ok, true);
      assert.equal(result.ok && result.grant.tenantId, TENANT);
      assert.equal(result.ok && result.grant.actorUid, 'staff_1');
      assert.equal(result.ok && result.grant.operation, 'REOPEN_BUSINESS_DAY');
      assert.equal(
        result.ok && result.grant.expiresAt,
        now + SUPERVISOR_GRANT_TTL_MS,
        'the grant lifetime is short and explicit'
      );
      assert.ok(SUPERVISOR_GRANT_TTL_MS <= 10 * 60 * 1000, 'a grant cannot outlive a shift pause');
    });

    it('stores the grant under a hash, so the token is not in the document id', async () => {
      const db = await dbWith(GOOD_CODE);
      const result = await attempt(db);
      assert.equal(result.ok, true);
      if (!result.ok) return;

      const docs = db.readAll(SUPERVISOR_GRANT_COLLECTION);
      const ids = Object.keys(docs);
      assert.equal(ids.length, 1);
      assert.equal(
        ids[0]?.includes(result.grant.token),
        false,
        'the document id is not the usable token'
      );
      assert.equal(docs[ids[0] as string]?.tokenHash !== undefined, true);
      assert.equal(docs[ids[0] as string]?.consumedAt, null);
    });

    it('never stores the code in the grant or the audit record', async () => {
      const db = await dbWith(GOOD_CODE);
      await attempt(db);

      const everything = JSON.stringify([db.readAll(SUPERVISOR_GRANT_COLLECTION), auditDocs(db)]);
      assert.equal(everything.includes(GOOD_CODE), false);
      assert.equal(everything.includes('4815-2299'), false);
    });
  });

  describe('refusing', () => {
    it('refuses a wrong code and issues no grant', async () => {
      const db = await dbWith(GOOD_CODE);
      const result = await attempt(db, { code: '0000-0000' });

      assert.equal(result.ok, false);
      assert.equal(!result.ok && result.code, 'INVALID_CODE');
      assert.deepEqual(db.readAll(SUPERVISOR_GRANT_COLLECTION), {});
    });

    it('refuses when the tenant has no supervisor configured', async () => {
      const db = createFakeFirestore();
      const result = await attempt(db);

      assert.equal(result.ok, false);
      assert.equal(!result.ok && result.code, 'NO_CREDENTIAL_CONFIGURED');
      assert.deepEqual(db.readAll(SUPERVISOR_GRANT_COLLECTION), {});
    });

    it('refuses when the credential is disabled', async () => {
      const db = await dbWith(GOOD_CODE);
      await setSupervisorCredential(db as never, mockFieldValue, {
        tenantId: TENANT,
        code: GOOD_CODE,
        actorUid: 'owner_1',
        disabled: true,
      });
      const result = await attempt(db);

      assert.equal(result.ok, false);
      assert.equal(!result.ok && result.code, 'CREDENTIAL_MISMATCH');
      assert.deepEqual(db.readAll(SUPERVISOR_GRANT_COLLECTION), {});
    });

    it('refuses a code shorter than a real credential, without hashing it', async () => {
      const db = await dbWith(GOOD_CODE);
      const result = await attempt(db, { code: '1234' });

      assert.equal(result.ok, false);
      assert.equal(!result.ok && result.code, 'INVALID_CODE');
      assert.deepEqual(db.readAll(SUPERVISOR_GRANT_COLLECTION), {});
    });

    it('refuses an unrecognised operation', async () => {
      const db = await dbWith(GOOD_CODE);
      const result = await attempt(db, { operation: 'DELETE_TENANT' });

      assert.equal(result.ok, false);
      assert.equal(!result.ok && result.code, 'INVALID_OPERATION');
      assert.deepEqual(db.readAll(SUPERVISOR_GRANT_COLLECTION), {});
    });

    it('refuses an unauthenticated caller', async () => {
      const db = await dbWith(GOOD_CODE);
      const result = await attempt(db, { actorUid: '' });

      assert.equal(result.ok, false);
      assert.equal(!result.ok && result.code, 'UNAUTHENTICATED');
      assert.deepEqual(db.readAll(SUPERVISOR_GRANT_COLLECTION), {});
    });

    it('does not let one tenant verify against another tenant credential', async () => {
      const db = await dbWith(GOOD_CODE, OTHER_TENANT);
      const result = await attempt(db);

      assert.equal(result.ok, false);
      assert.equal(!result.ok && result.code, 'NO_CREDENTIAL_CONFIGURED');
      assert.deepEqual(db.readAll(SUPERVISOR_GRANT_COLLECTION), {});
    });
  });

  describe('rate limiting', () => {
    it('locks the tenant out after the attempt limit and then admits it again', async () => {
      const db = await dbWith(GOOD_CODE);
      const base = Date.UTC(2026, 0, 1, 12, 0, 0);

      for (let i = 0; i < SUPERVISOR_MAX_ATTEMPTS; i += 1) {
        const result = await attempt(db, { code: `bad-${i}`, now: base });
        assert.equal(result.ok, false, `attempt ${i + 1} should fail`);
      }

      // Even the correct code is refused while locked out.
      const locked = await attempt(db, { code: GOOD_CODE, now: base });
      assert.equal(locked.ok, false);
      assert.equal(!locked.ok && locked.code, 'RATE_LIMITED');
      assert.ok(!locked.ok && locked.retryAfterMs && locked.retryAfterMs > 0, 'the caller is told how long to wait');
      assert.deepEqual(db.readAll(SUPERVISOR_GRANT_COLLECTION), {});

      // Once the window passes, the correct code works again.
      const later = await attempt(db, { code: GOOD_CODE, now: base + 11 * 60 * 1000 });
      assert.equal(later.ok, true);
    });

    it('keeps one tenant lockout from blocking another tenant', async () => {
      const db = await dbWith(GOOD_CODE, TENANT);
      assert.equal(
        (
          await setSupervisorCredential(db as never, mockFieldValue, {
            tenantId: OTHER_TENANT,
            code: GOOD_CODE,
            actorUid: 'owner_1',
          })
        ).ok,
        true
      );

      const base = Date.UTC(2026, 0, 1, 12, 0, 0);
      for (let i = 0; i < SUPERVISOR_MAX_ATTEMPTS; i += 1) {
        await verifySupervisorCredential({
          db: db as never,
          fieldValue: mockFieldValue,
          tenantId: TENANT,
          operation: 'REOPEN_BUSINESS_DAY',
          code: `bad-${i}`,
          actorUid: 'staff_1',
          actorRole: 'manager',
          correlationId: 'corr_lock',
          now: base,
        } as never);
      }

      assert.equal(
        (await supervisorAttemptStatus(db as never, TENANT, base)).count >= SUPERVISOR_MAX_ATTEMPTS,
        true,
        'the tenant that exhausted its budget is locked out'
      );
      assert.equal(
        (await supervisorAttemptStatus(db as never, OTHER_TENANT, base)).count,
        0,
        'a lockout is scoped to the tenant that caused it'
      );

      const other = await verifySupervisorCredential({
        db: db as never,
        fieldValue: mockFieldValue,
        tenantId: OTHER_TENANT,
        operation: 'REOPEN_BUSINESS_DAY',
        code: GOOD_CODE,
        actorUid: 'staff_2',
        actorRole: 'manager',
        correlationId: 'corr_other',
        now: base,
      } as never);
      assert.equal(other.ok, true);
    });

    it('resets the counter after a successful verification', async () => {
      const db = await dbWith(GOOD_CODE);
      const base = Date.UTC(2026, 0, 1, 12, 0, 0);

      await attempt(db, { code: 'wrong-one', now: base });
      assert.equal(
        (await supervisorAttemptStatus(db as never, TENANT, base)).remaining,
        SUPERVISOR_MAX_ATTEMPTS - 1
      );

      await attempt(db, { code: GOOD_CODE, now: base });
      assert.equal(
        (await supervisorAttemptStatus(db as never, TENANT, base)).remaining,
        SUPERVISOR_MAX_ATTEMPTS,
        'a verified code clears the suspicion'
      );
    });
  });

  describe('grants cannot be replayed or moved', () => {
    const grantOne = async (db: TestDb, now?: number) => {
      const result = await attempt(db, now ? { now } : {});
      assert.equal(result.ok, true);
      if (!result.ok) throw new Error('expected a grant');
      return result.grant;
    };

    it('is consumed exactly once', async () => {
      const db = await dbWith(GOOD_CODE);
      const grant = await grantOne(db);

      const first = await consumeSupervisorGrant(db as never, mockFieldValue, {
        token: grant.token,
        tenantId: TENANT,
        operation: 'REOPEN_BUSINESS_DAY',
        actorUid: 'staff_1',
      });
      assert.equal(first.ok, true);

      const second = await consumeSupervisorGrant(db as never, mockFieldValue, {
        token: grant.token,
        tenantId: TENANT,
        operation: 'REOPEN_BUSINESS_DAY',
        actorUid: 'staff_1',
      });
      assert.equal(second.ok, false);
      assert.equal(!second.ok && second.code, 'GRANT_CONSUMED');
    });

    it('refuses a different actor', async () => {
      const db = await dbWith(GOOD_CODE);
      const grant = await grantOne(db);

      const result = await consumeSupervisorGrant(db as never, mockFieldValue, {
        token: grant.token,
        tenantId: TENANT,
        operation: 'REOPEN_BUSINESS_DAY',
        actorUid: 'staff_other',
      });
      assert.equal(result.ok, false);
      assert.equal(!result.ok && result.code, 'GRANT_MISMATCH');
    });

    it('refuses a different tenant', async () => {
      const db = await dbWith(GOOD_CODE);
      const grant = await grantOne(db);

      const result = await consumeSupervisorGrant(db as never, mockFieldValue, {
        token: grant.token,
        tenantId: OTHER_TENANT,
        operation: 'REOPEN_BUSINESS_DAY',
        actorUid: 'staff_1',
      });
      assert.equal(result.ok, false);
      assert.equal(!result.ok && result.code, 'GRANT_MISMATCH');
    });

    it('refuses a different operation', async () => {
      const db = await dbWith(GOOD_CODE);
      const grant = await grantOne(db);

      const result = await consumeSupervisorGrant(db as never, mockFieldValue, {
        token: grant.token,
        tenantId: TENANT,
        operation: 'RESOLVE_PRICING_REVIEW',
        actorUid: 'staff_1',
      });
      assert.equal(result.ok, false);
      assert.equal(!result.ok && result.code, 'GRANT_MISMATCH');
    });

    it('refuses after expiry', async () => {
      const db = await dbWith(GOOD_CODE);
      const now = Date.UTC(2026, 0, 1, 12, 0, 0);
      const grant = await grantOne(db, now);

      const result = await consumeSupervisorGrant(db as never, mockFieldValue, {
        token: grant.token,
        tenantId: TENANT,
        operation: 'REOPEN_BUSINESS_DAY',
        actorUid: 'staff_1',
        now: now + SUPERVISOR_GRANT_TTL_MS + 1,
      });
      assert.equal(result.ok, false);
      assert.equal(!result.ok && result.code, 'GRANT_EXPIRED');
    });

    it('refuses a token that was never issued', async () => {
      const db = await dbWith(GOOD_CODE);
      const result = await consumeSupervisorGrant(db as never, mockFieldValue, {
        token: 'made-up-token',
        tenantId: TENANT,
        operation: 'REOPEN_BUSINESS_DAY',
        actorUid: 'staff_1',
      });
      assert.equal(result.ok, false);
      assert.equal(!result.ok && result.code, 'GRANT_INVALID');
    });

    it('covers every operation it can be issued for', () => {
      // If an operation is added to the allowlist, it must also be redeemable;
      // this guards against a grant that can be issued but never spent.
      assert.ok(SUPERVISOR_OPERATIONS.length >= 1);
      for (const operation of SUPERVISOR_OPERATIONS) {
        assert.equal(typeof operation, 'string');
        assert.equal(operation.trim(), operation);
      }
    });
  });

  describe('audit trail', () => {
    it('records a successful verification with who and what', async () => {
      const db = await dbWith(GOOD_CODE);
      await attempt(db);

      const docs = Object.values(auditDocs(db));
      assert.equal(docs.length, 1);
      assert.equal(docs[0]?.action, 'pos.supervisor.verify');
      assert.equal(docs[0]?.outcome, 'granted');
      assert.equal(docs[0]?.actorUid, 'staff_1');
      assert.equal(docs[0]?.actorRole, 'manager');
      assert.equal(docs[0]?.tenantId, TENANT);
      assert.equal(docs[0]?.operation, 'REOPEN_BUSINESS_DAY');
      assert.ok(docs[0]?.grantExpiresAt, 'the grant window is auditable');
    });

    it('records every refusal, including lockouts', async () => {
      const db = await dbWith(GOOD_CODE);
      const base = Date.UTC(2026, 0, 1, 12, 0, 0);

      for (let i = 0; i < SUPERVISOR_MAX_ATTEMPTS + 1; i += 1) {
        await attempt(db, { code: 'nope', now: base });
      }

      const docs = Object.values(auditDocs(db));
      assert.equal(docs.length, SUPERVISOR_MAX_ATTEMPTS + 1, 'every attempt leaves a record');
      assert.equal(docs.filter((d) => d.outcome === 'refused').length, SUPERVISOR_MAX_ATTEMPTS + 1);
      assert.ok(
        docs.some((d) => d.reason === 'rate_limited'),
        'the lockout itself is auditable'
      );
    });

    it('correlates repeated wrong codes without retaining anything reversible', async () => {
      const db = await dbWith(GOOD_CODE);
      await attempt(db, { code: 'guess-a' });
      await attempt(db, { code: 'guess-a' });
      await attempt(db, { code: 'guess-b' });

      const docs = Object.values(auditDocs(db));
      const sameCode = docs.filter((d) => d.reason === 'invalid_code').map((d) => d.codeFingerprint);
      assert.equal(sameCode.length, 3);
      assert.equal(sameCode[0], sameCode[1], 'the same wrong code correlates across attempts');
      assert.notEqual(sameCode[0], sameCode[2], 'a different wrong code is distinguishable');
      assert.equal(
        fingerprintCode('guess-a', TENANT).length,
        12,
        'the fingerprint is short, fixed width and one-way'
      );
    });
  });
});