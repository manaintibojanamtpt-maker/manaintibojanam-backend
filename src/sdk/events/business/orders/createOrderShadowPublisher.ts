/**
 * Order shadow publisher factory (M6 PR-5).
 */

import type { EventPublisherPort, OutboxRepositoryPort, ClockPort, UuidPort } from '../../contracts/ports';
import type { EventFeatureFlagReader } from '../../core/featureFlags';
import { createDefaultClock } from '../../providers/DefaultClock';
import { createDefaultUuid } from '../../providers/DefaultUuid';
import { createShadowPublisher } from '../../persistence/ShadowPublisher';
import { createOrderShadowPublisher, type OrderShadowPublisher } from './OrderShadowPublisher';
import type { OrderEventTelemetryHook } from './OrderEventTelemetry';

export interface CreateOrderShadowPublisherOptions {
  readonly featureFlags?: EventFeatureFlagReader;
  readonly outboxRepository: OutboxRepositoryPort;
  readonly clock?: ClockPort;
  readonly uuid?: UuidPort;
  readonly publisher?: EventPublisherPort;
  readonly onTelemetry?: OrderEventTelemetryHook;
}

export function createOrderShadowPublisherFactory(
  options: CreateOrderShadowPublisherOptions
): OrderShadowPublisher {
  const clock = options.clock ?? createDefaultClock();
  const uuid = options.uuid ?? createDefaultUuid();
  const publisher =
    options.publisher ??
    createShadowPublisher({
      featureFlags: options.featureFlags,
      outboxRepository: options.outboxRepository,
      clock,
      uuid,
    });

  return createOrderShadowPublisher({
    featureFlags: options.featureFlags,
    publisher,
    clock,
    uuid,
    onTelemetry: options.onTelemetry,
  });
}

export { createOrderShadowPublisher } from './OrderShadowPublisher';
export { createOrderEventMapper } from './OrderEventMapper';
export { createOrderEventValidator } from './OrderEventValidator';
export { createOrderEventFactory } from './OrderEventFactory';
export { createOrderEventPublisher } from './OrderEventPublisher';
