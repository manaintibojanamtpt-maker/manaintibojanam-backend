import { upsertCustomerProfile, type CustomerDocument } from '../infrastructure/customerRepository';
import type { AuthSessionUser } from '../domain/auth.types';

/** M1: Firestore-only customer bootstrap — no Marketplace API calls. */
export async function bootstrapCustomerSession(user: AuthSessionUser): Promise<CustomerDocument> {
  return upsertCustomerProfile(user);
}

export async function loadCustomerSession(uid: string): Promise<CustomerDocument | null> {
  const { readCustomerProfile } = await import('../infrastructure/customerRepository');
  return readCustomerProfile(uid);
}
