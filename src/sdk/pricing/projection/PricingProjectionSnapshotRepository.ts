/**
 * Pricing projection snapshot repository (M8 PR-6).
 * Stores snapshot metadata only — no read model payloads.
 */

import type { PricingProjectionSnapshotMetadata } from '../../../domain/pricing/projection/PricingProjectionSnapshot';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { PricingProjectionSnapshotPort } from './PricingProjectionPorts';

export class PricingProjectionSnapshotRepository implements PricingProjectionSnapshotPort {
  private readonly latest = new Map<string, PricingProjectionSnapshotMetadata>();
  private readonly history: PricingProjectionSnapshotMetadata[] = [];

  private key(projectionName: string, consumerGroup: string): string {
    return `${projectionName}@${consumerGroup}`;
  }

  save(snapshot: PricingProjectionSnapshotMetadata): SdkAsyncResult<void> {
    this.latest.set(this.key(snapshot.projectionName, snapshot.checkpoint.consumerGroup), snapshot);
    this.history.push(snapshot);
    return Promise.resolve(sdkOk(undefined));
  }

  load(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<PricingProjectionSnapshotMetadata | null> {
    return Promise.resolve(sdkOk(this.latest.get(this.key(projectionName, consumerGroup)) ?? null));
  }

  list(projectionName: string, limit: number): SdkAsyncResult<PricingProjectionSnapshotMetadata[]> {
    const items = this.history.filter((entry) => entry.projectionName === projectionName).slice(-limit);
    return Promise.resolve(sdkOk(items));
  }

  historySize(): number {
    return this.history.length;
  }
}

export function createPricingProjectionSnapshotRepository(): PricingProjectionSnapshotPort {
  return new PricingProjectionSnapshotRepository();
}
