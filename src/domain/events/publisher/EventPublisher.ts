/**
 * Event domain — publish intent builder (pure, M6 PR-1).
 */

import type { DomainEventInput } from '../shared/EventTypes';
import { isValidDomainEventInput } from '../validation/validateDomainEvent';

export interface PublishIntent<TPayload = unknown> {
  readonly envelope: DomainEventInput<TPayload>;
  readonly idempotencyKey?: string;
  readonly useOutbox: boolean;
}

export function createPublishIntent<TPayload>(
  envelope: DomainEventInput<TPayload>,
  options: { idempotencyKey?: string; useOutbox?: boolean } = {}
): PublishIntent<TPayload> | null {
  if (!isValidDomainEventInput(envelope)) {
    return null;
  }

  return {
    envelope,
    idempotencyKey: options.idempotencyKey ?? envelope.metadata.idempotencyKey,
    useOutbox: options.useOutbox ?? true,
  };
}
