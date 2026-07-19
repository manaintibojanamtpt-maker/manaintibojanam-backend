import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ANDROID_ORDER_UPDATES_CHANNEL_ID,
  buildFcmMulticastPayload,
} from '../fcmPushPayload.js';

describe('fcmPushPayload', () => {
  it('targets the Android order updates channel', () => {
    const payload = buildFcmMulticastPayload(
      ['token-1'],
      'Order accepted',
      'Your order is being prepared.',
      { type: 'order_status_update', path: '/orders/abc/track' },
    );

    assert.equal(payload.android.notification.channelId, ANDROID_ORDER_UPDATES_CHANNEL_ID);
    assert.equal(payload.android.priority, 'high');
    assert.equal(payload.data.path, '/orders/abc/track');
  });
});
