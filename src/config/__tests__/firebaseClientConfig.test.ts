import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { BHOJANOS_PROD_FIREBASE_PUBLIC } from '../../config/bhojanosProdFirebase';

describe('firebaseClientConfig production fallback', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    (globalThis as { window?: Window }).window = {
      location: { hostname: 'www.bhojanos.com' },
    } as Window;
    delete (globalThis.window as Window & { __BH_FIREBASE_CONFIG__?: unknown }).__BH_FIREBASE_CONFIG__;
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (globalThis as { window?: Window }).window;
    } else {
      globalThis.window = originalWindow;
    }
  });

  it('uses embedded bhojanos-prod config when runtime bootstrap is missing', async () => {
    const { getFirebaseClientConfig, isFirebaseClientConfigReady } = await import('../../config/firebaseClientConfig');
    const cfg = getFirebaseClientConfig();
    assert.equal(cfg.projectId, BHOJANOS_PROD_FIREBASE_PUBLIC.projectId);
    assert.equal(cfg.apiKey, BHOJANOS_PROD_FIREBASE_PUBLIC.apiKey);
    assert.equal(isFirebaseClientConfigReady(cfg), true);
  });

  it('never mixes bhojanos-prod apiKey with bhojanos2 appId', async () => {
    (globalThis.window as Window & { __BH_FIREBASE_CONFIG__?: unknown }).__BH_FIREBASE_CONFIG__ = {
      apiKey: BHOJANOS_PROD_FIREBASE_PUBLIC.apiKey,
      projectId: BHOJANOS_PROD_FIREBASE_PUBLIC.projectId,
    };
    const { getFirebaseClientConfig } = await import('../../config/firebaseClientConfig');
    const cfg = getFirebaseClientConfig();
    assert.equal(cfg.appId, BHOJANOS_PROD_FIREBASE_PUBLIC.appId);
    assert.equal(cfg.messagingSenderId, BHOJANOS_PROD_FIREBASE_PUBLIC.messagingSenderId);
  });
});
