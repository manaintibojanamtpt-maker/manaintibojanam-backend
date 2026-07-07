import fs from 'fs';
import path from 'path';
import type { App } from 'firebase-admin/app';
import {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
  type ServiceAccount,
} from 'firebase-admin/app';
import type { Firestore } from 'firebase-admin/firestore';
import { getFirestore, initializeFirestore } from 'firebase-admin/firestore';

export type CredentialSource =
  | 'FIREBASE_SERVICE_ACCOUNT'
  | 'GOOGLE_APPLICATION_CREDENTIALS'
  | 'APPLICATION_DEFAULT_METADATA';

export interface FirebaseAuthContext {
  readonly projectId: string;
  readonly databaseId: string;
  readonly storageBucket: string;
  readonly credentialSource: CredentialSource;
  readonly serviceAccountEmail: string | null;
  readonly credentialType: string;
  readonly adcDetected: boolean;
  readonly runningEnvironment: string;
  readonly googleApplicationCredentials: string | null;
  readonly firebaseServiceAccountSet: boolean;
}

export interface ResolvedCredential {
  readonly source: CredentialSource;
  readonly credential: ReturnType<typeof cert> | ReturnType<typeof applicationDefault>;
  readonly serviceAccountEmail: string | null;
  readonly credentialType: string;
  readonly serviceAccountProjectId: string | null;
}

const REQUIRED_SERVICE_ACCOUNT_FIELDS = [
  'project_id',
  'client_email',
  'private_key',
  'token_uri',
] as const;

export function resolveFirebaseProjectId(): string {
  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCP_PROJECT?.trim();

  if (!projectId) {
    throw new Error(
      'Missing FIREBASE_PROJECT_ID. Set FIREBASE_PROJECT_ID to your Firebase project (e.g. bhojanos-prod). ' +
        'Do not rely on firebase-applet-config.json for server authentication.',
    );
  }

  return projectId;
}

export function resolveStorageBucket(projectId: string): string {
  return (
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
    `${projectId}.firebasestorage.app`
  );
}

export function resolveDatabaseId(): string {
  return process.env.FIRESTORE_DATABASE_ID?.trim() || '(default)';
}

function assertServiceAccountShape(
  serviceAccount: Record<string, unknown>,
  label: string,
): asserts serviceAccount is ServiceAccount & { project_id: string; client_email: string } {
  for (const field of REQUIRED_SERVICE_ACCOUNT_FIELDS) {
    if (typeof serviceAccount[field] !== 'string' || !serviceAccount[field]) {
      throw new Error(
        `${label} is missing required field "${field}". Download a valid Firebase service account key.`,
      );
    }
  }
}

function assertProjectMatch(
  configuredProjectId: string,
  credentialProjectId: string | null,
  source: CredentialSource,
): void {
  if (!credentialProjectId) return;
  if (credentialProjectId !== configuredProjectId) {
    throw new Error(
      `Firebase project mismatch (${source}): FIREBASE_PROJECT_ID="${configuredProjectId}" ` +
        `but credential project_id="${credentialProjectId}". ` +
        'Use a service account key from the same project as FIREBASE_PROJECT_ID.',
    );
  }
}

function readServiceAccountFile(filePath: string): ServiceAccount & { project_id: string; client_email: string } {
  const resolved = path.resolve(filePath);
  const stat = fs.statSync(resolved);

  if (!stat.isFile()) {
    throw new Error(
      `GOOGLE_APPLICATION_CREDENTIALS must point to a JSON file, not a directory: ${resolved}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch (error) {
    throw new Error(
      `Failed to parse GOOGLE_APPLICATION_CREDENTIALS file at ${resolved}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`GOOGLE_APPLICATION_CREDENTIALS file is not a JSON object: ${resolved}`);
  }

  const serviceAccount = parsed as Record<string, unknown>;
  assertServiceAccountShape(serviceAccount, `GOOGLE_APPLICATION_CREDENTIALS (${resolved})`);
  return serviceAccount as ServiceAccount & { project_id: string; client_email: string };
}

export function resolveFirebaseCredential(
  configuredProjectId: string,
): ResolvedCredential {
  const firebaseServiceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  const googleApplicationCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() || null;

  if (firebaseServiceAccountRaw) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(firebaseServiceAccountRaw);
    } catch (error) {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT is not valid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('FIREBASE_SERVICE_ACCOUNT must be a JSON object.');
    }

    const serviceAccount = parsed as Record<string, unknown>;
    assertServiceAccountShape(serviceAccount, 'FIREBASE_SERVICE_ACCOUNT');
    assertProjectMatch(
      configuredProjectId,
      String(serviceAccount.project_id),
      'FIREBASE_SERVICE_ACCOUNT',
    );

    return {
      source: 'FIREBASE_SERVICE_ACCOUNT',
      credential: cert(serviceAccount as ServiceAccount),
      serviceAccountEmail: String(serviceAccount.client_email),
      credentialType: 'service_account_json_env',
      serviceAccountProjectId: String(serviceAccount.project_id),
    };
  }

  if (googleApplicationCredentials) {
    const serviceAccount = readServiceAccountFile(googleApplicationCredentials);
    assertProjectMatch(
      configuredProjectId,
      serviceAccount.project_id,
      'GOOGLE_APPLICATION_CREDENTIALS',
    );

    return {
      source: 'GOOGLE_APPLICATION_CREDENTIALS',
      credential: cert(serviceAccount),
      serviceAccountEmail: serviceAccount.client_email,
      credentialType: 'service_account_json_file',
      serviceAccountProjectId: serviceAccount.project_id,
    };
  }

  return {
    source: 'APPLICATION_DEFAULT_METADATA',
    credential: applicationDefault(),
    serviceAccountEmail: null,
    credentialType: 'application_default_credentials',
    serviceAccountProjectId: null,
  };
}

