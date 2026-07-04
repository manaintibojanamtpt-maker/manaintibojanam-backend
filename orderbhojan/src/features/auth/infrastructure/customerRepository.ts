import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import { getFirebaseFirestore, isFirestoreConfigured } from '@/firebase';
import type { AuthProviderId, AuthSessionUser } from '../domain/auth.types';

export interface CustomerDocument {
  readonly uid: string;
  readonly displayName: string | null;
  readonly email: string | null;
  readonly phoneNumber: string | null;
  readonly photoURL: string | null;
  readonly authProviders: readonly AuthProviderId[];
  readonly preferences: {
    readonly notifications: boolean;
    readonly marketing: boolean;
  };
  readonly createdAt?: unknown;
  readonly updatedAt?: unknown;
  readonly lastLoginAt?: unknown;
}

function customerRef(db: Firestore, uid: string) {
  return doc(db, 'customers', uid);
}

export async function upsertCustomerProfile(user: AuthSessionUser): Promise<CustomerDocument> {
  if (!isFirestoreConfigured()) {
    return buildCustomerDocument(user);
  }

  const db = getFirebaseFirestore();
  if (!db) {
    return buildCustomerDocument(user);
  }

  const ref = customerRef(db, user.uid);
  const existing = await getDoc(ref);
  const payload = {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    photoURL: user.photoURL,
    authProviders: mergeProviders(existing.data()?.authProviders as AuthProviderId[] | undefined, user.provider),
    preferences: {
      notifications: existing.data()?.preferences?.notifications ?? true,
      marketing: existing.data()?.preferences?.marketing ?? false,
    },
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
  };

  await setDoc(ref, payload, { merge: true });
  return buildCustomerDocument(user, payload.authProviders);
}

export async function readCustomerProfile(uid: string): Promise<CustomerDocument | null> {
  if (!isFirestoreConfigured()) return null;
  const db = getFirebaseFirestore();
  if (!db) return null;
  const snapshot = await getDoc(customerRef(db, uid));
  if (!snapshot.exists()) return null;
  return snapshot.data() as CustomerDocument;
}

function mergeProviders(existing: AuthProviderId[] | undefined, next: AuthProviderId): AuthProviderId[] {
  const set = new Set<AuthProviderId>(existing ?? []);
  set.add(next);
  return [...set];
}

function buildCustomerDocument(user: AuthSessionUser, providers?: readonly AuthProviderId[]): CustomerDocument {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    photoURL: user.photoURL,
    authProviders: providers ?? [user.provider],
    preferences: {
      notifications: true,
      marketing: false,
    },
  };
}
