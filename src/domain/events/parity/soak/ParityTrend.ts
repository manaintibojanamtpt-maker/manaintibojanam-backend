/** Parity trend analysis (M6 PR-9). Pure domain — no SDK imports. */

export type ParityTrendDirection = 'IMPROVING' | 'STABLE' | 'DEGRADING' | 'INSUFFICIENT_DATA';

export interface ParityTrend {
  readonly direction: ParityTrendDirection;
  readonly earlyParityPercent: number;
  readonly lateParityPercent: number;
  readonly deltaPercent: number;
}

export function analyzeParityTrend(
  parityPercents: readonly number[],
  stableDeltaThreshold = 0.5
): ParityTrend {
  if (parityPercents.length < 4) {
    return {
      direction: 'INSUFFICIENT_DATA',
      earlyParityPercent: 0,
      lateParityPercent: 0,
      deltaPercent: 0,
    };
  }

  const midpoint = Math.floor(parityPercents.length / 2);
  const early = parityPercents.slice(0, midpoint);
  const late = parityPercents.slice(midpoint);
  const avg = (values: readonly number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;

  const earlyParityPercent = avg(early);
  const lateParityPercent = avg(late);
  const deltaPercent = lateParityPercent - earlyParityPercent;

  let direction: ParityTrendDirection = 'STABLE';
  if (deltaPercent > stableDeltaThreshold) direction = 'IMPROVING';
  if (deltaPercent < -stableDeltaThreshold) direction = 'DEGRADING';

  return {
    direction,
    earlyParityPercent: Math.round(earlyParityPercent * 100) / 100,
    lateParityPercent: Math.round(lateParityPercent * 100) / 100,
    deltaPercent: Math.round(deltaPercent * 100) / 100,
  };
}
