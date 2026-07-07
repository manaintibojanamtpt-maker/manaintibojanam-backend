import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getMarketplaceTrackingForGuest,
  projectOrderTracking,
} from '../projectMarketplaceOrders.js';

describe('projectMarketplaceOrders guest tracking', () => {
  it('projectOrderTracking builds timeline from status', () => {
    const tracking = projectOrderTracking('ord-1', {
      status: 'PREPARING',
      createdAt: '2026-01-01T10:00:00.000Z',
    });
    assert.equal(tracking.orderId, 'ord-1');
    assert.equal(tracking.status, 'PREPARING');
    assert.ok(tracking.timeline.length >= 1);
  });

  it('getMarketplaceTrackingForGuest matches phone last four digits', async () => {
    const db = {
      collection: () => ({
        doc: () => ({
          get: async () => ({
            exists: true,
            id: 'ord-guest',
            data: () => ({
              status: 'PLACED',
              phone: '9876543210',
              createdAt: '2026-01-01T10:00:00.000Z',
            }),
          }),
        }),
      }),
    } as never;

    const ok = await getMarketplaceTrackingForGuest(db, 'ord-guest', '9999993210');
    assert.ok(ok);
    assert.equal(ok?.orderId, 'ord-guest');

    const bad = await getMarketplaceTrackingForGuest(db, 'ord-guest', '1111111111');
    assert.equal(bad, null);
  });
});
