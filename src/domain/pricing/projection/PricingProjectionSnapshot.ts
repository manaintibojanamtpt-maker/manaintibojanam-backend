/**
 * Pricing projection snapshot metadata (M8 PR-6).
 * Metadata only — no read model payloads.
 */

import type { PricingProjectionCheckpoint } from './PricingProjectionCheckpoint';

export interface PricingProjectionSnapshotMetadata {
  readonly snapshotId: string;
  readonly projectionName: string;
  readonly projectionVersion: string;
  readonly checkpoint: PricingProjectionCheckpoint;
  readonly capturedAt: string;
  readonly metadata: Readonly<Record<string, string>>;
}

export function buildPricingProjectionSnapshotMetadata(input: {
  snapshotId: string;
  projectionName: string;
  projectionVersion: string;
  checkpoint: PricingProjectionCheckpoint;
  capturedAt: string;
  metadata?: Readonly<Record<string, string>>;
}): PricingProjectionSnapshotMetadata | null {
  if (!input.snapshotId || !input.projectionName || !input.projectionVersion) return null;
  if (!input.checkpoint || !input.capturedAt) return null;
  return {
    ...input,
    metadata: input.metadata ?? {},
  };
}
