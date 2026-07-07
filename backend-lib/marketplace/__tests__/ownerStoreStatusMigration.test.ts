import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('owner store status API migration', () => {
  it('exposes storeOperations and acceptingOrders on owner storefront GET', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/marketplace/ownerStorefrontRoutes.ts'),
      'utf8',
    );
    assert.match(source, /storeOperations:/);
    assert.match(source, /acceptingOrders/);
    assert.match(source, /resolveStoreTiming/);
    assert.match(source, /isStoreOpenNow/);
  });

  it('registers public store-operations route on marketplace API', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/marketplace/marketplaceRoutes.ts'),
      'utf8',
    );
    assert.match(source, /restaurants\/:slug\/store-operations/);
    assert.match(source, /acceptingOrders/);
  });

  it('polls store status via API instead of Firestore onSnapshot', () => {
    const hook = fs.readFileSync(
      path.join(process.cwd(), 'src/hooks/useTenantStoreStatus.ts'),
      'utf8',
    );
    const reads = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/tenantStoreStatusReads.ts'),
      'utf8',
    );
    assert.match(hook, /subscribeTenantStoreStatus/);
    assert.match(reads, /fetchOwnerStoreOperations|fetchPublicStoreOperations/);
    assert.match(reads, /TENANT_STORE_STATUS_POLL_MS/);
    assert.match(reads, /OWNER_STORE_STATUS_POLL_MS/);
    assert.doesNotMatch(hook, /onSnapshot/);
    assert.doesNotMatch(hook, /firebase\/firestore/);
    assert.doesNotMatch(reads, /onSnapshot/);
    assert.doesNotMatch(reads, /firebase\/firestore/);
  });
});
