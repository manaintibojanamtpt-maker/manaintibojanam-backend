import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import type { FoodPublic } from '../src/types/marketplace-food';
import {
  filterMenuItemsByDietary,
  isNonVegFood,
  isVegFood,
  matchesMenuDietaryFilter,
} from '../src/features/food/domain/formatters';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function food(dietary: FoodPublic['dietary'], id = dietary): FoodPublic {
  return {
    foodId: id,
    slug: id,
    name: id,
    price: 100,
    currency: 'INR',
    category: 'Main',
    categoryId: 'main',
    dietary,
    availability: true,
    variants: [],
    addons: [],
  };
}

describe('menu dietary filter helpers', () => {
  it('classifies owner menu dietary flags', () => {
    assert.equal(isVegFood(food('veg')), true);
    assert.equal(isNonVegFood(food('nonVeg')), true);
    assert.equal(isNonVegFood(food('egg', 'egg-item')), true);
    assert.equal(isVegFood(food('nonVeg', 'chicken')), false);
  });

  it('filters menu items by veg and non-veg', () => {
    const items = [food('veg'), food('nonVeg', 'chicken'), food('egg', 'egg')];
    assert.equal(filterMenuItemsByDietary(items, 'veg').length, 1);
    assert.equal(filterMenuItemsByDietary(items, 'nonVeg').length, 2);
    assert.equal(filterMenuItemsByDietary(items, 'all').length, 3);
    assert.equal(matchesMenuDietaryFilter(food('veg'), 'nonVeg'), false);
  });
});

describe('menu dietary filter UI wiring', () => {
  it('food experience exposes sticky dietary filter bar', () => {
    const experience = readFileSync(
      join(root, 'src/presentation/food/OrderBhojanFoodExperience.tsx'),
      'utf8',
    );
    assert.match(experience, /OrderBhojanFoodDietaryFilterBar/);
    assert.match(experience, /filterMenuItemsByDietary/);
    assert.match(experience, /sticky top-0/);
  });
});
