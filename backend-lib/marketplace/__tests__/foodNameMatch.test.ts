import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizeFoodName, scoreFoodNameMatch } from '../foodNameMatch.js';

describe('foodNameMatch', () => {
  it('canonicalizes common ASR / spelling variants', () => {
    assert.equal(canonicalizeFoodName('Medu Vada'), 'medu wada');
    assert.equal(canonicalizeFoodName('Idly'), 'idli');
    assert.equal(canonicalizeFoodName('Masala Dosa'), 'masala dosa');
    assert.equal(canonicalizeFoodName('Malasa Dosa'), 'masala dosa');
  });

  it('scores Vada≈Wada and Idly≈Idli highly', () => {
    assert.ok(scoreFoodNameMatch('Medu Vada', 'Medu Wada') >= 0.85);
    assert.ok(scoreFoodNameMatch('Idly', 'Idli') >= 0.85);
    assert.ok(scoreFoodNameMatch('Masala Dosa', 'Malasa Dosa') >= 0.85);
  });
});
