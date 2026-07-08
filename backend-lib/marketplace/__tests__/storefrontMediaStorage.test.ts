import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStorefrontMediaPublicPath,
  buildStorefrontMediaPublicUrl,
  MAX_STOREFRONT_MEDIA_BYTES,
} from '../storefrontMediaStorage.js';

describe('storefrontMediaStorage', () => {
  it('builds public media URLs', () => {
    assert.equal(buildStorefrontMediaPublicPath('mana-inti', 'cover-1'), '/api/marketplace/media/mana-inti/cover-1');
    assert.equal(
      buildStorefrontMediaPublicUrl('https://bhojanos.com', 'mana-inti', 'cover-1'),
      'https://bhojanos.com/api/marketplace/media/mana-inti/cover-1',
    );
  });

  it('caps inline upload size under Firestore-safe limit', () => {
    assert.equal(MAX_STOREFRONT_MEDIA_BYTES, 389120);
  });
});
