/**
 * Menu projection trend analysis (M7 PR-9).
 * Pure domain — no infrastructure imports.
 */

export type MenuProjectionTrendDirection = 'IMPROVING' | 'STABLE' | 'DEGRADING';

export interface MenuProjectionTrend {
  readonly direction: MenuProjectionTrendDirection;
  readonly earlyParityPercent: number;
  readonly lateParityPercent: number;
  readonly deltaPercent: number;
}

export function analyzeMenuProjectionTrend(
  parityPercents: readonly number[],
  stableDeltaThreshold = 0.5
): MenuProjectionTrend {
  if (parityPercents.length < 4) {
    return {
      direction: 'STABLE',
      earlyParityPercent: 0,
      lateParityPercent: 0,
      deltaPercent: 0,
    };
  }

  const midpoint = Math.floor(parityPercents.length / 2);
  const early = parityPercents.slice(0, midpoint);
  const late = parityPercents.slice(midpoint);
  const average = (values: readonly number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;

  const earlyParityPercent = average(early);
  const lateParityPercent = average(late);
  const deltaPercent = lateParityPercent - earlyParityPercent;

  let direction: MenuProjectionTrendDirection = 'STABLE';
  if (deltaPercent > stableDeltaThreshold) direction = 'IMPROVING';
  if (deltaPercent < -stableDeltaThreshold) direction = 'DEGRADING';

  return {
    direction,
    earlyParityPercent: Math.round(earlyParityPercent * 100) / 100,
    lateParityPercent: Math.round(lateParityPercent * 100) / 100,
    deltaPercent: Math.round(deltaPercent * 100) / 100,
  };
}
