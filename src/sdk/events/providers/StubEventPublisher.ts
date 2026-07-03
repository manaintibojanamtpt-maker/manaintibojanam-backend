/**
 * EventSDK — stub publisher (M6 PR-1).
 */

import type { EventPublisherPort } from '../contracts/ports';
import type { EventEnvelope } from '../dto/EventEnvelope';
import type { PublishResult } from '../dto/PublishResult';
import type { SdkAsyncResult } from '../../core/result';
import { eventNotConfiguredAsync } from '../adapters/notConfigured';

const LAYER = 'StubEventPublisher';

export class StubEventPublisher implements EventPublisherPort {
  publish<TPayload>(_envelope: EventEnvelope<TPayload>): SdkAsyncResult<PublishResult> {
    return eventNotConfiguredAsync('publish', LAYER);
  }
}

export function createStubEventPublisher(): EventPublisherPort {
  return new StubEventPublisher();
}
