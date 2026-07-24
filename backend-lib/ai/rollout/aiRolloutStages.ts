/** AI canary rollout stages — same % buckets as pricing M8 PR-12. */

export type AiRolloutStageId = 0 | 1 | 2 | 3 | 4 | 5;

export interface AiRolloutStageDefinition {
  readonly stage: AiRolloutStageId;
  readonly label: string;
  readonly percent: number;
}

export const AI_ROLLOUT_STAGES: readonly AiRolloutStageDefinition[] = [
  { stage: 0, label: 'Off (0%)', percent: 0 },
  { stage: 1, label: 'Canary 1%', percent: 1 },
  { stage: 2, label: 'Pilot 5%', percent: 5 },
  { stage: 3, label: 'Expanded 25%', percent: 25 },
  { stage: 4, label: 'Majority 50%', percent: 50 },
  { stage: 5, label: 'Full 100%', percent: 100 },
] as const;

export function getAiRolloutStageDefinition(stage: AiRolloutStageId): AiRolloutStageDefinition {
  return AI_ROLLOUT_STAGES.find((item) => item.stage === stage) ?? AI_ROLLOUT_STAGES[0]!;
}

export function normalizeAiRolloutStage(value: unknown): AiRolloutStageId {
  const n = typeof value === 'number' ? value : Number(value);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return 0;
}

/** Next wider stage, or null when already at full (5). */
export function getNextAiRolloutStage(stage: AiRolloutStageId): AiRolloutStageId | null {
  if (stage >= 5) return null;
  return (stage + 1) as AiRolloutStageId;
}

/** Prior narrower stage for rollback advice (floor at 0). */
export function getPreviousAiRolloutStage(stage: AiRolloutStageId): AiRolloutStageId {
  if (stage <= 0) return 0;
  return (stage - 1) as AiRolloutStageId;
}
