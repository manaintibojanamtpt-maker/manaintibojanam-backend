import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractPushTokensFromCustomerDoc,
  extractPushTokensFromUserDoc,
  mergePushTokens,
  resolveCustomerPushTokens,
} from '../resolveCustomerPushTokens.js';

describe('resolveCustomerPushTokens', () => {
  it('reads legacy user device token fields', () => {
    const tokens = extractPushTokensFromUserDoc({
      deviceTokens: ['android-token-1'],
      fcmTokens: ['web-token-1', 'android-token-1'],
    });
    assert.deepEqual(tokens, ['android-token-1', 'web-token-1', 'android-token-1']);
  });

  it('reads marketplace customer notification token entries', () => {
    const tokens = extractPushTokensFromCustomerDoc({
      notificationTokens: [
        { token: 'android-token-2', platform: 'android', registeredAt: '2026-07-19T00:00:00.000Z' },
        { token: 'ios-token-1', platform: 'ios', registeredAt: '2026-07-19T00:00:01.000Z' },
      ],
    });
    assert.deepEqual(tokens, ['android-token-2', 'ios-token-1']);
  });

  it('merges and deduplicates tokens from both stores', () => {
    const tokens = resolveCustomerPushTokens(
      { deviceTokens: ['shared-token'] },
      {
        notificationTokens: [
          { token: 'shared-token', platform: 'android' },
          { token: 'android-only', platform: 'android' },
        ],
      },
    );
    assert.deepEqual(tokens, ['shared-token', 'android-only']);
  });

  it('returns empty list when no token fields exist', () => {
    assert.deepEqual(mergePushTokens([], []), []);
    assert.deepEqual(resolveCustomerPushTokens({}, {}), []);
  });
});
