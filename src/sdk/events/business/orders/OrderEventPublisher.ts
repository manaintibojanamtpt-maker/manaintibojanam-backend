/**
 * Order event publisher — delegates to EventPublisherPort (M6 PR-5).
 */

import type { EventPublisherPort } from '../../contracts/ports';
import type { EventEnvelope } from '../../dto/EventEnvelope';
import type { PublishResult } from '../../dto/PublishResult';
import type { SdkAsyncResult } from '../../../core/result';
import type { OrderEventTelemetryHook } from './OrderEventTelemetry';
import { createOrderEventTelemetryEmitter } from './OrderEventTelemetry';

export interface OrderEventPublisherOptions {
  readonly publisher: EventPublisherPort;
  readonly onTelemetry?: OrderEventTelemetryHook;
}

export class OrderEventPublisher {
  constructor(private readonly options: OrderEventPublisherOptions) {}

  async publish<TPayload>(envelope: EventEnvelope<TPayload>): SdkAsyncResult<PublishResult> {
    const telemetry = createOrderEventTelemetryEmitter(
      this.options.onTelemetry,
      'publish',
      envelope.header.aggregateId,
      envelope.metadata.correlationId
    );
    telemetry.shadowPublishStarted(envelope.header.type);
    const result = await this.options.publisher.publish(envelope);
    if (!result.ok) {
      telemetry.shadowPublishFailed(result.error.code, envelope.header.type);
      return result;
    }
    telemetry.shadowPublishCompleted(envelope.header.type, result.value.eventId);
    return result;
  }
}

export function createOrderEventPublisher(options: OrderEventPublisherOptions): OrderEventPublisher {
  return new OrderEventPublisher(options);
}
