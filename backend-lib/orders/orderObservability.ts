/**
 * Phase A / E — Structured observability for the order command path.
 *
 * Provides correlation-aware JSON logging and an in-process metric registry for
 * command failures, queue age, retries, projection lag and lifecycle
 * propagation. Secrets and customer/payment payloads are never emitted: only
 * identifiers, enums, counts and hashes.
 *
 * The registry is intentionally in-process so it works on every deploy target
 * without a new dependency. `/api/v1/ops/order-command-metrics` exposes a
 * snapshot for scraping.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const resolveMinLevel = (): LogLevel => {
  const raw = (process.env.ORDER_COMMAND_LOG_LEVEL ?? 'info').trim().toLowerCase();
  return raw in LEVEL_ORDER ? (raw as LogLevel) : 'info';
};

/**
 * Fields that must never be logged. Redacted by key at any nesting depth so a
 * caller cannot leak them by nesting inside `payload`.
 */
const REDACTED_KEYS = new Set([
  'authorization',
  'bearer',
  'token',
  'idtoken',
  'accesstoken',
  'refreshtoken',
  'cookie',
  'password',
  'secret',
  'apikey',
  'api_key',
  'razorpaysignature',
  'signature',
  'hmac',
  'cardnumber',
  'cvv',
  'customerphone',
  'phone',
  'email',
  'customeremail',
  'address',
  'upiid',
  'vpa',
  'notes',
  'itemnotes',
]);

const MAX_STRING_LENGTH = 200;

const sanitize = (value: unknown, depth = 0): unknown => {
  if (depth > 4) return '[truncated]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}…[${value.length}b]`
      : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Error) return { name: value.name, message: value.message.slice(0, MAX_STRING_LENGTH) };
  if (Array.isArray(value)) return value.slice(0, 20).map((entry) => sanitize(entry, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (REDACTED_KEYS.has(key.toLowerCase())) {
        out[key] = '[redacted]';
        continue;
      }
      out[key] = sanitize(entry, depth + 1);
    }
    return out;
  }
  return String(value);
};

export interface CorrelationContext {
  correlationId: string;
  commandId?: string;
  tenantId?: string;
  orderId?: string;
  deviceId?: string;
  actorUid?: string;
  actorRole?: string;
  idempotencyKey?: string;
}

let correlationCounter = 0;

/** Generate a sortable, low-collision correlation id without extra deps. */
export const newCorrelationId = (prefix = 'cc'): string => {
  correlationCounter = (correlationCounter + 1) % 0xffff;
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  const seq = correlationCounter.toString(36).padStart(4, '0');
  return `${prefix}_${time}_${seq}_${rand}`;
};

export const resolveCorrelationId = (
  headerValue: string | string[] | undefined,
  fallbackPrefix = 'cc'
): string => {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) return newCorrelationId(fallbackPrefix);
  // Bound length and character set so a hostile client cannot bloat logs.
  const safe = trimmed.replace(/[^A-Za-z0-9_.:-]/g, '').slice(0, 128);
  return safe || newCorrelationId(fallbackPrefix);
};

export const logStructured = (
  level: LogLevel,
  event: string,
  ctx: Record<string, unknown> = {}
): void => {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[resolveMinLevel()]) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...(sanitize(ctx) as Record<string, unknown>),
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
};

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export interface MetricSeries {
  count: number;
  sum: number;
  max: number;
  lastValue: number;
  lastUpdatedAt: string;
}

const newSeries = (): MetricSeries => ({
  count: 0,
  sum: 0,
  max: 0,
  lastValue: 0,
  lastUpdatedAt: new Date(0).toISOString(),
});

const REGISTRY = new Map<string, MetricSeries>();

/** Bucketed counters keyed by `name` plus optional `tags.k=v` pairs. */
export const recordCounter = (name: string, value = 1, tags?: Record<string, string>): void => {
  const key = tags ? `${name}{${Object.keys(tags).sort().map((k) => `${k}=${tags[k]}`).join(',')}}` : name;
  const series = REGISTRY.get(key) ?? newSeries();
  series.count += 1;
  series.sum += value;
  series.lastValue = value;
  if (value > series.max) series.max = value;
  series.lastUpdatedAt = new Date().toISOString();
  REGISTRY.set(key, series);
};

/** Observable value (latency ms, queue age ms, lag ms). */
export const recordValue = (name: string, value: number, tags?: Record<string, string>): void => {
  if (!Number.isFinite(value)) return;
  const key = tags ? `${name}{${Object.keys(tags).sort().map((k) => `${k}=${tags[k]}`).join(',')}}` : name;
  const series = REGISTRY.get(key) ?? newSeries();
  series.count += 1;
  series.sum += value;
  series.lastValue = value;
  if (value > series.max) series.max = value;
  series.lastUpdatedAt = new Date().toISOString();
  REGISTRY.set(key, series);
};

export interface MetricSnapshot {
  metrics: Record<string, MetricSeries & { avg: number }>;
  generatedAt: string;
}

export const metricsSnapshot = (): MetricSnapshot => {
  const metrics: MetricSnapshot['metrics'] = {};
  for (const [key, series] of REGISTRY) {
    metrics[key] = {
      ...series,
      avg: series.count > 0 ? Math.round((series.sum / series.count) * 100) / 100 : 0,
    };
  }
  return { metrics, generatedAt: new Date().toISOString() };
};

export const resetMetrics = (): void => {
  REGISTRY.clear();
};

// Metric names — kept in one place so dashboards and alerts agree on spelling.
export const METRIC = {
  commandReceived: 'order_command_received_total',
  commandSucceeded: 'order_command_succeeded_total',
  commandFailed: 'order_command_failed_total',
  commandReplayed: 'order_command_replayed_total',
  commandLatency: 'order_command_latency_ms',
  idempotencyConflict: 'order_command_idempotency_conflict_total',
  concurrencyConflict: 'order_command_concurrency_conflict_total',
  authRejected: 'order_command_auth_rejected_total',
  outboxEnqueued: 'order_outbox_enqueued_total',
  outboxDispatched: 'order_outbox_dispatched_total',
  outboxDeadLettered: 'order_outbox_dead_letter_total',
  outboxLag: 'order_outbox_lag_ms',
  projectionLag: 'order_projection_lag_ms',
  projectionShadowLag: 'order_projection_shadow_lag_ms',
  queueAge: 'pos_command_queue_age_ms',
  queueRetries: 'pos_command_queue_retries_total',
  queueDepth: 'pos_command_queue_depth',
  lifecyclePropagation: 'order_lifecycle_propagation_ms',
} as const;