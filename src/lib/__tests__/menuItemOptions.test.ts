import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  countMenuOptions,
  normalizeAddonGroupsForSave,
  normalizeVariantsForSave,
} from '../menuItemOptions.ts';

describe('menuItemOptions', () => {
  it('assigns stable ids and sort order on save', () => {
    const variants = normalizeVariantsForSave(
      [
        { kind: 'half', displayName: ' Half ', price: 199, sortOrder: 99 },
        { kind: 'full', displayName: 'Full', price: 299 },
      ],
      299,
    );
    assert.equal(variants.length, 2);
    assert.ok(variants[0]?.variantId);
    assert.equal(variants[0]?.sortOrder, 0);
    assert.equal(variants[0]?.displayName, 'Half');
  });

  it('filters blank addon options and groups', () => {
    const groups = normalizeAddonGroupsForSave([
      {
        displayName: 'Extras',
        options: [{ displayName: 'Raita', price: 29, kind: 'custom' }, { displayName: '  ', price: 0, kind: 'custom' }],
      },
      { displayName: '  ', options: [{ displayName: 'Egg', price: 20, kind: 'custom' }] },
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0]?.options.length, 1);
  });

  it('counts configured sizes and add-ons for menu table badges', () => {
    const counts = countMenuOptions(
      [{ kind: 'full', displayName: 'Full', price: 299 }],
      [{ displayName: 'Extras', options: [{ displayName: 'Raita', price: 29, kind: 'custom' }] }],
    );
    assert.equal(counts.variantCount, 1);
    assert.equal(counts.addonCount, 1);
  });
});
