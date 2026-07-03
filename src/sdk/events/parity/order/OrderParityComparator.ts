/**
 * Order parity comparator (M6 PR-8).
 * Loads legacy and projection views, normalizes, and compares without mutation.
 */

import type {
  LegacyOrderReadPort,
  ProjectionOrderReadPort,
  OrderParityComparatorPort,
} from '../../contracts/orderParityPorts';
import type { ClockPort } from '../../contracts/ports';
import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';
import {
  readEventFlagDefault,
  type EventFeatureFlagReader,
} from '../../core/featureFlags';
import { eventNotConfiguredAsync } from '../../adapters/notConfigured';
import { compareOrderCanonicalModels } from '../../../../domain/events/parity/order/OrderParityRules';
import type { OrderParityResult } from '../../../../domain/events/parity/order/OrderParityResult';
import { createOrderParityMapper, type OrderParityMapper } from './OrderParityMapper';
import type { OrderParityTelemetryHook } from './OrderParityTelemetry';
import { createOrderParityTelemetryEmitter } from './OrderParityTelemetry';

export interface OrderParityComparatorOptions {
  readonly featureFlags?: EventFeatureFlagReader;
  readonly legacyReadPort: LegacyOrderReadPort;
  readonly projectionReadPort: ProjectionOrderReadPort;
  readonly mapper?: OrderParityMapper;
  readonly clock: ClockPort;
  readonly onTelemetry?: OrderParityTelemetryHook;
}

export class OrderParityComparator implements OrderParityComparatorPort {
  private readonly mapper: OrderParityMapper;

  constructor(private readonly options: OrderParityComparatorOptions) {
    this.mapper = options.mapper ?? createOrderParityMapper();
  }

  private isEnabled(): boolean {
    const readFlag = this.options.featureFlags ?? readEventFlagDefault;
    return (
      readFlag('FF_EVENT_PLATFORM_ENABLED') &&
      readFlag('FF_EVENT_PROJECTION_ENABLED') &&
      readFlag('FF_EVENT_PROJECTION_RUNTIME_ENABLED') &&
      readFlag('FF_ORDER_READ_PROJECTION_ENABLED') &&
      readFlag('FF_ORDER_PROJECTION_PARITY_ENABLED')
    );
  }

  async compare(orderId: string): SdkAsyncResult<OrderParityResult> {
    if (!this.isEnabled()) {
      return eventNotConfiguredAsync('compare', 'OrderParityComparator');
    }

    const telemetry = createOrderParityTelemetryEmitter(
      this.options.onTelemetry,
      'compare',
      orderId
    );
    telemetry.parityStarted();

    try {
      const legacyResult = await this.options.legacyReadPort.get(orderId);
      if (!legacyResult.ok) {
        telemetry.parityFailed(legacyResult.error.code);
        return legacyResult;
      }

      const projectionResult = await this.options.projectionReadPort.get(orderId);
      if (!projectionResult.ok) {
        telemetry.parityFailed(projectionResult.error.code);
        return projectionResult;
      }

      const legacyCanonical =
        legacyResult.value === null ? null : this.mapper.mapLegacy(legacyResult.value);
      const projectionCanonical =
        projectionResult.value === null
          ? null
          : this.mapper.mapProjection(projectionResult.value);

      const comparedAt = this.options.clock.now();
      const result = compareOrderCanonicalModels(
        orderId,
        legacyCanonical,
        projectionCanonical,
        comparedAt
      );

      if (result.outcome === 'MATCH') {
        telemetry.parityMatch(result.outcome);
      } else {
        telemetry.parityMismatch(result.outcome);
      }
      telemetry.parityCompleted(result.outcome);

      return sdkOk(result);
    } catch (error) {
      const code = error instanceof Error ? error.message : 'UNKNOWN';
      telemetry.parityFailed(code);
      return {
        ok: false,
        error: { code: 'INTERNAL', message: code },
      };
    }
  }
}

export function createOrderParityComparator(
  options: OrderParityComparatorOptions
): OrderParityComparator {
  return new OrderParityComparator(options);
}
