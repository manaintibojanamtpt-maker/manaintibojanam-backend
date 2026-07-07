/** Unified incident platform — stored in `system_incidents` (backward compatible). */

export const INCIDENT_COLLECTION = 'system_incidents';
export const INCIDENT_SCHEMA_VERSION = '1.0';

/** Known incident types from client monitoring + server events. */
export const KNOWN_INCIDENT_TYPES = [
  'system_errors',
  'api_errors',
  'firestore_errors',
  'payment_incidents',
  'security_events',
  'performance_metrics',
  'merchant_blockers',
  'onboarding_events',
  'WEBHOOK_RECEIVED',
] as const;

export type KnownIncidentType = (typeof KNOWN_INCIDENT_TYPES)[number];

export type IncidentStatus =
  | 'DETECTED'
  | 'RUNNING'
  | 'VERIFIED'
  | 'RESOLVED'
  | 'ESCALATED';

export type IncidentSeverity = 'info' | 'warning' | 'error' | 'critical';

export type IncidentSource =
  | 'client'
  | 'server'
  | 'webhook'
  | 'cron'
  | 'autopilot'
  | 'monitoring';

export interface IncidentDocument {
  incidentId: string;
  type: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  source: IncidentSource;
  tenantId?: string;
  route?: string;
  correlationId: string;
  payload: Record<string, unknown>;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
  schemaVersion: string;
}

export interface WriteIncidentInput {
  type: string;
  status?: IncidentStatus;
  payload?: Record<string, unknown>;
  correlationId?: string;
  severity?: IncidentSeverity;
  source?: IncidentSource;
  tenantId?: string;
  route?: string;
  /** When true (default for selected types), mirror into legacy `client_errors`. */
  mirrorToClientErrors?: boolean;
}

export const CLIENT_ERROR_MIRROR_TYPES = new Set<string>([
  'system_errors',
  'merchant_blockers',
  'payment_incidents',
  'security_events',
  'firestore_errors',
]);

export interface ListIncidentsQuery {
  since?: string;
  type?: string;
  status?: string;
  tenantId?: string;
  limit?: number;
}

export interface IncidentTypeCount {
  type: string;
  count: number;
}

export interface IncidentStatsResult {
  since: string;
  counts: IncidentTypeCount[];
  total: number;
}
