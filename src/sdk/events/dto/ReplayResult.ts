import type { EventId } from '../types/branded';

export interface ReplayResult {
  readonly consumerGroup: string;
  readonly eventsReplayed: number;
  readonly fromEventId?: EventId;
  readonly toEventId?: EventId;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly dryRun: boolean;
}
