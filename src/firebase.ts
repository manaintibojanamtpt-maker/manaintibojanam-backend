import { initializeApp} from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, Firestore, enableNetwork, terminate, getFirestore, updateDoc } from 'firebase/firestore';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { useState, useEffect } from 'react';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize app first - this MUST succeed
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Set persistence to local for better session management
setPersistence(auth, browserLocalPersistence).catch(err => console.error("Auth Persistence Error:", err));

// Initialize Firestore with robust settings for sandboxed environments
const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";

console.log(`[Firestore Client] Initializing with Project: ${firebaseConfig.projectId}, Database: ${databaseId}`);

// Initialize Firestore with maximum resilience
let _dbInstance: Firestore | null = null;
let _initError: Error | null = null;
let _initAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

function initializeFirestoreInstance(): Firestore {
  if (_dbInstance) {
    console.log('[Firestore] Already initialized');
    return _dbInstance;
  }

  if (_initAttempts >= MAX_INIT_ATTEMPTS) {
    console.error('[Firestore] Max initialization attempts reached');
    throw _initError || new Error('Firestore initialization failed after multiple attempts');
  }

  _initAttempts++;

  try {
    console.log(`[Firestore] Initialization attempt ${_initAttempts}...`);
    
    // Try to initialize with specific database ID
    try {
      _dbInstance = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
      }, databaseId === "(default)" ? undefined : databaseId);
      console.log('[Firestore] Successfully initialized with database:', databaseId);
      return _dbInstance;
    } catch (specificDbError) {
      console.warn(`[Firestore] Failed to init with database '${databaseId}', trying default...`, specificDbError);
      
      // Fallback: Try with default database
      _dbInstance = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
      });
      console.log('[Firestore] Successfully initialized with default database');
      return _dbInstance;
    }
  } catch (error) {
    _initError = error instanceof Error ? error : new Error(String(error));
    console.error('[Firestore] Initialization attempt failed:', _initError);
    
    // Final fallback: Try getFirestore() which uses the default instance
    try {
      console.log('[Firestore] Attempting final fallback using getFirestore()...');
      _dbInstance = getFirestore(app);
      console.log('[Firestore] Successfully got Firestore instance via getFirestore()');
      return _dbInstance;
    } catch (fallbackError) {
      console.error('[Firestore] All initialization methods failed:', fallbackError);
      throw new Error(`Firestore initialization failed: ${_initError?.message}`);
    }
  }
}

// NOTE: Direct db export removed to prevent uninitialized access
// Use getDb() function instead for safe Firestore access

try {
  _dbInstance = initializeFirestoreInstance();
  console.log('[Firestore] Module initialization successful');
} catch (error) {
  console.error('[Firebase] CRITICAL: Could not initialize Firestore at module load:', error);
  // Don't set _dbInstance - let getDb() handle initialization on demand
}

// Safety wrapper to ensure db is always ready
export function getDb(): Firestore {
  if (!_dbInstance) {
    try {
      _dbInstance = initializeFirestoreInstance();
    } catch (error) {
      console.error('[Firestore] Could not initialize Firestore:', error);
      throw new Error('Firestore is not available. Please try again later.');
    }
  }
  return _dbInstance;
}

// Add auth state logging to check if API key is working
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log(`✅ [Auth] User is signed in: ${user.uid}`);
  } else {
    console.log(`ℹ️ [Auth] No user signed in.`);
  }
}, (error) => {
  console.error(`❌ [Auth] Error:`, error);
  if (error.message?.includes("suspended")) {
    console.error("🚨 [Auth] API Key is SUSPENDED. Please check Firebase Console.");
  }
});

export let isFirestoreConnected = false;

// Initialize resolveConnection to prevent "before initialization" errors
let resolveConnection: (value: boolean) => void = () => {
  // Placeholder - will be replaced by Promise constructor
};

export const firestoreConnectionPromise = new Promise<boolean>((resolve) => {
  resolveConnection = resolve;
});

// Function to manually force network connection
export async function forceOnline() {
  try {
    console.log("Attempting to enable Firestore network...");
    await enableNetwork(getDb());
    console.log("Firestore network enabled.");
    return true;
  } catch (e) {
    console.error("Failed to enable Firestore network:", e);
    return false;
  }
}

// Hook for components to track connection status
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

// Connection test and fallback with retry
async function testConnection(retries = 3) {
  console.log(`[Firestore Client] Testing connection to database: ${databaseId}...`);
  
  // Try to force network on first
  await forceOnline();

  for (let i = 0; i < retries; i++) {
    try {
      // Try to fetch a non-existent doc just to test connection
      // We use getDocFromServer to bypass cache
      await getDocFromServer(doc(getDb(), '_connection_test_', 'init'));
      console.log(`✅ [Firestore Client] Connection successful for database: ${databaseId}`);
      isFirestoreConnected = true;
      resolveConnection(true);
      return;
    } catch (error: any) {
      console.error(`❌ [Firestore Client] Connection Attempt ${i + 1} Error:`, error);
      
      if (error.message?.includes("client is offline") || error.message?.includes("suspended")) {
        console.warn("⚠️ [Firestore Client] Project might be restricted or suspended.");
      }

      if (i < retries - 1) {
        console.log(`Retrying Firestore connection in 2s...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  // Last resort: Try default database if named one failed
  if (databaseId !== "(default)") {
    console.log("🔄 [Firestore Client] Attempting fallback to (default) database...");
    try {
      const defaultDb = initializeFirestore(app, { experimentalForceLongPolling: true });
      await getDocFromServer(doc(defaultDb, '_connection_test_', 'init'));
      console.log("✅ [Firestore Client] Fallback to (default) successful.");
      // Note: We can't easily swap the exported 'db' instance without a proxy, 
      // but this confirms the project is alive.
    } catch (e) {
      console.error("❌ [Firestore Client] Fallback to (default) also failed.");
    }
  }

  isFirestoreConnected = false;
  resolveConnection(false);
}
testConnection();

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
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Push Notification Logic
export async function requestNotificationPermission() {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.log('Firebase Messaging is not supported in this browser.');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const messaging = getMessaging(app);
      const currentToken = await getToken(messaging).catch(err => {
        console.warn('Failed to get FCM token with default config', err);
        return null;
      });

      if (currentToken) {
        console.log('FCM Token:', currentToken);
        const currentUser = auth.currentUser;
        if (currentUser) {
          await updateDoc(doc(getDb(), 'users', currentUser.uid), {
            fcmToken: currentToken
          });
        }
        return currentToken;
      }
    }
  } catch (err) {
    console.error('An error occurred while requesting notification permission:', err);
  }
  return null;
}

export default app;
