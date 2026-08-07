import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RegexDeliveryTimeExtractor } from '../workflow/intent/extractors/RegexDeliveryTimeExtractor.js';

describe('RegexDeliveryTimeExtractor', () => {
  const extractor = new RegexDeliveryTimeExtractor();
  const fixedNow = new Date('2026-08-06T10:00:00.000Z');

  it('extracts ASAP from deliver now / asap', () => {
    const a = extractor.extract('deliver now', fixedNow);
    assert.equal(a[0]?.mode, 'asap');
    assert.equal(a[0]?.deliveryTimeSlot, 'ASAP');

    const b = extractor.extract('asap please', fixedNow);
    assert.equal(b[0]?.mode, 'asap');
  });

  it('extracts clock times like for 8 pm', () => {
    const hit = extractor.extract('for 8 pm', fixedNow);
    assert.equal(hit[0]?.mode, 'scheduled');
    assert.match(hit[0]?.slotLabel ?? '', /8:00 PM/i);
    assert.ok(hit[0]?.scheduledForHint);
    assert.match(hit[0]?.deliveryTimeSlot ?? '', /Today/);
  });

  it('extracts tomorrow lunch', () => {
    const hit = extractor.extract('tomorrow lunch', fixedNow);
    assert.equal(hit[0]?.mode, 'scheduled');
    assert.equal(hit[0]?.deliveryTimeSlot, 'Tomorrow, Lunch');
  });

  it('extracts tomorrow 8 pm with Tomorrow slot hint', () => {
    const hit = extractor.extract('tomorrow 8 pm', fixedNow);
    assert.equal(hit[0]?.mode, 'scheduled');
    assert.equal(hit[0]?.ambiguous, undefined);
    assert.match(hit[0]?.deliveryTimeSlot ?? '', /^Tomorrow,/);
    assert.match(hit[0]?.slotLabel ?? '', /Tomorrow.*8:00 PM/i);
    assert.ok(hit[0]?.scheduledForHint);
  });

  it('marks day after lunch as out of horizon (no fake Today/Tomorrow slot)', () => {
    const hit = extractor.extract('day after lunch', fixedNow);
    assert.equal(hit[0]?.normalizedValue, 'out_of_horizon');
    assert.equal(hit[0]?.deliveryTimeSlot, undefined);
    assert.equal(hit[0]?.ambiguous, undefined);
  });

  it('marks day after tomorrow 8 pm as out of horizon', () => {
    const hit = extractor.extract('day after tomorrow 8 pm', fixedNow);
    assert.equal(hit[0]?.normalizedValue, 'out_of_horizon');
    assert.equal(hit[0]?.deliveryTimeSlot, undefined);
  });

  it('marks vague day after sometime as ambiguous out of horizon', () => {
    const hit = extractor.extract('day after sometime', fixedNow);
    assert.equal(hit[0]?.normalizedValue, 'out_of_horizon');
    assert.equal(hit[0]?.ambiguous, true);
  });

  it('marks bare schedule verbs as ambiguous', () => {
    const hit = extractor.extract('schedule delivery later', fixedNow);
    assert.equal(hit[0]?.ambiguous, true);
    assert.equal(hit[0]?.mode, 'scheduled');
  });

  it('marks vague sometime evening as ambiguous', () => {
    const hit = extractor.extract('sometime evening', fixedNow);
    assert.equal(hit[0]?.ambiguous, true);
    assert.equal(hit[0]?.normalizedValue, 'ambiguous');
  });

  it('does not treat cart quantities as clock times', () => {
    const hit = extractor.extract('add 2 chicken biryani', fixedNow);
    assert.equal(hit.length, 0);
  });
});
