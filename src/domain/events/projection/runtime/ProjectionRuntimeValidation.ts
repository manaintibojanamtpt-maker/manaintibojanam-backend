/** Projection runtime validation (M6 PR-6). Pure domain — no SDK imports. */

import type { ProjectionSnapshotMetadata } from './ProjectionSnapshot';
import type { ProjectionRuntimeExecutionRecord } from './ProjectionExecutionRecord';

export interface PersistedProjectionCheckpoint {
  readonly projectionName: string;
  readonly projectionVersion: string;
  readonly consumerGroup: string;
  readonly eventId?: string;
  readonly sequence?: number;
  readonly schemaVersion: string;
  readonly updatedAt: string;
}

export function validatePersistedCheckpoint(
  checkpoint: PersistedProjectionCheckpoint
): readonly string[] {
  const errors: string[] = [];
  if (!checkpoint.projectionName) errors.push('projectionName is required');
  if (!checkpoint.projectionVersion) errors.push('projectionVersion is required');
  if (!checkpoint.consumerGroup) errors.push('consumerGroup is required');
  if (!checkpoint.schemaVersion) errors.push('schemaVersion is required');
  if (!checkpoint.updatedAt) errors.push('updatedAt is required');
  return errors;
}

export function validateRuntimeExecutionRecord(
  record: ProjectionRuntimeExecutionRecord
): readonly string[] {
  const errors: string[] = [];
  if (!record.executionId) errors.push('executionId is required');
  if (!record.projectionName) errors.push('projectionName is required');
  if (!record.consumerGroup) errors.push('consumerGroup is required');
  if (!record.startedAt) errors.push('startedAt is required');
  if (record.processedEvents < 0) errors.push('processedEvents must be >= 0');
  if (record.failedEvents < 0) errors.push('failedEvents must be >= 0');
  if (record.retryCount < 0) errors.push('retryCount must be >= 0');
  return errors;
}

export function validateSnapshotMetadata(snapshot: ProjectionSnapshotMetadata): readonly string[] {
  const errors: string[] = [];
  if (!snapshot.snapshotId) errors.push('snapshotId is required');
  if (!snapshot.projectionName) errors.push('projectionName is required');
  if (!snapshot.projectionVersion) errors.push('projectionVersion is required');
  if (!snapshot.consumerGroup) errors.push('consumerGroup is required');
  if (!snapshot.schemaVersion) errors.push('schemaVersion is required');
  if (!snapshot.capturedAt) errors.push('capturedAt is required');
  return errors;
}

export function validateRuntimeExecuteInput(input: {
  projectionName: string;
  consumerGroup: string;
  projectionVersion: string;
  schemaVersion: string;
}): readonly string[] {
  const errors: string[] = [];
  if (!input.projectionName) errors.push('projectionName is required');
  if (!input.consumerGroup) errors.push('consumerGroup is required');
  if (!input.projectionVersion) errors.push('projectionVersion is required');
  if (!input.schemaVersion) errors.push('schemaVersion is required');
  return errors;
}
