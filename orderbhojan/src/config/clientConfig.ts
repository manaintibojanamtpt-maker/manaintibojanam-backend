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

/** Public bhojanos-prod Firebase web SDK config (apiKey is not secret — domain-restricted in GCP). */
export const BHOJANOS_PROD_FIREBASE_PUBLIC = {
  apiKey: 'AIzaSyC6kCJwsEWuwLVPGmJsVDDxTyWlayp2yLQ',
  authDomain: 'bhojanos-prod.firebaseapp.com',
  projectId: 'bhojanos-prod',
  storageBucket: 'bhojanos-prod.firebasestorage.app',
  messagingSenderId: '170989397954',
  appId: '1:170989397954:web:9c67dbacc58329f360185b',
} as const;

/**
 * Web OAuth client ID for native Google sign-in (Capacitor).
 * Must match `default_web_client_id` generated from android/app/google-services.json.
 */
export const BHOJANOS_PROD_GOOGLE_WEB_CLIENT_ID =
  '170989397954-6mimml7p7gft6vg71essvpt74bat4kbc.apps.googleusercontent.com' as const;

export function isFirebaseConfigIncomplete(config: AppConfig): boolean {
  const { firebase } = config;
  return !firebase.apiKey || !firebase.authDomain || !firebase.appId || !firebase.messagingSenderId;
}

function applyFirebaseDefaults(config: AppConfig): AppConfig {
  return {
    ...config,
    firebase: {
      ...config.firebase,
      projectId: config.firebase.projectId || BHOJANOS_PROD_FIREBASE_PUBLIC.projectId,
      authDomain: config.firebase.authDomain || BHOJANOS_PROD_FIREBASE_PUBLIC.authDomain,
      storageBucket: config.firebase.storageBucket || BHOJANOS_PROD_FIREBASE_PUBLIC.storageBucket,
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

/** Live production must adopt backend Firebase project even when build env still says orderbhojan. */
export function mergeRemoteFirebaseConfigPreferRemote(
  config: AppConfig,
  remote: RemoteClientConfig,
): AppConfig {
  const remoteFirebase = remote.firebase;
  return {
    ...config,
    firebase: {
      apiKey: remoteFirebase.apiKey || config.firebase.apiKey,
      authDomain: remoteFirebase.authDomain || config.firebase.authDomain,
      projectId: remoteFirebase.projectId || BHOJANOS_PROD_FIREBASE_PUBLIC.projectId,
      storageBucket: remoteFirebase.storageBucket || config.firebase.storageBucket,
      messagingSenderId: remoteFirebase.messagingSenderId || config.firebase.messagingSenderId,
      appId: remoteFirebase.appId || config.firebase.appId,
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
  const usesLiveBackend = hydrated.marketplaceApiBaseUrl.includes('manaintibojanam-backend');
  const wrongProdFirebaseProject =
    import.meta.env?.PROD && usesLiveBackend && hydrated.firebase.projectId === 'orderbhojan';

  if (!isFirebaseConfigIncomplete(hydrated) && !wrongProdFirebaseProject) {
    return hydrated;
  }

  const remote = await fetchRemoteClientConfig(hydrated.marketplaceApiBaseUrl);
  if (remote) {
    hydrated =
      wrongProdFirebaseProject || (usesLiveBackend && import.meta.env?.PROD)
        ? mergeRemoteFirebaseConfigPreferRemote(hydrated, remote)
        : mergeRemoteFirebaseConfig(hydrated, remote);
  } else if (wrongProdFirebaseProject || (usesLiveBackend && import.meta.env?.PROD)) {
    hydrated = mergeRemoteFirebaseConfigPreferRemote(hydrated, {
      firebase: BHOJANOS_PROD_FIREBASE_PUBLIC,
      configured: true,
    });
  }
  return applyFirebaseDefaults(hydrated);
}
