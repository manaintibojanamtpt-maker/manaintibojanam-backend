/** Projection replay health (M6 PR-10). Pure domain — no SDK imports. */

export interface ProjectionReplaySample {
  readonly projectionName: string;
  readonly replayAttempts: number;
  readonly replaySuccesses: number;
}

export interface ProjectionReplayHealth {
  readonly projectionName: string;
  readonly replayAttempts: number;
  readonly replaySuccesses: number;
  readonly replaySuccessPercent: number;
  readonly verified: boolean;
}

export function evaluateProjectionReplayHealth(
  sample: ProjectionReplaySample,
  minReplaySuccessPercent: number
): ProjectionReplayHealth {
  const replaySuccessPercent =
    sample.replayAttempts === 0
      ? 100
      : Math.round((sample.replaySuccesses / sample.replayAttempts) * 10000) / 100;

  return {
    projectionName: sample.projectionName,
    replayAttempts: sample.replayAttempts,
    replaySuccesses: sample.replaySuccesses,
    replaySuccessPercent,
    verified: replaySuccessPercent >= minReplaySuccessPercent,
  };
}
