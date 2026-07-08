import type { AppConfig } from './environment';

export interface RemoteClientConfig {
  readonly firebase: {
    readonly apiKey: string;
    readonly authDomain: string;
    readonly projectId: string;
    readonly storageBucket: string;
    readonly messagingSenderId: string;
    readonly appId: string;
  };
  readonly configured?: boolean;
}

/** Non-secret bhojanos-prod defaults — mirrors orderbhojan/.env.example production block. */
export const BHOJANOS_PROD_FIREBASE_DEFAULTS = {
  projectId: 'bhojanos-prod',
  authDomain: 'bhojanos-prod.firebaseapp.com',
  storageBucket: 'bhojanos-prod.firebasestorage.app',
} as const;

export function isFirebaseConfigIncomplete(config: AppConfig): boolean {
  const { firebase } = config;
  return !firebase.apiKey || !firebase.authDomain || !firebase.appId || !firebase.messagingSenderId;
}

function applyFirebaseDefaults(config: AppConfig): AppConfig {
  return {
    ...config,
    firebase: {
      ...config.firebase,
      projectId: config.firebase.projectId || BHOJANOS_PROD_FIREBASE_DEFAULTS.projectId,
      authDomain: config.firebase.authDomain || BHOJANOS_PROD_FIREBASE_DEFAULTS.authDomain,
      storageBucket: config.firebase.storageBucket || BHOJANOS_PROD_FIREBASE_DEFAULTS.storageBucket,
    },
  };
}

export function mergeRemoteFirebaseConfig(
  config: AppConfig,
  remote: RemoteClientConfig,
): AppConfig {
  const remoteFirebase = remote.firebase;
  return {
    ...config,
    firebase: {
      apiKey: config.firebase.apiKey || remoteFirebase.apiKey || '',
      authDomain: config.firebase.authDomain || remoteFirebase.authDomain || '',
      projectId: config.firebase.projectId || remoteFirebase.projectId || '',
      storageBucket: config.firebase.storageBucket || remoteFirebase.storageBucket || '',
      messagingSenderId: config.firebase.messagingSenderId || remoteFirebase.messagingSenderId || '',
      appId: config.firebase.appId || remoteFirebase.appId || '',
      measurementId: config.firebase.measurementId,
    },
  };
}

export async function fetchRemoteClientConfig(
  baseUrl: string,
): Promise<RemoteClientConfig | null> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/client-config`;
  try {
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as RemoteClientConfig;
    if (!payload?.firebase) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function hydrateFirebaseConfig(config: AppConfig): Promise<AppConfig> {
  let hydrated = applyFirebaseDefaults(config);
  if (!isFirebaseConfigIncomplete(hydrated)) {
    return hydrated;
  }

  const remote = await fetchRemoteClientConfig(hydrated.marketplaceApiBaseUrl);
  if (remote) {
    hydrated = mergeRemoteFirebaseConfig(hydrated, remote);
  }
  return applyFirebaseDefaults(hydrated);
}
