/**
 * Menu projection checkpoint (M7 PR-6).
 * Pure domain — no infrastructure imports.
 */

export interface MenuProjectionCheckpoint {
  readonly projectionName: string;
  readonly projectionVersion: string;
  readonly eventId?: string;
  readonly sequence?: number;
  readonly schemaVersion: string;
  readonly consumerGroup: string;
  readonly updatedAt: string;
}

export function buildMenuProjectionCheckpoint(input: {
  projectionName: string;
  projectionVersion: string;
  consumerGroup: string;
  schemaVersion: string;
  updatedAt: string;
  eventId?: string;
  sequence?: number;
}): MenuProjectionCheckpoint | null {
  if (!input.projectionName || !input.projectionVersion || !input.consumerGroup) return null;
  if (!input.schemaVersion || !input.updatedAt) return null;
  return input;
}

export function checkpointKey(checkpoint: MenuProjectionCheckpoint): string {
  return `${checkpoint.projectionName}@${checkpoint.consumerGroup}`;
}
