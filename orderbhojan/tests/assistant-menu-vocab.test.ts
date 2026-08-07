import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCartAddUserMessage } from '../src/features/assistant/domain/isCartAddUserMessage';
import {
  correctTranscriptAgainstOrderingVocab,
  enrichCartPlansFromMenuCache,
  matchKitchenFragmentInMessage,
} from '../src/features/assistant/domain/matchOrderingVocabulary';
import { resolveCartPlanRestaurantId } from '../src/features/assistant/domain/resolveCartPlanRestaurant';
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

  it('matches Telugu kitchen name to Latin kitchen hint', () => {
    const hit = matchKitchenFragmentInMessage('రెండు మసాలా దోశ ఇంటి భోజనం నుండి', [
      { id: 'obr_inti-bhojanam-ghar-kha-khana-pune', name: 'Inti bhojanam Ghar kha Khana pune' },
      { id: 'obr_mana-inti', name: 'Mana Inti' },
    ]);
    assert.ok(hit);
    assert.match(hit?.name ?? '', /inti/i);
  });

  it('normalizes “from money” to a Mana Inti kitchen hint', () => {
    const parsed = parseCartAddUserMessage('add masala dosa from money');
    assert.ok(parsed);
    assert.equal(parsed?.itemName, 'masala dosa');
    assert.match(parsed?.kitchenHint ?? '', /mana inti/i);

    const hit = matchKitchenFragmentInMessage(parsed?.kitchenHint ?? '', [
      { id: 'obr_mana-inti', name: 'Mana Inti' },
      { id: 'obr_inti', name: 'Inti Bhojanam' },
    ]);
    assert.ok(hit);
    assert.equal(hit?.id, 'obr_mana-inti');
  });

  it('prefers a strong dish match over the wrong active kitchen', () => {
    resetSearchMenuCacheForTests();
    mergeMenuItemsIntoSearchCache([
      {
        id: 'other_dosa',
        type: 'food',
        label: 'Masala Dosa',
        restaurant: {
          restaurantId: 'other',
          restaurantSlug: 'other',
          displayName: 'Other Kitchen',
          cuisines: [],
          isOpen: true,
          badges: [],
          kitchenFormat: 'cloud_kitchen',
        },
        meta: { price: 99, isVeg: true },
      },
      {
        id: 'mana_inti_mysore_dosa',
        type: 'food',
        label: 'Mysore Masala Dosa',
        restaurant: {
          restaurantId: 'obr_mana-inti',
          restaurantSlug: 'mana-inti',
          displayName: 'Mana Inti',
          cuisines: [],
          isOpen: true,
          badges: [],
          kitchenFormat: 'cloud_kitchen',
        },
        meta: { price: 120, isVeg: true },
      },
    ]);

    const planRestaurant = resolveCartPlanRestaurantId({
      plan: {
        type: 'cart_add_plan',
        requiresConfirmation: true,
        executable: false,
        payload: { name: 'Mysore Masala Dosa' },
      },
      userMessage: 'add mysore masala dosa',
      nearbyKitchens: [
        { id: 'other', name: 'Other Kitchen' },
        { id: 'obr_mana-inti', name: 'Mana Inti' },
      ],
      activeRestaurantId: 'other',
    });

    assert.equal(planRestaurant, 'obr_mana-inti');
    resetSearchMenuCacheForTests();
  });

  it('enriches Masala Dosa against menu typo Malasa Dosa', () => {
    resetSearchMenuCacheForTests();
    mergeMenuItemsIntoSearchCache([
      {
        id: 'malasa_1',
        type: 'food',
        label: 'Malasa Dosa',
        restaurant: {
          restaurantId: 'obr_inti-bhojanam-ghar-kha-khana-pune',
          restaurantSlug: 'inti-bhojanam-ghar-kha-khana-pune',
          displayName: 'Inti bhojanam Ghar kha Khana pune',
          cuisines: [],
          isOpen: true,
          badges: [],
          kitchenFormat: 'home_kitchen',
        },
        meta: { price: 80, isVeg: true },
      },
    ]);

    const enriched = enrichCartPlansFromMenuCache(
      [
        {
          type: 'cart_add_plan',
          requiresConfirmation: true,
          executable: false,
          payload: {
            name: 'Masala Dosa',
            quantity: 2,
            restaurantId: 'obr_inti-bhojanam-ghar-kha-khana-pune',
          },
        },
      ],
      {
        activeRestaurantId: 'obr_inti-bhojanam-ghar-kha-khana-pune',
        userMessage: 'Rendu Masala Dosa from Inti bhojanam',
        nearbyKitchens: [
          {
            id: 'obr_inti-bhojanam-ghar-kha-khana-pune',
            name: 'Inti bhojanam Ghar kha Khana pune',
          },
        ],
      },
    );

    assert.equal(enriched[0]?.payload?.foodId, 'malasa_1');
    assert.equal(enriched[0]?.payload?.name, 'Malasa Dosa');
    resetSearchMenuCacheForTests();
  });

  it('corrects voice transcript dish tokens against menu vocab', () => {
    const corrected = correctTranscriptAgainstOrderingVocab('add two idly', {
      menuItems: [{ id: 'idli_1', name: 'Idli', price: 60, isVeg: true }],
      nearbyKitchens: [{ id: 'k1', name: 'Inti Bhojanam' }],
    });
    assert.match(corrected.toLowerCase(), /idli/);
  });

  it('resolves kitchen from utterance over active restaurant', () => {
    const planRestaurant = resolveCartPlanRestaurantId({
      plan: {
        type: 'cart_add_plan',
        requiresConfirmation: true,
        executable: false,
        payload: { name: 'Masala Dosa' },
      },
      userMessage: 'add masala dosa from intibojanam',
      assistantMessage: 'I found the Masala Dosa at Inti bhojanam Ghar kha Khana pune.',
      nearbyKitchens: [
        { id: 'other', name: 'Spice Hub' },
        { id: 'inti', name: 'Inti bhojanam Ghar kha Khana pune' },
      ],
      activeRestaurantId: 'other',
    });
    assert.equal(planRestaurant, 'inti');
  });

  it('strips wrong-kitchen foodId and rematches on the named kitchen menu', () => {
    resetSearchMenuCacheForTests();
    mergeMenuItemsIntoSearchCache([
      {
        id: 'wrong_kitchen_dosa',
        type: 'food',
        label: 'Masala Dosa',
        restaurant: {
          restaurantId: 'other',
          restaurantSlug: 'other',
          displayName: 'Other Kitchen',
          cuisines: [],
          isOpen: true,
          badges: [],
          kitchenFormat: 'cloud_kitchen',
        },
        meta: { price: 99, isVeg: true },
      },
      {
        id: 'inti_dosa',
        type: 'food',
        label: 'Masala Dosa',
        restaurant: {
          restaurantId: 'inti',
          restaurantSlug: 'inti-bhojanam',
          displayName: 'Inti bhojanam',
          cuisines: [],
          isOpen: true,
          badges: [],
          kitchenFormat: 'cloud_kitchen',
        },
        meta: { price: 120, isVeg: true },
      },
    ]);

    const enriched = enrichCartPlansFromMenuCache(
      [
        {
          type: 'cart_add_plan',
          requiresConfirmation: true,
          executable: false,
          payload: {
            name: 'Masala Dosa',
            foodId: 'wrong_kitchen_dosa',
            itemId: 'wrong_kitchen_dosa',
          },
        },
      ],
      {
        activeRestaurantId: 'other',
        userMessage: 'add masala dosa from intibojanam',
        assistantMessage: 'I found Masala Dosa at Inti bhojanam',
        nearbyKitchens: [
          { id: 'other', name: 'Other Kitchen' },
          { id: 'inti', name: 'Inti bhojanam Ghar kha Khana pune' },
        ],
      },
    );

    assert.equal(enriched[0]?.payload?.restaurantId, 'inti');
    assert.equal(enriched[0]?.payload?.foodId, 'inti_dosa');
    resetSearchMenuCacheForTests();
  });
});
