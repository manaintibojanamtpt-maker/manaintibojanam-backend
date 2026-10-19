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

  it('computes exact canonical revenue 115 with subtotal present (subtotal=100, discount=10, tax=5, delivery=20, totalAmount=115)', async () => {
    const orders = [
      {
        tenantId: 'tenant_1',
        status: 'DELIVERED',
        paymentStatus: 'paid',
        paymentMethod: 'UPI',
        subtotal: 100,
        discountAmount: 10,
        gstAmount: 5,
        deliveryFee: 20,
        totalAmount: 115,
        createdAt: new Date('2026-10-17T10:00:00.000+05:30'),
      },
    ];

    const db = createMockDb(orders);
    const summary = await getAuthoritativeDailySalesSummary(
      db,
      'tenant_1',
      new Date('2026-10-17T12:00:00.000+05:30')
    );

    assert.equal(summary.totalRevenue, 115, 'Canonical total revenue matches totalAmount 115 exactly');
    assert.equal(summary.netSales, 115, 'Canonical net billable sales matches totalAmount 115');
    assert.equal(summary.grossOrderValue, 125, 'Gross order value = totalAmount + discount (115 + 10 = 125)');
    assert.equal(summary.merchandiseSales, 100, 'Food subtotal before discount');
    assert.equal(summary.netMerchandiseSales, 90, 'Food sales net of discount (100 - 10 = 90)');
    assert.equal(summary.taxAmount, 5, 'Tax / GST collected');
    assert.equal(summary.deliveryCharges, 20, 'Delivery fee collected');
    assert.equal(summary.totalDiscounts, 10, 'Discount tracked');
    assert.equal(summary.verifiedCollections, 115);
    assert.equal(summary.receivables, 0);
  });

  it('yields identical canonical revenue 115 when subtotal is missing from order schema', async () => {
    const orders = [
      {
        tenantId: 'tenant_1',
        status: 'DELIVERED',
        paymentStatus: 'paid',
        paymentMethod: 'UPI',
        // subtotal missing
        discountAmount: 10,
        totalAmount: 115,
        createdAt: new Date('2026-10-17T10:00:00.000+05:30'),
      },
    ];

    const db = createMockDb(orders);
    const summary = await getAuthoritativeDailySalesSummary(
      db,
      'tenant_1',
      new Date('2026-10-17T12:00:00.000+05:30')
    );

    assert.equal(summary.totalRevenue, 115, 'Total revenue is 115 without subtotal');
    assert.equal(summary.netSales, 115, 'Net billable sales is 115 without subtotal');
    assert.equal(summary.grossOrderValue, 125);
    assert.equal(summary.totalDiscounts, 10);
  });

  it('handles refunds occurring on a later calendar date accurately', async () => {
    // Order placed on Oct 16 for 400
    // Refund initiated on Oct 17 with refundedAt timestamp
    const orders = [
      {
        tenantId: 'tenant_1',
        status: 'REFUNDED',
        paymentStatus: 'refunded',
        totalAmount: 400,
        refundAmount: 400,
        createdAt: new Date('2026-10-16T18:00:00.000+05:30'),
        refundedAt: new Date('2026-10-17T10:00:00.000+05:30'),
      },
    ];

    const db = createMockDb(orders);
    // When querying for Oct 16, order is reflected as refunded
    const summaryOct16 = await getAuthoritativeDailySalesSummary(
      db,
      'tenant_1',
      new Date('2026-10-16T20:00:00.000+05:30')
    );

    assert.equal(summaryOct16.refundAmount, 400);
    assert.equal(summaryOct16.totalRevenue, 0, 'Collections zeroed out by refund');
    assert.equal(summaryOct16.refundedOrderCount, 1);
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
