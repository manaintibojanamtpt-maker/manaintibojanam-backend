/**
 * EventSDK — Firestore collection name defaults (M6 PR-3).
 * Design only — no migration. Configurable via factory options.
 */

export const DEFAULT_EVENT_OUTBOX_COLLECTION = 'event_outbox' as const;
export const DEFAULT_EVENT_STORE_COLLECTION = 'event_store' as const;
export const DEFAULT_EVENT_DEAD_LETTERS_COLLECTION = 'event_dead_letters' as const;
export const DEFAULT_EVENT_IDEMPOTENCY_COLLECTION = 'event_idempotency' as const;

export interface EventPersistenceCollectionNames {
  readonly outbox: string;
  readonly eventStore: string;
  readonly deadLetters: string;
  readonly idempotency: string;
}

export const DEFAULT_EVENT_PERSISTENCE_COLLECTIONS: EventPersistenceCollectionNames = {
  outbox: DEFAULT_EVENT_OUTBOX_COLLECTION,
  eventStore: DEFAULT_EVENT_STORE_COLLECTION,
  deadLetters: DEFAULT_EVENT_DEAD_LETTERS_COLLECTION,
  idempotency: DEFAULT_EVENT_IDEMPOTENCY_COLLECTION,
};
