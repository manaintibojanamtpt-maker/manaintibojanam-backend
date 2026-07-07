import {
  getFirestore,
  initializeFirestore,
  Firestore,
  enableNetwork,
  getDoc as firebaseGetDoc,
  getDocs as firebaseGetDocs,
  type DocumentReference,
  type DocumentSnapshot,
  type Query,
  type QuerySnapshot,
} from 'firebase/firestore';
import { defaultFirestoreRetryPolicy, isFirestoreQuotaError } from './firestoreRetryPolicy';
import { useState, useCallback } from 'react';
import { app } from '../firebase';
import { getFirestoreDatabaseId, getResolvedFirebaseProjectId } from '../config/firebaseClientConfig';

const databaseId = getFirestoreDatabaseId();

console.log(`[Firestore Client] Project: ${getResolvedFirebaseProjectId()}, Database: ${databaseId}`);

declare global {
  interface Window {
    __bhojanos_firestore_db__?: Firestore;
  }
}

/** Single Firestore instance — never call initializeFirestore twice (causes SDK assertion crashes). */
let _dbInstance: Firestore | null = null;

function isFirestoreAlreadyInitializedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('already been initialized') || message.includes('already exists');
}

function createDbInstance(): Firestore {
  const settings = { ignoreUndefinedProperties: true };
  const useNamedDb = Boolean(databaseId && databaseId !== '(default)');

  if (useNamedDb) {
    try {
      return initializeFirestore(app, settings, databaseId);
    } catch (error: unknown) {
      if (isFirestoreAlreadyInitializedError(error)) {
        return getFirestore(app, databaseId);
      }
      throw error;
    }
  }

  try {
    return initializeFirestore(app, settings);
  } catch (error: unknown) {
    if (isFirestoreAlreadyInitializedError(error)) {
      return getFirestore(app);
    }
    throw error;
  }
}

export function getDb(): Firestore {
  if (typeof window !== 'undefined' && window.__bhojanos_firestore_db__) {
    _dbInstance = window.__bhojanos_firestore_db__;
    return _dbInstance;
  }

  if (!_dbInstance) {
    _dbInstance = createDbInstance();
    if (typeof window !== 'undefined') {
      window.__bhojanos_firestore_db__ = _dbInstance;
    }
  }

  return _dbInstance;
}

/** Avoid overlapping enableNetwork calls — a known trigger for Firestore internal assertion failures. */
let networkReady = false;
let networkEnablePromise: Promise<boolean> | null = null;

export async function ensureFirestoreNetwork(): Promise<boolean> {
  if (networkReady) return true;
  if (networkEnablePromise) return networkEnablePromise;

  networkEnablePromise = (async () => {
    try {
      await enableNetwork(getDb());
      networkReady = true;
      return true;
    } catch {
      return false;
    } finally {
      networkEnablePromise = null;
    }
  })();

  return networkEnablePromise;
}

/**
 * Do NOT probe Firestore with getDocFromServer on a cold connection — it can permanently
 * brick the client (Firebase SDK ca9/da08/b815). Assume online until an operation fails.
 */
export let isFirestoreConnected = true;

export function markFirestoreDisconnected(): void {
  isFirestoreConnected = false;
}

export function markFirestoreConnected(): void {
  isFirestoreConnected = true;
}

export function useFirestoreConnection() {
  const [connected, setConnected] = useState(isFirestoreConnected);
  const [loading, setLoading] = useState(false);

  const retry = useCallback(async () => {
    setLoading(true);
    const ok = await ensureFirestoreNetwork();
    isFirestoreConnected = ok;
    setConnected(ok);
    setLoading(false);
  }, []);

  return { connected, loading, retry };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: unknown;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  if (errorMessage.includes('default credentials') || errorMessage.includes('GOOGLE_APPLICATION_CREDENTIALS')) {
    return;
  }
  if (errorMessage.includes('INTERNAL ASSERTION FAILED')) {
    markFirestoreDisconnected();
  }
  if (isFirestoreQuotaError(error)) {
    markFirestoreDisconnected();
  }
  console.error('Firestore Error: ', errorMessage, operationType, path);
  throw new Error(errorMessage);
}

function docCoalesceKey(ref: DocumentReference): string {
  return `doc:${ref.path}`;
}

function queryCoalesceKey(query: Query): string {
  const internal = query as unknown as {
    _query?: {
      path?: { canonicalString?: () => string };
      filters?: unknown[];
    };
  };
  const path = internal._query?.path?.canonicalString?.() ?? 'unknown';
  const filterCount = internal._query?.filters?.length ?? 0;
  return `query:${path}:${filterCount}`;
}

/** Quota-protected getDoc wrapper — use instead of firebase/firestore getDoc directly. */
export async function getDoc<T = DocumentSnapshot>(
  ref: DocumentReference,
): Promise<T extends DocumentSnapshot ? T : DocumentSnapshot> {
  return defaultFirestoreRetryPolicy.executeRead(docCoalesceKey(ref), () => firebaseGetDoc(ref)) as Promise<
    T extends DocumentSnapshot ? T : DocumentSnapshot
  >;
}

/** Quota-protected getDocs wrapper — use instead of firebase/firestore getDocs directly. */
export async function getDocs<T = QuerySnapshot>(
  query: Query,
): Promise<T extends QuerySnapshot ? T : QuerySnapshot> {
  return defaultFirestoreRetryPolicy.executeRead(queryCoalesceKey(query), () => firebaseGetDocs(query)) as Promise<
    T extends QuerySnapshot ? T : QuerySnapshot
  >;
}
