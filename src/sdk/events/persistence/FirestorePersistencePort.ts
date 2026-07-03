/**
 * EventSDK — vendor-neutral Firestore persistence port (M6 PR-3).
 * No Firebase SDK types in contract.
 */

export interface FirestorePersistenceDocument {
  readonly id: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export type FirestorePersistenceFilterOp = '==' | '!=' | '<' | '<=' | '>' | '>=';

export interface FirestorePersistenceFilter {
  readonly field: string;
  readonly op: FirestorePersistenceFilterOp;
  readonly value: unknown;
}

export interface FirestorePersistencePort {
  set(collection: string, id: string, data: Record<string, unknown>): Promise<void>;
  get(collection: string, id: string): Promise<FirestorePersistenceDocument | null>;
  update(collection: string, id: string, data: Record<string, unknown>): Promise<void>;
  query(
    collection: string,
    filters: readonly FirestorePersistenceFilter[],
    limit: number
  ): Promise<FirestorePersistenceDocument[]>;
}
