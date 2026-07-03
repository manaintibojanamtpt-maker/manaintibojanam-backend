/** Menu rollout stage definitions (M7 PR-12). Pure domain — no SDK imports. */

export type RolloutStageId = 0 | 1 | 2 | 3 | 4 | 5;

export interface RolloutStageDefinition {
  readonly stage: RolloutStageId;
  readonly label: string;
  readonly projectionPercent: number;
}

export const ROLLOUT_STAGES: readonly RolloutStageDefinition[] = [
  { stage: 0, label: 'Legacy Only', projectionPercent: 0 },
  { stage: 1, label: 'Canary 1%', projectionPercent: 1 },
  { stage: 2, label: 'Pilot 5%', projectionPercent: 5 },
  { stage: 3, label: 'Expanded 25%', projectionPercent: 25 },
  { stage: 4, label: 'Majority 50%', projectionPercent: 50 },
  { stage: 5, label: 'Full 100%', projectionPercent: 100 },
] as const;

export function getRolloutStageDefinition(stage: RolloutStageId): RolloutStageDefinition {
  return ROLLOUT_STAGES.find((item) => item.stage === stage) ?? ROLLOUT_STAGES[0]!;
}

export function getNextRolloutStage(stage: RolloutStageId): RolloutStageId | null {
  if (stage >= 5) return null;
  return (stage + 1) as RolloutStageId;
}
