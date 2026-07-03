import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PROJECTION_RUNTIME_DOMAIN_VERSION } from '../shared/ProjectionRuntimeConstants';
import { buildProjectionSnapshotMetadata } from '../ProjectionSnapshot';
import {
  startRuntimeExecution,
  completeRuntimeExecution,
  incrementRuntimeRetry,
} from '../ProjectionExecutionRecord';
import {
  shouldPersistSnapshot,
  shouldRecordExecutionHistory,
  resolveExecutionFinalStatus,
  shouldRetryRuntimeExecution,
} from '../ProjectionExecutionPolicy';
import { buildRecoveryPlan, canResumeFromCheckpoint } from '../ProjectionRecovery';
import { createEmptyStatistics, updateStatistics } from '../ProjectionStatistics';
import {
  validatePersistedCheckpoint,
  validateRuntimeExecutionRecord,
  validateRuntimeExecuteInput,
} from '../ProjectionRuntimeValidation';

describe('Projection runtime domain (M6 PR-6)', () => {
  it('exports PROJECTION_RUNTIME_DOMAIN_VERSION', () => {
    assert.equal(PROJECTION_RUNTIME_DOMAIN_VERSION, '0.1.0-runtime');
  });

  it('buildProjectionSnapshotMetadata validates required fields', () => {
    assert.equal(buildProjectionSnapshotMetadata({
      snapshotId: '',
      projectionName: 'p',
      projectionVersion: '1.0.0',
      consumerGroup: 'g',
      schemaVersion: '1.0.0',
      capturedAt: '2026-06-26T00:00:00.000Z',
    }), null);
    assert.ok(buildProjectionSnapshotMetadata({
      snapshotId: 'snap-1',
      projectionName: 'p',
      projectionVersion: '1.0.0',
      consumerGroup: 'g',
      schemaVersion: '1.0.0',
      capturedAt: '2026-06-26T00:00:00.000Z',
    }));
  });

  it('runtime execution lifecycle', () => {
    const started = startRuntimeExecution('exec-1', 'p', 'g', '2026-06-26T00:00:00.000Z');
    assert.equal(started.status, 'running');
    const completed = completeRuntimeExecution(started, '2026-06-26T00:00:01.000Z', 5, 0);
    assert.equal(completed.status, 'completed');
    assert.equal(completed.processedEvents, 5);
    assert.ok(completed.durationMs !== undefined);
  });

  it('incrementRuntimeRetry increases retry count', () => {
    const started = startRuntimeExecution('exec-1', 'p', 'g', '2026-06-26T00:00:00.000Z');
    assert.equal(incrementRuntimeRetry(started).retryCount, 1);
  });

  it('execution policy helpers', () => {
    const execution = completeRuntimeExecution(
      startRuntimeExecution('e', 'p', 'g', '2026-06-26T00:00:00.000Z'),
      '2026-06-26T00:00:01.000Z',
      1,
      0
    );
    assert.equal(shouldRecordExecutionHistory(execution), true);
    assert.equal(shouldPersistSnapshot(1), true);
    assert.equal(shouldPersistSnapshot(0), false);
    assert.equal(resolveExecutionFinalStatus(1, 0), 'completed');
    assert.equal(resolveExecutionFinalStatus(0, 1), 'failed');
    assert.equal(shouldRetryRuntimeExecution(2), true);
    assert.equal(shouldRetryRuntimeExecution(3), false);
  });

  it('buildRecoveryPlan from failed execution', () => {
    const failed = completeRuntimeExecution(
      startRuntimeExecution('e', 'p', 'g', '2026-06-26T00:00:00.000Z'),
      '2026-06-26T00:00:01.000Z',
      0,
      1,
      'failed'
    );
    const plan = buildRecoveryPlan({
      projectionName: 'p',
      consumerGroup: 'g',
      lastFailedExecution: failed,
      lastEventId: 'evt-1',
    });
    assert.ok(plan);
    assert.equal(canResumeFromCheckpoint(plan!), true);
  });

  it('updateStatistics aggregates counters', () => {
    const empty = createEmptyStatistics('p', 'g');
    const updated = updateStatistics(empty, {
      processed: 3,
      failed: 1,
      skipped: 2,
      checkpointSaved: true,
      durationMs: 100,
    });
    assert.equal(updated.processed, 3);
    assert.equal(updated.checkpointCount, 1);
    assert.equal(updated.averageDurationMs, 100);
  });

  it('validatePersistedCheckpoint requires all fields', () => {
    assert.ok(
      validatePersistedCheckpoint({
        projectionName: 'p',
        projectionVersion: '1.0.0',
        consumerGroup: 'g',
        schemaVersion: '1.0.0',
        updatedAt: '2026-06-26T00:00:00.000Z',
      }).length === 0
    );
  });

  it('validateRuntimeExecuteInput rejects empty projectionName', () => {
    assert.ok(
      validateRuntimeExecuteInput({
        projectionName: '',
        consumerGroup: 'g',
        projectionVersion: '1.0.0',
        schemaVersion: '1.0.0',
      }).length > 0
    );
  });

  it('validateRuntimeExecutionRecord rejects negative counts', () => {
    const record = startRuntimeExecution('e', 'p', 'g', '2026-06-26T00:00:00.000Z');
    assert.equal(validateRuntimeExecutionRecord(record).length, 0);
  });
});
