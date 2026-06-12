const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = path.join(__dirname, '../src');
const firebaseTsPath = path.join(srcDir, 'firebase.ts');
const firebaseDbTsPath = path.join(srcDir, 'lib', 'firebase-db.ts');

// 1. Create lib directory if not exists
if (!fs.existsSync(path.join(srcDir, 'lib'))) {
  fs.mkdirSync(path.join(srcDir, 'lib'), { recursive: true });
}

// 2. Read firebase.ts
const firebaseTsContent = fs.readFileSync(firebaseTsPath, 'utf8');

// The new firebase.ts content:
const newFirebaseTs = `import { initializeApp} from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize app first - this MUST succeed
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Set persistence to local for better session management
setPersistence(auth, browserLocalPersistence).catch(err => console.error("Auth Persistence Error:", err));

// Add auth state logging to check if API key is working
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log(\`✅ [Auth] User is signed in: \${user.uid}\`);
  } else {
    console.log(\`ℹ️ [Auth] No user signed in.\`);
  }
}, (error) => {
  console.error(\`❌ [Auth] Error:\`, error);
  if (error.message?.includes("suspended")) {
    console.error("🚨 [Auth] API Key is SUSPENDED. Please check Firebase Console.");
  }
});

// Push Notification Logic
export async function requestNotificationPermission() {
  try {
    const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
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
          // Dynamic import of db to avoid circular/static deps
          const { getDb } = await import('./lib/firebase-db');
          const { updateDoc, doc } = await import('firebase/firestore');
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
`;

// The new lib/firebase-db.ts content:
const newFirebaseDbTs = `import { initializeFirestore, doc, getDocFromServer, Firestore, enableNetwork, getFirestore } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { app, auth } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';

const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";

console.log(\`[Firestore Client] Initializing with Project: \${firebaseConfig.projectId}, Database: \${databaseId}\`);

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
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
      }, databaseId === "(default)" ? undefined : databaseId);
      return _dbInstance;
    } catch (specificDbError) {
      _dbInstance = initializeFirestore(app, {
        experimentalForceLongPolling: true,
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
      throw new Error(\`Firestore initialization failed: \${_initError?.message}\`);
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
      await getDocFromServer(doc(getDb(), '_connection_test_', 'init'));
      isFirestoreConnected = true;
      resolveConnection(true);
      return;
    } catch (error: any) {
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  if (databaseId !== "(default)") {
    try {
      const defaultDb = initializeFirestore(app, { experimentalForceLongPolling: true });
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
`;

fs.writeFileSync(firebaseTsPath, newFirebaseTs);
fs.writeFileSync(firebaseDbTsPath, newFirebaseDbTs);

// 3. Update all imports in src/**/*.tsx and src/**/*.ts
function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(srcDir, (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    if (filePath === firebaseTsPath || filePath === firebaseDbTsPath) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Find imports from firebase that grab getDb, forceOnline, handleFirestoreError, useFirestoreConnection, OperationType, isFirestoreConnected
    // Regex is tricky, so let's just do simple replacements.
    // If the file imports 'getDb', 'handleFirestoreError', etc. from any variant of '../firebase' or './firebase'
    const importsToMove = ['getDb', 'forceOnline', 'handleFirestoreError', 'useFirestoreConnection', 'OperationType', 'isFirestoreConnected'];
    
    // We will parse lines
    const lines = content.split('\\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("from '../firebase'") || lines[i].includes("from './firebase'") || lines[i].includes("from '../../firebase'")) {
        let line = lines[i];
        let hasAuth = line.includes('auth') || line.includes('app') || line.includes('requestNotificationPermission');
        let hasDb = importsToMove.some(imp => line.includes(imp));
        
        if (hasDb) {
          // It imports DB stuff. 
          // If it ONLY imports DB stuff, just change the path to lib/firebase-db
          if (!hasAuth) {
            lines[i] = line.replace(/from '([^']+firebase)'/, "from '$1/../lib/firebase-db'");
            // fix path mapping: if it was '../firebase', it becomes '../lib/firebase-db'
            // wait, if it was '../firebase', replacing 'firebase' with 'lib/firebase-db' makes it '../lib/firebase-db'
            // if it was './firebase', it makes it './lib/firebase-db'
            // Let's explicitly calculate relative path.
            let rel = path.relative(path.dirname(filePath), firebaseDbTsPath).replace(/\\\\/g, '/');
            if (!rel.startsWith('.')) rel = './' + rel;
            lines[i] = line.replace(/from '([^']+)'/, "from '" + rel + "'");
            changed = true;
          } else {
            // It imports BOTH auth and DB. Split it into two lines.
            let authImports = [];
            let dbImports = [];
            // naive parsing
            const match = line.match(/import\s+{([^}]+)}\s+from/);
            if (match) {
              const tokens = match[1].split(',').map(t => t.trim()).filter(Boolean);
              tokens.forEach(t => {
                if (importsToMove.includes(t)) dbImports.push(t);
                else authImports.push(t);
              });
              
              let relDb = path.relative(path.dirname(filePath), firebaseDbTsPath).replace(/\\\\/g, '/').replace(/\.ts$/, '');
              if (!relDb.startsWith('.')) relDb = './' + relDb;
              
              let relAuth = path.relative(path.dirname(filePath), firebaseTsPath).replace(/\\\\/g, '/').replace(/\.ts$/, '');
              if (!relAuth.startsWith('.')) relAuth = './' + relAuth;

              lines[i] = "import { " + authImports.join(', ') + " } from '" + relAuth + "';\nimport { " + dbImports.join(', ') + " } from '" + relDb + "';";
              changed = true;
            }
          }
        }
      }
    }
    
    if (changed) {
      fs.writeFileSync(filePath, lines.join('\\n'));
      console.log('Updated: ' + filePath);
    }
  }
});
console.log('Done refactoring Firebase imports.');
