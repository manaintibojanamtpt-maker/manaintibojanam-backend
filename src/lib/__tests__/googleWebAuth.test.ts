import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../../..');

describe('google web auth COOP-safe redirect', () => {
  it('uses redirect on web and keeps native platform on Capacitor path', () => {
    const nativePlatform = readFileSync(join(root, 'src/lib/nativePlatform.ts'), 'utf8');
    assert.match(nativePlatform, /if \(isNativePlatform\(\)\) return false/);
    assert.match(nativePlatform, /Cross-Origin-Opener-Policy/);
    assert.match(nativePlatform, /return true;/);
  });

  it('owner login completes Google redirect results on return', () => {
    const ownerLogin = readFileSync(join(root, 'src/pages/owner/OwnerLogin.tsx'), 'utf8');
    assert.match(ownerLogin, /completeGoogleRedirectSignIn/);
    assert.match(ownerLogin, /ensureAuthPersistence/);
    assert.match(ownerLogin, /signInWithGoogleAccount/);
    assert.match(ownerLogin, /resolveOwnerLoginError/);
    assert.doesNotMatch(ownerLogin, /signInWithPopup/);
  });

  it('shared google web auth helper exposes redirect completion', () => {
    const helper = readFileSync(join(root, 'src/lib/googleWebAuth.ts'), 'utf8');
    assert.match(helper, /signInWithRedirect/);
    assert.match(helper, /getRedirectResult/);
    assert.match(helper, /ensureAuthPersistence/);
    assert.match(helper, /shouldUseGoogleAuthRedirect/);
    assert.match(helper, /AUTH_RETURN_TO_KEY = 'auth_return_to'/);
    assert.match(helper, /persistAuthReturnToFromCurrentUrl/);
  });
});
