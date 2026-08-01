import { randomUUID } from 'node:crypto';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import {
  CLIENT_ERROR_MIRROR_TYPES,
  INCIDENT_COLLECTION,
  INCIDENT_SCHEMA_VERSION,
  type IncidentDocument,
  type IncidentSeverity,
  type IncidentSource,
  type IncidentStatsResult,
  type IncidentStatus,
  type ListIncidentsQuery,
  type WriteIncidentInput,
  KNOWN_INCIDENT_TYPES,
} from './incidentTypes.js';

export type IncidentLogFn = (
  level: 'info' | 'warn' | 'error',
  message: string,
  meta?: Record<string, unknown>,
) => void;

export interface IncidentRepositoryDeps {
  db: Firestore;
  fieldValue: typeof FieldValue;
  isBackedOff: () => boolean;
  onQuotaError: (source: string) => void;
  isQuotaError: (err: unknown) => boolean;
  log?: IncidentLogFn;
}

export interface WriteIncidentResult {
  incidentId: string;
  correlationId: string;
  skipped?: 'firestore_quota_backoff' | 'firestore_unavailable';
}

function inferSeverity(type: string, payload: Record<string, unknown>): IncidentSeverity {
  const explicit = payload.severity;
  if (explicit === 'critical' || explicit === 'Critical') return 'critical';
  if (explicit === 'warning' || explicit === 'Warning') return 'warning';
  if (explicit === 'info' || explicit === 'Info') return 'info';

  if (type === 'payment_incidents' || type === 'merchant_blockers' || type === 'security_events') {
    return 'critical';
  }
  if (type === 'firestore_errors' || type === 'api_errors' || type === 'system_errors') {
    return 'error';
  }
  if (type === 'WEBHOOK_RECEIVED' || type === 'performance_metrics' || type === 'onboarding_events') {
    return 'info';
  }
  return 'error';
}

function buildIncidentDocument(
  incidentId: string,
  input: WriteIncidentInput,
): Omit<IncidentDocument, 'incidentId'> & { incidentId: string } {
  const now = new Date().toISOString();
  const payload = input.payload ?? {};
  const correlationId = input.correlationId || `inc-${Date.now()}`;
  const tenantId =
    input.tenantId ||
    (typeof payload.tenantId === 'string' ? payload.tenantId : undefined);
  const route =
    input.route || (typeof payload.route === 'string' ? payload.route : undefined);

  return {
    incidentId,
    type: input.type,
    status: (input.status ?? 'DETECTED') as IncidentStatus,
    severity: input.severity ?? inferSeverity(input.type, payload),
    source: input.source ?? 'monitoring',
    tenantId,
    route,
    correlationId,
    payload,
    retryCount: 0,
    maxRetries: 3,
    createdAt: now,
    updatedAt: now,
    schemaVersion: INCIDENT_SCHEMA_VERSION,
  };
}

export class IncidentRepository {
  constructor(private readonly deps: IncidentRepositoryDeps) {}

  private log(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) {
    this.deps.log?.(level, message, meta);
  }

  /** Single write path for all platform incidents. */
  async writeIncident(input: WriteIncidentInput): Promise<WriteIncidentResult> {
    const correlationId = input.correlationId || `inc-${Date.now()}`;

    if (this.deps.isBackedOff()) {
      return { incidentId: '', correlationId, skipped: 'firestore_quota_backoff' };
    }

    const incidentId = randomUUID();
    const document = buildIncidentDocument(incidentId, { ...input, correlationId });

    try {
      await this.deps.db.collection(INCIDENT_COLLECTION).doc(incidentId).set(document);
      this.log('info', 'Incident logged', {
        incidentId,
        type: document.type,
        status: document.status,
        correlationId,
      });

      const shouldMirror =
        input.mirrorToClientErrors ??
        CLIENT_ERROR_MIRROR_TYPES.has(input.type);

      if (shouldMirror) {
        await this.mirrorToClientErrors(document);
      }

      return { incidentId, correlationId };
    } catch (err: unknown) {
      if (this.deps.isQuotaError(err)) {
        this.deps.onQuotaError('IncidentRepository.writeIncident');
      } else {
        const message = err instanceof Error ? err.message : String(err);
        this.log('error', 'Failed to write incident', { message, correlationId, type: input.type });
      }
      return { incidentId: '', correlationId, skipped: 'firestore_unavailable' };
    }
  }

