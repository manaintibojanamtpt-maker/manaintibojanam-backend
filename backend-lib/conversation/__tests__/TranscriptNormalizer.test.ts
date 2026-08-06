import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TranscriptNormalizer } from '../workflow/intent/TranscriptNormalizer.js';

describe('TranscriptNormalizer', () => {
  const normalizer = new TranscriptNormalizer();

  it('should lowercase and remove punctuation', () => {
    assert.strictEqual(normalizer.normalize('Hello, World!'), 'hello world');
    assert.strictEqual(normalizer.normalize('Make it spicy!!!'), 'make it spicy');
    assert.strictEqual(normalizer.normalize('   spaces   here   '), 'spaces here');
  });

  it('should normalize order types', () => {
    assert.strictEqual(normalizer.normalize('I want a parcel'), 'i want a takeaway');
    assert.strictEqual(normalizer.normalize('Make it to go please'), 'make it takeaway please');
  });

  it('should normalize checkout synonyms', () => {
    assert.strictEqual(normalizer.normalize('Get the bill'), 'get the checkout');
    assert.strictEqual(normalizer.normalize('I want to pay'), 'i want to checkout');
  });

  it('should normalize cancellation synonyms', () => {
    assert.strictEqual(normalizer.normalize('cancel my order'), 'cancelorder my order');
    assert.strictEqual(normalizer.normalize('never mind'), 'cancelorder');
    assert.strictEqual(normalizer.normalize('leave it'), 'cancelorder');
  });

  it('should normalize multilingual affirmations', () => {
    assert.strictEqual(normalizer.normalize('yes'), 'yes');
    assert.strictEqual(normalizer.normalize('okay'), 'yes');
    assert.strictEqual(normalizer.normalize('avunu'), 'yes'); // Telugu
    assert.strictEqual(normalizer.normalize('haan'), 'yes'); // Hindi
    assert.strictEqual(normalizer.normalize('han please'), 'yes please'); // Hindi
  });

  it('should normalize multilingual negations', () => {
    assert.strictEqual(normalizer.normalize('no'), 'no');
    assert.strictEqual(normalizer.normalize('nope'), 'no');
    assert.strictEqual(normalizer.normalize('dont do that'), 'no do that');
    assert.strictEqual(normalizer.normalize('vaddu'), 'no'); // Telugu
    assert.strictEqual(normalizer.normalize('nahi'), 'no'); // Hindi
  });

  it('should not replace substrings inside other words', () => {
    // "ok" shouldn't replace "ok" inside "look"
    assert.strictEqual(normalizer.normalize('look at this'), 'look at this');
    // "pay" shouldn't replace "pay" inside "payment" -> wait, "payment" is also a synonym
    // Let's test "paycheck"
    assert.strictEqual(normalizer.normalize('paycheck is here'), 'paycheck is here');
  });

  it('should handle empty transcripts', () => {
    assert.strictEqual(normalizer.normalize(''), '');
    assert.strictEqual(normalizer.normalize('   '), '');
    assert.strictEqual(normalizer.normalize('...'), '');
  });
});
