/**
 * Order read projection worker — first business projection (M6 PR-7).
 * Shadow only. Consumes order.created.v1, order.updated.v1, order.cancelled.v1.
 * No OrderSDK integration. No runtime consumers.
 */

import type {
  OrderProjectionWorkerPort,
  OrderProjectionProcessResult,
  OrderProjectionRepositoryPort,
  OrderProjectionSnapshotPort,
} from '../../contracts/orderProjectionPorts';
import type { ProjectionHandlerPort, ProjectionHandlerContext } from '../../contracts/projectionPorts';
import type { EventEnvelope } from '../../dto/EventEnvelope';
import type { ClockPort, UuidPort } from '../../contracts/ports';
import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';
import {
  readEventFlagDefault,
  type EventFeatureFlagReader,
} from '../../core/featureFlags';
import { eventNotConfiguredAsync } from '../../adapters/notConfigured';
import { createOrderProjectionMapper, type OrderProjectionMapper } from './OrderProjectionMapper';
import { createOrderProjectionValidator, type OrderProjectionValidator } from './OrderProjectionValidator';
import {
  createOrderProjectionSnapshotStore,
  type OrderProjectionSnapshotStore,
} from './OrderProjectionSnapshot';
import type { OrderProjectionTelemetryHook } from './OrderProjectionTelemetry';
import { createOrderProjectionTelemetryEmitter } from './OrderProjectionTelemetry';
import {
  ORDER_READ_PROJECTION_NAME,
  ORDER_READ_PROJECTION_VERSION,
  ORDER_READ_PROJECTION_CONSUMER_GROUP,
} from '../../../../domain/events/projections/order/OrderProjectionMetadata';
import { ORDER_EVENT_TYPES } from '../../../../domain/events/orders/OrderEventSchema';

export interface OrderProjectionWorkerOptions {
  readonly featureFlags?: EventFeatureFlagReader;
  readonly repository: OrderProjectionRepositoryPort;
  readonly snapshotStore: OrderProjectionSnapshotPort;
  readonly mapper?: OrderProjectionMapper;
  readonly validator?: OrderProjectionValidator;
  readonly snapshotBuilder?: OrderProjectionSnapshotStore;
  readonly onTelemetry?: OrderProjectionTelemetryHook;
}

export class OrderProjectionWorker implements OrderProjectionWorkerPort {
  private readonly mapper: OrderProjectionMapper;
  private readonly validator: OrderProjectionValidator;

  constructor(private readonly options: OrderProjectionWorkerOptions) {
    this.mapper = options.mapper ?? createOrderProjectionMapper();
    this.validator = options.validator ?? createOrderProjectionValidator();
  }

  private isEnabled(): boolean {
    const readFlag = this.options.featureFlags ?? readEventFlagDefault;
    return (
      readFlag('FF_EVENT_PLATFORM_ENABLED') &&
      readFlag('FF_EVENT_PROJECTION_ENABLED') &&
      readFlag('FF_EVENT_PROJECTION_RUNTIME_ENABLED') &&
      readFlag('FF_ORDER_READ_PROJECTION_ENABLED')
    );
  }

  async process<TPayload>(
    envelope: EventEnvelope<TPayload>
  ): SdkAsyncResult<OrderProjectionProcessResult> {
    if (!this.isEnabled()) {
      return eventNotConfiguredAsync('process', 'OrderProjectionWorker');
    }

    const orderId = envelope.header.aggregateId;
    const telemetry = createOrderProjectionTelemetryEmitter(
      this.options.onTelemetry,
      'process',
      orderId
    );
    telemetry.projectionStarted(envelope.header.type, envelope.header.eventId);

    const envelopeValidation = this.validator.validateEnvelope(envelope);
    if (!envelopeValidation.ok) {
      telemetry.projectionFailed(envelopeValidation.error.code, envelope.header.type, envelope.header.eventId);
      return envelopeValidation;
    }

    const existingResult = await this.options.repository.get(orderId);
    if (!existingResult.ok) return existingResult;

    const transitionValidation = this.validator.validateTransition(
      envelope.header.type,
      existingResult.value
    );
    if (!transitionValidation.ok) {
      telemetry.projectionFailed(transitionValidation.error.code, envelope.header.type, envelope.header.eventId);
      return {
        ok: true,
        value: {
          orderId,
          eventType: envelope.header.type,
          eventId: envelope.header.eventId,
          applied: false,
          reason: transitionValidation.error.message,
        },
      };
    }

    const mapped = this.mapper.mapEvent(envelope, existingResult.value);
    if (!mapped.ok) {
      telemetry.projectionFailed(mapped.error.code, envelope.header.type, envelope.header.eventId);
      return {
        ok: true,
        value: {
          orderId,
          eventType: envelope.header.type,
          eventId: envelope.header.eventId,
          applied: false,
          reason: mapped.error.message,
        },
      };
    }

    const modelValidation = this.validator.validateReadModel(mapped.value);
    if (!modelValidation.ok) {
      telemetry.projectionFailed(modelValidation.error.code, envelope.header.type, envelope.header.eventId);
      return modelValidation;
    }

    await this.options.repository.save(mapped.value);

    if (this.options.snapshotBuilder) {
      const snapshot = this.options.snapshotBuilder.buildSnapshot(
        mapped.value,
        envelope.header.eventId,
        envelope.header.type
      );
      await this.options.snapshotStore.save(snapshot);
    }

    telemetry.eventProcessed(envelope.header.type, envelope.header.eventId);
    telemetry.projectionCompleted(envelope.header.type, envelope.header.eventId);

    return sdkOk({
      orderId,
      eventType: envelope.header.type,
      eventId: envelope.header.eventId,
      applied: true,
      readModel: mapped.value,
    });
  }

  asHandler(): ProjectionHandlerPort {
    return {
      handle: async (envelope, _context: ProjectionHandlerContext) => {
        const result = await this.process(envelope);
        if (!result.ok) return result;
        if (!result.value.applied) {
          return {
            ok: false,
            error: {
              code: 'PROJECTION_SKIPPED',
              message: result.value.reason ?? 'Projection not applied',
            },
          };
        }
        return sdkOk(undefined);
      },
    };
  }

  static supportedEventTypes(): readonly string[] {
    return [
      ORDER_EVENT_TYPES.CREATED,
      ORDER_EVENT_TYPES.UPDATED,
      ORDER_EVENT_TYPES.CANCELLED,
    ];
  }

  static projectionIdentity() {
    return {
      projectionName: ORDER_READ_PROJECTION_NAME,
      projectionVersion: ORDER_READ_PROJECTION_VERSION,
      consumerGroup: ORDER_READ_PROJECTION_CONSUMER_GROUP,
      ownerPlatform: 'M1-OrderPlatform',
      replaySupported: true,
      checkpointStrategy: 'event_id' as const,
    };
  }
}

export function createOrderProjectionWorker(
  options: OrderProjectionWorkerOptions
): OrderProjectionWorker {
  return new OrderProjectionWorker(options);
}
