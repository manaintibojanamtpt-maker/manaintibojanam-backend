import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  correctTranscriptAgainstOrderingVocab,
  enrichCartPlansFromMenuCache,
  matchKitchenFragmentInMessage,
} from '../src/features/assistant/domain/matchOrderingVocabulary';
import {
  mergeMenuItemsIntoSearchCache,
  resetSearchMenuCacheForTests,
} from '../src/features/search/store/searchMenuCacheStore';

describe('assistant menu vocabulary matching', () => {
  it('matches kitchen name fragments like Bojanam', () => {
    const hit = matchKitchenFragmentInMessage('Bojanam', [
      { id: 'k1', name: 'Inti Bhojanam' },
      { id: 'k2', name: 'Mana Inti' },
    ]);
    assert.ok(hit);
    assert.equal(hit?.name, 'Inti Bhojanam');
  });

  it('enriches cart plans with foodId from menu cache (Vada→Wada)', () => {
    resetSearchMenuCacheForTests();
    mergeMenuItemsIntoSearchCache([
      {
        id: 'wada_1',
        type: 'food',
        label: 'Medu Wada',
        restaurant: {
          restaurantId: 'rest_1',
          restaurantSlug: 'inti-bhojanam',
          displayName: 'Inti Bhojanam',
          cuisines: [],
          isOpen: true,
          badges: [],
          kitchenFormat: 'cloud_kitchen',
        },
        meta: { price: 60, isVeg: true },
      },
    ]);

    const enriched = enrichCartPlansFromMenuCache(
      [
        {
          type: 'cart_add_plan',
          requiresConfirmation: true,
          executable: false,
          payload: { name: 'Medu Vada', quantity: 2 },
        },
      ],
      'rest_1',
    );

    assert.equal(enriched[0]?.payload?.foodId, 'wada_1');
    assert.equal(enriched[0]?.payload?.name, 'Medu Wada');
    resetSearchMenuCacheForTests();
  });

  it('corrects voice transcript dish tokens against menu vocab', () => {
    const corrected = correctTranscriptAgainstOrderingVocab('add two idly', {
      menuItems: [{ id: 'idli_1', name: 'Idli', price: 60, isVeg: true }],
      nearbyKitchens: [{ id: 'k1', name: 'Inti Bhojanam' }],
    });
    assert.match(corrected.toLowerCase(), /idli/);
  });
});
