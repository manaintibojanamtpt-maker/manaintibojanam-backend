import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadAppConfig } from '../src/config/environment';
import { validateAppConfig } from '../src/config/validation';
import { ConfigValidationError } from '../src/config/validation';

describe('config validation', () => {
  it('accepts development config without firebase keys', () => {
    const config = loadAppConfig();
    if (config.environment === 'production') {
      return;
    }
    assert.doesNotThrow(() => validateAppConfig(config));
    assert.ok(config.marketplaceApiBaseUrl.startsWith('http'));
  });

  it('rejects invalid timeout', () => {
    const config = loadAppConfig();
    assert.throws(
      () =>
        validateAppConfig({
          ...config,
          api: { ...config.api, timeoutMs: 50 },
        }),
      ConfigValidationError,
    );
  });
});
