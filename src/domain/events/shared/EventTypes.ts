/** Pure domain types for Event Platform (M6 PR-1). No SDK imports. */

export interface DomainEventHeaderInput {
  readonly eventId: string;
  readonly type: string;
  readonly version: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly occurredAt: string;
}

export interface DomainEventMetadataInput {
  readonly tenantId?: string;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly traceId?: string;
  readonly source?: string;
  readonly idempotencyKey?: string;
}

export interface DomainEventInput<TPayload = unknown> {
  readonly header: DomainEventHeaderInput;
  readonly metadata: DomainEventMetadataInput;
  readonly payload: TPayload;
}

export interface OutboxAppendInput<TPayload = unknown> {
  readonly envelope: DomainEventInput<TPayload>;
  readonly status: 'pending' | 'published' | 'failed' | 'dead_letter';
  readonly attemptCount: number;
}

export interface SchemaRegistrationInput {
  readonly type: string;
  readonly version: string;
  readonly schemaVersion: string;
  readonly jsonSchema?: Readonly<Record<string, unknown>>;
}

export interface ReplayPlanInput {
  readonly consumerGroup: string;
  readonly fromEventId?: string;
  readonly fromTimestamp?: string;
  readonly eventTypes?: readonly string[];
  readonly dryRun?: boolean;
}

export interface ReplayPlanResult {
  readonly consumerGroup: string;
  readonly estimatedEvents: number;
  readonly dryRun: boolean;
  readonly allowed: boolean;
  readonly reason?: string;
}
