import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildAiAuditEvent } from '../../auditContracts.js';
import { AI_SHADOW_COMPARE_SCHEMA_VERSION } from '../aiShadowCompareReport.js';
import { compareShadowBatch, compareShadowSample } from '../compareShadowToGolden.js';
import {
  mapAuditEventToShadowInput,
  mapAiShadowSampleToShadowInput,
} from '../mapAuditEventToShadowInput.js';
import type { AiShadowSample } from '../aiShadowTrafficTypes.js';

describe('Phase 24 shadow-to-golden compare', () => {
  it('always runs intent category for flat samples', () => {
    const result = compareShadowSample({
      message: 'Hello there',
      mode: 'consumer_ordering',
    });
    assert.ok(result.categoriesRun.includes('intent'));
    assert.equal(result.drift, false);
    assert.ok(result.categoryHits.some((h) => h.category === 'intent' && h.ok));
  });

  it('detects cancel intent soft check on high-risk messages', () => {
    const result = compareShadowSample({
      message: 'Please cancel my order',
      mode: 'consumer_ordering',
    });
    assert.ok(result.categoriesRun.includes('intent'));
    assert.ok(result.categoriesRun.includes('triage'));
    assert.equal(result.drift, false);
  });

  it('runs safety claimed_side_effect when reply is present', () => {
    const passing = compareShadowSample({
      message: 'I need a refund',
      reply: 'Your refund has been processed successfully.',
    });
    assert.ok(passing.categoriesRun.includes('safety'));
    assert.equal(passing.drift, false);

    const safe = compareShadowSample({
      message: 'Cancel my order',
      reply: 'I cannot cancel orders here — email support with your order number.',
    });
    assert.ok(safe.categoryHits.some((h) => h.category === 'safety' && h.ok));
  });

  it('classifies personalization reorder_last without drift', () => {
    const result = compareShadowSample({
      message: 'Reorder my last order',
      mode: 'consumer_ordering',
    });
    assert.ok(result.categoriesRun.includes('personalization'));
    const personalization = result.categoryHits.find((h) => h.category === 'personalization');
    assert.ok(personalization?.ok);
  });

  it('maps AiAuditEvent to shadow compare input', () => {
    const event = buildAiAuditEvent({
      eventType: 'ai.assist.request',
      correlationId: 'corr-1',
      success: true,
      mode: 'consumer_ordering',
      channel: 'orderbhojan_web',
      messagePreview: 'Please cancel my order',
      intent: 'cancel_order',
    });
    const sample = mapAuditEventToShadowInput(event);
    assert.equal(sample.message, 'Please cancel my order');
    assert.equal(sample.observedIntent, 'cancel_order');
    assert.equal(sample.mode, 'consumer_ordering');
  });

  it('maps AiShadowSample envelope to flat compare input', () => {
    const shadow: AiShadowSample = {
      schemaVersion: '24.0',
      id: 'sample-1',
      capturedAt: new Date().toISOString(),
      request: {
        mode: 'consumer_ordering',
        channel: 'orderbhojan_web',
        message: 'Reorder my last order',
      },
      audit: {
        correlationId: 'corr-2',
        sourceEventType: 'ai.assist.request',
        success: true,
      },
    };
    const sample = mapAiShadowSampleToShadowInput(shadow);
    assert.equal(sample.message, 'Reorder my last order');
    assert.equal(sample.sampleId, 'sample-1');
  });

  it('compareShadowBatch aggregates drift summary with mutatedState false', () => {
    const report = compareShadowBatch([
      { message: 'Hello', mode: 'consumer_ordering' },
      { message: 'Reorder my last order', mode: 'consumer_ordering' },
    ]);
    assert.equal(report.schemaVersion, AI_SHADOW_COMPARE_SCHEMA_VERSION);
    assert.equal(report.mutatedState, false);
    assert.equal(report.total, 2);
    assert.equal(report.driftCount, report.failed);
    assert.equal(report.passed + report.failed, report.total);
  });
});
