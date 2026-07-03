/**
 * Pricing projection execution plan (M8 PR-6).
 * Pure domain — no business mapping.
 */

import type { PricingProjectionIdentity } from './PricingProjectionMetadata';
import type { PricingProjectionExecuteRequest } from './PricingProjectionExecution';

export interface PricingProjectionPlan {
  readonly identity: PricingProjectionIdentity;
  readonly executionId: string;
  readonly requestedAt: string;
}

export function buildPricingProjectionPlan(input: {
  identity: PricingProjectionIdentity;
  executionId: string;
  requestedAt: string;
}): PricingProjectionPlan | null {
  if (!input.identity.projectionName || !input.identity.consumerGroup) return null;
  if (!input.executionId || !input.requestedAt) return null;
  return input;
}

export function planFromPricingExecuteRequest(
  request: PricingProjectionExecuteRequest,
  requestedAt: string
): PricingProjectionPlan | null {
  return buildPricingProjectionPlan({
    identity: {
      projectionName: request.projectionName,
      projectionVersion: request.projectionVersion,
      consumerGroup: request.consumerGroup,
      schemaVersion: request.schemaVersion,
    },
    executionId: request.executionId,
    requestedAt,
  });
}
