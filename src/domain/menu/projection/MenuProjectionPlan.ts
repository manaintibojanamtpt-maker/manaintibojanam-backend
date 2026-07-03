/**
 * Menu projection execution plan (M7 PR-6).
 * Pure domain — no business mapping.
 */

import type { MenuProjectionIdentity } from './MenuProjectionMetadata';
import type { MenuProjectionExecuteRequest } from './MenuProjectionExecution';

export interface MenuProjectionPlan {
  readonly identity: MenuProjectionIdentity;
  readonly executionId: string;
  readonly requestedAt: string;
}

export function buildMenuProjectionPlan(input: {
  identity: MenuProjectionIdentity;
  executionId: string;
  requestedAt: string;
}): MenuProjectionPlan | null {
  if (!input.identity.projectionName || !input.identity.consumerGroup) return null;
  if (!input.executionId || !input.requestedAt) return null;
  return input;
}

export function planFromExecuteRequest(
  request: MenuProjectionExecuteRequest,
  requestedAt: string
): MenuProjectionPlan | null {
  return buildMenuProjectionPlan({
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
