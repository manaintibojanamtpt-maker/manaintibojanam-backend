import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getOwnerApiPausedUntilMs,
  parseRetryAfterMs,
  pauseOwnerApiFromResponse,
  pauseOwnerApiUntil,
  resetOwnerApiRateLimitStateForTests,
} from '../ownerApiRateLimit';

describe('ownerApiRateLimit', () => {
  it('parses Retry-After seconds and HTTP-date values', () => {
    assert.equal(parseRetryAfterMs('30'), 30_000);

    const future = new Date(Date.now() + 45_000).toUTCString();
    const parsed = parseRetryAfterMs(future);
    assert.ok(parsed !== null);
    assert.ok(parsed >= 44_000 && parsed <= 46_000);
  });

  it('pauses owner API calls until Retry-After expires', () => {
    resetOwnerApiRateLimitStateForTests();
    pauseOwnerApiFromResponse('12');
    assert.ok(getOwnerApiPausedUntilMs() >= Date.now() + 11_000);
  });

  it('extends pause window when multiple 429 responses arrive', () => {
    resetOwnerApiRateLimitStateForTests();
    pauseOwnerApiUntil(Date.now() + 5_000);
    pauseOwnerApiUntil(Date.now() + 20_000);
    assert.ok(getOwnerApiPausedUntilMs() >= Date.now() + 19_000);
  });
});
