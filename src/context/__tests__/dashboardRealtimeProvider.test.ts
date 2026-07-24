import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  computeLowStockAlerts,
  computePendingOrderCount,
  computePendingOrders,
  detectNewOrderIds,
  filterActiveOrders,
  DASHBOARD_REALTIME_POLL_MS,
  NEW_ORDER_STATUSES,
} from '../dashboardRealtimeHelpers';

describe('dashboardRealtimeHelpers', () => {
  it('counts pending orders using alert statuses', () => {
    const orders = [
      { id: '1', status: 'PENDING', totalAmount: 100, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: '2', status: 'PREPARING', totalAmount: 100, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: '3', status: 'PLACED', totalAmount: 100, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: '4', status: 'PENDING_PAYMENT', totalAmount: 100, createdAt: '2026-01-01T00:00:00.000Z' },
    ];

    assert.equal(computePendingOrderCount(orders), 3);
    assert.deepEqual(computePendingOrders(orders).map((order) => order.id), ['1', '3', '4']);
    assert.ok(NEW_ORDER_STATUSES.has('PAYMENT_VERIFICATION'));
    assert.ok(NEW_ORDER_STATUSES.has('PENDING_PAYMENT'));
  });

  it('filters inactive terminal orders from active dashboard list', () => {
    const orders = [
      { id: '1', status: 'PREPARING', totalAmount: 100, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: '2', status: 'DELIVERED', totalAmount: 100, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: '3', status: 'CANCELLED', totalAmount: 100, createdAt: '2026-01-01T00:00:00.000Z' },
    ];

    assert.deepEqual(filterActiveOrders(orders).map((order) => order.id), ['1']);
  });

  it('derives low-stock alerts including critical out-of-stock items', () => {
    const alerts = computeLowStockAlerts([
      { id: 'a', name: 'Rice', stockCount: 0, lowStockThreshold: 5 } as any,
      { id: 'b', name: 'Dal', stockCount: 3, lowStockThreshold: 5 } as any,
      { id: 'c', name: 'Paneer', stockCount: 10, lowStockThreshold: 5 } as any,
    ]);

    assert.equal(alerts.length, 2);
    assert.equal(alerts[0]?.isCritical, true);
    assert.equal(alerts[1]?.isCritical, false);
  });

  it('detects newly arrived pending orders after baseline snapshot', () => {
    const baseline = detectNewOrderIds(null, [
      { id: 'a', status: 'PENDING', totalAmount: 100, createdAt: '2026-01-01T00:00:00.000Z' },
    ]);
    assert.equal(baseline.newOrderCount, 0);

    const next = detectNewOrderIds(baseline.nextKnownIds, [
      { id: 'a', status: 'PENDING', totalAmount: 100, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'b', status: 'PLACED', totalAmount: 100, createdAt: '2026-01-01T00:00:00.000Z' },
    ]);
    assert.equal(next.newOrderCount, 1);
  });
});

describe('DashboardRealtimeProvider consolidation', () => {
  it('uses a single dashboard poll interval constant', () => {
    assert.equal(DASHBOARD_REALTIME_POLL_MS, 30_000);
  });

  it('centralizes owner dashboard polling in DashboardRealtimeProvider', () => {
    const providerSource = fs.readFileSync(
      path.join(process.cwd(), 'src/context/DashboardRealtimeProvider.tsx'),
      'utf8',
    );
    const orderAlertSource = fs.readFileSync(
      path.join(process.cwd(), 'src/context/OrderAlertContext.tsx'),
      'utf8',
    );
    const dashboardSource = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/owner/OwnerDashboard.tsx'),
      'utf8',
    );
    const menuCountSource = fs.readFileSync(
      path.join(process.cwd(), 'src/hooks/useOwnerMenuCount.ts'),
      'utf8',
    );

    assert.match(providerSource, /DashboardOrdersContext\.Provider/);
    assert.match(providerSource, /DashboardPendingOrdersContext\.Provider/);
    assert.doesNotMatch(orderAlertSource, /fetchOwnerOrdersFromApi/);
    assert.doesNotMatch(orderAlertSource, /setInterval/);
    assert.doesNotMatch(dashboardSource, /subscribeOwnerOrders/);
    assert.match(dashboardSource, /useDashboardOrders/);
    assert.match(dashboardSource, /useDashboardMenu/);
    assert.match(dashboardSource, /useDashboardStoreStatus/);
    assert.match(menuCountSource, /useIsDashboardRealtimeActive/);
  });

  it('wraps owner layout with DashboardRealtimeProvider', () => {
    const layoutSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/owner/OwnerLayout.tsx'),
      'utf8',
    );

    assert.match(layoutSource, /DashboardRealtimeProvider/);
    assert.match(layoutSource, /OrderAlertProvider/);
  });
});
