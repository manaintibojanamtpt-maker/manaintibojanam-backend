import { randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { AiAuditEvent } from './auditContracts.js';

export const AI_AUDIT_COLLECTION = 'ai_audit_events' as const;

export interface AiAuditPersistedDocument extends AiAuditEvent {
  readonly eventId: string;
  readonly persistedAt: string;
}

export type AiAuditPersistSkipReason =
  | 'flag_disabled'
  | 'no_db'
  | 'firestore_quota_backoff'
  | 'firestore_unavailable';

export interface WriteAiAuditEventResult {
  readonly eventId: string;
  readonly skipped?: AiAuditPersistSkipReason;
}

export interface AiAuditEventRepositoryDeps {
  readonly db: Firestore;
  readonly isBackedOff?: () => boolean;
  readonly onQuotaError?: (source: string) => void;
  readonly isQuotaError?: (err: unknown) => boolean;
  readonly log?: (level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) => void;
}

export interface ListAiAuditEventsQuery {
  readonly since?: string;
  readonly eventType?: string;
  /** Comma-separated or array of event types (OR match). */
  readonly eventTypes?: readonly string[];
  readonly correlationId?: string;
  readonly errorCode?: string;
  readonly canaryBucket?: number;
  readonly safetyBlocked?: boolean;
  readonly limit?: number;
}

function defaultIsQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /RESOURCE_EXHAUSTED|Quota exceeded|8 RESOURCE_EXHAUSTED/i.test(msg);
}

export class AiAuditEventRepository {
  constructor(private readonly deps: AiAuditEventRepositoryDeps) {}

  async writeEvent(event: AiAuditEvent): Promise<WriteAiAuditEventResult> {
    if (this.deps.isBackedOff?.()) {
      return { eventId: '', skipped: 'firestore_quota_backoff' };
    }

    const eventId = randomUUID();
    const document: AiAuditPersistedDocument = {
      ...event,
      eventId,
      persistedAt: new Date().toISOString(),
    };

    try {
      await this.deps.db.collection(AI_AUDIT_COLLECTION).doc(eventId).set(document);
      this.deps.log?.('info', 'AI audit event persisted', {
        eventId,
        eventType: event.eventType,
        correlationId: event.correlationId,
      });
      return { eventId };
    } catch (err) {
      if (this.deps.isQuotaError?.(err) ?? defaultIsQuotaError(err)) {
        this.deps.onQuotaError?.('ai_audit_events');
        return { eventId: '', skipped: 'firestore_quota_backoff' };
      }
      this.deps.log?.('warn', 'AI audit event persist failed', {
        eventType: event.eventType,
        correlationId: event.correlationId,
        error: err instanceof Error ? err.message : String(err),
      });
      return { eventId: '', skipped: 'firestore_unavailable' };
    }
  }

  /**
   * Recent events for ops review. Prefer created-order by persistedAt desc.
   * Filters applied in memory when composite indexes are unavailable.
   */
  async listEvents(query: ListAiAuditEventsQuery = {}): Promise<AiAuditPersistedDocument[]> {
    if (this.deps.isBackedOff?.()) return [];

    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    try {
      const snapshot = await this.deps.db
        .collection(AI_AUDIT_COLLECTION)
        .orderBy('persistedAt', 'desc')
        .limit(Math.min(limit * 3, 600))
        .get();

      let rows = snapshot.docs.map((doc) => doc.data() as AiAuditPersistedDocument);

      if (query.since) {
        rows = rows.filter((row) => (row.timestamp || row.persistedAt) >= query.since!);
      }
      const typeSet = new Set<string>();
      if (query.eventType?.trim()) typeSet.add(query.eventType.trim());
      for (const t of query.eventTypes ?? []) {
        if (t.trim()) typeSet.add(t.trim());
      }
      if (typeSet.size > 0) {
        rows = rows.filter((row) => typeSet.has(row.eventType));
      }
      if (query.correlationId) {
        rows = rows.filter((row) => row.correlationId === query.correlationId);
      }
      if (query.errorCode?.trim()) {
        rows = rows.filter((row) => row.errorCode === query.errorCode!.trim());
      }
      if (typeof query.canaryBucket === 'number' && Number.isFinite(query.canaryBucket)) {
        rows = rows.filter((row) => row.canaryBucket === query.canaryBucket);
      }
      if (query.safetyBlocked === true) {
        rows = rows.filter((row) => row.safetyBlocked === true);
      }

      return rows.slice(0, limit);
    } catch (err) {
      if (this.deps.isQuotaError?.(err) ?? defaultIsQuotaError(err)) {
        this.deps.onQuotaError?.('ai_audit_events_list');
      }
      this.deps.log?.('warn', 'AI audit event list failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  }
}
