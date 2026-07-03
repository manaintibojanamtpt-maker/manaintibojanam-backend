import type { IdempotencyKey } from './IdempotencyKey';
import type { EventId } from '../types/branded';

/** Idempotency ledger entry — no persistence in PR-2 (in-memory test only). */
export interface IdempotencyRecord {
  readonly key: IdempotencyKey;
  readonly eventId: EventId;
  readonly recordedAt: string;
  readonly expiresAt?: string;
}
