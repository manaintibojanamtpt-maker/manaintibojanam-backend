import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { resolveAuthPhase } from '../src/features/auth/domain/auth.types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const authRoot = join(root, 'src/features/auth');

function readAuthFile(relativePath: string): string {
  return readFileSync(join(authRoot, relativePath), 'utf8');
}

describe('M1 auth integration boundaries', () => {
  it('auth application layer does not call Marketplace API', () => {
    const files = [
      'application/authService.ts',
      'application/profileBootstrapService.ts',
      'hooks/useCustomerProfile.ts',
      'ui/ProfilePage.tsx',
    ];
    for (const file of files) {
      const content = readAuthFile(file);
      assert.doesNotMatch(content, /getMarketplaceApiClient/);
      assert.doesNotMatch(content, /@\/marketplace-api/);
    }
  });

  it('supports guest browsing without Firebase configuration', () => {
    assert.equal(
      resolveAuthPhase({
        firebaseConfigured: false,
        authReady: true,
        firebaseUser: null,
        guestBrowsing: true,
      }),
      'guest',
    );
  });
});
