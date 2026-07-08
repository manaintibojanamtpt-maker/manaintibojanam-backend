import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Sprint 19 — live search sync', () => {
  it('auto-enables FF_OB_SEARCH when FF_OB_FIRESTORE is set', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/featureFlags/flags.ts'),
      'utf8',
    );
    assert.match(source, /FF_OB_SEARCH = true/);
  });

  it('search hooks use live marketplace query behavior', () => {
    const root = process.cwd();
    for (const file of [
      'src/features/search/hooks/useSearchResults.ts',
      'src/features/search/hooks/useSearchSuggestions.ts',
      'src/features/search/hooks/useSearchBrowse.ts',
    ]) {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      assert.match(source, /getMarketplaceQueryBehavior/);
    }
  });

  it('revision sync invalidates search queries', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/features/marketplace/hooks/useMarketplaceRevisionSync.ts'),
      'utf8',
    );
    assert.match(source, /searchKeys\.all/);
  });
});
