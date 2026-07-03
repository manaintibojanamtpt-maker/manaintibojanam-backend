/**
 * Projection domain — rebuild policy (pure, M6 PR-4).
 * Infrastructure only — no runtime rebuilds in PR-4.
 */

import type {
  ProjectionIdentity,
  ProjectionRebuildPlan,
  ProjectionRebuildRequest,
  ProjectionRebuildResult,
  ProjectionRebuildStatus,
} from '../shared/ProjectionIdentityTypes';
import { isValidProjectionIdentity } from './ProjectionIdentity';
import { DEFAULT_PROJECTION_BATCH_SIZE } from './shared/ProjectionConstants';

export function prepareRebuildPlan(
  identity: ProjectionIdentity,
  options: {
    fromEventId?: string;
    fromSequence?: number;
    dryRun?: boolean;
    batchSize?: number;
  } = {}
): ProjectionRebuildPlan | null {
  if (!isValidProjectionIdentity(identity)) return null;
  if (!identity.replaySupported) return null;

  return {
    identity,
    fromEventId: options.fromEventId,
    fromSequence: options.fromSequence,
    dryRun: options.dryRun ?? true,
    batchSize: options.batchSize ?? DEFAULT_PROJECTION_BATCH_SIZE,
  };
}

export function createRebuildRequest(
  identity: ProjectionIdentity,
  rebuildId: string,
  fromEventId?: string,
  dryRun = true
): ProjectionRebuildRequest | null {
  if (!isValidProjectionIdentity(identity)) return null;
  return { identity, rebuildId, fromEventId, dryRun };
}

export function transitionRebuildStatus(
  current: ProjectionRebuildStatus,
  action: 'prepare' | 'execute' | 'pause' | 'resume' | 'cancel' | 'complete' | 'fail'
): ProjectionRebuildStatus {
  switch (action) {
    case 'prepare':
      return current === 'idle' ? 'prepared' : current;
    case 'execute':
      return current === 'prepared' || current === 'paused' ? 'running' : current;
    case 'pause':
      return current === 'running' ? 'paused' : current;
    case 'resume':
      return current === 'paused' ? 'running' : current;
    case 'cancel':
      return current === 'prepared' || current === 'running' || current === 'paused'
        ? 'cancelled'
        : current;
    case 'complete':
      return 'completed';
    case 'fail':
      return 'failed';
    default:
      return current;
  }
}

export function buildRebuildResult(
  rebuildId: string,
  identity: ProjectionIdentity,
  status: ProjectionRebuildStatus,
  eventsPlanned: number,
  eventsProcessed: number,
  startedAt: string,
  completedAt?: string
): ProjectionRebuildResult {
  return {
    rebuildId,
    identity,
    status,
    eventsPlanned,
    eventsProcessed,
    startedAt,
    completedAt,
  };
}
