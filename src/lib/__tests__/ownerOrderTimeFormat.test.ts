import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatOwnerOrderTime } from '../ownerOrderTimeFormat';

describe('formatOwnerOrderTime', () => {
  it('shows Today label for orders placed earlier today', () => {
    const now = new Date();
    const earlierToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30, 0);
    const label = formatOwnerOrderTime(earlierToday, now);
    assert.match(label, /^Today /);
  });

  it('shows Yesterday label for prior-day orders', () => {
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 20, 30, 0);
    const label = formatOwnerOrderTime(yesterday, now);
    assert.match(label, /^Yesterday /);
    assert.match(label, /8:30 PM|20:30|PM|AM/);
  });

  it('does not fall back to Just now for older timestamps', () => {
    const now = new Date('2026-07-16T14:00:00.000Z');
    const label = formatOwnerOrderTime({ _seconds: 1_752_000_000 }, now);
    assert.notEqual(label, 'Just now');
    assert.notEqual(label, 'Time unavailable');
  });
});
