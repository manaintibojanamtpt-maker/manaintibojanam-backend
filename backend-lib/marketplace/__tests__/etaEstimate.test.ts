import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_PREP_TIME_MINUTES,
  estimateDeliveryEtaMinutes,
} from '../etaEstimate.js';

describe('etaEstimate', () => {
  it('uses default prep time when none provided', () => {
    const eta = estimateDeliveryEtaMinutes();
    assert.equal(eta.min, DEFAULT_PREP_TIME_MINUTES);
  });

  it('adds travel time from distance', () => {
    const eta = estimateDeliveryEtaMinutes(25, 4);
    assert.equal(eta.min, 37);
    assert.ok(eta.max >= eta.min);
  });

  it('caps ETA at maximum', () => {
    const eta = estimateDeliveryEtaMinutes(90, 20);
    assert.equal(eta.min, 120);
    assert.equal(eta.max, 120);
  });
});
