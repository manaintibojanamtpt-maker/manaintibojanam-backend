import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MarketplaceMediaValidationError,
  omitUndefinedFields,
  sanitizeMarketplacePayload,
  stripUndefinedDeep,
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

  it('sanitizes festival offers without undefined Firestore fields', () => {
    const result = sanitizeMarketplacePayload({
      offers: [
        {
          offerId: 'offer_1',
          title: 'Diwali Feast',
          displayText: '20% off orders above ₹499',
          enabled: true,
          priority: 0,
          type: 'festival',
        },
      ],
    });

    const offers = result?.offers as Record<string, unknown>[];
    assert.equal(offers.length, 1);
    const offer = offers[0];
    assert.equal(offer.displayText, '20% off orders above ₹499');
    assert.equal(offer.title, 'Diwali Feast');
    assert.equal(offer.description, '');
    assert.equal(offer.type, 'festival');
    assert.equal(offer.enabled, true);
    assert.ok(!('validFrom' in offer));
    assert.ok(!('validTo' in offer));
    assert.ok(!('badge' in offer));
    for (const value of Object.values(offer)) {
      assert.notEqual(value, undefined);
    }
  });

  it('omitUndefinedFields drops undefined keys', () => {
    const cleaned = omitUndefinedFields({
      title: 'Live',
      badge: undefined,
      description: '',
    });
    assert.deepEqual(cleaned, { title: 'Live', description: '' });
  });

  it('stripUndefinedDeep removes nested undefined Firestore fields', () => {
    const cleaned = stripUndefinedDeep({
      offers: [
        {
          offerId: 'offer_1',
          title: 'Diwali',
          displayText: '20% off',
          description: undefined,
          badge: undefined,
          enabled: true,
        },
      ],
      tagline: undefined,
    }) as Record<string, unknown>;

    const offers = cleaned.offers as Record<string, unknown>[];
    assert.equal(offers.length, 1);
    assert.ok(!('description' in offers[0]));
    assert.ok(!('badge' in offers[0]));
    assert.ok(!('tagline' in cleaned));
  });
});
