import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MarketplaceMediaValidationError,
  sanitizeMarketplacePayload,
} from '../marketplaceMediaSanitizer.js';

describe('marketplaceMediaSanitizer', () => {
  it('allows https image URLs', () => {
    const result = sanitizeMarketplacePayload({
      theme: { coverUrl: 'https://cdn.example.com/cover.jpg' },
      gallery: [{ galleryId: 'g1', url: 'https://cdn.example.com/1.jpg', sortOrder: 0 }],
    });
    assert.equal(result?.theme && (result.theme as { coverUrl: string }).coverUrl, 'https://cdn.example.com/cover.jpg');
    assert.equal((result?.gallery as unknown[]).length, 1);
  });

  it('rejects base64 data URLs', () => {
    assert.throws(
      () =>
        sanitizeMarketplacePayload({
          theme: { coverUrl: 'data:image/jpeg;base64,abc' },
        }),
      MarketplaceMediaValidationError,
    );
  });

  it('rejects oversized inline data URLs with a clear message', () => {
    const huge = `data:image/jpeg;base64,${'A'.repeat(600)}`;
    assert.throws(
      () =>
        sanitizeMarketplacePayload({
          gallery: [{ galleryId: 'g1', url: huge, sortOrder: 0 }],
        }),
      (error: unknown) =>
        error instanceof MarketplaceMediaValidationError &&
        (error as Error).message.includes('too large'),
    );
  });
});
