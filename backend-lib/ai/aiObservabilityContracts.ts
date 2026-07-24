import type { AiAuditEvent, AiAuditEventType } from './auditContracts.js';

export const AI_OBSERVABILITY_SCHEMA_VERSION = '20.0' as const;

export interface AiLatencyStats {
  readonly count: number;
  readonly avgMs: number | null;
  readonly p50Ms: number | null;
  readonly p95Ms: number | null;
}

/** Per-slice quality/safety/latency — used for canary cohort buckets. */
export interface AiObservabilitySlice {
  readonly totalEvents: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly safetyBlockedCount: number;
  readonly latency: AiLatencyStats;
}

export interface AiObservabilityWindow {
  readonly since: string;
  readonly totalEvents: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly safetyBlockedCount: number;
  readonly byEventType: Readonly<Record<string, number>>;
  readonly byPlatform: Readonly<Record<string, number>>;
  readonly byMode: Readonly<Record<string, number>>;
  /** Percentage bucket 0–99 (string keys), or "none" when no cohort key. */
  readonly byCanaryBucket: Readonly<Record<string, AiObservabilitySlice>>;
  readonly byErrorCode: Readonly<Record<string, number>>;
  readonly latency: AiLatencyStats;
}

/** Stable read-only observability snapshot — no PII, no mutation. */
export interface AiObservabilitySnapshot {
  readonly schemaVersion: typeof AI_OBSERVABILITY_SCHEMA_VERSION;
  readonly generatedAt: string;
  readonly mutatedState: false;
  readonly persistence: 'in_process';
  readonly process: AiObservabilityWindow;
  readonly last1h: AiObservabilityWindow;
  readonly last24h: AiObservabilityWindow;
}

export interface AiMetricSample {
  readonly timestampMs: number;
  readonly eventType: AiAuditEventType;
  readonly success: boolean;
  readonly safetyBlocked: boolean;
  readonly latencyMs?: number;
  readonly platform?: AiAuditEvent['platform'];
  readonly mode?: AiAuditEvent['mode'];
  readonly canaryBucket?: number;
  readonly errorCode?: string;
  readonly canaryGateApplied?: boolean;
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx] ?? null;
}

function emptyLatency(): AiLatencyStats {
  return { count: 0, avgMs: null, p50Ms: null, p95Ms: null };
}

function emptySlice(): AiObservabilitySlice {
  return {
    totalEvents: 0,
    successCount: 0,
    failureCount: 0,
    safetyBlockedCount: 0,
    latency: emptyLatency(),
  };
}

function finalizeSlice(
  acc: {
    totalEvents: number;
    successCount: number;
    failureCount: number;
    safetyBlockedCount: number;
    latencies: number[];
  },
): AiObservabilitySlice {
  acc.latencies.sort((a, b) => a - b);
  const avgMs =
    acc.latencies.length > 0
      ? Math.round(acc.latencies.reduce((sum, n) => sum + n, 0) / acc.latencies.length)
      : null;
  return {
    totalEvents: acc.totalEvents,
    successCount: acc.successCount,
    failureCount: acc.failureCount,
    safetyBlockedCount: acc.safetyBlockedCount,
    latency: {
      count: acc.latencies.length,
      avgMs,
      p50Ms: percentile(acc.latencies, 50),
      p95Ms: percentile(acc.latencies, 95),
    },
  };
}

export function buildWindowStats(
  samples: readonly AiMetricSample[],
  sinceMs: number,
  nowMs: number = Date.now(),
): AiObservabilityWindow {
  const inWindow = samples.filter((s) => s.timestampMs >= sinceMs);
  const byEventType: Record<string, number> = {};
  const byPlatform: Record<string, number> = {};
  const byMode: Record<string, number> = {};
  const byErrorCode: Record<string, number> = {};
  const bucketAcc: Record<
    string,
    {
      totalEvents: number;
      successCount: number;
      failureCount: number;
      safetyBlockedCount: number;
      latencies: number[];
    }
  > = {};
  let successCount = 0;
  let failureCount = 0;
  let safetyBlockedCount = 0;
  const latencies: number[] = [];

  for (const sample of inWindow) {
    byEventType[sample.eventType] = (byEventType[sample.eventType] ?? 0) + 1;
    if (sample.platform) {
      byPlatform[sample.platform] = (byPlatform[sample.platform] ?? 0) + 1;
    }
    if (sample.mode) {
      byMode[sample.mode] = (byMode[sample.mode] ?? 0) + 1;
    }
    if (sample.errorCode) {
      byErrorCode[sample.errorCode] = (byErrorCode[sample.errorCode] ?? 0) + 1;
    }

    const bucketKey =
      typeof sample.canaryBucket === 'number' && Number.isFinite(sample.canaryBucket)
        ? String(sample.canaryBucket)
        : 'none';
    if (!bucketAcc[bucketKey]) {
      bucketAcc[bucketKey] = {
        totalEvents: 0,
        successCount: 0,
        failureCount: 0,
        safetyBlockedCount: 0,
        latencies: [],
      };
    }
    const slice = bucketAcc[bucketKey]!;
    slice.totalEvents += 1;
    if (sample.success) slice.successCount += 1;
    else slice.failureCount += 1;
    if (sample.safetyBlocked) slice.safetyBlockedCount += 1;
    if (typeof sample.latencyMs === 'number' && Number.isFinite(sample.latencyMs)) {
      slice.latencies.push(sample.latencyMs);
    }

    if (sample.success) successCount += 1;
    else failureCount += 1;
    if (sample.safetyBlocked) safetyBlockedCount += 1;
    if (typeof sample.latencyMs === 'number' && Number.isFinite(sample.latencyMs)) {
      latencies.push(sample.latencyMs);
    }
  }

  latencies.sort((a, b) => a - b);
  const avgMs =
    latencies.length > 0
      ? Math.round(latencies.reduce((sum, n) => sum + n, 0) / latencies.length)
      : null;

  const byCanaryBucket: Record<string, AiObservabilitySlice> = {};
  for (const [key, acc] of Object.entries(bucketAcc)) {
    byCanaryBucket[key] = finalizeSlice(acc);
  }
  if (Object.keys(byCanaryBucket).length === 0) {
    byCanaryBucket.none = emptySlice();
  }

  return {
    since: new Date(sinceMs).toISOString(),
    totalEvents: inWindow.length,
    successCount,
    failureCount,
    safetyBlockedCount,
    byEventType,
    byPlatform,
    byMode,
    byCanaryBucket,
    byErrorCode,
    latency: {
      count: latencies.length,
      avgMs,
      p50Ms: percentile(latencies, 50),
      p95Ms: percentile(latencies, 95),
    },
  };
}

export function buildAiObservabilitySnapshot(
  samples: readonly AiMetricSample[],
  nowMs: number = Date.now(),
): AiObservabilitySnapshot {
  const oldest = samples.length > 0 ? Math.min(...samples.map((s) => s.timestampMs)) : nowMs;
  return {
    schemaVersion: AI_OBSERVABILITY_SCHEMA_VERSION,
    generatedAt: new Date(nowMs).toISOString(),
    mutatedState: false,
    persistence: 'in_process',
    process: buildWindowStats(samples, oldest, nowMs),
    last1h: buildWindowStats(samples, nowMs - 3_600_000, nowMs),
    last24h: buildWindowStats(samples, nowMs - 86_400_000, nowMs),
  };
}
