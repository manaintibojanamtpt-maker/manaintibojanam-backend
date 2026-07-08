import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { bdsMotionPresets } from '../src/animations/index';
import { bdsIconNames } from '../src/icons/index';

describe('BDS motion presets', () => {
  it('registers core motion tokens', () => {
    assert.ok(bdsMotionPresets.pageEnter);
    assert.ok(bdsMotionPresets.skeleton);
  });
});

describe('BDS icon registry', () => {
  it('includes food marketplace icons', () => {
    assert.ok(bdsIconNames.includes('cart'));
    assert.ok(bdsIconNames.includes('veg'));
  });
});
