import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getInitialMotionTier, MOTION_FPS_FLOOR } from '../deviceMotionCapability.js';

describe('deviceMotionCapability', () => {
  it('exports a sensible FPS floor', () => {
    assert.equal(MOTION_FPS_FLOOR, 50);
  });

  it('returns static tier when reduced motion is preferred', () => {
    const original = globalThis.window;
    globalThis.window = {
      matchMedia: (query: string) => ({ matches: query.includes('reduce') }),
    } as unknown as Window & typeof globalThis;
    try {
      assert.equal(getInitialMotionTier(), 'static');
    } finally {
      globalThis.window = original;
    }
  });
});
