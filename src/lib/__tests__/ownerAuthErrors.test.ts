import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatOwnerAuthError } from '../ownerAuthErrors';

describe('formatOwnerAuthError', () => {
  it('maps invalid credentials separately from network failures', () => {
    assert.match(
      formatOwnerAuthError({ code: 'auth/invalid-credential' }, { configReady: true }),
      /Continue with Google/,
    );
    assert.match(
      formatOwnerAuthError({ code: 'auth/wrong-password' }, { configReady: true }),
      /Continue with Google/,
    );
    assert.match(
      formatOwnerAuthError({ code: 'auth/user-not-found' }, { configReady: true }),
      /Continue with Google/,
    );
  });

  it('surfaces config bootstrap failures before generic network copy', () => {
    assert.match(
      formatOwnerAuthError({ code: 'auth/network-request-failed' }, { configReady: false }),
      /Firebase is not configured/,
    );
  });

  it('keeps network guidance when config is ready', () => {
    assert.match(
      formatOwnerAuthError({ code: 'auth/network-request-failed' }, { configReady: true }),
      /Network error during sign-in/,
    );
  });

  it('maps unauthorized domain to authorized-domains guidance', () => {
    assert.match(
      formatOwnerAuthError({ code: 'auth/unauthorized-domain' }, { configReady: true }),
      /Authorized domains/,
    );
  });

  it('maps invalid api key to config guidance', () => {
    assert.match(
      formatOwnerAuthError({ code: 'auth/invalid-api-key' }, { configReady: true }),
      /API key rejected/,
    );
  });

  it('uses superadmin credential copy for invalid credentials', () => {
    assert.match(
      formatOwnerAuthError({ code: 'auth/invalid-credential' }, { configReady: true, portal: 'superadmin' }),
      /grant superadmin/,
    );
  });

  it('uses admin credential copy for invalid credentials', () => {
    assert.match(
      formatOwnerAuthError({ code: 'auth/wrong-password' }, { configReady: true, portal: 'admin' }),
      /Invalid admin credentials/,
    );
  });

  it('network failures mention hard-refresh and private-window recovery', () => {
    const message = formatOwnerAuthError(
      { code: 'auth/network-request-failed' },
      { configReady: true, portal: 'superadmin' },
    );
    assert.match(message, /Network error during sign-in/);
    assert.match(message, /private window|Hard-refresh/i);
  });
});
