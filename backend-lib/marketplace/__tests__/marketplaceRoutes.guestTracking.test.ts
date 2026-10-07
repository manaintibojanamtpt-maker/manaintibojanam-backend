import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createFakeFirestore } from '../../orders/__tests__/fakeFirestore.js';
import { getMarketplaceTrackingForGuest } from '../projectMarketplaceOrders.js';
import { mockFieldValue } from '../../orders/__tests__/fakeFirestore.js';

const TENANT = 'tenant_alpha';

describe('guest tracking authorization', () => {
  it('getMarketplaceTrackingForGuest matches phone last-4', async () => {
    const db = createFakeFirestore({
      seed: {
        'orders/o1': {
          orderId: 'o1',
          tenantId: TENANT,
          orderStatus: 'PLACED',
          phone: '9876543210',
          customerPhone: '9876543210',
          deliveryAddress: { phone: '9876543210' },
        },
      },
    });

    const result = await getMarketplaceTrackingForGuest(db as never, 'o1', '3210', mockFieldValue);
    assert.ok(result);
    assert.equal(result?.orderId, 'o1');
  });

  it('getMarketplaceTrackingForGuest rejects wrong phone last-4', async () => {
    const db = createFakeFirestore({
      seed: {
        'orders/o1': {
          orderId: 'o1',
          tenantId: TENANT,
          orderStatus: 'PLACED',
          phone: '9876543210',
          customerPhone: '9876543210',
          deliveryAddress: { phone: '9876543210' },
        },
      },
    });

    const result = await getMarketplaceTrackingForGuest(db as never, 'o1', '9999', mockFieldValue);
    assert.equal(result, null);
  });

  it('getMarketplaceTrackingForGuest returns null for nonexistent order', async () => {
    const db = createFakeFirestore();
    const result = await getMarketplaceTrackingForGuest(db as never, 'missing', '1234', mockFieldValue);
    assert.equal(result, null);
  });

  it('lookup does not mint tokens — only checkout or recovery can issue', async () => {
    const db = createFakeFirestore({
      seed: {
        'orders/o1': {
          orderId: 'o1',
          tenantId: TENANT,
          orderStatus: 'PLACED',
          phone: '9876543210',
          customerPhone: '9876543210',
          deliveryAddress: { phone: '9876543210' },
        },
      },
    });

    await getMarketplaceTrackingForGuest(db as never, 'o1', '3210', mockFieldValue);
    const grants = db.readAll('supervisor_grants');
    assert.equal(Object.keys(grants).length, 0, 'lookup must not create guest tokens');
  });
});