  private async mirrorToClientErrors(document: IncidentDocument): Promise<void> {
    const payload = document.payload;
    try {
      await this.deps.db.collection('client_errors').add({
        level: document.severity === 'critical' ? 'CRITICAL' : 'ERROR',
        message:
          (typeof payload.error === 'string' && payload.error) ||
          (typeof payload.blockerType === 'string' && payload.blockerType) ||
          (typeof payload.failureReason === 'string' && payload.failureReason) ||
          document.type,
        contextSummary: JSON.stringify(payload).slice(0, 500),
        tenantId: document.tenantId || 'unknown',
        route: document.route || '',
        incidentType: document.type,
        incidentId: document.incidentId,
        correlationId: document.correlationId,
        timestamp: this.deps.fieldValue.serverTimestamp(),
        resolved: false,
      });
    } catch (err: unknown) {
      if (this.deps.isQuotaError(err)) {
        this.deps.onQuotaError('IncidentRepository.mirrorToClientErrors');
      }
    }
  }

  /** Count incidents of a given type since an ISO timestamp (AutoPilot + ops stats). */
  async countIncidentsByTypeSince(type: string, sinceIso: string): Promise<number> {
    if (this.deps.isBackedOff()) return 0;

    const sinceDate = new Date(sinceIso);

    try {
      const snapshot = await this.deps.db
        .collection(INCIDENT_COLLECTION)
        .where('type', '==', type)
        .where('createdAt', '>=', sinceDate)
        .count()
        .get();
      return snapshot.data().count;
    } catch (err: unknown) {
      if (this.deps.isQuotaError(err)) {
        this.deps.onQuotaError(`countIncidents:${type}`);
        return 0;
      }

      const fallback = await this.deps.db
        .collection(INCIDENT_COLLECTION)
        .where('type', '==', type)
        .where('createdAt', '>=', sinceDate)
        .limit(500)
        .get();
      return fallback.size;
    }
  }

  async countIncidentsByTypesSince(
    types: readonly string[],
    sinceIso: string,
  ): Promise<IncidentStatsResult> {
    const counts = await Promise.all(
      types.map(async (type) => ({
        type,
        count: await this.countIncidentsByTypeSince(type, sinceIso),
      })),
    );
    const total = counts.reduce((sum, entry) => sum + entry.count, 0);
    return { since: sinceIso, counts, total };
  }

  async listIncidents(query: ListIncidentsQuery = {}): Promise<IncidentDocument[]> {
    if (this.deps.isBackedOff()) return [];

    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const fetchLimit = Math.min(limit * 4, 200);

    try {
      const snapshot = await this.deps.db
        .collection(INCIDENT_COLLECTION)
        .orderBy('createdAt', 'desc')
        .limit(fetchLimit)
        .get();

      let incidents = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as IncidentDocument;
        return { ...data, incidentId: data.incidentId || docSnap.id };
      });

      if (query.since) {
        incidents = incidents.filter((row) => row.createdAt >= query.since!);
      }
      if (query.type) {
        incidents = incidents.filter((row) => row.type === query.type);
      }
      if (query.status) {
        incidents = incidents.filter((row) => row.status === query.status);
      }
      if (query.tenantId) {
        incidents = incidents.filter((row) => row.tenantId === query.tenantId);
      }

      return incidents.slice(0, limit);
    } catch (err: unknown) {
      if (this.deps.isQuotaError(err)) {
        this.deps.onQuotaError('IncidentRepository.listIncidents');
      }
      throw err;
    }
  }
}

export function createIncidentRepository(deps: IncidentRepositoryDeps): IncidentRepository {
  return new IncidentRepository(deps);
}

export function getAutopilotIncidentTypes(): readonly string[] {
  return KNOWN_INCIDENT_TYPES.filter((type) => type !== 'WEBHOOK_RECEIVED' && type !== 'performance_metrics' && type !== 'onboarding_events');
}

export { KNOWN_INCIDENT_TYPES };
