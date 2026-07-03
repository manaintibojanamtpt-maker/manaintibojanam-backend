/**
 * Menu catalog shadow projection snapshot store (M7 PR-7 test only).
 */

import type { MenuProjectionSnapshotPort } from './menuProjectionPorts';
import type { MenuCatalogProjectionReadModel } from '../../../../domain/menu/projections/menu/MenuProjectionState';
import type { MenuCatalogProjectionSnapshotRecord } from '../../../../domain/menu/projections/menu/MenuProjectionState';
import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';
import type { MenuCatalogProjectionTelemetryHook } from './MenuProjectionTelemetry';
import { createMenuCatalogProjectionTelemetryEmitter } from './MenuProjectionTelemetry';

export interface MenuProjectionSnapshotClock {
  now(): string;
}

export interface MenuProjectionSnapshotUuid {
  generate(): string;
}

export interface MenuProjectionSnapshotOptions {
  readonly clock: MenuProjectionSnapshotClock;
  readonly uuid: MenuProjectionSnapshotUuid;
  readonly onTelemetry?: MenuCatalogProjectionTelemetryHook;
}

export class MenuCatalogProjectionSnapshotStore implements MenuProjectionSnapshotPort {
  private readonly snapshots: MenuCatalogProjectionSnapshotRecord[] = [];

  constructor(private readonly options: MenuProjectionSnapshotOptions) {}

  save(snapshot: MenuCatalogProjectionSnapshotRecord): SdkAsyncResult<void> {
    const telemetry = createMenuCatalogProjectionTelemetryEmitter(
      this.options.onTelemetry,
      'saveSnapshot',
      snapshot.catalogId
    );
    this.snapshots.push(snapshot);
    telemetry.snapshotSaved(snapshot.lastEventId);
    return Promise.resolve(sdkOk(undefined));
  }

  loadLatest(catalogId: string): SdkAsyncResult<MenuCatalogProjectionSnapshotRecord | null> {
    const latest =
      [...this.snapshots].reverse().find((snapshot) => snapshot.catalogId === catalogId) ?? null;
    return Promise.resolve(sdkOk(latest));
  }

  listByCatalog(
    catalogId: string,
    limit: number
  ): SdkAsyncResult<MenuCatalogProjectionSnapshotRecord[]> {
    const items = this.snapshots.filter((snapshot) => snapshot.catalogId === catalogId).slice(-limit);
    return Promise.resolve(sdkOk(items));
  }

  buildSnapshot(
    readModel: MenuCatalogProjectionReadModel,
    lastEventId: string,
    lastEventType: string
  ): MenuCatalogProjectionSnapshotRecord {
    return {
      snapshotId: this.options.uuid.generate(),
      catalogId: readModel.catalogId,
      tenantId: readModel.tenantId,
      projectionVersion: readModel.projectionVersion,
      readModel,
      capturedAt: this.options.clock.now(),
      lastEventId,
      lastEventType,
    };
  }
}

export function createMenuProjectionSnapshotStore(
  options: MenuProjectionSnapshotOptions
): MenuCatalogProjectionSnapshotStore {
  return new MenuCatalogProjectionSnapshotStore(options);
}
