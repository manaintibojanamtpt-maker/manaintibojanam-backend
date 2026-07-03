/**
 * Order parity infrastructure factory (M6 PR-8).
 * Wires validator, comparator, report repository — validation only.
 */

import type {
  LegacyOrderReadPort,
  ProjectionOrderReadPort,
  OrderParityInfrastructurePort,
} from '../../contracts/orderParityPorts';
import type { ClockPort, UuidPort } from '../../contracts/ports';
import type { EventFeatureFlagReader } from '../../core/featureFlags';
import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';
import { createDefaultClock } from '../../providers/DefaultClock';
import { createDefaultUuid } from '../../providers/DefaultUuid';
import { createOrderParityValidator, type OrderParityValidator } from './OrderParityValidator';
import { createOrderParityComparator, type OrderParityComparator } from './OrderParityComparator';
import {
  createOrderParityReportRepository,
  buildParityReportRecord,
  type OrderParityReportRepository,
} from './OrderParityReport';
import type { OrderParityTelemetryHook } from './OrderParityTelemetry';
import { createOrderParityTelemetryEmitter } from './OrderParityTelemetry';
import type { OrderParityReportRecord } from '../../../../domain/events/parity/order/OrderParityResult';
import type { OrderParityStatistics } from '../../../../domain/events/parity/order/OrderParityStatistics';
import { EMPTY_ORDER_PARITY_STATISTICS } from '../../../../domain/events/parity/order/OrderParityStatistics';
import type { LegacyOrderDocument } from '../../../../domain/events/orders/OrderEventMetadata';
import type { OrderProjectionReadModel } from '../../../../domain/events/projections/order/OrderProjectionState';

export interface OrderParityInfrastructure extends OrderParityInfrastructurePort {
  readonly validator: OrderParityValidator;
  readonly comparator: OrderParityComparator;
  readonly reportRepository: OrderParityReportRepository;
  readonly legacyReadPort: LegacyOrderReadPort;
  readonly projectionReadPort: ProjectionOrderReadPort;
}

export interface CreateOrderParityInfrastructureOptions {
  readonly featureFlags?: EventFeatureFlagReader;
  readonly legacyReadPort?: LegacyOrderReadPort;
  readonly projectionReadPort?: ProjectionOrderReadPort;
  readonly reportRepository?: OrderParityReportRepository;
  readonly clock?: ClockPort;
  readonly uuid?: UuidPort;
  readonly onTelemetry?: OrderParityTelemetryHook;
}

export class InMemoryLegacyOrderReadPort implements LegacyOrderReadPort {
  private readonly store = new Map<string, LegacyOrderDocument>();

  seed(order: LegacyOrderDocument): void {
    this.store.set(order.id, order);
  }

  get(orderId: string): SdkAsyncResult<LegacyOrderDocument | null> {
    return Promise.resolve(sdkOk(this.store.get(orderId) ?? null));
  }
}

export class InMemoryProjectionOrderReadPort implements ProjectionOrderReadPort {
  private readonly store = new Map<string, OrderProjectionReadModel>();

  seed(model: OrderProjectionReadModel): void {
    this.store.set(model.orderId, model);
  }

  get(orderId: string): SdkAsyncResult<OrderProjectionReadModel | null> {
    return Promise.resolve(sdkOk(this.store.get(orderId) ?? null));
  }
}

export function createOrderParityInfrastructure(
  options: CreateOrderParityInfrastructureOptions = {}
): OrderParityInfrastructure {
  const clock = options.clock ?? createDefaultClock();
  const uuid = options.uuid ?? createDefaultUuid();
  const legacyReadPort = options.legacyReadPort ?? new InMemoryLegacyOrderReadPort();
  const projectionReadPort = options.projectionReadPort ?? new InMemoryProjectionOrderReadPort();
  const reportRepository = options.reportRepository ?? createOrderParityReportRepository();
  const validator = createOrderParityValidator();
  const comparator = createOrderParityComparator({
    featureFlags: options.featureFlags,
    legacyReadPort,
    projectionReadPort,
    clock,
    onTelemetry: options.onTelemetry,
  });

  const infra: OrderParityInfrastructure = {
    validator,
    comparator,
    reportRepository,
    legacyReadPort,
    projectionReadPort,

    async validate(orderId) {
      const validated = validator.validateOrderId(orderId);
      return Promise.resolve(validated);
    },

    async compare(orderId) {
      const validated = validator.validateOrderId(orderId);
      if (!validated.ok) return validated;
      return comparator.compare(orderId);
    },

    async compareAndReport(orderId) {
      const telemetry = createOrderParityTelemetryEmitter(options.onTelemetry, 'compareAndReport', orderId);
      telemetry.parityStarted();

      const validated = validator.validateOrderId(orderId);
      if (!validated.ok) {
        telemetry.parityFailed(validated.error.code);
        return validated;
      }

      const compared = await comparator.compare(orderId);
      if (!compared.ok) return compared;

      const report = buildParityReportRecord(
        uuid.generate(),
        compared.value,
        undefined,
        undefined
      );
      await reportRepository.save(report);
      telemetry.parityCompleted(compared.value.outcome);
      return sdkOk(report);
    },

    async statistics() {
      return sdkOk(reportRepository.getStatistics() ?? EMPTY_ORDER_PARITY_STATISTICS);
    },
  };

  return infra;
}

export {
  createOrderParityValidator,
  createOrderParityComparator,
  createOrderParityReportRepository,
};
