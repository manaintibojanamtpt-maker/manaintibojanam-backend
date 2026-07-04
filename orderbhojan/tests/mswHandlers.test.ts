import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { marketplaceHandlers } from '../src/marketplace-api/mocks/handlers';

describe('MSW marketplace handlers', () => {
  it('registers handlers for all M0 mock endpoints', () => {
    assert.ok(marketplaceHandlers.length >= 10);
  });
});
