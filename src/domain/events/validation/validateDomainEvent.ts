/**
 * Event domain — envelope validation (pure, M6 PR-1).
 */

import type { DomainEventInput } from '../shared/EventTypes';

export type DomainValidationError = {
  readonly field: string;
  readonly message: string;
};

const SEMVER_PATTERN = /^\d+\.\d+\.\d+(-[\w.]+)?$/;

export function validateDomainEventInput<TPayload>(
  input: DomainEventInput<TPayload>
): readonly DomainValidationError[] {
  const errors: DomainValidationError[] = [];

  if (!input.header?.eventId) {
    errors.push({ field: 'header.eventId', message: 'required' });
  }
  if (!input.header?.type) {
    errors.push({ field: 'header.type', message: 'required' });
  }
  if (!input.header?.version || !SEMVER_PATTERN.test(input.header.version)) {
    errors.push({ field: 'header.version', message: 'must be semver' });
  }
  if (!input.header?.aggregateType) {
    errors.push({ field: 'header.aggregateType', message: 'required' });
  }
  if (!input.header?.aggregateId) {
    errors.push({ field: 'header.aggregateId', message: 'required' });
  }
  if (!input.header?.occurredAt) {
    errors.push({ field: 'header.occurredAt', message: 'required' });
  }
  if (!input.metadata?.correlationId) {
    errors.push({ field: 'metadata.correlationId', message: 'required' });
  }
  if (input.payload === undefined || input.payload === null) {
    errors.push({ field: 'payload', message: 'must not be null or undefined' });
  }

  return errors;
}

export function isValidDomainEventInput<TPayload>(input: DomainEventInput<TPayload>): boolean {
  return validateDomainEventInput(input).length === 0;
}
