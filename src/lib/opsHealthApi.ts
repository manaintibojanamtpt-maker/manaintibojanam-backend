import { EnvironmentConfig } from '../config/environment';

const apiBase = () => EnvironmentConfig.getApiUrl();

export const OPS_UNAVAILABLE = 'Unavailable';

export interface ApiHealthResponse {
  status: string;
  timestamp: string;
  firestore?: { backedOff?: boolean; backoffUntil?: string | null };
  platform?: { build?: string; tier?: string };
}

export interface OpsIncidentRecord {
  incidentId: string;
  type: string;
  status: string;
  correlationId: string;
  tenantId?: string;
  route?: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentStatsPayload {
  since: string;
  counts: Array<{ type: string; count: number }>;
  total: number;
}

export interface IncidentTrendPoint {
  hour: string;
  count: number;
}

export interface OpsHealthSummary {
  success: boolean;
  apiHealth: { status: string; timestamp: string };
  openIncidentsCount: number | null;
  latestDeploy: string | null;
  incidentStats: {
    last1h: IncidentStatsPayload;
    last24h: IncidentStatsPayload;
  } | null;
  incidentTrend: IncidentTrendPoint[] | null;
}

type FetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

async function opsFetch<T>(path: string): Promise<FetchResult<T>> {
  try {
    const response = await fetch(`${apiBase()}${path}`);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      return {
        ok: false,
        status: response.status,
        error: body.error || response.statusText || 'Request failed',
      };
    }
    return { ok: true, data: (await response.json()) as T };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { ok: false, status: 0, error: message };
  }
}

export async function fetchApiHealth(): Promise<ApiHealthResponse | null> {
  const result = await opsFetch<ApiHealthResponse>('/api/health');
  return result.ok ? result.data : null;
}

export async function fetchOpsIncidents(limit = 50): Promise<OpsIncidentRecord[] | null> {
  const result = await opsFetch<{
    success: boolean;
    incidents: OpsIncidentRecord[];
  }>(`/api/ops/incidents?limit=${limit}`);
  return result.ok && result.data.success ? result.data.incidents : null;
}

export async function fetchOpsIncidentStats(since?: string): Promise<IncidentStatsPayload | null> {
  const query = since ? `?since=${encodeURIComponent(since)}` : '';
  const result = await opsFetch<IncidentStatsPayload & { success: boolean }>(
    `/api/ops/incidents/stats${query}`,
  );
  if (!result.ok || !result.data.success) return null;
  const { since: sinceValue, counts, total } = result.data;
  return { since: sinceValue, counts, total };
}

export async function fetchOpsHealthSummary(): Promise<OpsHealthSummary | null> {
  const result = await opsFetch<OpsHealthSummary>('/api/ops/health-summary');
  return result.ok && result.data.success ? result.data : null;
}

/** Phase 12 — AI gateway metrics + canary snapshot (superadmin). Read-only UI. */
export interface AiOpsSliceSummary {
  totalEvents: number;
  successCount: number;
  failureCount: number;
  safetyBlockedCount: number;
  latency?: {
    count: number;
    avgMs: number | null;
    p50Ms: number | null;
    p95Ms: number | null;
  };
}

export interface AiOpsWindowSummary {
  totalEvents: number;
  successCount: number;
  failureCount: number;
  safetyBlockedCount?: number;
  byCanaryBucket?: Record<string, AiOpsSliceSummary>;
  byErrorCode?: Record<string, number>;
  latency?: {
    count: number;
    avgMs: number | null;
    p50Ms: number | null;
    p95Ms: number | null;
  };
}

