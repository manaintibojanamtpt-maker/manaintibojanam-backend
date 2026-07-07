import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('owner orders API migration', () => {
  it('registers tenant-scoped owner orders list route', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/marketplace/ownerOrdersRoutes.ts'),
      'utf8',
    );
    assert.match(source, /app\.get\('\/api\/owner\/orders'/);
    assert.match(source, /assertOwnerTenantAccess/);
    assert.match(source, /hasMore/);
  });

  it('polls owner orders via API instead of Firestore onSnapshot', () => {
    const reads = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/ownerOrdersReads.ts'),
      'utf8',
    );
    assert.match(reads, /fetchOwnerOrdersFromApi/);
    assert.match(reads, /OWNER_ORDERS_POLL_MS/);
    assert.doesNotMatch(reads, /onSnapshot/);
    assert.doesNotMatch(reads, /firebase\/firestore/);
  });

  it('owner dashboard and orders pages avoid direct order listeners', () => {
    for (const file of ['src/pages/owner/OwnerDashboard.tsx', 'src/pages/owner/OwnerOrders.tsx']) {
      const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      assert.match(source, /subscribeOwnerOrders/);
      assert.doesNotMatch(source, /onSnapshot\(.*orders/);
    }
    const orders = fs.readFileSync(path.join(process.cwd(), 'src/pages/owner/OwnerOrders.tsx'), 'utf8');
    assert.doesNotMatch(orders, /firebase\/firestore/);
  });

  it('useOwnerMenuCount polls owner menu API', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/hooks/useOwnerMenuCount.ts'),
      'utf8',
    );
    assert.match(source, /fetchOwnerMenuItems/);
    assert.doesNotMatch(source, /onSnapshot/);
    assert.doesNotMatch(source, /firebase\/firestore/);
  });
});
