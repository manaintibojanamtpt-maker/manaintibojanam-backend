/** Projection snapshot metadata (M6 PR-6). Pure domain — no SDK imports. */

export interface ProjectionSnapshotMetadata {
  readonly snapshotId: string;
  readonly projectionName: string;
  readonly projectionVersion: string;
  readonly consumerGroup: string;
  readonly lastEventId?: string;
  readonly lastSequence?: number;
  readonly schemaVersion: string;
  readonly capturedAt: string;
}

export function buildProjectionSnapshotMetadata(input: {
  snapshotId: string;
  projectionName: string;
  projectionVersion: string;
  consumerGroup: string;
  schemaVersion: string;
  capturedAt: string;
  lastEventId?: string;
  lastSequence?: number;
}): ProjectionSnapshotMetadata | null {
  if (!input.snapshotId || !input.projectionName || !input.projectionVersion) return null;
  if (!input.consumerGroup || !input.schemaVersion || !input.capturedAt) return null;
  return input;
}
