import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('auth returnTo session persistence', () => {
  it('stores auth_return_to in sessionStorage before redirect', () => {
    const authReturn = readFileSync(
      join(root, 'src/features/auth/domain/authReturnTo.ts'),
      'utf8',
    );
    assert.match(authReturn, /export const AUTH_RETURN_TO_KEY = 'auth_return_to'/);
    assert.match(authReturn, /sessionStorage\.setItem\(AUTH_RETURN_TO_KEY/);
    assert.match(authReturn, /sessionStorage\.getItem\(AUTH_RETURN_TO_KEY/);
    assert.match(authReturn, /sessionStorage\.removeItem\(AUTH_RETURN_TO_KEY/);
  });

  it('resolveAuthRedirect prefers query param over router state', () => {
    const resolveRedirect = readFileSync(
      join(root, 'src/presentation/auth/resolveAuthRedirect.ts'),
      'utf8',
    );
    const queryIndex = resolveRedirect.indexOf("params.get('returnTo')");
    const stateIndex = resolveRedirect.indexOf('fromState');
    assert.ok(queryIndex >= 0 && stateIndex > queryIndex);
  });
});
