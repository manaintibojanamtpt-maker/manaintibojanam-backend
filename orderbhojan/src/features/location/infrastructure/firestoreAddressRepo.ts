import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { getFirebaseFirestore, isFirestoreConfigured } from '@/firebase';
import type { SavedAddress, IndiaAddress } from '../domain/location.types';
import type { SavedAddressInput } from '../domain/location.schema';
import { LOCATION_ERROR_CODES, LocationError } from '../domain/location.errors';

function addressesCol(uid: string) {
  const db = getFirebaseFirestore();
  if (!db) throw new LocationError(LOCATION_ERROR_CODES.FIRESTORE_UNAVAILABLE, 'Firestore not configured');
  return collection(db, 'customers', uid, 'addresses');
}

function addressDoc(uid: string, addressId: string) {
  const db = getFirebaseFirestore();
  if (!db) throw new LocationError(LOCATION_ERROR_CODES.FIRESTORE_UNAVAILABLE, 'Firestore not configured');
  return doc(db, 'customers', uid, 'addresses', addressId);
}

function toSavedAddress(id: string, data: Record<string, unknown>): SavedAddress {
  return {
    id,
    label: data.label as SavedAddress['label'],
    customLabel: data.customLabel as string | undefined,
    isDefault: Boolean(data.isDefault),
    address: data.address as IndiaAddress,
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
  };
}

export async function listSavedAddresses(uid: string): Promise<SavedAddress[]> {
  if (!isFirestoreConfigured()) return [];
  const snapshot = await getDocs(addressesCol(uid));
  return snapshot.docs.map((d) => toSavedAddress(d.id, d.data()));
}

export async function saveAddress(uid: string, input: SavedAddressInput, addressId?: string): Promise<SavedAddress> {
  if (!isFirestoreConfigured()) {
    throw new LocationError(LOCATION_ERROR_CODES.FIRESTORE_UNAVAILABLE, 'Sign in with Firebase to save addresses');
  }

  const id = addressId ?? crypto.randomUUID();
  const ref = addressDoc(uid, id);

  if (input.isDefault) {
    await clearDefaultAddress(uid, id);
  }

  const payload = {
    label: input.label,
    customLabel: input.customLabel ?? null,
    isDefault: input.isDefault,
    address: input.address,
    updatedAt: serverTimestamp(),
    ...(addressId ? {} : { createdAt: serverTimestamp() }),
  };

  await setDoc(ref, payload, { merge: true });
  const saved = await getDoc(ref);
  return toSavedAddress(id, saved.data() ?? payload);
}

async function clearDefaultAddress(uid: string, exceptId: string): Promise<void> {
  const existing = await listSavedAddresses(uid);
  const db = getFirebaseFirestore();
  if (!db) return;
  const batch = writeBatch(db);
  for (const addr of existing) {
    if (addr.isDefault && addr.id !== exceptId) {
      batch.update(addressDoc(uid, addr.id), { isDefault: false });
    }
  }
  await batch.commit();
}

export async function deleteSavedAddress(uid: string, addressId: string): Promise<void> {
  if (!isFirestoreConfigured()) return;
  await deleteDoc(addressDoc(uid, addressId));
}

export async function setDefaultAddress(uid: string, addressId: string): Promise<SavedAddress> {
  const snapshot = await getDoc(addressDoc(uid, addressId));
  if (!snapshot.exists()) {
    throw new LocationError(LOCATION_ERROR_CODES.VALIDATION_FAILED, 'Address not found');
  }
  const data = snapshot.data();
  return saveAddress(
    uid,
    {
      label: data.label as SavedAddressInput['label'],
      customLabel: data.customLabel as string | undefined,
      isDefault: true,
      address: data.address as IndiaAddress,
    },
    addressId,
  );
}
