import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isNonRoutableDevApiHost, loadAppConfig } from '../src/config/environment';
import { validateAppConfig } from '../src/config/validation';
import { ConfigValidationError } from '../src/config/validation';
import {
  BHOJANOS_PROD_FIREBASE_PUBLIC,
  BHOJANOS_PROD_GOOGLE_WEB_CLIENT_ID,
} from '../src/config/clientConfig';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

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

  it('detects loopback API hosts that must not ship in Capacitor APKs', () => {
    assert.equal(isNonRoutableDevApiHost('http://localhost:8080'), true);
    assert.equal(isNonRoutableDevApiHost('http://127.0.0.1:8081'), true);
    assert.equal(isNonRoutableDevApiHost('https://manaintibojanam-backend.onrender.com'), false);
  });

  it('aligns Android google-services.json with bhojanos-prod Firebase web Auth', () => {
    const services = JSON.parse(
      readFileSync(join(root, 'android/app/google-services.json'), 'utf8'),
    ) as {
      project_info: { project_number: string; project_id: string };
      client: Array<{ oauth_client: Array<{ client_id: string; client_type: number }> }>;
    };
    assert.equal(services.project_info.project_number, BHOJANOS_PROD_FIREBASE_PUBLIC.messagingSenderId);
    assert.equal(services.project_info.project_id, BHOJANOS_PROD_FIREBASE_PUBLIC.projectId);
    const webClient = services.client[0]?.oauth_client.find((entry) => entry.client_type === 3);
    assert.equal(webClient?.client_id, BHOJANOS_PROD_GOOGLE_WEB_CLIENT_ID);
  });
});
