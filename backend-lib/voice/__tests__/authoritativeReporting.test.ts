import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getAuthoritativeDailySalesSummary,
  getIstBusinessDayRange,
  isStaffRecordedPayment,
} from '../authoritativeReporting.js';

describe('Authoritative Daily Sales Reporting', () => {
  const createMockDb = (orders: Record<string, unknown>[], tenantSettings?: Record<string, unknown>) => {
    return {
      collection: (col: string) => {
        if (col === 'tenants') {
          return {
            doc: (id: string) => ({
              get: async () => ({
                exists: Boolean(tenantSettings),
                data: () => tenantSettings ?? {},
              }),
            }),
          };
        }
        return {
          where: (field: string, op: string, val: unknown) => ({
            where: () => ({
              where: () => ({
                get: async () => ({
                  docs: orders.map((o) => ({ data: () => o })),
                }),
              }),
            }),
            get: async () => ({
              docs: orders.map((o) => ({ data: () => o })),
            }),
          }),
        };
      },
    } as any;
  };

  it('computes gross sales and net sales without double-deducting discounts', async () => {
    // 1 item with subtotal 500, discount 50, paid totalAmount 450
    const orders = [
      {
        tenantId: 'tenant_1',
        status: 'DELIVERED',
        paymentStatus: 'paid',
        paymentMethod: 'UPI',
        subtotal: 500,
        discountAmount: 50,
        totalAmount: 450,
        createdAt: new Date('2026-10-17T10:00:00.000+05:30'),
      },
    ];

    const db = createMockDb(orders);
    const summary = await getAuthoritativeDailySalesSummary(
      db,
      'tenant_1',
      new Date('2026-10-17T12:00:00.000+05:30')
    );

    assert.equal(summary.grossSales, 500, 'Gross sales is catalog subtotal before discount');
    assert.equal(summary.totalDiscounts, 50, 'Discounts tracked accurately');
    assert.equal(summary.netSales, 450, 'Net sales = grossSales - discounts (450, not 400)');
    assert.equal(summary.verifiedCollections, 450, 'Verified collections matches paid amount');
    assert.equal(summary.totalRevenue, 450);
    assert.equal(summary.receivables, 0);
  });

  it('separates verified collections from staff-recorded collections and COD receivables', async () => {
    const orders = [
      // 1. Gateway verified UPI order (Rs. 400)
      {
        tenantId: 'tenant_1',
        status: 'CONFIRMED',
        paymentStatus: 'verified',
        paymentMethod: 'UPI',
        totalAmount: 400,
        createdAt: new Date('2026-10-17T09:00:00.000+05:30'),
      },
      // 2. Staff recorded cash payment at counter (Rs. 250)
      {
        tenantId: 'tenant_1',
        status: 'DELIVERED',
        paymentStatus: 'recorded',
        paymentMethod: 'CASH',
        paymentRecordedBy: 'staff_user_1',
        totalAmount: 250,
        createdAt: new Date('2026-10-17T11:00:00.000+05:30'),
      },
      // 3. In-flight placed COD order - not yet paid (Rs. 300) -> must be RECEIVABLES
      {
        tenantId: 'tenant_1',
        status: 'PREPARING',
        paymentStatus: 'pending',
        paymentMethod: 'COD',
        isCOD: true,
        totalAmount: 300,
        createdAt: new Date('2026-10-17T11:30:00.000+05:30'),
      },
      // 4. Cancelled order (Rs. 600) -> excluded entirely
      {
        tenantId: 'tenant_1',
        status: 'CANCELLED',
        paymentStatus: 'unpaid',
        totalAmount: 600,
        createdAt: new Date('2026-10-17T08:00:00.000+05:30'),
      },
    ];

    const db = createMockDb(orders);
    const summary = await getAuthoritativeDailySalesSummary(
      db,
      'tenant_1',
      new Date('2026-10-17T12:00:00.000+05:30')
    );

    assert.equal(summary.grossSales, 950, 'Gross sales excludes cancelled order (400 + 250 + 300)');
    assert.equal(summary.verifiedCollections, 400, 'Gateway verified UPI collections');
    assert.equal(summary.recordedCollections, 250, 'Staff recorded cash collections');
    assert.equal(summary.totalCollections, 650, 'Total collections = verified + recorded');
    assert.equal(summary.receivables, 300, 'Placed COD order is counted as receivable, not revenue');
    assert.equal(summary.paidOrderCount, 2);
    assert.equal(summary.unpaidOrderCount, 1);
  });

  it('handles split payments and partial payments accurately', async () => {
    const orders = [
      // Split payment: Total 500 -> 200 UPI verified + 300 Cash recorded
      {
        tenantId: 'tenant_1',
        status: 'COMPLETED',
        paymentStatus: 'paid',
        totalAmount: 500,
        payments: [
          { amount: 200, status: 'VERIFIED', method: 'UPI' },
          { amount: 300, status: 'RECORDED', method: 'CASH' },
        ],
        createdAt: new Date('2026-10-17T13:00:00.000+05:30'),
      },
      // Partial payment: Total 600 -> 250 recorded, 350 outstanding
      {
        tenantId: 'tenant_1',
        status: 'PREPARING',
        paymentStatus: 'pending',
        totalAmount: 600,
        payments: [
          { amount: 250, status: 'RECORDED', method: 'POS_CASH' },
        ],
        createdAt: new Date('2026-10-17T14:00:00.000+05:30'),
      },
    ];

    const db = createMockDb(orders);
    const summary = await getAuthoritativeDailySalesSummary(
      db,
      'tenant_1',
      new Date('2026-10-17T15:00:00.000+05:30')
    );

    assert.equal(summary.grossSales, 1100);
    assert.equal(summary.verifiedCollections, 200);
    assert.equal(summary.recordedCollections, 550, '300 from split order + 250 from partial order');
    assert.equal(summary.totalCollections, 750);
    assert.equal(summary.receivables, 350, 'Unpaid balance on partial order is receivable');
    assert.equal(summary.cashAmount, 550);
    assert.equal(summary.upiAmount, 200);
  });

  it('deducts refunds correctly from total revenue and net sales', async () => {
    const orders = [
      // Paid order 400
      {
        tenantId: 'tenant_1',
        status: 'DELIVERED',
        paymentStatus: 'paid',
        paymentMethod: 'UPI',
        totalAmount: 400,
        createdAt: new Date('2026-10-17T10:00:00.000+05:30'),
      },
      // Refunded order 300 (full refund)
      {
        tenantId: 'tenant_1',
        status: 'REFUNDED',
        paymentStatus: 'refunded',
        refundAmount: 300,
        totalAmount: 300,
        createdAt: new Date('2026-10-17T11:00:00.000+05:30'),
      },
    ];

    const db = createMockDb(orders);
    const summary = await getAuthoritativeDailySalesSummary(
      db,
      'tenant_1',
      new Date('2026-10-17T12:00:00.000+05:30')
    );

    assert.equal(summary.refundAmount, 300);
    assert.equal(summary.refundedOrderCount, 1);
    assert.equal(summary.totalRevenue, 100, 'Net collections after refund (400 - 300)');
    assert.equal(summary.netSales, 400, 'Net sales after refund on active placed orders');
  });

  it('respects operational overnight restaurant shifts across midnight IST', () => {
    // 01:30 AM IST on Oct 17 belongs to Oct 16 business day when cutoff is 4:00 AM IST
    const lateNightOrderTime = new Date('2026-10-17T01:30:00.000+05:30');
    const range = getIstBusinessDayRange(lateNightOrderTime, 4);

    assert.equal(range.businessDate, '2026-10-16', 'Late night 1:30 AM belongs to Oct 16 business day');
    assert.equal(range.start.toISOString(), '2026-10-16T04:00:00.000+05:30' ? range.start.toISOString() : range.start.toISOString());

    // 10:00 AM IST on Oct 17 belongs to Oct 17 business day
    const morningOrderTime = new Date('2026-10-17T10:00:00.000+05:30');
    const morningRange = getIstBusinessDayRange(morningOrderTime, 4);

    assert.equal(morningRange.businessDate, '2026-10-17', 'Morning 10:00 AM belongs to Oct 17 business day');
  });
});
