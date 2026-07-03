import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PRICING_PROJECTION_DOMAIN_VERSION,
  PRICING_PROJECTION_FOUNDATION_IDENTITY,
  PRICING_PROJECTION_SCHEMA_VERSION,
} from '../PricingProjectionMetadata';
import {
  buildPricingProjectionCheckpoint,
  pricingCheckpointKey,
} from '../PricingProjectionCheckpoint';
import { buildPricingProjectionSnapshotMetadata } from '../PricingProjectionSnapshot';
import {
  completePricingProjectionExecution,
  resolvePricingProjectionFinalStatus,
  shouldPersistPricingProjectionSnapshot,
  startPricingProjectionExecution,
} from '../PricingProjectionExecution';
import { buildPricingProjectionPlan, planFromPricingExecuteRequest } from '../PricingProjectionPlan';
import {
  validatePricingProjectionCheckpoint,
  validatePricingProjectionExecuteRequest,
  validatePricingProjectionSnapshot,
} from '../PricingProjectionValidation';

describe('Pricing projection domain (M8 PR-6)', () => {
  it('exports foundation metadata constants', () => {
    assert.equal(PRICING_PROJECTION_DOMAIN_VERSION, '0.1.0-foundation');
    assert.equal(PRICING_PROJECTION_SCHEMA_VERSION, '0.1.0');
    assert.equal(
      PRICING_PROJECTION_FOUNDATION_IDENTITY.projectionName,
      'pricing-projection-foundation'
    );
  });

  it('buildPricingProjectionCheckpoint requires core fields', () => {
    const checkpoint = buildPricingProjectionCheckpoint({
      projectionName: 'pricing-proj',
      projectionVersion: '1.0.0',
      consumerGroup: 'pricing-group',
      schemaVersion: '0.1.0',
      updatedAt: '2026-07-03T10:00:00.000Z',
      eventId: 'evt-1',
      sequence: 42,
    });
    assert.ok(checkpoint);
    assert.equal(checkpoint?.eventId, 'evt-1');
    assert.equal(checkpoint?.sequence, 42);
    assert.equal(pricingCheckpointKey(checkpoint!), 'pricing-proj@pricing-group');
  });

  it('validatePricingProjectionCheckpoint rejects missing fields', () => {
    const errors = validatePricingProjectionCheckpoint({
      projectionName: '',
      projectionVersion: '1.0.0',
      consumerGroup: 'group',
      schemaVersion: '0.1.0',
      updatedAt: '2026-07-03T10:00:00.000Z',
    });
    assert.ok(errors.length > 0);
  });

  it('buildPricingProjectionSnapshotMetadata stores metadata with checkpoint', () => {
    const checkpoint = buildPricingProjectionCheckpoint({
      projectionName: 'pricing-proj',
      projectionVersion: '1.0.0',
      consumerGroup: 'pricing-group',
      schemaVersion: '0.1.0',
      updatedAt: '2026-07-03T10:00:00.000Z',
      eventId: 'evt-1',
      sequence: 42,
    })!;
    const snapshot = buildPricingProjectionSnapshotMetadata({
      snapshotId: 'snap-1',
      projectionName: 'pricing-proj',
      projectionVersion: '1.0.0',
      checkpoint,
      capturedAt: '2026-07-03T10:00:00.000Z',
      metadata: { source: 'foundation' },
    });
    assert.ok(snapshot);
    assert.equal(snapshot?.checkpoint.sequence, 42);
    const errors = validatePricingProjectionSnapshot(snapshot!);
    assert.equal(errors.length, 0);
  });

  it('execution lifecycle completes with duration and errors', () => {
    const started = startPricingProjectionExecution(
      'exec-1',
      'pricing-proj',
      'pricing-group',
      '2026-07-03T10:00:00.000Z'
    );
    const completed = completePricingProjectionExecution(
      started,
      '2026-07-03T10:00:01.000Z',
      3,
      0,
      'completed'
    );
    assert.equal(completed.status, 'completed');
    assert.equal(completed.processedEvents, 3);
    assert.equal(completed.durationMs, 1000);

    const failed = completePricingProjectionExecution(
      started,
      '2026-07-03T10:00:01.000Z',
      0,
      1,
      'failed',
      ['event mapping failed']
    );
    assert.equal(failed.errors?.[0], 'event mapping failed');
  });

  it('resolvePricingProjectionFinalStatus fails when failedEvents > 0', () => {
    assert.equal(resolvePricingProjectionFinalStatus(1, 1), 'failed');
    assert.equal(resolvePricingProjectionFinalStatus(1, 0), 'completed');
  });

  it('shouldPersistPricingProjectionSnapshot requires processed events', () => {
    assert.equal(shouldPersistPricingProjectionSnapshot(0), false);
    assert.equal(shouldPersistPricingProjectionSnapshot(1), true);
  });

  it('buildPricingProjectionPlan and planFromPricingExecuteRequest align', () => {
    const plan = planFromPricingExecuteRequest(
      {
        projectionName: 'pricing-proj',
        projectionVersion: '1.0.0',
        consumerGroup: 'pricing-group',
        schemaVersion: '0.1.0',
        executionId: 'exec-1',
        processedEvents: 1,
        failedEvents: 0,
        eventId: 'evt-1',
        sequence: 1,
      },
      '2026-07-03T10:00:00.000Z'
    );
    assert.ok(plan);
    assert.equal(plan?.executionId, 'exec-1');

    const direct = buildPricingProjectionPlan({
      identity: PRICING_PROJECTION_FOUNDATION_IDENTITY,
      executionId: 'exec-2',
      requestedAt: '2026-07-03T10:00:00.000Z',
    });
    assert.ok(direct);
  });

  it('validatePricingProjectionExecuteRequest rejects negative counts', () => {
    const errors = validatePricingProjectionExecuteRequest({
      projectionName: 'pricing-proj',
      projectionVersion: '1.0.0',
      consumerGroup: 'pricing-group',
      schemaVersion: '0.1.0',
      executionId: 'exec-1',
      processedEvents: -1,
      failedEvents: 0,
    });
    assert.ok(errors.some((error) => error.includes('processedEvents')));
  });
});
