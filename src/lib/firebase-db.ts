import { getFirestore, initializeFirestore, doc, getDocFromServer, Firestore, enableNetwork } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { app } from '../firebase';
import { getFirestoreDatabaseId, getResolvedFirebaseProjectId } from '../config/firebaseClientConfig';

const databaseId = getFirestoreDatabaseId();

console.log(`[Firestore Client] Project: ${getResolvedFirebaseProjectId()}, Database: ${databaseId}`);

/** Single Firestore instance — never call initializeFirestore twice (causes SDK assertion crashes). */
let _dbInstance: Firestore | null = null;

function createDbInstance(): Firestore {
  if (databaseId && databaseId !== '(default)') {
    try {
      return initializeFirestore(app, { ignoreUndefinedProperties: true }, databaseId);
    } catch {
      /* already initialized — reuse default instance */
    }
  }
  return getFirestore(app);
}

export function getDb(): Firestore {
  if (!_dbInstance) {
    _dbInstance = createDbInstance();
  }
  return _dbInstance;
}

export let isFirestoreConnected = false;

let resolveConnection: (value: boolean) => void = () => {};

export const firestoreConnectionPromise = new Promise<boolean>((resolve) => {
  resolveConnection = resolve;
});

export async function forceOnline() {
  try {
    await enableNetwork(getDb());
    return true;
  } catch {
    return false;
  }
}

export function useFirestoreConnection() {
  const [connected, setConnected] = useState(isFirestoreConnected);
  const [loading, setLoading] = useState(!isFirestoreConnected);

  useEffect(() => {
    let mounted = true;
    firestoreConnectionPromise.then((status) => {
      if (mounted) {
        setConnected(status);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { connected, loading, retry: testConnection };
}

async function testConnection(retries = 2) {
  await forceOnline();

  for (let i = 0; i < retries; i++) {
    try {
      await Promise.race([
        getDocFromServer(doc(getDb(), '_connection_test_', 'init')),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);
      isFirestoreConnected = true;
      resolveConnection(true);
      return;
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === 'permission-denied') {
        isFirestoreConnected = true;
        resolveConnection(true);
        return;
      }
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }
  }

  isFirestoreConnected = false;
  resolveConnection(false);
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
  console.error('Firestore Error: ', errorMessage, operationType, path);
  throw new Error(errorMessage);
}

setTimeout(() => {
  void testConnection();
}, 5000);
