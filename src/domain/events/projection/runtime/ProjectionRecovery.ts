/** Projection recovery helpers (M6 PR-6). Pure domain — no SDK imports. */

import type { ProjectionRuntimeExecutionRecord } from './ProjectionExecutionRecord';

export interface ProjectionRecoveryPlan {
  readonly projectionName: string;
  readonly consumerGroup: string;
  readonly fromExecutionId?: string;
  readonly fromEventId?: string;
  readonly fromSequence?: number;
  readonly resumeAllowed: boolean;
}

export function buildRecoveryPlan(input: {
  projectionName: string;
  consumerGroup: string;
  lastFailedExecution?: ProjectionRuntimeExecutionRecord;
  lastEventId?: string;
  lastSequence?: number;
}): ProjectionRecoveryPlan | null {
  if (!input.projectionName || !input.consumerGroup) return null;
  const resumeAllowed =
    input.lastFailedExecution?.status === 'failed' ||
    input.lastEventId !== undefined ||
    input.lastSequence !== undefined;
  return {
    projectionName: input.projectionName,
    consumerGroup: input.consumerGroup,
    fromExecutionId: input.lastFailedExecution?.executionId,
    fromEventId: input.lastEventId,
    fromSequence: input.lastSequence,
    resumeAllowed,
  };
}

export function canResumeFromCheckpoint(plan: ProjectionRecoveryPlan): boolean {
  return plan.resumeAllowed && (plan.fromEventId !== undefined || plan.fromSequence !== undefined);
}
