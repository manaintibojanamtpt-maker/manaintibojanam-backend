import { initializeFirestore, doc, getDocFromServer, Firestore, enableNetwork, getFirestore } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { app } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';

const databaseId = (firebaseConfig as any).firestoreDatabaseId || "(default)";

console.log(`[Firestore Client] Initializing with Project: ${firebaseConfig.projectId}, Database: ${databaseId}`);

let _dbInstance: Firestore | null = null;
let _initError: Error | null = null;
let _initAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

function initializeFirestoreInstance(): Firestore {
  if (_dbInstance) return _dbInstance;

  if (_initAttempts >= MAX_INIT_ATTEMPTS) {
    throw _initError || new Error('Firestore initialization failed after multiple attempts');
  }

  _initAttempts++;

  try {
    try {
      _dbInstance = initializeFirestore(app, {
        ignoreUndefinedProperties: true,
      }, databaseId === "(default)" ? undefined : databaseId);
      return _dbInstance;
    } catch (specificDbError) {
      _dbInstance = initializeFirestore(app, {
        ignoreUndefinedProperties: true,
      });
      return _dbInstance;
    }
  } catch (error) {
    _initError = error instanceof Error ? error : new Error(String(error));
    try {
      _dbInstance = getFirestore(app);
      return _dbInstance;
    } catch (fallbackError) {
      throw new Error(`Firestore initialization failed: ${_initError?.message}`);
    }
  }
}

export function getDb(): Firestore {
  if (!_dbInstance) {
    _dbInstance = initializeFirestoreInstance();
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
  } catch (e) {
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
    return () => { mounted = false; };
  }, []);

  return { connected, loading, retry: testConnection };
}

async function testConnection(retries = 3) {
  await forceOnline();

  for (let i = 0; i < retries; i++) {
    try {
      // Use Promise.race to prevent hanging indefinitely
      await Promise.race([
        getDocFromServer(doc(getDb(), '_connection_test_', 'init')),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]);
      isFirestoreConnected = true;
      resolveConnection(true);
      return;
    } catch (error: any) {
      // If it's a permission denied error, it means we ARE connected to the server!
      if (error?.code === 'permission-denied') {
        isFirestoreConnected = true;
        resolveConnection(true);
        return;
      }
      
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  if (databaseId !== "(default)") {
    try {
      const defaultDb = initializeFirestore(app, { ignoreUndefinedProperties: true });
      await getDocFromServer(doc(defaultDb, '_connection_test_', 'init'));
    } catch (e) {}
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
  authInfo: any;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  if (errorMessage.includes('default credentials') || errorMessage.includes('GOOGLE_APPLICATION_CREDENTIALS')) {
    return;
  }
  console.error('Firestore Error: ', errorMessage, operationType, path);
  throw new Error(errorMessage);
}

// Defer the connection test so it does NOT block initial app render.
// The UI and auth resolve immediately; this runs silently in the background.
setTimeout(() => testConnection(), 3000);
