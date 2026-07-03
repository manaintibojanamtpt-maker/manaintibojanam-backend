/**
 * EventSDK — stub subscriber (M6 PR-1).
 */

import type { EventSubscriberPort, EventHandler } from '../contracts/ports';
import type { Subscription } from '../dto/Subscription';
import type { SubscribeResult } from '../dto/SubscribeResult';
import type { SdkAsyncResult } from '../../core/result';
import { eventNotConfiguredAsync } from '../adapters/notConfigured';

const LAYER = 'StubEventSubscriber';

export class StubEventSubscriber implements EventSubscriberPort {
  subscribe<TPayload>(
    _subscription: Omit<Subscription, 'subscriptionId' | 'createdAt'>,
    _handler: EventHandler<TPayload>
  ): SdkAsyncResult<SubscribeResult> {
    return eventNotConfiguredAsync('subscribe', LAYER);
  }

  unsubscribe(_subscriptionId: string): SdkAsyncResult<void> {
    return eventNotConfiguredAsync('unsubscribe', LAYER);
  }
}

export function createStubEventSubscriber(): EventSubscriberPort {
  return new StubEventSubscriber();
}
