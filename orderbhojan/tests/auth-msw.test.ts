import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { marketplaceHandlers } from '../src/marketplace-api/mocks/handlers';

describe('MSW auth-aware handlers', () => {
  it('registers marketplace handlers including auth-gated profile', () => {
    assert.ok(marketplaceHandlers.length >= 12);
    const paths = marketplaceHandlers.map((handler) => String(handler.info.path));
    assert.ok(paths.some((path) => path.includes('/profile')));
    assert.ok(paths.some((path) => path.includes('/orders')));
  });
});
