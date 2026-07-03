/**
 * Menu projection snapshot metadata (M7 PR-6).
 * Metadata only — no read model payloads.
 * Pure domain — no infrastructure imports.
 */

export interface MenuProjectionSnapshotMetadata {
  readonly snapshotId: string;
  readonly projectionName: string;
  readonly projectionVersion: string;
  readonly consumerGroup: string;
  readonly lastEventId?: string;
  readonly lastSequence?: number;
  readonly schemaVersion: string;
  readonly capturedAt: string;
}

export function buildMenuProjectionSnapshotMetadata(input: {
  snapshotId: string;
  projectionName: string;
  projectionVersion: string;
  consumerGroup: string;
  schemaVersion: string;
  capturedAt: string;
  lastEventId?: string;
  lastSequence?: number;
}): MenuProjectionSnapshotMetadata | null {
  if (!input.snapshotId || !input.projectionName || !input.projectionVersion) return null;
  if (!input.consumerGroup || !input.schemaVersion || !input.capturedAt) return null;
  return input;
}
