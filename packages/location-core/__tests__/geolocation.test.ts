import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  geolocationErrorMessage,
  mapGeolocationErrorCode,
} from '../src/errors.js';

describe('geolocation errors', () => {
  it('maps browser error codes', () => {
    assert.equal(mapGeolocationErrorCode(1), 'PERMISSION_DENIED');
    assert.equal(mapGeolocationErrorCode(2), 'UNAVAILABLE');
    assert.equal(mapGeolocationErrorCode(3), 'TIMEOUT');
    assert.equal(mapGeolocationErrorCode(99), 'UNKNOWN');
  });

  it('returns user-facing messages', () => {
    assert.match(geolocationErrorMessage('PERMISSION_DENIED'), /denied/i);
    assert.match(geolocationErrorMessage('TIMEOUT'), /timed out/i);
  });
});
