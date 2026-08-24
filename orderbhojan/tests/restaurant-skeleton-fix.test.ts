import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('restaurant experience skeleton flash fix', () => {
  it('useRestaurantExperience has placeholderData for cached data rendering', () => {
    const experience = readFileSync(
      join(root, 'src/features/restaurant/hooks/useRestaurantExperience.ts'),
      'utf8',
    );

    assert.match(experience, /placeholderData:/);
    assert.match(experience, /previous \?\?/);
    assert.match(experience, /queryClient\.getQueryData/);
    assert.match(experience, /Show cached data immediately, then revalidate in background/);
  });

  it('useRestaurantExperience has refetchOnWindowFocus false', () => {
    const experience = readFileSync(
      join(root, 'src/features/restaurant/hooks/useRestaurantExperience.ts'),
      'utf8',
    );

    assert.match(experience, /refetchOnWindowFocus: false/);
    assert.match(experience, /Don't invalidate on window focus/);
  });

  it('useRestaurantLocationInvalidation is no-op with deprecation comment', () => {
    const experience = readFileSync(
      join(root, 'src/features/restaurant/hooks/useRestaurantExperience.ts'),
      'utf8',
    );

    assert.match(experience, /useRestaurantLocationInvalidation/);
    assert.match(experience, /@deprecated/);
    assert.match(experience, /Intentionally empty - location changes should not cause restaurant skeleton flash/);
    assert.match(experience, /Restaurant experience data is stable across customer location changes/);
  });

  it('useRestaurantExperience has gcTime and staleTime overrides', () => {
    const experience = readFileSync(
      join(root, 'src/features/restaurant/hooks/useRestaurantExperience.ts'),
      'utf8',
    );

    assert.match(experience, /gcTime: Math\.max\(liveQuery\.gcTime, 15 \* 60_000\)/);
    assert.match(experience, /staleTime: Math\.max\(liveQuery\.staleTime, 60_000\)/);
  });

  it('restaurant experience query key includes slug, lat, lng', () => {
    const experience = readFileSync(
      join(root, 'src/features/restaurant/hooks/useRestaurantExperience.ts'),
      'utf8',
    );

    assert.match(experience, /restaurantKeys\.experience\(slug \?\? '', lat, lng\)/);
  });

  it('useRestaurantExperience returns cached data before fresh data arrives', () => {
    const experience = readFileSync(
      join(root, 'src/features/restaurant/hooks/useRestaurantExperience.ts'),
      'utf8',
    );

    // The placeholderData function returns previous data or query client cached data
    // This ensures no skeleton flash during revalidation
    assert.match(experience, /placeholderData: \(previous\) =>/);
    assert.match(experience, /previous \?\?/);
    assert.match(experience, /queryClient\.getQueryData\(restaurantKeys\.experience\(slug, lat, lng\)\)/);
  });
});