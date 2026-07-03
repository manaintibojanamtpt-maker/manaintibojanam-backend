/**
 * Pricing projection checkpoint repository (M8 PR-6).
 * In-memory persistence only — no Firestore.
 */

import type { PricingProjectionCheckpoint } from '../../../domain/pricing/projection/PricingProjectionCheckpoint';
import { pricingCheckpointKey } from '../../../domain/pricing/projection/PricingProjectionCheckpoint';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { PricingProjectionCheckpointPort } from './PricingProjectionPorts';

export class PricingProjectionCheckpointRepository implements PricingProjectionCheckpointPort {
  private readonly store = new Map<string, PricingProjectionCheckpoint>();

  save(checkpoint: PricingProjectionCheckpoint): SdkAsyncResult<void> {
    this.store.set(pricingCheckpointKey(checkpoint), checkpoint);
    return Promise.resolve(sdkOk(undefined));
  }

  load(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<PricingProjectionCheckpoint | null> {
    return Promise.resolve(
      sdkOk(this.store.get(`${projectionName}@${consumerGroup}`) ?? null)
    );
  }

  size(): number {
    return this.store.size;
  }
}

export function createPricingProjectionCheckpointRepository(): PricingProjectionCheckpointPort {
  return new PricingProjectionCheckpointRepository();
}