export async function detectApplicationDefaultCredentials(): Promise<boolean> {
  try {
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth();
    await auth.getApplicationDefault();
    return true;
  } catch {
    return false;
  }
}

export function printFirebaseAuthenticationReport(context: FirebaseAuthContext): void {
  console.log('------------------------------------');
  console.log('Firebase Authentication Report');
  console.log('------------------------------------');
  console.log(`Credential Source: ${context.credentialSource}`);
  console.log(`Project ID: ${context.projectId}`);
  console.log(`Database: ${context.databaseId}`);
  console.log(`Storage Bucket: ${context.storageBucket}`);
  console.log(`Service Account Email: ${context.serviceAccountEmail ?? '(resolved at runtime via ADC)'}`);
  console.log(`Database ID: ${context.databaseId}`);
  console.log(`Running Environment: ${context.runningEnvironment}`);
  console.log(`GOOGLE_APPLICATION_CREDENTIALS: ${context.googleApplicationCredentials ?? 'not set'}`);
  console.log(`FIREBASE_SERVICE_ACCOUNT: ${context.firebaseServiceAccountSet ? 'set' : 'not set'}`);
  console.log(`ADC detected: ${context.adcDetected}`);
  console.log(`Credential Type: ${context.credentialType}`);
  console.log('------------------------------------');
}

export async function verifyFirestoreIamAccess(
  db: Firestore,
  context: FirebaseAuthContext,
): Promise<void> {
  const docRef = db.collection('system_health').doc('firebase_auth_test');
  const marker = `auth_probe_${Date.now()}`;

  try {
    await docRef.set({
      marker,
      projectId: context.projectId,
      checkedAt: new Date().toISOString(),
      source: context.credentialSource,
    });

    const snapshot = await docRef.get();
    if (!snapshot.exists || snapshot.data()?.marker !== marker) {
      throw new Error('Firestore auth probe read-back mismatch');
    }

    await docRef.delete();
  } catch (error: unknown) {
    const grpcCode = (error as { code?: number | string })?.code;
    const details = (error as { details?: string })?.details;
    const message = error instanceof Error ? error.message : String(error);

    console.error('Permission denied — Firestore IAM probe failed');
    console.error(`Service account email: ${context.serviceAccountEmail ?? 'unknown (ADC)'}`);
    console.error(`Project: ${context.projectId}`);
    console.error(`Database: ${context.databaseId}`);
    console.error(`Firestore error code: ${grpcCode ?? 'unknown'}`);
    console.error(`Details: ${details ?? message}`);

    throw new Error(
      `Firestore IAM verification failed for project "${context.projectId}" ` +
        `(service account: ${context.serviceAccountEmail ?? 'ADC'}): ${message}`,
    );
  }
}

let singleton: FirebaseAdminProvider | null = null;

export class FirebaseAdminProvider {
  private readonly app: App;
  private readonly firestore: Firestore;
  private readonly context: FirebaseAuthContext;

  private constructor(app: App, firestore: Firestore, context: FirebaseAuthContext) {
    this.app = app;
    this.firestore = firestore;
    this.context = context;
  }

  static async initialize(options?: { skipProbe?: boolean }): Promise<FirebaseAdminProvider> {
    if (singleton) return singleton;

    const projectId = resolveFirebaseProjectId();
    const databaseId = resolveDatabaseId();
    const storageBucket = resolveStorageBucket(projectId);
    const resolved = resolveFirebaseCredential(projectId);
    const adcDetected = await detectApplicationDefaultCredentials();

    const app =
      getApps().length > 0
        ? getApp()
        : initializeApp({
            credential: resolved.credential,
            projectId,
            storageBucket,
          });

    const firestore =
      databaseId !== '(default)'
        ? initializeFirestore(app, { preferRest: true }, databaseId)
        : initializeFirestore(app, { preferRest: true });

    const context: FirebaseAuthContext = {
      projectId,
      databaseId,
      storageBucket,
      credentialSource: resolved.source,
      serviceAccountEmail: resolved.serviceAccountEmail,
      credentialType: resolved.credentialType,
      adcDetected,
      runningEnvironment: process.env.NODE_ENV || 'development',
      googleApplicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() || null,
      firebaseServiceAccountSet: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT?.trim()),
    };

    singleton = new FirebaseAdminProvider(app, firestore, context);
    printFirebaseAuthenticationReport(context);

    if (!options?.skipProbe) {
      await verifyFirestoreIamAccess(firestore, context);
      console.log('✔ Firestore IAM probe: read / write / delete OK');
    }

    return singleton;
  }

  static getInstance(): FirebaseAdminProvider {
    if (!singleton) {
      throw new Error('FirebaseAdminProvider not initialized. Call initialize() first.');
    }
    return singleton;
  }

  getApp(): App {
    return this.app;
  }

  getFirestore(): Firestore {
    return this.firestore;
  }

  getContext(): FirebaseAuthContext {
    return this.context;
  }
}

export async function getFirebaseFirestore(): Promise<Firestore> {
  return (await FirebaseAdminProvider.initialize()).getFirestore();
}
