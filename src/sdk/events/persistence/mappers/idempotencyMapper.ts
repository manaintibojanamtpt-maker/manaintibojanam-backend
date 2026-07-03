/**
 * EventSDK — idempotency document mappers (M6 PR-3).
 */

export interface IdempotencyPersistenceDocument {
  readonly key: string;
  readonly eventId: string;
  readonly recordedAt: string;
  readonly expiresAt?: string;
}

export function mapIdempotencyToDocument(
  key: string,
  eventId: string,
  recordedAt: string,
  expiresAt?: string
): Record<string, unknown> {
  return { key, eventId, recordedAt, expiresAt };
}

export function mapDocumentToIdempotency(doc: Record<string, unknown>): IdempotencyPersistenceDocument {
  return {
    key: String(doc.key),
    eventId: String(doc.eventId),
    recordedAt: String(doc.recordedAt),
    expiresAt: doc.expiresAt ? String(doc.expiresAt) : undefined,
  };
}

export function isIdempotencyExpired(doc: IdempotencyPersistenceDocument, now: string): boolean {
  return Boolean(doc.expiresAt && doc.expiresAt < now);
}
