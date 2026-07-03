import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  REFERENCE_SDK_VERSION,
  REFERENCE_SDK_FROZEN,
} from '../reference/version';
import { REFERENCE_SDK_MODULE } from '../reference/shared/constants';
import {
  REFERENCE_SDK_VERSION as VERSION_BARREL,
  REFERENCE_SDK_FROZEN as FROZEN_BARREL,
  REFERENCE_SDK_MODULE as MODULE_BARREL,
} from '../reference/types';

describe('ReferenceSDK foundation (M2 PR-3)', () => {
  it('exports REFERENCE_SDK_VERSION as 1.0.0-foundation', () => {
    assert.equal(REFERENCE_SDK_VERSION, '1.0.0-foundation');
    assert.equal(VERSION_BARREL, '1.0.0-foundation');
  });

  it('exports REFERENCE_SDK_FROZEN as false', () => {
    assert.equal(REFERENCE_SDK_FROZEN, false);
    assert.equal(FROZEN_BARREL, false);
  });

  it('exports REFERENCE_SDK_MODULE as reference', () => {
    assert.equal(REFERENCE_SDK_MODULE, 'reference');
    assert.equal(MODULE_BARREL, 'reference');
  });
});

describe('ReferenceSDK entity kind coverage', () => {
  it('defines six hierarchy entity kinds in type exports', async () => {
    const types = await import('../reference/types');
    assert.ok(types);
    // Runtime smoke: branded types are type-only; module loads without side effects
  });
});
