import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { OrderSDK } from '../orders/OrderSDK';
import type { OrderId, UserId } from '../core/types';
import { sdkOk, sdkFail, sdkError } from '../core/resultHelpers';
import { mapOrderToReadModel } from '../orders/mappers/mapOrderToReadModel';
import { PollingProvider, createPollingProvider } from '../orders/realtime/PollingProvider';
import {
  createOrderRealtimeProvider,
  DEFAULT_REALTIME_PROVIDER_KIND,
} from '../orders/realtime/ProviderFactory';

const sampleOrder = {
  id: 'order-rt-1',
  tenantId: 'tenant-mana',
  userId: 'user-1',
  orderNumber: 7001,
  customerName: 'Realtime User',
  phone: '9876543210',
  status: 'PREPARING',
  paymentMethod: 'cod',
  paymentStatus: 'pending',
  items: [
    {
      menuItemId: 'menu-1',
      name: 'Meals',
      unitPrice: 100,
      quantity: 1,
      lineSubtotal: 100,
      lineTotal: 100,
    },
  ],
  subtotal: 100,
  totalAmount: 100,
  createdAt: '2026-06-26T12:00:00.000Z',
};

const sampleOrderTwo = {
  ...sampleOrder,
  id: 'order-rt-2',
  orderNumber: 7002,
  createdAt: '2026-06-26T13:00:00.000Z',
};

const createMockSdk = (overrides: Partial<OrderSDK> = {}): OrderSDK => ({
  getOrderById: async (orderId) => {
    if (orderId === 'order-rt-1') {
      return sdkOk(mapOrderToReadModel(sampleOrder));
    }
    if (orderId === 'order-rt-2') {
      return sdkOk(mapOrderToReadModel(sampleOrderTwo));
    }
    return sdkFail(sdkError('NOT_FOUND', 'Order not found', { orderId }));
  },
  listOrdersForUser: async () =>
    sdkOk([
      mapOrderToReadModel(sampleOrder),
      mapOrderToReadModel(sampleOrderTwo),
    ]),
  requestGuestViewToken: async () =>
    sdkFail(sdkError('VALIDATION', 'not used in realtime tests')),
  ...overrides,
});

describe('PollingProvider', () => {
  it('exposes kind polling', () => {
    const provider = createPollingProvider(createMockSdk());
    assert.equal(provider.kind, 'polling');
  });

  it('subscribeOrder emits immediate snapshot from OrderSDK', async () => {
    const sdk = createMockSdk();
    const provider = new PollingProvider(sdk, { pollIntervalMs: 60_000 });

    let snapshot: unknown;
    const unsubscribe = provider.subscribeOrder('order-rt-1' as OrderId, (order) => {
      snapshot = order;
    });

    await new Promise((resolve) => setImmediate(resolve));

    assert.ok(snapshot);
    assert.equal((snapshot as { id: string }).id, 'order-rt-1');
    unsubscribe();
  });

  it('subscribeOrder returns null when OrderSDK reports NOT_FOUND', async () => {
    const provider = new PollingProvider(createMockSdk(), { pollIntervalMs: 60_000 });
    let snapshot: unknown = 'pending';

    const unsubscribe = provider.subscribeOrder('missing' as OrderId, (order) => {
      snapshot = order;
    });

    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(snapshot, null);
    unsubscribe();
  });

  it('subscribeOrderList uses listOrdersForUser for logged-in scope', async () => {
    let listCalls = 0;
    const sdk = createMockSdk({
      listOrdersForUser: async () => {
        listCalls += 1;
        return sdkOk([mapOrderToReadModel(sampleOrder)]);
      },
    });

    const provider = new PollingProvider(sdk, { pollIntervalMs: 60_000 });
    const snapshots: number[] = [];

    const unsubscribe = provider.subscribeOrderList(
      { userId: 'user-1' },
      (orders) => snapshots.push(orders.length)
    );

    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(listCalls, 1);
    assert.deepEqual(snapshots, [1]);
    unsubscribe();
  });

  it('subscribeOrderList fetches guest orders via getOrderById', async () => {
    let getCalls = 0;
    const sdk = createMockSdk({
      getOrderById: async (orderId) => {
        getCalls += 1;
        const createdAt =
          orderId === 'order-rt-2'
            ? '2026-06-26T13:00:00.000Z'
            : '2026-06-26T12:00:00.000Z';
        return sdkOk(mapOrderToReadModel({ ...sampleOrder, id: orderId, createdAt }));
      },
    });

    const provider = new PollingProvider(sdk, { pollIntervalMs: 60_000 });
    const snapshots: string[][] = [];

    const unsubscribe = provider.subscribeOrderList(
      { guestOrderIds: ['order-rt-1', 'order-rt-2'] },
      (orders) => snapshots.push(orders.map((order) => order.id))
    );

    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(getCalls, 2);
    assert.deepEqual(snapshots[0], ['order-rt-2', 'order-rt-1']);
    unsubscribe();
  });

  it('subscribeOrderList returns empty array when no guest ids', async () => {
    const sdk = createMockSdk({
      getOrderById: async () => {
        throw new Error('should not be called');
      },
    });

    const provider = new PollingProvider(sdk);
    let length = -1;

    const unsubscribe = provider.subscribeOrderList({ guestOrderIds: [] }, (orders) => {
      length = orders.length;
    });

    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(length, 0);
    unsubscribe();
  });

  it('unsubscribe stops further polling', async () => {
    let getCalls = 0;
    const sdk = createMockSdk({
      getOrderById: async () => {
        getCalls += 1;
        return sdkOk(mapOrderToReadModel(sampleOrder));
      },
    });

    const provider = new PollingProvider(sdk, { pollIntervalMs: 20 });
    const unsubscribe = provider.subscribeOrder('order-rt-1' as OrderId, () => {});

    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(getCalls, 1);

    unsubscribe();
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(getCalls, 1);
  });
});

