import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('profile native auth and storage fixes', () => {
  it('clears stale guestBrowsing when Firebase session restores', () => {
    const authProvider = readFileSync(join(root, 'src/shared/providers/AuthProvider.tsx'), 'utf8');
    assert.match(authProvider, /setGuestBrowsing\(false\)/);
  });

  it('fetchBearerToken ignores stale guestBrowsing for signed-in users', () => {
    const authService = readFileSync(join(root, 'src/features/auth/application/authService.ts'), 'utf8');
    assert.match(authService, /!user\.isAnonymous/);
    assert.match(authService, /guestBrowsing was stale/);
  });

  it('preferences upsert uses merge setDoc instead of update-only path', () => {
    const repo = readFileSync(
      join(root, 'src/features/auth/infrastructure/customerRepository.ts'),
      'utf8',
    );
    assert.match(repo, /updateCustomerPreferences/);
    assert.match(repo, /upsertCustomerSavedAddress/);
    assert.match(repo, /setDoc\([\s\S]*merge: true/);
    assert.doesNotMatch(repo, /updateDoc\(/);
  });

  it('profile addresses refresh saved list before opening selector', () => {
    const profile = readFileSync(join(root, 'src/presentation/profile/OrderBhojanProfilePage.tsx'), 'utf8');
    assert.match(profile, /refreshSavedAddresses/);
    assert.match(profile, /openExternalUrl/);
  });

  it('favorite toggle rolls back optimistic update on API failure', () => {
    const favorites = readFileSync(join(root, 'src/features/favorites/hooks/useFavoritesSync.ts'), 'utf8');
    assert.match(favorites, /onError:[\s\S]*toggle\(restaurantId\)/);
  });
});
