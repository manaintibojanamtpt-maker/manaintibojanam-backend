/**
 * Projection domain — plan and batch builders (pure, M6 PR-4).
 */

import type {
  ProjectionPlan,
  ProjectionBatch,
  ProjectionBatchItem,
  ProjectionCheckpoint,
  ProjectionCursor,
  ProjectionResult,
  ProjectionExecution,
} from './shared/ProjectionTypes';
import { DEFAULT_PROJECTION_BATCH_SIZE } from './shared/ProjectionConstants';

export function buildProjectionPlan(input: {
  projectionName: string;
  consumerGroup: string;
  batchSize?: number;
  startFromEventId?: string;
  startFromSequence?: number;
}): ProjectionPlan | null {
  if (!input.projectionName || !input.consumerGroup) return null;
  return {
    projectionName: input.projectionName,
    consumerGroup: input.consumerGroup,
    batchSize: input.batchSize ?? DEFAULT_PROJECTION_BATCH_SIZE,
    startFromEventId: input.startFromEventId,
    startFromSequence: input.startFromSequence,
  };
}

export function buildProjectionBatch(
  projectionName: string,
  consumerGroup: string,
  items: readonly ProjectionBatchItem[],
  batchId: string,
  createdAt: string
): ProjectionBatch | null {
  if (!projectionName || !consumerGroup || items.length === 0) return null;
  return { projectionName, consumerGroup, items, batchId, createdAt };
}

export function cursorFromCheckpoint(checkpoint: ProjectionCheckpoint): ProjectionCursor {
  return {
    projectionName: checkpoint.projectionName,
    consumerGroup: checkpoint.consumerGroup,
    lastEventId: checkpoint.lastEventId,
    lastSequence: checkpoint.lastSequence,
  };
}

export function checkpointFromCursor(
  cursor: ProjectionCursor,
  timestamp: string,
  projectionVersion: string,
  schemaVersion: string
): ProjectionCheckpoint {
  return {
    projectionName: cursor.projectionName,
    projectionVersion,
    consumerGroup: cursor.consumerGroup,
    eventId: cursor.lastEventId,
    sequence: cursor.lastSequence,
    timestamp,
    schemaVersion,
    version: projectionVersion,
    lastEventId: cursor.lastEventId,
    lastSequence: cursor.lastSequence,
  };
}

export function buildProjectionResult(input: {
  projectionName: string;
  consumerGroup: string;
  processed: number;
  failed: number;
  skipped: number;
  failures: ProjectionResult['failures'];
  completedAt: string;
}): ProjectionResult {
  return {
    projectionName: input.projectionName,
    consumerGroup: input.consumerGroup,
    processed: input.processed,
    failed: input.failed,
    skipped: input.skipped,
    failures: input.failures,
    completedAt: input.completedAt,
  };
}

export function startProjectionExecution(
  executionId: string,
  projectionName: string,
  consumerGroup: string,
  startedAt: string,
  batchId?: string
): ProjectionExecution {
  return {
    executionId,
    projectionName,
    consumerGroup,
    batchId,
    startedAt,
    status: 'running',
    processed: 0,
    failed: 0,
  };
}

export function completeProjectionExecution(
  execution: ProjectionExecution,
  completedAt: string,
  processed: number,
  failed: number,
  status: 'completed' | 'failed' = 'completed'
): ProjectionExecution {
  return {
    ...execution,
    completedAt,
    processed,
    failed,
    status,
  };
}

export function validateProjectionCheckpoint(checkpoint: ProjectionCheckpoint): readonly string[] {
  const errors: string[] = [];
  if (!checkpoint.projectionName) errors.push('projectionName is required');
  if (!checkpoint.projectionVersion) errors.push('projectionVersion is required');
  if (!checkpoint.consumerGroup) errors.push('consumerGroup is required');
  if (!checkpoint.timestamp) errors.push('timestamp is required');
  if (!checkpoint.schemaVersion) errors.push('schemaVersion is required');
  return errors;
}
