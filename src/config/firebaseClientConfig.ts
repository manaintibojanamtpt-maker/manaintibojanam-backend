import { EnvironmentConfig } from './environment';

/** Local / staging Firebase project (bhojanos2). */
const DEV_FIREBASE = {
  apiKey: 'AIzaSyBBKia1hM4ZU0hYS52dTy63KTkwzZFYzgI',
  authDomain: 'bhojanos2.firebaseapp.com',
  projectId: 'bhojanos2',
  storageBucket: 'bhojanos2.firebasestorage.app',
  messagingSenderId: '928117320950',
  appId: '1:928117320950:web:e155ae1679e8d9fbe950d7',
  measurementId: 'G-PLZEZBXYQK',
} as const;

export type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

function pickEnv(key: string): string | undefined {
  const value = import.meta.env[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** Single source of truth for browser Firebase SDK config. */
export function getFirebaseClientConfig(): FirebaseClientConfig {
  const fromEnv: Partial<FirebaseClientConfig> = {
    apiKey: pickEnv('VITE_FIREBASE_API_KEY'),
    authDomain: pickEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: pickEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: pickEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: pickEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: pickEnv('VITE_FIREBASE_APP_ID'),
    measurementId: pickEnv('VITE_FIREBASE_MEASUREMENT_ID'),
  };

  if (fromEnv.projectId && fromEnv.apiKey) {
    return {
      apiKey: fromEnv.apiKey,
      authDomain: fromEnv.authDomain || `${fromEnv.projectId}.firebaseapp.com`,
      projectId: fromEnv.projectId,
      storageBucket: fromEnv.storageBucket || `${fromEnv.projectId}.firebasestorage.app`,
      messagingSenderId: fromEnv.messagingSenderId || DEV_FIREBASE.messagingSenderId,
      appId: fromEnv.appId || DEV_FIREBASE.appId,
      measurementId: fromEnv.measurementId,
    };
  }

  if (EnvironmentConfig.isProduction()) {
    console.error(
      '[Firebase] Production build is missing VITE_FIREBASE_* env vars. ' +
        'Set them on Vercel to bhojanos-prod before deploying.',
    );
  }

  return { ...DEV_FIREBASE };
}

export function getFirestoreDatabaseId(): string {
  return pickEnv('VITE_FIRESTORE_DATABASE_ID') || '(default)';
}

export function getResolvedFirebaseProjectId(): string {
  return getFirebaseClientConfig().projectId;
}