export interface AiOpsSummary {
  success: boolean;
  schemaVersion: string;
  mutatedState: false;
  gateway?: {
    enabled: boolean;
    configured: boolean;
    ready: boolean;
    model?: string;
  };
  observability: {
    schemaVersion: string;
    generatedAt: string;
    mutatedState: false;
    persistence: 'in_process';
    process: AiOpsWindowSummary;
    last1h: AiOpsWindowSummary;
    last24h: AiOpsWindowSummary;
  };
  rollout?: {
    schemaVersion: string;
    canaryFlagEnabled: boolean;
    wiredIntoAssist: boolean;
    liveRolloutGatesEnabled?: boolean;
    currentStage: number;
    percent: number;
    label: string;
    nextStage?: number | null;
    healthOk: boolean;
    healthReason?: string;
    note?: string;
    prechecks?: {
      golden: { status: string; reason: string; blockerCode?: string };
      shadow: { status: string; reason: string; blockerCode?: string };
    };
    promotion?: {
      allowed: boolean;
      fromStage: number;
      toStage: number | null;
      reason: string;
      blockers: readonly string[];
      advisoryOnly: true;
    };
    halt?: {
      haltRecommended: boolean;
      reason: string;
      triggeredBy: string;
      advisoryOnly: true;
    };
    rollback?: {
      required: boolean;
      recommendedStage: number;
      reason: string;
      triggeredBy: string;
      advisoryOnly: true;
    };
    thresholds?: {
      goldenMinPassRate: number;
      shadowMinSamples: number;
      shadowMaxDriftRate: number;
      minSoakHours: number;
      maxCanaryErrorRatePercent: number;
    };
    advancement?: {
      autoPromote: false;
      method: 'manual_env';
      manualApprovalGranted: boolean;
      stageSetAt: string | null;
      requiresHumanApproval: true;
      note: string;
    };
  };
  auditPersistence?: {
    enabled: boolean;
    collection: string;
    repositoryConfigured?: boolean;
  };
}

export async function fetchAiOpsSummary(): Promise<AiOpsSummary | null> {
  const result = await opsFetch<AiOpsSummary>('/api/ops/ai/summary');
  return result.ok && result.data.success ? result.data : null;
}

/** Phase 22 — durable AI audit event (superadmin review). */
export interface AiAuditEventRecord {
  eventId: string;
  persistedAt: string;
  schemaVersion: string;
  eventType: string;
  timestamp: string;
  correlationId: string;
  conversationId?: string;
  mode?: string;
  channel?: string;
  intent?: string;
  model?: string;
  latencyMs?: number;
  success: boolean;
  safetyBlocked?: boolean;
  violationCodes?: string[];
  messagePreview?: string;
  errorCode?: string;
  phase?: number;
  mutatedState: false;
  platform?: string;
  cartPlanStatus?: string;
  planCount?: number;
  canaryRoutingKey?: string;
  canaryBucket?: number;
  canaryGateApplied?: boolean;
  canaryGateReason?: string;
}

export interface AiAuditEventsQuery {
  since?: string;
  eventType?: string;
  eventTypes?: string[];
  correlationId?: string;
  errorCode?: string;
  canaryBucket?: number;
  safetyBlocked?: boolean;
  limit?: number;
}

export interface AiAuditEventsResponse {
  success: boolean;
  schemaVersion: string;
  mutatedState: false;
  collection: string;
  auditPersistenceEnabled: boolean;
  count: number;
  events: AiAuditEventRecord[];
  error?: string;
}

/** Phase 24 — shadow traffic samples + replay comparison (superadmin). Read-only UI. */
export interface AiShadowSampleRecord {
  id: string;
  capturedAt: string;
  eventType: string;
  mode?: string;
  channel?: string;
  messagePreview?: string;
  correlationId?: string;
  intent?: string;
  model?: string;
  canaryBucket?: number;
  [key: string]: unknown;
}

export interface AiShadowSamplesResponse {
  success: boolean;
  mutatedState: false;
  enabled: boolean;
  count: number;
  samples: AiShadowSampleRecord[];
  error?: string;
}

export interface AiShadowReplayRequest {
  limit?: number;
  samples?: AiShadowSampleRecord[];
}

export interface AiShadowReplayResult {
  sampleId: string;
  eventType?: string;
  status: 'passed' | 'failed' | 'drifted';
  category?: string;
  message?: string;
  driftFields?: string[];
}

export interface AiShadowReplayReport {
  total: number;
  passed: number;
  failed: number;
  drifted: number;
  byCategory: Record<string, { total: number; passed: number; failed: number; drifted: number }>;
  results: AiShadowReplayResult[];
}

