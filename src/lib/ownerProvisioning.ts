import { auth } from '../firebase';
import { EnvironmentConfig } from '../config/environment';

export type ProvisionOwnerParams = {
  name: string;
  email: string;
  restaurantName: string;
  mobileNumber?: string;
};

async function ownerApiPost<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to continue.');
  }

  const token = await user.getIdToken();
  const res = await fetch(`${EnvironmentConfig.getApiUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body ?? {}),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.success === false) {
    throw new Error(payload.error || 'Store setup failed. Please try again.');
  }
  return payload as T;
}

/** Create kitchen + link owner profile via backend (Admin SDK). */
export async function provisionOwnerStore(params: ProvisionOwnerParams): Promise<string> {
  const payload = await ownerApiPost<{ tenantSlug: string }>('/api/owner/provision', {
    name: params.name,
    email: params.email,
    restaurantName: params.restaurantName,
    mobileNumber: params.mobileNumber || '',
  });
  return payload.tenantSlug;
}

/** Repair ownedTenantIds on the user doc when client Firestore writes are blocked. */
export async function syncOwnerTenantsViaApi(): Promise<string[]> {
  const payload = await ownerApiPost<{ ownedTenantIds: string[] }>('/api/owner/sync-tenants');
  return Array.isArray(payload.ownedTenantIds) ? payload.ownedTenantIds.filter(Boolean) : [];
}
