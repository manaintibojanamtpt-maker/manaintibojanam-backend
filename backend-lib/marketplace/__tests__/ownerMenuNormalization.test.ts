import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeMenuAddonGroups,
  normalizeMenuItemPayload,
  normalizeMenuVariants,
} from '../ownerMenuNormalization.js';

describe('ownerMenuNormalization', () => {
  it('normalizes variants with kind, price, and offer price', () => {
    const variants = normalizeMenuVariants([
      { kind: 'half', displayName: 'Half', price: 199, offerPrice: 169 },
      { displayName: 'Full', price: 299 },
      { displayName: '', price: 100 },
    ]);
    assert.equal(variants?.length, 2);
    assert.equal(variants?.[0]?.kind, 'half');
    assert.equal(variants?.[0]?.offerPrice, 169);
  });

  it('normalizes addon groups and drops empty options', () => {
    const groups = normalizeMenuAddonGroups([
      {
        displayName: 'Extras',
        required: true,
        options: [
          { displayName: 'Raita', price: 29 },
          { displayName: '', price: 10 },
        ],
      },
      { displayName: 'Empty group', options: [] },
    ]);
    assert.equal(groups?.length, 1);
    assert.equal(groups?.[0]?.displayName, 'Extras');
    assert.equal(groups?.[0]?.required, true);
    assert.equal((groups?.[0]?.options as unknown[]).length, 1);
  });

  it('clears variants and addonGroups when owner sends empty arrays', () => {
    const payload = normalizeMenuItemPayload(
      {
        name: 'Biryani',
        category: 'Main',
        price: 299,
        variants: [],
        addonGroups: [],
      },
      'demo-kitchen',
    );
    assert.deepEqual(payload.variants, []);
    assert.deepEqual(payload.addonGroups, []);
  });

  it('omits variants when key absent (partial patch safe for callers that merge)', () => {
    const payload = normalizeMenuItemPayload(
      { name: 'Biryani', category: 'Main', price: 299 },
      'demo-kitchen',
    );
    assert.equal('variants' in payload, false);
    assert.equal('addonGroups' in payload, false);
  });
});
