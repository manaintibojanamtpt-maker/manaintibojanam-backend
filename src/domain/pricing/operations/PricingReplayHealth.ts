/** Pricing projection replay health (M8 PR-10). Pure domain — no SDK imports. */

export interface PricingReplaySample {
  readonly projectionName: string;
  readonly replayAttempts: number;
  readonly replaySuccesses: number;
}

export interface PricingReplayHealth {
  readonly projectionName: string;
  readonly replayAttempts: number;
  readonly replaySuccesses: number;
  readonly replaySuccessPercent: number;
  readonly verified: boolean;
}

export function evaluatePricingReplayHealth(
  sample: PricingReplaySample,
  minReplaySuccessPercent: number
): PricingReplayHealth {
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