export interface AiShadowReplayResponse {
  success: boolean;
  mutatedState: false;
  report?: AiShadowReplayReport;
  error?: string;
}

async function opsPost<T>(path: string, body: unknown): Promise<FetchResult<T>> {
  try {
    const response = await fetch(`${apiBase()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const parsed = (await response.json().catch(() => ({}))) as { error?: string };
      return {
        ok: false,
        status: response.status,
        error: parsed.error || response.statusText || 'Request failed',
      };
    }
    return { ok: true, data: (await response.json()) as T };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { ok: false, status: 0, error: message };
  }
}

export async function fetchAiShadowSamples(
  limit = 50,
): Promise<AiShadowSamplesResponse | null> {
  const result = await opsFetch<AiShadowSamplesResponse & { shadowTrafficEnabled?: boolean }>(
    `/api/ops/ai/shadow/samples?limit=${limit}`,
  );
  if (result.ok === false) {
    return {
      success: false,
      mutatedState: false,
      enabled: false,
      count: 0,
      samples: [],
      error: result.error,
    };
  }
  const data = result.data;
  return {
    ...data,
    enabled: data.enabled === true || data.shadowTrafficEnabled === true,
    mutatedState: false,
    samples: Array.isArray(data.samples) ? data.samples : [],
    count: typeof data.count === 'number' ? data.count : (data.samples?.length ?? 0),
  };
}

export async function replayAiShadowTraffic(
  request: AiShadowReplayRequest = {},
): Promise<AiShadowReplayResponse | null> {
  const result = await opsPost<AiShadowReplayResponse>('/api/ops/ai/shadow/replay', request);
  if (result.ok === false) {
    return {
      success: false,
      mutatedState: false,
      error: result.error,
    };
  }
  return result.data;
}

export async function fetchAiAuditEvents(
  query: AiAuditEventsQuery = {},
): Promise<AiAuditEventsResponse | null> {
  const params = new URLSearchParams();
  if (query.since) params.set('since', query.since);
  if (query.eventType) params.set('eventType', query.eventType);
  if (query.eventTypes?.length) params.set('eventTypes', query.eventTypes.join(','));
  if (query.correlationId) params.set('correlationId', query.correlationId);
  if (query.errorCode) params.set('errorCode', query.errorCode);
  if (typeof query.canaryBucket === 'number') params.set('canaryBucket', String(query.canaryBucket));
  if (query.safetyBlocked) params.set('safetyBlocked', '1');
  params.set('limit', String(query.limit ?? 50));

  const result = await opsFetch<AiAuditEventsResponse>(
    `/api/ops/ai/audit-events?${params.toString()}`,
  );
  if (result.ok === false) {
    return {
      success: false,
      schemaVersion: '22.0',
      mutatedState: false,
      collection: 'ai_audit_events',
      auditPersistenceEnabled: false,
      count: 0,
      events: [],
      error: result.error,
    };
  }
  return result.data;
}

export interface OpsDashboardSnapshot {
  healthSummary: OpsHealthSummary | null;
  apiHealth: ApiHealthResponse | null;
  incidents: OpsIncidentRecord[] | null;
  aiSummary: AiOpsSummary | null;
  fetchedAt: string;
  errors: string[];
}

export async function loadOpsDashboardSnapshot(): Promise<OpsDashboardSnapshot> {
  const [healthSummary, apiHealth, incidents, aiSummary] = await Promise.all([
    fetchOpsHealthSummary(),
    fetchApiHealth(),
    fetchOpsIncidents(50),
    fetchAiOpsSummary(),
  ]);

  const errors: string[] = [];
  if (!healthSummary) errors.push('health-summary');
  if (!apiHealth) errors.push('api-health');
  if (!incidents) errors.push('incidents');
  if (!aiSummary) errors.push('ai-summary');

  return {
    healthSummary,
    apiHealth,
    incidents,
    aiSummary,
    fetchedAt: new Date().toISOString(),
    errors,
  };
}
