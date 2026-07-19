import { auth } from '../firebase';
import { EnvironmentConfig } from '../config/environment';
import {
  getOwnerApiPausedUntilMs,
  isOwnerApiPaused,
  pauseOwnerApiFromResponse,
} from './ownerApiRateLimit';

export type ProvisionOwnerParams = {
  name: string;
  email: string;
  restaurantName: string;
  mobileNumber?: string;
};

const OWNER_API_TIMEOUT_MS = 60_000;
const OWNER_API_MAX_ATTEMPTS = 3;
const OWNER_API_RETRY_BASE_MS = 2_000;
const OWNER_API_DEFAULT_429_BACKOFF_MS = 60_000;

const inflightGetRequests = new Map<string, Promise<unknown>>();

function resolveOwnerApiBase(): string {
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'bhojanos.com' || window.location.hostname === 'www.bhojanos.com')
  ) {
    return window.location.origin;
  }
  return EnvironmentConfig.getApiUrl();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isRetryableOwnerApiError(error: unknown): boolean {
  if (!(error instanceof Error)) return true;
  if (error.name === 'AbortError') return true;
  if (/failed to fetch|network|load failed|networkerror/i.test(error.message)) return true;
  const status = (error as Error & { status?: number }).status;
  return status === 502 || status === 503 || status === 504;
}

async function waitForOwnerApiPause(): Promise<void> {
  if (!isOwnerApiPaused()) return;
  const waitMs = getOwnerApiPausedUntilMs() - Date.now();
  if (waitMs > 0) {
    await sleep(waitMs);
  }
}

function getInflightGetKey(method: string, path: string): string {
  return `${method}:${path}`;
}

/** Best-effort wake-up for Render cold starts before owner mutations. */
export async function warmOwnerApi(timeoutMs = 30_000): Promise<void> {
  const apiBase = resolveOwnerApiBase();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(`${apiBase}/api/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch {
    // Cold start may still be in progress; publish request will retry.
  } finally {
    window.clearTimeout(timeoutId);
  }
}

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

  const execute = async (): Promise<T> => {
    const token = await user.getIdToken();
    const apiBase = resolveOwnerApiBase();
    let lastError: unknown;

    for (let attempt = 1; attempt <= OWNER_API_MAX_ATTEMPTS; attempt += 1) {
      await waitForOwnerApiPause();

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), OWNER_API_TIMEOUT_MS);

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

        if (res.status === 429) {
          pauseOwnerApiFromResponse(res.headers.get('Retry-After'), OWNER_API_DEFAULT_429_BACKOFF_MS);
          const rateLimitError = new Error('Too many requests. Please wait a moment and try again.') as Error & {
            status?: number;
            retryAfterMs?: number;
          };
          rateLimitError.status = 429;
          rateLimitError.retryAfterMs =
            getOwnerApiPausedUntilMs() - Date.now() > 0
              ? getOwnerApiPausedUntilMs() - Date.now()
              : OWNER_API_DEFAULT_429_BACKOFF_MS;
          throw rateLimitError;
        }

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
        lastError = error;
        if (!isRetryableOwnerApiError(error) || attempt === OWNER_API_MAX_ATTEMPTS) {
          break;
        }
        await sleep(OWNER_API_RETRY_BASE_MS * attempt);
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    if (lastError instanceof Error && lastError.name === 'AbortError') {
      throw new Error('Server is waking up — please try again in a few seconds.');
    }
    throw lastError;
  };

  if (method !== 'GET') {
    return execute();
  }

  const inflightKey = getInflightGetKey(method, path);
  const existing = inflightGetRequests.get(inflightKey) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }

  const promise = execute().finally(() => {
    inflightGetRequests.delete(inflightKey);
  });
  inflightGetRequests.set(inflightKey, promise);
  return promise;
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
  await warmOwnerApi();
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
