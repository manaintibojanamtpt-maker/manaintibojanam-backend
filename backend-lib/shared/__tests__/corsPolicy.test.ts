import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CORS_ALLOWED_ORIGINS,
  createCorsOptions,
  isCorsOriginAllowed,
  resolveCorsAllowedOrigins,
} from '../corsPolicy.js';

describe('corsPolicy', () => {
  it('includes OrderBhojan and BhojanOS production origins by default', () => {
    assert.ok(DEFAULT_CORS_ALLOWED_ORIGINS.includes('https://orderbhojan.web.app'));
    assert.ok(DEFAULT_CORS_ALLOWED_ORIGINS.includes('https://www.bhojanos.com'));
  });

  it('allows localhost dev origins', () => {
    assert.ok(isCorsOriginAllowed('http://localhost:5174', [...DEFAULT_CORS_ALLOWED_ORIGINS]));
  });

  it('rejects unknown browser origins', () => {
    assert.equal(isCorsOriginAllowed('https://evil.example', [...DEFAULT_CORS_ALLOWED_ORIGINS]), false);
  });

  it('allows requests without an Origin header', () => {
    assert.equal(isCorsOriginAllowed(undefined, [...DEFAULT_CORS_ALLOWED_ORIGINS]), true);
  });

  it('reads CORS_ALLOWED_ORIGINS from env when set', () => {
    const previous = process.env.CORS_ALLOWED_ORIGINS;
    process.env.CORS_ALLOWED_ORIGINS = 'https://custom.example, https://orderbhojan.web.app';
    try {
      assert.deepEqual(resolveCorsAllowedOrigins(), [
        'https://custom.example',
        'https://orderbhojan.web.app',
      ]);
    } finally {
      if (previous === undefined) delete process.env.CORS_ALLOWED_ORIGINS;
      else process.env.CORS_ALLOWED_ORIGINS = previous;
    }
  });

  it('builds cors options that accept OrderBhojan origin', () => {
    const options = createCorsOptions([...DEFAULT_CORS_ALLOWED_ORIGINS]);
    assert.equal(typeof options.origin, 'function');
    let allowed = false;
    (options.origin as Function)('https://orderbhojan.web.app', (_err: Error | null, ok?: boolean) => {
      allowed = ok === true;
    });
    assert.equal(allowed, true);
  });
});
