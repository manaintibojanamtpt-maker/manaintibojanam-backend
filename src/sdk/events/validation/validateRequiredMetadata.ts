/**
 * EventSDK — required metadata validation (M6 PR-2).
 */

import type { EventEnvelope } from '../dto/EventEnvelope';
import type { SdkResult } from '../../core/result';
import { sdkError, sdkFail, sdkOk } from '../../core/resultHelpers';

export function validateRequiredMetadata<TPayload>(
  envelope: EventEnvelope<TPayload>
): SdkResult<EventEnvelope<TPayload>> {
  if (!envelope.metadata?.correlationId) {
    return sdkFail(
      sdkError('ENVELOPE_INVALID', 'EventEnvelope.metadata.correlationId is required')
    );
  }
  return sdkOk(envelope);
}
