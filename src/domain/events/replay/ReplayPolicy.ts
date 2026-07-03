/** Replay batch and safety limits (M6 PR-1). */

export const REPLAY_MAX_BATCH_SIZE = 1000 as const;

export const REPLAY_REQUIRES_DRY_RUN_FIRST = false as const;

export function clampReplayBatchSize(requested: number): number {
  return Math.min(Math.max(1, requested), REPLAY_MAX_BATCH_SIZE);
}
