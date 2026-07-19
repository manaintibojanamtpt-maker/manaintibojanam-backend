import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  filterLocalMenuItems,
  menuItemsToSuggestions,
} from '../src/features/search/domain/localMenuItemSearch';
import {
  mergeMenuItemsIntoSearchCache,
  resetSearchMenuCacheForTests,
} from '../src/features/search/store/searchMenuCacheStore';

describe('menu item search UX', () => {
  it('filters cached menu items instantly for partial queries', () => {
    resetSearchMenuCacheForTests();
    mergeMenuItemsIntoSearchCache([
      {
        id: 'food_andhra_mini_thali',
        type: 'food',
        label: 'Andhra Veg Thali (Mini)',
        subtitle: 'Veg Thali (South Indian Meals)',
        slug: 'lucky-s-kitchen',
        meta: { price: 149, isVeg: true },
      },
    ]);

    const matches = filterLocalMenuItems('Andhra Veg Thali (Mini)', [
      {
        id: 'food_andhra_mini_thali',
        type: 'food',
        label: 'Andhra Veg Thali (Mini)',
        subtitle: 'Veg Thali (South Indian Meals)',
      },
    ], 8);

    assert.equal(matches[0]?.label, 'Andhra Veg Thali (Mini)');
    assert.equal(
      menuItemsToSuggestions(matches)[0]?.label,
      'Andhra Veg Thali (Mini)',
    );
  });

  it('Menu tab search page uses menu-items hook and suggestions endpoint wiring', () => {
    const root = process.cwd();
    const experience = fs.readFileSync(
      path.join(root, 'src/presentation/search/OrderBhojanSearchExperience.tsx'),
      'utf8',
    );
    const searchBar = fs.readFileSync(
      path.join(root, 'src/presentation/search/OrderBhojanSearchBar.tsx'),
      'utf8',
    );

    assert.match(experience, /useMenuItemSearch/);
    assert.doesNotMatch(experience, /useSearchResults/);
    assert.match(searchBar, /useMenuItemSearchSuggestions/);
    assert.match(
      fs.readFileSync(path.join(root, 'src/marketplace-api/index.ts'), 'utf8'),
      /search\/menu-items/,
    );
  });

  it('search hooks disable live polling interval', () => {
    const root = process.cwd();
    for (const file of [
      'src/features/search/hooks/useSearchResults.ts',
      'src/features/search/hooks/useSearchSuggestions.ts',
      'src/features/search/hooks/useSearchBrowse.ts',
      'src/features/search/hooks/useMenuItemSearch.ts',
      'src/features/search/hooks/useMenuItemSearchSuggestions.ts',
    ]) {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      assert.match(source, /getSearchQueryBehavior/);
      assert.doesNotMatch(source, /getMarketplaceQueryBehavior/);
    }
  });

  it('uses client timeout fallback and browse cache seeding for instant suggestions', () => {
    const root = process.cwd();
    assert.match(
      fs.readFileSync(path.join(root, 'src/features/search/hooks/useMenuItemSearchSuggestions.ts'), 'utf8'),
      /withSearchClientTimeout/,
    );
    assert.match(
      fs.readFileSync(path.join(root, 'src/features/search/ui/SearchProvider.tsx'), 'utf8'),
      /useSearchMenuCacheFromBrowse/,
    );
    assert.match(
      fs.readFileSync(path.join(root, 'src/features/search/domain/localMenuItemSearch.ts'), 'utf8'),
      /replace\(\/\[\^a-z0-9\\s\]\/gi/,
    );
  });
});
