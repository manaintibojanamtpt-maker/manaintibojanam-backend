/** Pure domain types for projection workers (M6 PR-4). No SDK imports. */

export interface ProjectionMetadata {
  readonly projectionName: string;
  readonly consumerGroup: string;
  readonly handlerVersion: string;
  readonly eventTypes: readonly string[];
}

export interface ProjectionPlan {
  readonly projectionName: string;
  readonly consumerGroup: string;
  readonly batchSize: number;
  readonly startFromEventId?: string;
  readonly startFromSequence?: number;
}

export interface ProjectionCheckpoint {
  readonly projectionName: string;
  readonly projectionVersion: string;
  readonly consumerGroup: string;
  readonly eventId?: string;
  readonly sequence?: number;
  readonly timestamp: string;
  readonly schemaVersion: string;
  /** @deprecated use projectionVersion */
  readonly version?: string;
  /** @deprecated use eventId */
  readonly lastEventId?: string;
  /** @deprecated use sequence */
  readonly lastSequence?: number;
}

export interface ProjectionCursor {
  readonly projectionName: string;
  readonly consumerGroup: string;
  readonly lastEventId?: string;
  readonly lastSequence?: number;
}

export interface ProjectionBatchItem {
  readonly eventId: string;
  readonly eventType: string;
  readonly eventVersion: string;
  readonly sequence: number;
}

export interface ProjectionBatch {
  readonly projectionName: string;
  readonly consumerGroup: string;
  readonly items: readonly ProjectionBatchItem[];
  readonly batchId: string;
  readonly createdAt: string;
}

export interface ProjectionFailure {
  readonly eventId: string;
  readonly eventType: string;
  readonly reason: string;
  readonly retryable: boolean;
  readonly attemptCount: number;
}

export interface ProjectionResult {
  readonly projectionName: string;
  readonly consumerGroup: string;
  readonly processed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly failures: readonly ProjectionFailure[];
  readonly completedAt: string;
}

export interface ProjectionExecution {
  readonly executionId: string;
  readonly projectionName: string;
  readonly consumerGroup: string;
  readonly batchId?: string;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly status: 'running' | 'completed' | 'failed';
  readonly processed: number;
  readonly failed: number;
}
