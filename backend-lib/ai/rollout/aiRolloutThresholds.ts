/** Local copy of health-gate shape to avoid circular import with aiRolloutPolicy. */
export interface AiRolloutHealthGateNumbers {
  readonly maxFailureRatePercent: number;
  readonly maxP95LatencyMs: number;
  readonly maxSafetyBlockedRatePercent: number;
  readonly minSampleSize: number;
}

/** Phase 25 advisory thresholds for promotion / halt / rollback. */
export interface AiCanaryLiveRolloutThresholds {
  readonly routingHealth: AiRolloutHealthGateNumbers;
  /** Stricter than routing — recommend halt (do not promote). */
  readonly halt: AiRolloutHealthGateNumbers;
  /** Stricter still — recommend rollback stage. */
  readonly rollback: AiRolloutHealthGateNumbers;
  readonly goldenMinPassRate: number;
  readonly shadowMinSamples: number;
  readonly shadowMaxDriftRate: number;
  readonly minSoakHours: number;
  /** Max share of events with AI_CANARY_* error codes before halt. */
  readonly maxCanaryErrorRatePercent: number;
}

export const DEFAULT_AI_CANARY_LIVE_THRESHOLDS: AiCanaryLiveRolloutThresholds = {
  /** Mirrors DEFAULT_AI_ROLLOUT_HEALTH_GATES (Phase 13). */
  routingHealth: {
    maxFailureRatePercent: 15,
    maxP95LatencyMs: 15_000,
    maxSafetyBlockedRatePercent: 25,
    minSampleSize: 20,
  },
  halt: {
    maxFailureRatePercent: 12,
    maxP95LatencyMs: 12_000,
    maxSafetyBlockedRatePercent: 20,
    minSampleSize: 20,
  },
  rollback: {
    maxFailureRatePercent: 20,
    maxP95LatencyMs: 20_000,
    maxSafetyBlockedRatePercent: 30,
    minSampleSize: 20,
  },
  goldenMinPassRate: 1,
  shadowMinSamples: 10,
  shadowMaxDriftRate: 0.05,
  minSoakHours: 24,
  maxCanaryErrorRatePercent: 10,
};

function parsePositiveNumber(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function readAiCanaryLiveRolloutThresholds(
  env: NodeJS.ProcessEnv = process.env,
): AiCanaryLiveRolloutThresholds {
  const base = DEFAULT_AI_CANARY_LIVE_THRESHOLDS;
  return {
    routingHealth: base.routingHealth,
    halt: base.halt,
    rollback: base.rollback,
    goldenMinPassRate: Math.min(
      1,
      parsePositiveNumber(env.AI_CANARY_GOLDEN_MIN_PASS_RATE, base.goldenMinPassRate),
    ),
    shadowMinSamples: Math.floor(
      parsePositiveNumber(env.AI_CANARY_SHADOW_MIN_SAMPLES, base.shadowMinSamples),
    ),
    shadowMaxDriftRate: Math.min(
      1,
      parsePositiveNumber(env.AI_CANARY_SHADOW_MAX_DRIFT_RATE, base.shadowMaxDriftRate),
    ),
    minSoakHours: parsePositiveNumber(env.AI_CANARY_ROLLOUT_MIN_SOAK_HOURS, base.minSoakHours),
    maxCanaryErrorRatePercent: parsePositiveNumber(
      env.AI_CANARY_MAX_ERROR_RATE_PERCENT,
      base.maxCanaryErrorRatePercent,
    ),
  };
}
