import type { EventId, EventTypeName } from '../types/branded';

export interface ReplayRequest {
  readonly consumerGroup: string;
  readonly fromEventId?: EventId;
  readonly fromTimestamp?: string;
  readonly eventTypes?: readonly EventTypeName[];
  readonly dryRun?: boolean;
}
