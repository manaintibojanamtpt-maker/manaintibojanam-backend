import { auth } from '../firebase';
import { EnvironmentConfig } from '../config/environment';

export type ProvisionOwnerParams = {
  name: string;
  email: string;
  restaurantName: string;
  mobileNumber?: string;
};

async function ownerApiPost<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  return ownerApiRequest<T>('POST', path, body);
}

export async function ownerApiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to continue.');
  }

  const token = await user.getIdToken();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 12_000);

  const apiBase =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'bhojanos.com' || window.location.hostname === 'www.bhojanos.com')
      ? window.location.origin
      : EnvironmentConfig.getApiUrl();

  try {
    const res = await fetch(`${apiBase}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: method === 'GET' || method === 'DELETE' ? undefined : JSON.stringify(body ?? {}),
      signal: controller.signal,
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload.success === false) {
      throw new Error(payload.error || payload.message || 'Request failed. Please try again.');
    }
    return payload as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Server is waking up — please try again in a few seconds.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
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
