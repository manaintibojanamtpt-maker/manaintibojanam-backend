import type { EventId, EventTypeName, AggregateId } from '../types/branded';

export interface ReplayRangeRequest {
  readonly consumerGroup: string;
  readonly fromEventId?: EventId;
  readonly toEventId?: EventId;
  readonly fromTimestamp?: string;
  readonly toTimestamp?: string;
  readonly dryRun?: boolean;
}

export interface ReplayByAggregateRequest {
  readonly consumerGroup: string;
  readonly aggregateType: string;
  readonly aggregateId: AggregateId;
  readonly dryRun?: boolean;
}

export interface ReplayByTypeRequest {
  readonly consumerGroup: string;
  readonly eventTypes: readonly EventTypeName[];
  readonly dryRun?: boolean;
}
