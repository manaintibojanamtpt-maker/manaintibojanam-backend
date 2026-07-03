/**
 * Menu projection snapshot repository (M7 PR-6).
 * Stores snapshot metadata only — no read model payloads.
 */

import type { MenuProjectionSnapshotMetadata } from '../../../domain/menu/projection/MenuProjectionSnapshot';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { MenuProjectionSnapshotPort } from './MenuProjectionPorts';

export class MenuProjectionSnapshotRepository implements MenuProjectionSnapshotPort {
  private readonly latest = new Map<string, MenuProjectionSnapshotMetadata>();
  private readonly history: MenuProjectionSnapshotMetadata[] = [];

  private key(projectionName: string, consumerGroup: string): string {
    return `${projectionName}@${consumerGroup}`;
  }

  save(snapshot: MenuProjectionSnapshotMetadata): SdkAsyncResult<void> {
    this.latest.set(this.key(snapshot.projectionName, snapshot.consumerGroup), snapshot);
    this.history.push(snapshot);
    return Promise.resolve(sdkOk(undefined));
  }

  load(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<MenuProjectionSnapshotMetadata | null> {
    return Promise.resolve(sdkOk(this.latest.get(this.key(projectionName, consumerGroup)) ?? null));
  }

  list(projectionName: string, limit: number): SdkAsyncResult<MenuProjectionSnapshotMetadata[]> {
    const items = this.history.filter((entry) => entry.projectionName === projectionName).slice(-limit);
    return Promise.resolve(sdkOk(items));
  }

  historySize(): number {
    return this.history.length;
  }
}

export function createMenuProjectionSnapshotRepository(): MenuProjectionSnapshotPort {
  return new MenuProjectionSnapshotRepository();
}
