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
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
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
      const err = new Error(payload.error || payload.message || 'Request failed. Please try again.') as Error & {
        validationErrors?: string[];
        status?: number;
      };
      err.status = res.status;
      if (Array.isArray(payload.validationErrors)) {
        err.validationErrors = payload.validationErrors.filter(Boolean);
      }
      throw err;
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

/** Publish kitchen to OrderBhojan after server-side validation. */
export async function publishOwnerStorefrontViaApi(tenantId: string): Promise<{
  success: boolean;
  validationErrors?: string[];
}> {
  try {
    await ownerApiPost<{ success: boolean }>(`/api/owner/storefront/${tenantId}/publish`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const validationErrors =
      error && typeof error === 'object' && Array.isArray((error as { validationErrors?: unknown }).validationErrors)
        ? (error as { validationErrors: string[] }).validationErrors
        : message.includes('not ready to publish')
          ? [message]
          : undefined;
    if (validationErrors) {
      return { success: false, validationErrors };
    }
    throw error;
  }
}
