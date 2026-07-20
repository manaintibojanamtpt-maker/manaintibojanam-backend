import { EnvironmentConfig } from './environment';
import { BHOJANOS_PROD_FIREBASE_PUBLIC } from './bhojanosProdFirebase';
import { isProductionBhojanHost, readRuntimeFirebaseConfig } from '../lib/runtimeFirebaseConfig';

/** Local / staging Firebase project (bhojanos2). Never use on bhojanos.com. */
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
  const value = import.meta.env?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function defaultsForProject(projectId: string): FirebaseClientConfig {
  return projectId === BHOJANOS_PROD_FIREBASE_PUBLIC.projectId
    ? { ...BHOJANOS_PROD_FIREBASE_PUBLIC }
    : { ...DEV_FIREBASE };
}

function normalizeFirebaseConfig(partial: Partial<FirebaseClientConfig>): FirebaseClientConfig {
  const projectId = partial.projectId?.trim() || BHOJANOS_PROD_FIREBASE_PUBLIC.projectId;
  const defaults = defaultsForProject(projectId);
  return {
    apiKey: partial.apiKey?.trim() || defaults.apiKey,
    authDomain: partial.authDomain?.trim() || defaults.authDomain,
    projectId,
    storageBucket: partial.storageBucket?.trim() || defaults.storageBucket,
    messagingSenderId: partial.messagingSenderId?.trim() || defaults.messagingSenderId,
    appId: partial.appId?.trim() || defaults.appId,
    measurementId: partial.measurementId?.trim() || undefined,
  };
}

export function isFirebaseClientConfigReady(config?: FirebaseClientConfig): boolean {
  const cfg = config ?? getFirebaseClientConfig();
  return Boolean(cfg.apiKey && cfg.projectId && cfg.authDomain && cfg.appId && cfg.messagingSenderId);
}

/** Single source of truth for browser Firebase SDK config. */
export function getFirebaseClientConfig(): FirebaseClientConfig {
  const runtime = readRuntimeFirebaseConfig();
  if (runtime) {
    return normalizeFirebaseConfig(runtime);
  }

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
    return normalizeFirebaseConfig(fromEnv);
  }

  if (isProductionBhojanHost()) {
    console.warn(
      '[Firebase] Runtime bootstrap and VITE_FIREBASE_* are unavailable — using embedded bhojanos-prod config.',
    );
    return { ...BHOJANOS_PROD_FIREBASE_PUBLIC };
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
