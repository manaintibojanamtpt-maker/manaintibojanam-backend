/**
 * Event domain — outbox record builder (pure, M6 PR-1).
 */

import type { DomainEventInput, OutboxAppendInput } from '../shared/EventTypes';
import { isValidDomainEventInput } from '../validation/validateDomainEvent';

export interface BuiltOutboxRecord<TPayload = unknown> {
  readonly eventId: string;
  readonly type: string;
  readonly version: string;
  readonly envelope: DomainEventInput<TPayload>;
  readonly status: OutboxAppendInput<TPayload>['status'];
  readonly attemptCount: number;
}

export function buildOutboxRecord<TPayload>(
  input: OutboxAppendInput<TPayload>
): BuiltOutboxRecord<TPayload> | null {
  if (!isValidDomainEventInput(input.envelope)) {
    return null;
  }

  return {
    eventId: input.envelope.header.eventId,
    type: input.envelope.header.type,
    version: input.envelope.header.version,
    envelope: input.envelope,
    status: input.status,
    attemptCount: input.attemptCount,
  };
}

export function shouldRetryOutbox(attemptCount: number, maxAttempts: number): boolean {
  return attemptCount < maxAttempts;
}

export function nextOutboxStatus(
  current: OutboxAppendInput['status'],
  success: boolean,
  attemptCount: number,
  maxAttempts: number
): OutboxAppendInput['status'] {
  if (success) return 'published';
  if (attemptCount >= maxAttempts) return 'dead_letter';
  return current === 'dead_letter' ? 'dead_letter' : 'failed';
}
