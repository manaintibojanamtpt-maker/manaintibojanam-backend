/** Menu projection drift detection (M7 PR-10). Pure domain — no SDK imports. */

export interface MenuProjectionDriftSample {
  readonly projectionName: string;
  readonly processedEvents: number;
  readonly duplicateEvents: number;
  readonly droppedEvents: number;
  readonly missingEvents: number;
  readonly outOfOrderEvents: number;
}

export interface MenuProjectionDriftReport {
  readonly projectionName: string;
  readonly duplicatePercent: number;
  readonly droppedEventPercent: number;
  readonly missingEventCount: number;
  readonly outOfOrderEventCount: number;
  readonly projectionDriftCount: number;
  readonly driftDetected: boolean;
  readonly reasons: readonly string[];
}

function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

export function detectMenuProjectionDrift(
  sample: MenuProjectionDriftSample,
  maxDuplicatePercent: number,
  maxDroppedEventPercent: number,
  maxCriticalDriftCount = 0
): MenuProjectionDriftReport {
  const reasons: string[] = [];
  const duplicatePercent = percent(sample.duplicateEvents, sample.processedEvents);
  const droppedEventPercent = percent(sample.droppedEvents, sample.processedEvents);
  const projectionDriftCount =
    sample.missingEvents + sample.outOfOrderEvents + sample.duplicateEvents;

  if (duplicatePercent > maxDuplicatePercent) {
    reasons.push(`Duplicate rate ${duplicatePercent}% exceeds ${maxDuplicatePercent}%`);
  }
  if (droppedEventPercent > maxDroppedEventPercent) {
    reasons.push(`Dropped event rate ${droppedEventPercent}% exceeds ${maxDroppedEventPercent}%`);
  }
  if (sample.missingEvents > 0) {
    reasons.push(`Missing events detected: ${sample.missingEvents}`);
  }
  if (sample.outOfOrderEvents > 0) {
    reasons.push(`Out-of-order events detected: ${sample.outOfOrderEvents}`);
  }
  if (projectionDriftCount > maxCriticalDriftCount) {
    reasons.push(
      `Projection drift count ${projectionDriftCount} exceeds critical threshold ${maxCriticalDriftCount}`
    );
  }

  return {
    projectionName: sample.projectionName,
    duplicatePercent,
    droppedEventPercent,
    missingEventCount: sample.missingEvents,
    outOfOrderEventCount: sample.outOfOrderEvents,
    projectionDriftCount,
    driftDetected: reasons.length > 0,
    reasons,
  };
}
