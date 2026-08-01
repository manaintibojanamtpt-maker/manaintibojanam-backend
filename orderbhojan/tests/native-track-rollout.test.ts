import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateNativeTrackRollout,
  parseTrackOrderIdFromPath,
} from '../src/features/nativeTrack/nativeTrackRollout';

describe('nativeTrackRollout', () => {
  it('stays off when kill switches are false (default)', () => {
    const d = evaluateNativeTrackRollout({
      hostEnabled: false,
      trackEnabled: false,
      percent: 100,
      internalEmails: ['a@b.com'],
      userEmail: 'a@b.com',
      cohortKey: 'ob-cohort-deadbeef',
    });
    assert.equal(d.enabled, false);
    assert.equal(d.reason, 'kill_switch_off');
  });

  it('requires both FF_NATIVE_HOST and FF_NATIVE_TRACK', () => {
    const hostOnly = evaluateNativeTrackRollout({
      hostEnabled: true,
      trackEnabled: false,
      percent: 100,
      internalEmails: [],
      cohortKey: 'k',
    });
    assert.equal(hostOnly.enabled, false);
    const both = evaluateNativeTrackRollout({
      hostEnabled: true,
      trackEnabled: true,
      percent: 100,
      internalEmails: [],
      cohortKey: 'k',
    });
    assert.equal(both.enabled, true);
  });

  it('allows internal email when pct=0', () => {
    const d = evaluateNativeTrackRollout({
      hostEnabled: true,
      trackEnabled: true,
      percent: 0,
      internalEmails: ['dogfood@example.com'],
      userEmail: 'dogfood@example.com',
      cohortKey: 'k',
    });
    assert.equal(d.enabled, true);
    assert.equal(d.reason, 'internal_email');
  });

  it('parses track path and deep-link shapes', () => {
    assert.equal(parseTrackOrderIdFromPath('/orders/abc123/track'), 'abc123');
    assert.equal(parseTrackOrderIdFromPath('/orders/abc123/track?phone=99'), 'abc123');
    assert.equal(
      parseTrackOrderIdFromPath('orderbhojan://app/orders/abc123/track'),
      'abc123',
    );
    assert.equal(parseTrackOrderIdFromPath('orderbhojan://orders/abc123/track'), 'abc123');
    assert.equal(parseTrackOrderIdFromPath('/cart'), null);
  });
});
