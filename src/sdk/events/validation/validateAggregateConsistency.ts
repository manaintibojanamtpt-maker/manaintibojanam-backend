/**
 * EventSDK — aggregate consistency validation (M6 PR-2).
 */

import type { EventEnvelope } from '../dto/EventEnvelope';
import type { SdkResult } from '../../core/result';
import { sdkError, sdkFail, sdkOk } from '../../core/resultHelpers';

export function validateAggregateConsistency<TPayload>(
  envelope: EventEnvelope<TPayload>
): SdkResult<EventEnvelope<TPayload>> {
  const { header } = envelope;
  if (!header.aggregateType || !header.aggregateId) {
    return sdkFail(
      sdkError('ENVELOPE_INVALID', 'aggregateType and aggregateId must both be present')
    );
  }
  if (header.aggregateType.trim().length === 0) {
    return sdkFail(sdkError('ENVELOPE_INVALID', 'aggregateType must not be empty'));
  }
  return sdkOk(envelope);
}
