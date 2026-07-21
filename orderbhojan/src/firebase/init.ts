import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  type Auth,
  type User,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAppConfig } from '@/config';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let authPersistenceReady: Promise<void> | null = null;

function buildFirebaseConfig() {
  const { firebase } = getAppConfig();
  return {
    apiKey: firebase.apiKey,
    authDomain: firebase.authDomain,
    projectId: firebase.projectId,
    storageBucket: firebase.storageBucket,
    messagingSenderId: firebase.messagingSenderId,
    appId: firebase.appId,
    measurementId: firebase.measurementId,
  };
}

export function initializeFirebase(): { app: FirebaseApp | null; auth: Auth | null; firestore: Firestore | null } {
  const config = getAppConfig();
  const { firebase } = config;

  if (!firebase.apiKey || !firebase.projectId) {
    if (config.environment === 'development') {
      return { app: null, auth: null, firestore: null };
    }
  }

  if (!app) {
    app = getApps()[0] ?? initializeApp(buildFirebaseConfig());
    auth = getAuth(app);
    authPersistenceReady = setPersistence(auth, browserLocalPersistence).then(() => undefined);
    firestore = getFirestore(app);
  }

  return { app, auth: auth!, firestore: firestore! };
}

/** Await before getRedirectResult so redirect sessions restore reliably on web. */
export async function ensureAuthPersistence(): Promise<void> {
  initializeFirebase();
  if (!authPersistenceReady) {
    return;
  }
  await authPersistenceReady;
}

export function getFirebaseAuth(): Auth | null {
  if (!auth) {
    initializeFirebase();
  }
  return auth;
}

export function getFirebaseFirestore(): Firestore | null {
  if (!firestore) {
    initializeFirebase();
  }
  return firestore;
}

export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(firebaseAuth, callback);
}

export async function getFirebaseIdToken(): Promise<string | null> {
  const { fetchBearerToken } = await import('@/features/auth/application/authService');
  return fetchBearerToken();
}

export function isFirebaseConfigured(): boolean {
  const { firebase } = getAppConfig();
  return Boolean(firebase.apiKey && firebase.projectId && firebase.appId);
}

export function isFirestoreConfigured(): boolean {
  return isFirebaseConfigured();
}
