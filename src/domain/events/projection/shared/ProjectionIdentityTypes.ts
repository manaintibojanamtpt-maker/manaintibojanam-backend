/** Pure domain types for projection identity and rebuild (M6 PR-4). */

export type ProjectionVersion = string;

export type CheckpointStrategy = 'event_id' | 'sequence';

/** Immutable projection worker identity — duplicate registration MUST fail. */
export interface ProjectionIdentity {
  readonly projectionName: string;
  readonly projectionVersion: ProjectionVersion;
  readonly consumerGroup: string;
  readonly ownerPlatform: string;
  readonly replaySupported: boolean;
  readonly checkpointStrategy: CheckpointStrategy;
}

export type ProjectionRebuildStatus =
  | 'idle'
  | 'prepared'
  | 'running'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface ProjectionRebuildPlan {
  readonly identity: ProjectionIdentity;
  readonly fromEventId?: string;
  readonly fromSequence?: number;
  readonly dryRun: boolean;
  readonly batchSize: number;
}

export interface ProjectionRebuildRequest {
  readonly identity: ProjectionIdentity;
  readonly rebuildId: string;
  readonly fromEventId?: string;
  readonly dryRun?: boolean;
}

export interface ProjectionRebuildResult {
  readonly rebuildId: string;
  readonly identity: ProjectionIdentity;
  readonly status: ProjectionRebuildStatus;
  readonly eventsPlanned: number;
  readonly eventsProcessed: number;
  readonly startedAt: string;
  readonly completedAt?: string;
}
