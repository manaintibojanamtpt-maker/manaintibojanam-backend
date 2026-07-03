/**
 * EventSDK — envelope validation (M6 PR-1).
 */

import type { EventEnvelope } from '../dto/EventEnvelope';
import type { SdkResult } from '../../core/result';
import { sdkError, sdkFail, sdkOk } from '../../core/resultHelpers';

const SEMVER_PATTERN = /^\d+\.\d+\.\d+(-[\w.]+)?$/;

export function validateEventEnvelope<TPayload>(
  envelope: EventEnvelope<TPayload>
): SdkResult<EventEnvelope<TPayload>> {
  const { header, metadata, payload } = envelope;

  if (!header?.eventId) {
    return sdkFail(sdkError('ENVELOPE_INVALID', 'EventEnvelope.header.eventId is required'));
  }
  if (!header.type) {
    return sdkFail(sdkError('ENVELOPE_INVALID', 'EventEnvelope.header.type is required'));
  }
  if (!header.version || !SEMVER_PATTERN.test(header.version)) {
    return sdkFail(
      sdkError('ENVELOPE_INVALID', 'EventEnvelope.header.version must be semver (e.g. 1.0.0)')
    );
  }
  if (!header.aggregateType) {
    return sdkFail(sdkError('ENVELOPE_INVALID', 'EventEnvelope.header.aggregateType is required'));
  }
  if (!header.aggregateId) {
    return sdkFail(sdkError('ENVELOPE_INVALID', 'EventEnvelope.header.aggregateId is required'));
  }
  if (!header.occurredAt) {
    return sdkFail(sdkError('ENVELOPE_INVALID', 'EventEnvelope.header.occurredAt is required'));
  }
  if (!metadata?.correlationId) {
    return sdkFail(sdkError('ENVELOPE_INVALID', 'EventEnvelope.metadata.correlationId is required'));
  }
  if (payload === undefined || payload === null) {
    return sdkFail(sdkError('ENVELOPE_INVALID', 'EventEnvelope.payload must not be null or undefined'));
  }

  return sdkOk(envelope);
}
