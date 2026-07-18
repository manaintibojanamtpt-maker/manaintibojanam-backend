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
    assert.match(source, /app\.post\('\/api\/owner\/orders\/:orderId\/verify-payment'/);
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
    const dashboard = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/owner/OwnerDashboard.tsx'),
      'utf8',
    );
    assert.match(dashboard, /useDashboardOrders/);
    assert.doesNotMatch(dashboard, /onSnapshot\(.*orders/);
    assert.doesNotMatch(dashboard, /firebase\/firestore/);

    const orders = fs.readFileSync(path.join(process.cwd(), 'src/pages/owner/OwnerOrders.tsx'), 'utf8');
    assert.match(orders, /subscribeOwnerOrders/);
    assert.match(orders, /verifyOwnerOrderPayment/);
    assert.match(orders, /Payment received — Verify & Accept/);
    assert.doesNotMatch(orders, /onSnapshot\(.*orders/);
    assert.doesNotMatch(orders, /firebase\/firestore/);

    const provider = fs.readFileSync(
      path.join(process.cwd(), 'src/context/DashboardRealtimeProvider.tsx'),
      'utf8',
    );
    assert.match(provider, /fetchOwnerOrdersList|fetchOwnerOrdersFromApi/);
    assert.doesNotMatch(provider, /onSnapshot/);
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