describe('PollingProvider parity with OrderSDK one-shot reads', () => {
  it('subscribeOrder first snapshot matches getOrderById', async () => {
    const sdk = createMockSdk();
    const provider = new PollingProvider(sdk, { pollIntervalMs: 60_000 });

    const direct = await sdk.getOrderById('order-rt-1' as OrderId);
    assert.equal(direct.ok, true);

    let streamed: unknown;
    const unsubscribe = provider.subscribeOrder('order-rt-1' as OrderId, (order) => {
      streamed = order;
    });

    await new Promise((resolve) => setImmediate(resolve));

    if (!direct.ok) return;
    assert.deepEqual(streamed, direct.value);
    unsubscribe();
  });

  it('subscribeOrderList first snapshot matches sorted listOrdersForUser', async () => {
    const sdk = createMockSdk();
    const provider = new PollingProvider(sdk, { pollIntervalMs: 60_000 });

    const direct = await sdk.listOrdersForUser({ userId: 'user-1' as UserId }, {});
    assert.equal(direct.ok, true);

    let streamed: unknown;
    const unsubscribe = provider.subscribeOrderList({ userId: 'user-1' }, (orders) => {
      streamed = orders;
    });

    await new Promise((resolve) => setImmediate(resolve));

    if (!direct.ok) return;
    const expected = [...direct.value].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    assert.deepEqual(streamed, expected);
    unsubscribe();
  });
});

describe('ProviderFactory', () => {
  it('defaults to polling provider', () => {
    const provider = createOrderRealtimeProvider(createMockSdk());
    assert.equal(provider.kind, DEFAULT_REALTIME_PROVIDER_KIND);
  });

  it('returns RealtimeProvider interface (strategy)', () => {
    const provider = createOrderRealtimeProvider(createMockSdk(), { kind: 'polling' });
    assert.equal(typeof provider.subscribeOrder, 'function');
    assert.equal(typeof provider.subscribeOrderList, 'function');
  });

  it('rejects unimplemented firestore kind', () => {
    assert.throws(
      () => createOrderRealtimeProvider(createMockSdk(), { kind: 'firestore' }),
      /not implemented/
    );
  });

  it('rejects unimplemented sse kind', () => {
    assert.throws(
      () => createOrderRealtimeProvider(createMockSdk(), { kind: 'sse' }),
      /not implemented/
    );
  });

  it('rejects unimplemented websocket kind', () => {
    assert.throws(
      () => createOrderRealtimeProvider(createMockSdk(), { kind: 'websocket' }),
      /not implemented/
    );
  });
});
