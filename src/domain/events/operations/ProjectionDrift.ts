/** Projection drift detection (M6 PR-10). Pure domain — no SDK imports. */

export interface ProjectionDriftSample {
  readonly projectionName: string;
  readonly processedEvents: number;
  readonly duplicateEvents: number;
  readonly droppedEvents: number;
  readonly missingEvents: number;
  readonly outOfOrderEvents: number;
}

export interface ProjectionDriftReport {
  readonly projectionName: string;
  readonly duplicatePercent: number;
  readonly droppedEventPercent: number;
  readonly missingEventCount: number;
  readonly outOfOrderEventCount: number;
  readonly driftDetected: boolean;
  readonly reasons: readonly string[];
}

function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

export function detectProjectionDrift(
  sample: ProjectionDriftSample,
  maxDuplicatePercent: number,
  maxDroppedEventPercent: number
): ProjectionDriftReport {
  const reasons: string[] = [];
  const duplicatePercent = percent(sample.duplicateEvents, sample.processedEvents);
  const droppedEventPercent = percent(sample.droppedEvents, sample.processedEvents);

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

  return {
    projectionName: sample.projectionName,
    duplicatePercent,
    droppedEventPercent,
    missingEventCount: sample.missingEvents,
    outOfOrderEventCount: sample.outOfOrderEvents,
    driftDetected: reasons.length > 0,
    reasons,
  };
}
