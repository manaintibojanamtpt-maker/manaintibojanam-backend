/**
 * EventSDK — stub adapter (M6 PR-1).
 * All methods return NOT_CONFIGURED until pipeline PR lands.
 */

import type { SdkAsyncResult } from '../../core/result';
import type { EventSDK, EventHandler } from '../contracts/EventSDK';
import type { EventEnvelope } from '../dto/EventEnvelope';
import type { PublishResult } from '../dto/PublishResult';
import type { SubscribeResult } from '../dto/SubscribeResult';
import type { Subscription } from '../dto/Subscription';
import type { ReplayRequest } from '../dto/ReplayRequest';
import type { ReplayResult } from '../dto/ReplayResult';
import type { EventSchemaDefinition } from '../contracts/ports';
import type { EventTypeName } from '../types/branded';
import type { EventVersion } from '../dto/EventVersion';
import { eventNotConfiguredAsync } from './notConfigured';

const LAYER = 'StubEventAdapter';

export class StubEventAdapter implements EventSDK {
  publish<TPayload>(_envelope: EventEnvelope<TPayload>): SdkAsyncResult<PublishResult> {
    return eventNotConfiguredAsync('publish', LAYER);
  }

  subscribe<TPayload>(
    _subscription: Omit<Subscription, 'subscriptionId' | 'createdAt'>,
    _handler: EventHandler<TPayload>
  ): SdkAsyncResult<SubscribeResult> {
    return eventNotConfiguredAsync('subscribe', LAYER);
  }

  registerSchema(
    _definition: Omit<EventSchemaDefinition, 'registeredAt'>
  ): SdkAsyncResult<EventSchemaDefinition> {
    return eventNotConfiguredAsync('registerSchema', LAYER);
  }

  resolveSchema(
    _type: EventTypeName,
    _version: EventVersion
  ): SdkAsyncResult<EventSchemaDefinition | null> {
    return eventNotConfiguredAsync('resolveSchema', LAYER);
  }

  replay(_request: ReplayRequest): SdkAsyncResult<ReplayResult> {
    return eventNotConfiguredAsync('replay', LAYER);
  }
}

export function createStubEventAdapter(): EventSDK {
  return new StubEventAdapter();
}
