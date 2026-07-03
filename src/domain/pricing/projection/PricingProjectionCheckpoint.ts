/**
 * Pricing projection checkpoint (M8 PR-6).
 * Pure domain — no infrastructure imports.
 */

export interface PricingProjectionCheckpoint {
  readonly projectionName: string;
  readonly projectionVersion: string;
  readonly eventId?: string;
  readonly sequence?: number;
  readonly schemaVersion: string;
  readonly consumerGroup: string;
  readonly updatedAt: string;
}

export function buildPricingProjectionCheckpoint(input: {
  projectionName: string;
  projectionVersion: string;
  consumerGroup: string;
  schemaVersion: string;
  updatedAt: string;
  eventId?: string;
  sequence?: number;
}): PricingProjectionCheckpoint | null {
  if (!input.projectionName || !input.projectionVersion || !input.consumerGroup) return null;
  if (!input.schemaVersion || !input.updatedAt) return null;
  return input;
}

export function pricingCheckpointKey(checkpoint: PricingProjectionCheckpoint): string {
  return `${checkpoint.projectionName}@${checkpoint.consumerGroup}`;
}
