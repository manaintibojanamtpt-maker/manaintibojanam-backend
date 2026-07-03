/**
 * SearchSDK — Firestore read port for search repository (M4 PR-3).
 * Vendor-neutral — no Firestore SDK types in contract.
 */

export interface FirestoreSearchDocument {
  readonly id: string;
  readonly data: Record<string, unknown>;
}

export interface FirestoreSearchPort {
  fetchTenantDocuments(): Promise<FirestoreSearchDocument[]>;
}
