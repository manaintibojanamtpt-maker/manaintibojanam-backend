/**
 * Phase 24 — shadow traffic validation (non-user-visible capture + offline replay).
 * OFF by default; does not call providers or serve responses to end users.
 */
export interface AiShadowTrafficConfig {
  readonly enabled: boolean;
  /** 0–1 inclusive; 1 = capture every eligible audit event. */
  readonly sampleRate: number;
  /** Max samples returned per replay / list request. */
  readonly maxBatch: number;
  /** Reserved — in-process ring buffer only for Phase 24. */
  readonly persistenceEnabled: boolean;
}

const DEFAULT_SAMPLE_RATE = 1;
const DEFAULT_MAX_BATCH = 50;
const DEFAULT_BUFFER_CAPACITY = 500;

export function readAiShadowTrafficConfig(
  env: NodeJS.ProcessEnv = process.env,
): AiShadowTrafficConfig {
  const sampleRateRaw = env.AI_SHADOW_TRAFFIC_SAMPLE_RATE;
  const parsedRate =
    sampleRateRaw !== undefined && sampleRateRaw !== ''
      ? Number(sampleRateRaw)
      : DEFAULT_SAMPLE_RATE;
  const sampleRate =
    Number.isFinite(parsedRate) && parsedRate >= 0 && parsedRate <= 1
      ? parsedRate
      : DEFAULT_SAMPLE_RATE;

  const maxBatchRaw = env.AI_SHADOW_TRAFFIC_MAX_BATCH;
  const parsedBatch =
    maxBatchRaw !== undefined && maxBatchRaw !== ''
      ? Number(maxBatchRaw)
      : DEFAULT_MAX_BATCH;
  const maxBatch =
    Number.isFinite(parsedBatch) && parsedBatch >= 1
      ? Math.floor(parsedBatch)
      : DEFAULT_MAX_BATCH;

  return {
    enabled: env.AI_SHADOW_TRAFFIC_ENABLED === 'true',
    sampleRate,
    maxBatch,
    persistenceEnabled: env.AI_SHADOW_PERSISTENCE_ENABLED === 'true',
  };
}

export function readAiShadowBufferCapacity(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env.AI_SHADOW_TRAFFIC_BUFFER_CAPACITY;
  const parsed = raw !== undefined && raw !== '' ? Number(raw) : DEFAULT_BUFFER_CAPACITY;
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : DEFAULT_BUFFER_CAPACITY;
}
