import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MENU_PROJECTION_DOMAIN_VERSION,
  MENU_PROJECTION_FOUNDATION_IDENTITY,
  MENU_PROJECTION_SCHEMA_VERSION,
} from '../MenuProjectionMetadata';
import {
  buildMenuProjectionCheckpoint,
  checkpointKey,
} from '../MenuProjectionCheckpoint';
import { buildMenuProjectionSnapshotMetadata } from '../MenuProjectionSnapshot';
import {
  completeMenuProjectionExecution,
  resolveMenuProjectionFinalStatus,
  shouldPersistMenuProjectionSnapshot,
  startMenuProjectionExecution,
} from '../MenuProjectionExecution';
import { buildMenuProjectionPlan, planFromExecuteRequest } from '../MenuProjectionPlan';
import {
  validateMenuProjectionCheckpoint,
  validateMenuProjectionExecuteRequest,
  validateMenuProjectionSnapshot,
} from '../MenuProjectionValidation';

describe('Menu projection domain (M7 PR-6)', () => {
  it('exports foundation metadata constants', () => {
    assert.equal(MENU_PROJECTION_DOMAIN_VERSION, '0.1.0-foundation');
    assert.equal(MENU_PROJECTION_SCHEMA_VERSION, '0.1.0');
    assert.equal(MENU_PROJECTION_FOUNDATION_IDENTITY.projectionName, 'menu-projection-foundation');
  });

  it('buildMenuProjectionCheckpoint requires core fields', () => {
    const checkpoint = buildMenuProjectionCheckpoint({
      projectionName: 'menu-proj',
      projectionVersion: '1.0.0',
      consumerGroup: 'menu-group',
      schemaVersion: '0.1.0',
      updatedAt: '2026-06-27T10:00:00.000Z',
      eventId: 'evt-1',
      sequence: 42,
    });
    assert.ok(checkpoint);
    assert.equal(checkpoint?.eventId, 'evt-1');
    assert.equal(checkpoint?.sequence, 42);
    assert.equal(
      checkpointKey(checkpoint!),
      'menu-proj@menu-group'
    );
  });

  it('validateMenuProjectionCheckpoint rejects missing fields', () => {
    const errors = validateMenuProjectionCheckpoint({
      projectionName: '',
      projectionVersion: '1.0.0',
      consumerGroup: 'group',
      schemaVersion: '0.1.0',
      updatedAt: '2026-06-27T10:00:00.000Z',
    });
    assert.ok(errors.length > 0);
  });

  it('buildMenuProjectionSnapshotMetadata stores metadata only', () => {
    const snapshot = buildMenuProjectionSnapshotMetadata({
      snapshotId: 'snap-1',
      projectionName: 'menu-proj',
      projectionVersion: '1.0.0',
      consumerGroup: 'menu-group',
      schemaVersion: '0.1.0',
      capturedAt: '2026-06-27T10:00:00.000Z',
      lastEventId: 'evt-1',
      lastSequence: 42,
    });
    assert.ok(snapshot);
    const errors = validateMenuProjectionSnapshot(snapshot!);
    assert.equal(errors.length, 0);
  });

  it('execution lifecycle completes with duration', () => {
    const started = startMenuProjectionExecution(
      'exec-1',
      'menu-proj',
      'menu-group',
      '2026-06-27T10:00:00.000Z'
    );
    const completed = completeMenuProjectionExecution(
      started,
      '2026-06-27T10:00:01.000Z',
      3,
      0,
      'completed'
    );
    assert.equal(completed.status, 'completed');
    assert.equal(completed.processedEvents, 3);
    assert.equal(completed.durationMs, 1000);
  });

  it('resolveMenuProjectionFinalStatus fails when failedEvents > 0', () => {
    assert.equal(resolveMenuProjectionFinalStatus(1, 1), 'failed');
    assert.equal(resolveMenuProjectionFinalStatus(1, 0), 'completed');
  });

  it('shouldPersistMenuProjectionSnapshot requires processed events', () => {
    assert.equal(shouldPersistMenuProjectionSnapshot(0), false);
    assert.equal(shouldPersistMenuProjectionSnapshot(1), true);
  });

  it('buildMenuProjectionPlan and planFromExecuteRequest align', () => {
    const plan = planFromExecuteRequest(
      {
        projectionName: 'menu-proj',
        projectionVersion: '1.0.0',
        consumerGroup: 'menu-group',
        schemaVersion: '0.1.0',
        executionId: 'exec-1',
        processedEvents: 1,
        failedEvents: 0,
        eventId: 'evt-1',
        sequence: 1,
      },
      '2026-06-27T10:00:00.000Z'
    );
    assert.ok(plan);
    assert.equal(plan?.executionId, 'exec-1');

    const direct = buildMenuProjectionPlan({
      identity: MENU_PROJECTION_FOUNDATION_IDENTITY,
      executionId: 'exec-2',
      requestedAt: '2026-06-27T10:00:00.000Z',
    });
    assert.ok(direct);
  });

  it('validateMenuProjectionExecuteRequest rejects negative counts', () => {
    const errors = validateMenuProjectionExecuteRequest({
      projectionName: 'menu-proj',
      projectionVersion: '1.0.0',
      consumerGroup: 'menu-group',
      schemaVersion: '0.1.0',
      executionId: 'exec-1',
      processedEvents: -1,
      failedEvents: 0,
    });
    assert.ok(errors.some((error) => error.includes('processedEvents')));
  });
});
