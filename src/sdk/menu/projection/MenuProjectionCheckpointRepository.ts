/**
 * Menu projection checkpoint repository (M7 PR-6).
 * In-memory persistence only — no Firestore.
 */

import type { MenuProjectionCheckpoint } from '../../../domain/menu/projection/MenuProjectionCheckpoint';
import { checkpointKey } from '../../../domain/menu/projection/MenuProjectionCheckpoint';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { MenuProjectionCheckpointPort } from './MenuProjectionPorts';

export class MenuProjectionCheckpointRepository implements MenuProjectionCheckpointPort {
  private readonly store = new Map<string, MenuProjectionCheckpoint>();

  save(checkpoint: MenuProjectionCheckpoint): SdkAsyncResult<void> {
    this.store.set(checkpointKey(checkpoint), checkpoint);
    return Promise.resolve(sdkOk(undefined));
  }

  load(
    projectionName: string,
    consumerGroup: string
  ): SdkAsyncResult<MenuProjectionCheckpoint | null> {
    return Promise.resolve(
      sdkOk(this.store.get(`${projectionName}@${consumerGroup}`) ?? null)
    );
  }

  size(): number {
    return this.store.size;
  }
}

export function createMenuProjectionCheckpointRepository(): MenuProjectionCheckpointPort {
  return new MenuProjectionCheckpointRepository();
}
