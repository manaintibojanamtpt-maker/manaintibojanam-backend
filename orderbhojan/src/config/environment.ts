export type AppEnvironment = 'development' | 'preview' | 'production';

export interface AppConfig {
  readonly environment: AppEnvironment;
  readonly marketplaceApiBaseUrl: string;
  readonly marketplaceApiVersion: string;
  readonly firebase: {
    readonly apiKey: string;
    readonly authDomain: string;
    readonly projectId: string;
    readonly storageBucket: string;
    readonly messagingSenderId: string;
    readonly appId: string;
    readonly measurementId?: string;
  };
  readonly features: {
    readonly mswEnabled: boolean;
    readonly appCheckEnabled: boolean;
    readonly analyticsEnabled: boolean;
  };
  readonly api: {
    readonly timeoutMs: number;
    readonly retryAttempts: number;
    readonly retryDelayMs: number;
  };
}

function readEnv(key: string, fallback = ''): string {
  const env = import.meta.env ?? {};
  return (env as Record<string, string | undefined>)[key]?.trim() ?? fallback;
}

function resolveEnvironment(): AppEnvironment {
  const env = import.meta.env ?? {};
  const explicit = (env as Record<string, string | undefined>).VITE_APP_ENV?.trim();
  if (explicit === 'production' || explicit === 'preview' || explicit === 'development') {
    return explicit;
  }
  return env.PROD ? 'production' : 'development';
}

function isLiveMarketplaceBuild(): boolean {
  const explicit = readEnv('VITE_FF_OB_FIRESTORE');
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;
  return Boolean(import.meta.env?.PROD);
}

function resolveFirebaseProjectId(liveMarketplace: boolean): string {
  const explicit = readEnv('VITE_FIREBASE_PROJECT_ID');
  if (liveMarketplace && import.meta.env?.PROD && (!explicit || explicit === 'orderbhojan')) {
    return 'bhojanos-prod';
  }
  return explicit || (liveMarketplace ? 'bhojanos-prod' : 'orderbhojan');
}

export function loadAppConfig(): AppConfig {
  const liveMarketplace = isLiveMarketplaceBuild();
  const explicitApiUrl = readEnv('VITE_MARKETPLACE_API_URL');
  const marketplaceApiBaseUrl = explicitApiUrl
    ? explicitApiUrl.replace(/\/$/, '')
    : liveMarketplace && import.meta.env?.DEV
      ? typeof window !== 'undefined'
        ? window.location.origin
        : readEnv('VITE_MARKETPLACE_API_PROXY', 'http://localhost:8080')
      : liveMarketplace
        ? readEnv('VITE_MARKETPLACE_API_PROXY', 'https://manaintibojanam-backend.onrender.com')
        : import.meta.env?.DEV
          ? typeof window !== 'undefined'
            ? window.location.origin
            : 'http://localhost:5174'
          : 'https://manaintibojanam-backend.onrender.com';

  return {
    environment: resolveEnvironment(),
    marketplaceApiBaseUrl,
    marketplaceApiVersion: readEnv('VITE_MARKETPLACE_API_VERSION', '1.0'),
    firebase: {
      apiKey: readEnv('VITE_FIREBASE_API_KEY'),
      authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN'),
      projectId: resolveFirebaseProjectId(liveMarketplace),
      storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
      appId: readEnv('VITE_FIREBASE_APP_ID'),
      measurementId: readEnv('VITE_FIREBASE_MEASUREMENT_ID') || undefined,
    },
    features: {
      mswEnabled:
        liveMarketplace
          ? false
          : readEnv('VITE_MSW_ENABLED', (import.meta.env?.DEV ? 'true' : 'false')) === 'true',
      appCheckEnabled: readEnv('VITE_APP_CHECK_ENABLED', 'false') === 'true',
      analyticsEnabled: readEnv('VITE_ANALYTICS_ENABLED', 'true') === 'true',
    },
    api: {
      timeoutMs: Number(readEnv('VITE_API_TIMEOUT_MS', '30000')),
      retryAttempts: Number(readEnv('VITE_API_RETRY_ATTEMPTS', '2')),
      retryDelayMs: Number(readEnv('VITE_API_RETRY_DELAY_MS', '500')),
    },
  };
}
