import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BDS_FROZEN, BDS_VERSION } from '../src/constants';

describe('BDS v1.0 constants', () => {
  it('exports frozen version', () => {
    assert.equal(BDS_VERSION, '1.0.0');
    assert.equal(BDS_FROZEN, true);
  });
});
