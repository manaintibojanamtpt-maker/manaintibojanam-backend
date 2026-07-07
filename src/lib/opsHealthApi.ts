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

export interface OpsDashboardSnapshot {
  healthSummary: OpsHealthSummary | null;
  apiHealth: ApiHealthResponse | null;
  incidents: OpsIncidentRecord[] | null;
  fetchedAt: string;
  errors: string[];
}

export async function loadOpsDashboardSnapshot(): Promise<OpsDashboardSnapshot> {
  const [healthSummary, apiHealth, incidents] = await Promise.all([
    fetchOpsHealthSummary(),
    fetchApiHealth(),
    fetchOpsIncidents(50),
  ]);

  const errors: string[] = [];
  if (!healthSummary) errors.push('health-summary');
  if (!apiHealth) errors.push('api-health');
  if (!incidents) errors.push('incidents');

  return {
    healthSummary,
    apiHealth,
    incidents,
    fetchedAt: new Date().toISOString(),
    errors,
  };
}
