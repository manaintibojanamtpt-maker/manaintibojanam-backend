import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createOrderApiAdapter } from '../../sdk/orders/adapters/OrderApiAdapter';
import type { OrderApiPort } from '../../sdk/orders/adapters/OrderApiPort';
import type { OrderId, TenantId } from '../../sdk/core/types';
import { mapOrdersToReadModels } from '../../sdk/orders/mappers/mapOrderToReadModel';
import {
  apiRecordToOwnerOrder,
  coerceOwnerOrderDate,
  readModelToOwnerOrder,
  sortOwnerOrdersNewestFirst,
} from '../ownerOrderReadModelMapper';

const tenantA = 'tenant-kitchen-a';
const tenantB = 'tenant-kitchen-b';

const ownerOrderRecord = {
  id: 'order-owner-1',
  tenantId: tenantA,
  userId: 'customer-1',
  customerName: 'Ravi',
  customerPhone: '9876543210',
  phone: '9876543210',
  status: 'PREPARING',
  paymentMethod: 'cod',
  paymentStatus: 'pending',
  items: [{ menuItemId: 'm1', name: 'Thali', unitPrice: 120, quantity: 2, lineSubtotal: 240, lineTotal: 240 }],
  subtotal: 240,
  totalAmount: 240,
  createdAt: '2026-06-26T11:00:00.000Z',
  deliveryAddress: { addressLine1: '12 MG Road', city: 'Hyderabad' },
  deliveryAssignedAt: '2026-06-26T11:15:00.000Z',
  timeline: [{ id: 'evt-1', eventType: 'status_change' }],
};

const createOwnerMockPort = (overrides: Partial<OrderApiPort> = {}): OrderApiPort => ({
  fetchOrderByIdApi: async (orderId) =>
    orderId === 'order-owner-1' ? ownerOrderRecord : null,
  fetchOrders: async () => [],
  fetchOrdersByTenant: async (tenantId) => {
    if (tenantId === tenantA) {
      return [
        ownerOrderRecord,
        { ...ownerOrderRecord, id: 'order-owner-2', createdAt: '2026-06-26T12:00:00.000Z' },
        { ...ownerOrderRecord, id: 'order-other', tenantId: tenantB },
      ];
    }
    return [];
  },
  requestGuestViewToken: async () => ({ success: false, error: 'not used' }),
  ...overrides,
});

describe('Owner Orders SDK read parity (M1B PR-1)', () => {
  it('readModelToOwnerOrder preserves owner UI fields', () => {
    const ownerOrder = apiRecordToOwnerOrder(ownerOrderRecord);
    assert.equal(ownerOrder.customerPhone, '9876543210');
    assert.equal(ownerOrder.deliveryAddress?.addressLine1, '12 MG Road');
    assert.equal(ownerOrder.deliveryAssignedAt, '2026-06-26T11:15:00.000Z');
    assert.ok(ownerOrder.timeline);
  });

  it('listOrdersForTenant filters by tenant and applies limit', async () => {
    const adapter = createOrderApiAdapter(createOwnerMockPort());
    const result = await adapter.listOrdersForTenant(
      { tenantId: tenantA as TenantId, limit: 1 },
      {}
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.value.length, 1);
    assert.equal(result.value[0].tenantId, tenantA);
    assert.equal(result.value[0].id, 'order-owner-2');
  });

  it('listOrdersForTenant matches mapOrdersToReadModels(port fetch)', async () => {
    const port = createOwnerMockPort();
    const adapter = createOrderApiAdapter(port);
    const apiRecords = (await port.fetchOrdersByTenant?.(tenantA)) ?? [];
    const tenantRecords = apiRecords.filter((record) => record.tenantId === tenantA);
    const expected = mapOrdersToReadModels(tenantRecords).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const result = await adapter.listOrdersForTenant({ tenantId: tenantA as TenantId }, {});

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.value, expected);
  });

  it('listOrdersForTenant fails when port is not configured', async () => {
    const adapter = createOrderApiAdapter({
      fetchOrderByIdApi: async () => null,
      fetchOrders: async () => [],
      requestGuestViewToken: async () => ({ success: false }),
    });

    const result = await adapter.listOrdersForTenant({ tenantId: tenantA as TenantId }, {});
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('getOrderById maps owner order detail shape', async () => {
    const adapter = createOrderApiAdapter(createOwnerMockPort());
    const result = await adapter.getOrderById('order-owner-1' as OrderId);

    assert.equal(result.ok, true);
    if (!result.ok) return;

    const ownerOrder = readModelToOwnerOrder(result.value, ownerOrderRecord);
    assert.equal(ownerOrder.customerName, 'Ravi');
    assert.equal(ownerOrder.totalAmount, 240);
  });

  it('owner order records sort newest first after SDK mapping', () => {
    const mapped = sortOwnerOrdersNewestFirst([
      apiRecordToOwnerOrder(ownerOrderRecord),
      apiRecordToOwnerOrder({
        ...ownerOrderRecord,
        id: 'order-owner-2',
        createdAt: '2026-06-26T12:00:00.000Z',
      }),
    ]);

    assert.equal(mapped[0].id, 'order-owner-2');
    assert.equal(mapped[1].id, 'order-owner-1');
  });

  it('sortOwnerOrdersNewestFirst handles firestore-like timestamps', () => {
    const sorted = sortOwnerOrdersNewestFirst([
      { id: 'a', totalAmount: 1, status: 'PENDING', createdAt: { seconds: 100 } },
      { id: 'b', totalAmount: 1, status: 'PENDING', createdAt: { seconds: 200 } },
    ]);

    assert.equal(sorted[0].id, 'b');
  });

  it('coerceOwnerOrderDate accepts ISO strings from owner API', () => {
    const parsed = coerceOwnerOrderDate('2026-06-26T11:00:00.000Z');
    assert.ok(parsed instanceof Date);
    assert.equal(parsed?.toISOString(), '2026-06-26T11:00:00.000Z');
  });
});
