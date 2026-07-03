/** Menu projection replay health (M7 PR-10). Pure domain — no SDK imports. */

export interface MenuReplaySample {
  readonly projectionName: string;
  readonly replayAttempts: number;
  readonly replaySuccesses: number;
}

export interface MenuReplayHealth {
  readonly projectionName: string;
  readonly replayAttempts: number;
  readonly replaySuccesses: number;
  readonly replaySuccessPercent: number;
  readonly verified: boolean;
}

export function evaluateMenuReplayHealth(
  sample: MenuReplaySample,
  minReplaySuccessPercent: number
): MenuReplayHealth {
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
