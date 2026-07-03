/**
 * Pricing catalog shadow projection snapshot store (M8 PR-7).
 * Metadata only — no catalog payloads.
 */

import type { PricingProjectionSnapshotPort } from './pricingProjectionPorts';
import type { PricingCatalogProjectionReadModel } from '../../../../domain/pricing/projections/pricing/PricingProjectionState';
import type { PricingCatalogProjectionSnapshotRecord } from '../../../../domain/pricing/projections/pricing/PricingProjectionState';
import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';
import type { PricingCatalogProjectionTelemetryHook } from './PricingProjectionTelemetry';
import { createPricingCatalogProjectionTelemetryEmitter } from './PricingProjectionTelemetry';

export interface PricingProjectionSnapshotClock {
  now(): string;
}

export interface PricingProjectionSnapshotUuid {
  generate(): string;
}

export interface PricingProjectionSnapshotOptions {
  readonly clock: PricingProjectionSnapshotClock;
  readonly uuid: PricingProjectionSnapshotUuid;
  readonly onTelemetry?: PricingCatalogProjectionTelemetryHook;
}

export class PricingCatalogProjectionSnapshotStore implements PricingProjectionSnapshotPort {
  private readonly snapshots: PricingCatalogProjectionSnapshotRecord[] = [];

  constructor(private readonly options: PricingProjectionSnapshotOptions) {}

  save(snapshot: PricingCatalogProjectionSnapshotRecord): SdkAsyncResult<void> {
    const telemetry = createPricingCatalogProjectionTelemetryEmitter(
      this.options.onTelemetry,
      'saveSnapshot',
      snapshot.priceListId
    );
    this.snapshots.push(snapshot);
    telemetry.snapshotSaved(snapshot.lastEventId);
    return Promise.resolve(sdkOk(undefined));
  }

  loadLatest(priceListId: string): SdkAsyncResult<PricingCatalogProjectionSnapshotRecord | null> {
    const latest =
      [...this.snapshots].reverse().find((snapshot) => snapshot.priceListId === priceListId) ??
      null;
    return Promise.resolve(sdkOk(latest));
  }

  listByPriceList(
    priceListId: string,
    limit: number
  ): SdkAsyncResult<PricingCatalogProjectionSnapshotRecord[]> {
    const items = this.snapshots
      .filter((snapshot) => snapshot.priceListId === priceListId)
      .slice(-limit);
    return Promise.resolve(sdkOk(items));
  }

  buildSnapshot(
    readModel: PricingCatalogProjectionReadModel,
    lastEventId: string,
    lastEventType: string
  ): PricingCatalogProjectionSnapshotRecord {
    return {
      snapshotId: this.options.uuid.generate(),
      priceListId: readModel.priceListId,
      tenantId: readModel.tenantId,
      projectionVersion: readModel.projectionVersion,
      pricingVersion: readModel.pricingVersion,
      status: readModel.status,
      priceCount: readModel.priceCount,
      couponCount: readModel.couponCount,
      campaignCount: readModel.campaignCount,
      offerCount: readModel.offerCount,
      capturedAt: this.options.clock.now(),
      lastEventId,
      lastEventType,
    };
  }
}

export function createPricingProjectionSnapshotStore(
  options: PricingProjectionSnapshotOptions
): PricingCatalogProjectionSnapshotStore {
  return new PricingCatalogProjectionSnapshotStore(options);
}
