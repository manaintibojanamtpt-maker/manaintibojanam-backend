/**
 * EventSDK factory — default or stub adapter by feature flag (M6 PR-2).
 */

import type { EventSDK } from './contracts/EventSDK';
import { createDefaultEventAdapter } from './adapters/DefaultEventAdapter';
import { createStubEventAdapter } from './adapters/StubEventAdapter';
import {
  readEventFlagDefault,
  type EventFeatureFlagReader,
} from './core/featureFlags';
import type { CreateEventSDKOptions } from './shared/options';

export {
  createEventPublisher,
  createEventSubscriber,
  createOutboxRepository,
  createReplayService,
  createReplayEngine,
  createEventStore,
  createSchemaRegistry,
  createEventInfrastructure,
} from './adapters/EventInfrastructureFactory';

export function resolveEventEnabled(options?: CreateEventSDKOptions): boolean {
  const readFlag: EventFeatureFlagReader = options?.featureFlags ?? readEventFlagDefault;
  return readFlag('FF_EVENT_PLATFORM_ENABLED');
}

export function createEventSDK(options: CreateEventSDKOptions = {}): EventSDK {
  if (options.eventSdk) {
    return options.eventSdk;
  }

  if (!resolveEventEnabled(options)) {
    return createStubEventAdapter();
  }

  return createDefaultEventAdapter(options);
}
