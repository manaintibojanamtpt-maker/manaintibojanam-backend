import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { isProductionBhojanHost } from '../runtimeFirebaseConfig';

describe('isProductionBhojanHost', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    (globalThis as { window?: Window }).window = {
      location: { hostname: 'www.bhojanos.com' },
    } as Window;
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (globalThis as { window?: Window }).window;
    } else {
      globalThis.window = originalWindow;
    }
  });

  it('matches Vercel production hosts', () => {
    assert.equal(isProductionBhojanHost(), true);
    (globalThis.window as Window).location.hostname = 'bhojanos.com';
    assert.equal(isProductionBhojanHost(), true);
  });

  it('matches Firebase admin/owner hosting sites', () => {
    (globalThis.window as Window).location.hostname = 'bhojanos-admin.web.app';
    assert.equal(isProductionBhojanHost(), true);
    (globalThis.window as Window).location.hostname = 'bhojanos-owner.web.app';
    assert.equal(isProductionBhojanHost(), true);
    (globalThis.window as Window).location.hostname = 'orderbhojan.web.app';
    assert.equal(isProductionBhojanHost(), true);
  });

  it('does not treat bhojanos2 dev hosting as production', () => {
    (globalThis.window as Window).location.hostname = 'bhojanos2.web.app';
    assert.equal(isProductionBhojanHost(), false);
  });
});
