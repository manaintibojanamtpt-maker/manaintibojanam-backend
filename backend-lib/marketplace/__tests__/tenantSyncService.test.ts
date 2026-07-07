import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractTenantSyncRevision } from '../tenantProjectionHelpers.js';

describe('tenantSyncService revision contract', () => {
  it('prefers explicit tenantSyncRevision on tenant documents', () => {
    assert.equal(
      extractTenantSyncRevision({
        tenantSyncRevision: '2026-07-06T14:00:00.000Z',
        updatedAt: '2026-07-06T12:00:00.000Z',
        storeOperations: { updatedAt: '2026-07-06T13:00:00.000Z' },
      }),
      '2026-07-06T14:00:00.000Z',
    );
  });
});
