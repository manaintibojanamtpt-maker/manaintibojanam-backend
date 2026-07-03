/**
 * Order read projection snapshot store (M6 PR-7 test only).
 */

import type { OrderProjectionSnapshotPort } from '../../contracts/orderProjectionPorts';
import type { OrderProjectionSnapshotRecord } from '../../../../domain/events/projections/order/OrderProjectionState';
import type { ClockPort, UuidPort } from '../../contracts/ports';
import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';
import type { OrderProjectionTelemetryHook } from './OrderProjectionTelemetry';
import { createOrderProjectionTelemetryEmitter } from './OrderProjectionTelemetry';

export interface OrderProjectionSnapshotOptions {
  readonly clock: ClockPort;
  readonly uuid: UuidPort;
  readonly onTelemetry?: OrderProjectionTelemetryHook;
}

export class OrderProjectionSnapshotStore implements OrderProjectionSnapshotPort {
  private readonly snapshots: OrderProjectionSnapshotRecord[] = [];

  constructor(private readonly options: OrderProjectionSnapshotOptions) {}

  save(snapshot: OrderProjectionSnapshotRecord): SdkAsyncResult<void> {
    const telemetry = createOrderProjectionTelemetryEmitter(
      this.options.onTelemetry,
      'saveSnapshot',
      snapshot.orderId
    );
    this.snapshots.push(snapshot);
    telemetry.snapshotSaved(snapshot.lastEventId);
    return Promise.resolve(sdkOk(undefined));
  }

  loadLatest(orderId: string): SdkAsyncResult<OrderProjectionSnapshotRecord | null> {
    const latest = [...this.snapshots].reverse().find((s) => s.orderId === orderId) ?? null;
    return Promise.resolve(sdkOk(latest));
  }

  listByOrder(orderId: string, limit: number): SdkAsyncResult<OrderProjectionSnapshotRecord[]> {
    const items = this.snapshots.filter((s) => s.orderId === orderId).slice(-limit);
    return Promise.resolve(sdkOk(items));
  }

  buildSnapshot(
    readModel: import('../../../../domain/events/projections/order/OrderProjectionState').OrderProjectionReadModel,
    lastEventId: string,
    lastEventType: string
  ): OrderProjectionSnapshotRecord {
    return {
      snapshotId: this.options.uuid.generate(),
      orderId: readModel.orderId,
      tenantId: readModel.tenantId,
      projectionVersion: readModel.projectionVersion,
      readModel,
      capturedAt: this.options.clock.now(),
      lastEventId,
      lastEventType,
    };
  }
}

export function createOrderProjectionSnapshotStore(
  options: OrderProjectionSnapshotOptions
): OrderProjectionSnapshotStore {
  return new OrderProjectionSnapshotStore(options);
}
