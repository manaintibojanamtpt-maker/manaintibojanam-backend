import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PROJECTION_DOMAIN_VERSION } from '../shared/ProjectionConstants';
import {
  buildProjectionPlan,
  buildProjectionBatch,
  buildProjectionResult,
  checkpointFromCursor,
  cursorFromCheckpoint,
  startProjectionExecution,
  completeProjectionExecution,
  validateProjectionCheckpoint,
} from '../ProjectionPlan';
import {
  shouldRetryProjection,
  shouldDeadLetterProjection,
  resolveProjectionRetryDelayMs,
  buildProjectionFailure,
  PROJECTION_MAX_RETRY_ATTEMPTS,
} from '../ProjectionRetryPolicy';
import {
  validateProjectionIdentity,
  isDuplicateProjectionIdentity,
  projectionIdentityKey,
} from '../ProjectionIdentity';
import {
  prepareRebuildPlan,
  transitionRebuildStatus,
  buildRebuildResult,
} from '../ProjectionRebuildPolicy';
import type { ProjectionIdentity } from '../shared/ProjectionIdentityTypes';

describe('Projection domain (M6 PR-4)', () => {
  it('exports PROJECTION_DOMAIN_VERSION', () => {
    assert.equal(PROJECTION_DOMAIN_VERSION, '0.1.0-foundation');
  });

  it('buildProjectionPlan requires projectionName and consumerGroup', () => {
    assert.equal(buildProjectionPlan({ projectionName: '', consumerGroup: 'g' }), null);
    assert.ok(buildProjectionPlan({ projectionName: 'test-proj', consumerGroup: 'g' }));
  });

  it('buildProjectionBatch requires items', () => {
    assert.equal(
      buildProjectionBatch('p', 'g', [], 'batch-1', '2026-06-26T00:00:00.000Z'),
      null
    );
    const batch = buildProjectionBatch(
      'p',
      'g',
      [{ eventId: 'e1', eventType: 't', eventVersion: '1.0.0', sequence: 1 }],
      'batch-1',
      '2026-06-26T00:00:00.000Z'
    );
    assert.ok(batch);
    assert.equal(batch!.items.length, 1);
  });

  it('checkpoint and cursor round-trip', () => {
    const checkpoint = checkpointFromCursor(
      { projectionName: 'p', consumerGroup: 'g', lastEventId: 'e1', lastSequence: 5 },
      '2026-06-26T00:00:00.000Z',
      '1.0.0',
      '1.0.0'
    );
    const cursor = cursorFromCheckpoint(checkpoint);
    assert.equal(cursor.lastEventId, 'e1');
    assert.equal(cursor.lastSequence, 5);
  });

  it('validateProjectionCheckpoint detects missing fields', () => {
    assert.ok(
      validateProjectionCheckpoint({
        projectionName: '',
        projectionVersion: '',
        consumerGroup: 'g',
        timestamp: '',
        schemaVersion: '',
      }).length > 0
    );
  });

  it('shouldRetryProjection respects max attempts', () => {
    const failure = buildProjectionFailure('e1', 't', 'err', 1);
    assert.equal(shouldRetryProjection(1, failure, PROJECTION_MAX_RETRY_ATTEMPTS), true);
    assert.equal(shouldRetryProjection(5, failure, PROJECTION_MAX_RETRY_ATTEMPTS), false);
  });

  it('shouldDeadLetterProjection when not retryable', () => {
    const failure = buildProjectionFailure('e1', 't', 'err', 1, false);
    assert.equal(shouldDeadLetterProjection(1, failure), true);
  });

  it('resolveProjectionRetryDelayMs increases with attempts', () => {
    assert.ok(resolveProjectionRetryDelayMs(1) <= resolveProjectionRetryDelayMs(3));
  });

  it('buildProjectionResult aggregates counts', () => {
    const result = buildProjectionResult({
      projectionName: 'p',
      consumerGroup: 'g',
      processed: 3,
      failed: 1,
      skipped: 0,
      failures: [],
      completedAt: '2026-06-26T00:00:00.000Z',
    });
    assert.equal(result.processed, 3);
    assert.equal(result.failed, 1);
  });

  it('projection execution lifecycle', () => {
    const started = startProjectionExecution('exec-1', 'p', 'g', '2026-06-26T00:00:00.000Z');
    assert.equal(started.status, 'running');
    const completed = completeProjectionExecution(started, '2026-06-26T00:01:00.000Z', 5, 0);
    assert.equal(completed.status, 'completed');
    assert.equal(completed.processed, 5);
  });

  it('validateProjectionIdentity and duplicate detection', () => {
    const identity: ProjectionIdentity = {
      projectionName: 'order-summary',
      projectionVersion: '1.0.0',
      consumerGroup: 'read-model',
      ownerPlatform: 'M6',
      replaySupported: true,
      checkpointStrategy: 'event_id',
    };
    assert.equal(validateProjectionIdentity(identity).length, 0);
    assert.equal(projectionIdentityKey(identity), 'order-summary@1.0.0@read-model');
    assert.equal(isDuplicateProjectionIdentity([identity], identity), true);
  });

  it('prepareRebuildPlan requires replaySupported', () => {
    const identity: ProjectionIdentity = {
      projectionName: 'p',
      projectionVersion: '1.0.0',
      consumerGroup: 'g',
      ownerPlatform: 'M6',
      replaySupported: false,
      checkpointStrategy: 'sequence',
    };
    assert.equal(prepareRebuildPlan(identity), null);
  });

  it('transitionRebuildStatus follows state machine', () => {
    assert.equal(transitionRebuildStatus('idle', 'prepare'), 'prepared');
    assert.equal(transitionRebuildStatus('prepared', 'execute'), 'running');
    assert.equal(transitionRebuildStatus('running', 'pause'), 'paused');
    assert.equal(transitionRebuildStatus('paused', 'resume'), 'running');
    assert.equal(transitionRebuildStatus('running', 'cancel'), 'cancelled');
  });

  it('buildRebuildResult aggregates rebuild metadata', () => {
    const identity: ProjectionIdentity = {
      projectionName: 'p',
      projectionVersion: '1.0.0',
      consumerGroup: 'g',
      ownerPlatform: 'M6',
      replaySupported: true,
      checkpointStrategy: 'event_id',
    };
    const result = buildRebuildResult(
      'rb-1',
      identity,
      'completed',
      100,
      100,
      '2026-06-26T00:00:00.000Z',
      '2026-06-26T00:05:00.000Z'
    );
    assert.equal(result.rebuildId, 'rb-1');
    assert.equal(result.eventsProcessed, 100);
  });
});
